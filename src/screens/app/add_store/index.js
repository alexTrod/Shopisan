import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  ScrollView,
  Image,
  DeviceEventEmitter,
  Keyboard,
  BackHandler,
  Platform
} from "react-native";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";
import { firestore } from "../../../../firebaseconfig";
import { useSelector, useDispatch } from "react-redux";
import { AppColors } from "../../../utils";
import { width, height } from "../../../utils/dimension";
import { getCategoriesLocale } from "../../../Redux/Reducers/CategoriesReducer";
import { setSelectedCategories, setCategories } from "../../../Redux/Actions/CategoriesActions";
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from "@expo/vector-icons";
import MapboxGL from "@rnmapbox/maps";
import { useTranslation } from "../../../utils/useTranslation";
import * as Location from 'expo-location';
import Toast from "react-native-toast-message";
import { ensureCityExists } from "../../../utils/cityManagement";
import OpeningHoursPicker from "../../../components/opening-hours-picker";

MapboxGL.setAccessToken('sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ');

export default function AddStoreScreen({ navigation }) {
  const { t } = useTranslation();
  const user = useSelector((state) => state.user.userData);

  // Auth check - only signed-up users can add stores
  useEffect(() => {
    if (!user) {
      Alert.alert(
        t('login_required') || 'Login Required',
        t('login_required_add_store_message') || 'Please sign up or log in to add a store.',
        [
          { text: t('cancel') || 'Cancel', onPress: () => navigation.goBack() },
          { text: t('sign_up') || 'Sign Up', onPress: () => navigation.navigate('Signup') }
        ]
      );
    }
  }, [user, navigation, t]);

  const [name, setName] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [description, setDescription] = useState("");
  const { categories, selectedCategories } = useSelector(state => state.categories);
  const [modalVisible, setModalVisible] = useState(false);
  const dispatch = useDispatch();
  const [selectedImage, setSelectedImage] = useState(null);
  const [storeEmail, setStoreEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [managerFirstName, setManagerFirstName] = useState('');
  const [managerLastName, setManagerLastName] = useState('');
  
  // Validation states
  const [validationErrors, setValidationErrors] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const fetchAddressSuggestions = async (text) => {
    setQuery(text);
    setStreet(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
  
    const mapboxToken = 'sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ';
  
    try {
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${mapboxToken}&autocomplete=true&limit=10&country=fr,gr,gb,es,be,it`);
      const result = await response.json();
      setSuggestions(result.features || []);
    } catch (error) {
      console.error('Erreur de recherche Mapbox:', error);
    }
    setLoadingSuggestions(false);
  };

  const handleAddressSelect = (item) => {
    if (!item) return;
  
    setSuggestions([]);
    
    const context = item.context || [];
    const cityInfo = context.find(c => c.id.includes('place'));
    const postalCodeInfo = context.find(c => c.id.includes('postcode'));
  
    const streetNumber = item.address || '';
    const streetName = item.text || '';
  
    const city = cityInfo ? cityInfo.text : '';
    const postalCode = postalCodeInfo ? postalCodeInfo.text : '';
  
    setStreet(streetName);
    setStreetNumber(streetNumber);
    setCity(city);
    setPostalCode(postalCode);
    setQuery(`${streetNumber} ${streetName}`);
    
    if (item.center) {
      setSelectedLocation({
        latitude: item.center[1],
        longitude: item.center[0]
      });
      setShowMap(true);
    }
  };  

  const handleUseCurrentLocation = async () => {
    const mapboxToken = 'sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ';
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre localisation pour continuer.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      setShowMap(true);

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.coords.longitude},${location.coords.latitude}.json?access_token=${mapboxToken}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const address = data.features[0];
        handleAddressSelect(address);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position actuelle');
    }
  };

  const [openingHours, setOpeningHours] = useState({
    monday: { morning: null, afternoon: null },
    tuesday: { morning: null, afternoon: null },
    wednesday: { morning: null, afternoon: null },
    thursday: { morning: null, afternoon: null },
    friday: { morning: null, afternoon: null },
    saturday: { morning: null, afternoon: null },
    sunday: { morning: null, afternoon: null },
  });      

  useEffect(() => {
    const loadCategories = async () => {
      const cats = await getCategoriesLocale();
      dispatch(setCategories(cats));
    };
    loadCategories();
  }, []);

  const data = categories.map(category => ({
    value: category.id,
    label: category.name,
  }));

  const getCategoryName = (id) => {
    const category = categories.find(cat => cat.id === id);
    return category ? category.name : null;
  };

  const handleSelectCategory = (item) => {
    const newSelectedCategories = selectedCategories.includes(item.value)
      ? selectedCategories.filter(cat => cat !== item.value)
      : [...selectedCategories, item.value];
    dispatch(setSelectedCategories(newSelectedCategories));
  };

  const handleRemoveCategory = (categoryID) => {
    dispatch(setSelectedCategories(selectedCategories.filter(cat => cat !== categoryID)));
  };

  const uploadImageToCloudflare = async (uri) => {
    const cloudflareAccountId = 'e593403f5f942f93365e9cd0be4065a1';
    const apiToken = 'o44MNleTjEPJpsfbegB9ocnlFA1DJh0ZUlrxIrNI';

    const fileName = `photo_${Date.now()}.jpg`;

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: fileName,
      type: 'image/jpeg'
    });

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/images/v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
      body: formData
    });

    const data = await response.json();

    if (!data.success) {
      console.error("Erreur Cloudflare:", data.errors);
      throw new Error('Échec de l\'upload vers Cloudflare');
    }

    return data.result.variants[0];
  };

  const validateField = (fieldName, value) => {
    const requiredFields = ['name', 'street', 'city', 'postalCode', 'description'];
    const isRequired = requiredFields.includes(fieldName);
    
    if (isRequired && (!value || value.trim() === '')) {
      return true; // Has error
    }
    return false; // No error
  };

  const validateAllFields = () => {
    const errors = {};
    const requiredFields = [
      { key: 'name', value: name },
      { key: 'street', value: street },
      { key: 'city', value: city },
      { key: 'postalCode', value: postalCode },
      { key: 'description', value: description }
    ];

    requiredFields.forEach(field => {
      if (validateField(field.key, field.value)) {
        errors[field.key] = true;
      }
    });

    if (selectedCategories.length === 0) {
      errors.categories = true;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getInputStyle = (fieldName) => {
    const hasError = hasAttemptedSubmit && validationErrors[fieldName];
    return [
      styles.input,
      hasError && styles.inputError
    ];
  };

  const handleAddStore = async () => {
    setHasAttemptedSubmit(true);

    if (!validateAllFields()) {
      Alert.alert(t('error'), t('required_fields_error'));
      return;
    }

    if (!name || !street || !city || !postalCode || !description || selectedCategories.length === 0) {
      Alert.alert("Erreur", "Les champs obligatoires sont : nom, adresse, ville, code postal, description et au moins une catégorie.");
      return;
    }

    if (suggestions.length > 0) {
      setSuggestions([]);
      Keyboard.dismiss();
    }

    let imageUrl = null;

    try {
      if (selectedImage) {
        try {
          imageUrl = await uploadImageToCloudflare(selectedImage.uri);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          Toast.show({
            text1: t('warning') || 'Warning',
            text2: 'Image upload failed. Store will be created without image.',
            type: 'info',
          });
          // Continue without image
        }
      }

      const fullAddress = `${streetNumber} ${street}, ${postalCode} ${city}, France`;

      const apiKey = 'AIzaSyCsGAmEtEu_aox4wHgf4GOQA2nGUgjdfrA';
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.status !== "OK" || data.results.length === 0) {
        Alert.alert("Erreur", "Impossible de trouver l'adresse. Vérifiez les informations.");
        return;
      }

      const location = data.results[0].geometry.location;
      const latitude = Number(location.lat);
      const longitude = Number(location.lng);

      const ownerId = user ? await getOwnerId(user.id) || null : null;

      const storesRef = collection(firestore, "stores");
      const storesSnapshot = await getDocs(storesRef);

      let maxId = 0;
      storesSnapshot.forEach((doc) => {
        const storeData = doc.data();
        if (storeData.id && typeof storeData.id === "number" && storeData.id > maxId) {
          maxId = storeData.id;
        }
      });

      const newStoreId = maxId + 1;

      const storeData = {
        id: newStoreId,
        name,
        owner_id: ownerId,
        address: [
          {
            location: {
              address: { street: `${street}` },
              city: {
                name: city,
                postal_code: postalCode,
                country_id: "FR",
              },
              geopoint: {
                latitude,
                longitude,
              },
            },
          },
        ],
        
        latitude,
        longitude,

        cityName: city,
        description: { fr: description },
        category: selectedCategories,
        storeStatus: 0,
        website: "",
        openingHours: openingHours,
        imageUrl: imageUrl || "",
        is_validated: false,
        ...(user?.userType === "merchant" && {
          email: storeEmail || "",
          phone: phone || "",
          managerFirstName: managerFirstName || "",
          managerLastName: managerLastName || "",
        }),
      };

      await addDoc(storesRef, storeData);

      // Ensure city exists in the cities collection
      try {
        const cityResult = await ensureCityExists(city, postalCode, latitude, longitude, "FR");
        if (cityResult.success) {
          console.log(cityResult.message);
        } else {
          console.warn('City creation/update had issues:', cityResult.error);
        }
      } catch (cityError) {
        console.error('Error ensuring city exists:', cityError);
        // Continue even if city creation fails - store is already created
      }

      DeviceEventEmitter.emit('stores:refresh');
      dispatch(setSelectedCategories([]));
      
      Toast.show({
        text1: t('store_saved_success'),
        type: 'success',
        visibilityTime: 4000,
      });
      
      navigation.goBack();
    } catch (error) {
      console.error("Erreur lors de l'ajout du magasin :", error);
      Alert.alert("Erreur", "Impossible d'ajouter le magasin");
    }
  };  

  const handlePickImage = async () => {
    try {
      // Keep it as compatible and simple as possible; don't block on permission
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // backward-compatible enum
        quality: 0.7,
      });
  
      if (!result?.canceled) {
        if (result?.assets?.length > 0) {
          setSelectedImage(result.assets[0]);
        } else if (result?.uri) {
          setSelectedImage({ uri: result.uri });
        }
      }
    } catch (e) {
      console.error('Image picker error', e);
      Alert.alert('Error', 'Unable to open image picker.');
    }
  };  

  const getOwnerId = async (userId) => {
      try {
        const userRef = doc(firestore, "users", userId);
        const userSnap = await getDoc(userRef);
    
        if (userSnap.exists()) {
          const ownerId = userSnap.data().id;
          return ownerId;
        } else {
          console.error("Utilisateur introuvable dans Firestore.");
          return null;
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'owner_id :", error);
        return null;
      }
    };

  const formatHours = (hours) => {
    if (!hours.morning && !hours.afternoon) return "Fermé";

    const formatTimeDisplay = (timeStr) => {
      if (!timeStr) return "";
      const parts = timeStr.split(':');
      const hour = parts[0];
      const minute = parts[1];
      return minute === "00" || !minute ? `${hour}h` : `${hour}h${minute}`;
    };

    let result = "";
    if (hours.morning) {
      result += `${formatTimeDisplay(hours.morning.start)}-${formatTimeDisplay(hours.morning.end)}`;
    }
    if (hours.afternoon) {
      if (result) result += " / ";
      result += `${formatTimeDisplay(hours.afternoon.start)}-${formatTimeDisplay(hours.afternoon.end)}`;
    }
    return result;
  };

  const [hoursErrors, setHoursErrors] = useState({});

  const validateHour = (day, period, field, value) => {
    let error = '';
    if (value && !/^\d{1,2}$/.test(value)) {
      error = 'notNumber';
    }
    const otherField = field === 'start' ? 'end' : 'start';
    const otherValue = openingHours[day][period]?.[otherField];
    if (value && otherValue && /^\d{1,2}$/.test(value) && /^\d{1,2}$/.test(otherValue)) {
      const v1 = field === 'start' ? value : otherValue;
      const v2 = field === 'end' ? value : otherValue;
      if (parseInt(v1) >= parseInt(v2)) {
        error = 'order';
      }
    }
    setHoursErrors(prev => ({
      ...prev,
      [`${day}_${period}_${field}`]: error
    }));
  };

  const updateOpeningHourValidated = (day, period, field, value) => {
    updateOpeningHour(day, period, field, value);
    validateHour(day, period, field, value);
  };

  const handleBackPress = () => {
    if (suggestions.length > 0) {
      setSuggestions([]);
      Keyboard.dismiss();
      return;
    }
    navigation.goBack();
  };

  useEffect(() => {
    const onHardwareBack = () => {
      if (suggestions.length > 0) {
        setSuggestions([]);
        Keyboard.dismiss();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onHardwareBack);
    return () => sub.remove();
  }, [suggestions]);

  useEffect(() => {
    return () => setSuggestions([]);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 10 }}>
        <TouchableOpacity onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={30} color={AppColors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "bold", marginLeft: 10 }}>
          Add a store
        </Text>
      </View>
    <ScrollView 
      contentContainerStyle={styles.scrollContainer} 
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
    >
      <View style={styles.container}>
        <Text style={styles.label}>{t('store_name')}</Text>
        <TextInput
          style={getInputStyle('name')}
          placeholder={t('store_name')}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>{t('street_number')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('street_number')}
          value={streetNumber}
          onChangeText={setStreetNumber}
          keyboardType="numeric"
        />

        <Text style={styles.label}>{t('street')}</Text>
        <View style={{ position: 'relative', zIndex: 1000 }}>
          <TextInput
            style={getInputStyle('street')}
            placeholder={t('street')}
            value={street}
            onChangeText={fetchAddressSuggestions}
          />
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 200 }}
                nestedScrollEnabled={true}
              >
                {suggestions.map((item, index) => (
                  <TouchableOpacity
                    key={item.id || index}
                    style={styles.suggestionItem}
                    onPress={() => handleAddressSelect(item)}
                  >
                    <Text style={styles.suggestionText}>{item.place_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <Text style={styles.label}>{t('city')}</Text>
        <TextInput
          style={getInputStyle('city')}
          placeholder={t('city')}
          value={city}
          onChangeText={setCity}
        />

        <Text style={styles.label}>{t('postal_code')}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[getInputStyle('postalCode'), { flex: 1 }]}
            placeholder={t('postal_code')}
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="numeric"
          />
          <TouchableOpacity 
            style={styles.locationButton} 
            onPress={handleUseCurrentLocation}
          >
            <Ionicons name="location" size={20} color={AppColors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('description')}</Text>
        <TextInput
          style={[getInputStyle('description'), styles.textArea]}
          placeholder={t('description')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {user?.userType === "merchant" && (
          <>
            <Text style={styles.label}>{t('store_email')} <Text style={styles.optionalText}>({t('optional')})</Text></Text>
            <TextInput
              style={styles.input}
              placeholder={t('store_email')}
              value={storeEmail}
              onChangeText={setStoreEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>{t('website')} <Text style={styles.optionalText}>({t('optional')})</Text></Text>
            <TextInput
              style={styles.input}
              placeholder={t('website')}
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
            />

            <Text style={styles.label}>{t('phone')} <Text style={styles.optionalText}>({t('optional')})</Text></Text>
            <TextInput
              style={styles.input}
              placeholder={t('phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>{t('manager_first_name')} <Text style={styles.optionalText}>({t('optional')})</Text></Text>
            <TextInput
              style={styles.input}
              placeholder={t('manager_first_name')}
              value={managerFirstName}
              onChangeText={setManagerFirstName}
            />

            <Text style={styles.label}>{t('manager_last_name')} <Text style={styles.optionalText}>({t('optional')})</Text></Text>
            <TextInput
              style={styles.input}
              placeholder={t('manager_last_name')}
              value={managerLastName}
              onChangeText={setManagerLastName}
            />
          </>
        )}

        <Text style={styles.label}>{t('categories')}</Text>
        <TouchableOpacity 
          style={[
            styles.categoryButton, 
            hasAttemptedSubmit && validationErrors.categories && styles.categoryButtonError
          ]} 
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.categoryButtonText}>
            {selectedCategories.length > 0 ? `${selectedCategories.length} catégorie(s) sélectionnée(s)` : t('select_categories')}
          </Text>
        </TouchableOpacity>

        <ScrollView horizontal={true} style={styles.selectedCategoriesContainer}>
          {selectedCategories.map((categoryID) => (
            <View key={categoryID} style={styles.selectedCategoryItem}>
              <Text style={styles.selectedCategoryText}>{getCategoryName(categoryID)}</Text>
              <TouchableOpacity onPress={() => handleRemoveCategory(categoryID)}>
                <Ionicons name="close" size={20} color={AppColors.black} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {showMap && selectedLocation && (
          <View style={styles.mapContainer}>
            <MapboxGL.MapView style={styles.map}>
              <MapboxGL.Camera
                centerCoordinate={[selectedLocation.longitude, selectedLocation.latitude]}
                zoomLevel={14}
              />
              <MapboxGL.PointAnnotation
                id="selected-location"
                coordinate={[selectedLocation.longitude, selectedLocation.latitude]}
              />
            </MapboxGL.MapView>
          </View>
        )}

        <OpeningHoursPicker
          value={openingHours}
          onChange={setOpeningHours}
          locale={t('locale') === 'en' ? 'en' : 'fr'}
          showPresets={true}
          t={t}
        />

        {!selectedImage ? (
          <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
            <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.imageButtonText}>{t('add_image')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.selectedImageContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
              <Ionicons name="close-circle" size={30} color="red" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={handleAddStore}>
          <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.addButtonText}>{t('add_store')}</Text>
        </TouchableOpacity>

        <Modal animationType="slide" transparent={true} visible={modalVisible}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                onPress={() => {
                  if (selectedCategories.length === categories.length) {
                    dispatch(setSelectedCategories([]));
                  } else {
                    dispatch(setSelectedCategories(categories.map(category => category.id)));
                  }
                }}
                style={styles.categoryItem}
              >
                <Text style={[styles.categoryText, { color: selectedCategories.length === categories.length ? AppColors.primary : AppColors.black }]}>
                  Tout sélectionner
                </Text>
              </TouchableOpacity>
              <FlatList
                data={data}
                keyExtractor={item => item.value.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => handleSelectCategory(item)} style={styles.categoryItem}>
                    <Text style={[styles.categoryText, { color: selectedCategories.includes(item.value) ? AppColors.primary : AppColors.black }]}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    padding: width(4),
    backgroundColor: AppColors.white_100
  },
  label: {
    fontSize: 16,
    fontWeight: "bold", 
    marginBottom: 5
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: "#f8f8f8", 
  },
  inputError: {
    borderColor: AppColors.red,
    backgroundColor: "#fff0f0",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top"
  },
  categoryButton: {
    backgroundColor: AppColors.primary_faded,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  categoryButtonError: {
    borderColor: AppColors.red,
  },
  categoryButtonText: {
    color: AppColors.primary,
    fontSize: 16
  },
  selectedCategoriesContainer: {
    flexDirection: "row",
    marginTop: 10
  },
  selectedCategoryItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColors.black,
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 5,
    height: 40
  },
  selectedCategoryText: { 
    marginRight: 5,
    fontSize: 14
  },
  addButton: {
    backgroundColor: AppColors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    height: '80%',
    backgroundColor: AppColors.white,
    borderRadius: 10,
    padding: 20,
  },
  categoryItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_200,
    flexDirection:'row',
  },
  categoryText: {
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: AppColors.red,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: AppColors.white,
    fontWeight: 'bold',
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  dayContainer: {
    marginBottom: 0,
    padding: 5,
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  periodContainer: {
    marginBottom: 10,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
    color: "#666",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hourInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  toText: {
    marginHorizontal: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
  },
  imageButton: {
    backgroundColor: AppColors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  imageButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  selectedImageContainer: {
    marginVertical: 10,
    position: "relative",
    alignItems: "center",
  },
  selectedImage: {
    width: width(80),
    height: height(20),
    borderRadius: 10,
  },
  removeImageButton: {
    position: "absolute",
    top: 5,
    right: 5,
  },  
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: AppColors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_200,
  },
  suggestionText: {
    fontSize: 14,
    color: AppColors.black,
  },
  locationButton: {
    padding: 10,
    marginLeft: 10,
    backgroundColor: AppColors.primary_faded,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mapContainer: {
    height: 200,
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  presetButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.primary_faded,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedPreset: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.white,
  },
  presetText: {
    color: AppColors.primary,
    fontSize: 14,
  },
  selectedPresetText: {
    fontWeight: 'bold',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  closedButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: AppColors.primary_faded,
  },
  closedButtonText: {
    color: AppColors.primary,
    fontSize: 12,
  },
  closedText: {
    color: AppColors.grey_200,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  openingHoursContainer: {
    marginBottom: 20,
  },
  dayGroup: {
    backgroundColor: AppColors.white,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
  },
  dayGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  dayGroupTitle: {
    flex: 1,
  },
  dayGroupText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: AppColors.black,
  },
  dayGroupHours: {
    fontSize: 12,
    color: AppColors.grey_200,
    marginTop: 2,
  },
  dayGroupContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.grey_200,
    backgroundColor: AppColors.white_200,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 2,
    minHeight: 48,
  },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    marginRight: 4,
  },

  blockActions: {
    marginTop: 6,
  },

  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },

  timeInput: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    marginHorizontal: 4,
    backgroundColor: AppColors.white_100,
    paddingVertical: 2,
  },
  hoursContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    marginHorizontal: 4,
    backgroundColor: AppColors.white_100,
    paddingVertical: 2,
  },
  timeSeparator: {
    marginHorizontal: 4,
    color: AppColors.grey_200,
  },
  dayActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  hoursHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  hoursHeaderBlock: {
    flex: 1,
    alignItems: 'center',
  },
  hoursHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: AppColors.primary,
    marginBottom: 2,
  },
  hoursHeaderSubText: {
    fontSize: 11,
    color: AppColors.grey_200,
    marginHorizontal: 8,
  },
  dayActionsHeader: {
    width: 48,
  },
  timeInputError: {
    borderColor: AppColors.red,
    backgroundColor: '#fff0f0',
  },
  timeInputErrorText: {
    color: AppColors.red,
    fontSize: 11,
    marginTop: -4,
    marginBottom: 4,
    marginLeft: 8,
  },
  dayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 48,
    marginLeft: 4,
  },
  actionButton: {
    padding: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  addressInputWrapper: {
    flex: 1,
  },
  locationButton: {
    marginLeft: 8,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  minuteInput: {
    width: 36,
  },
  optionalText: {
    fontSize: 14,
    fontWeight: "normal",
    color: AppColors.grey_200,
    fontStyle: "italic",
  },
});
