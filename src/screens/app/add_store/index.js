import React, { useState, useEffect } from "react";
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
  Image
} from "react-native";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";
import { firestore, storage } from "../../../../firebaseconfig";
import { useSelector, useDispatch } from "react-redux";
import { AppColors } from "../../../utils";
import { width, height } from "../../../utils/dimension";
import { getCategoriesLocale } from "../../../Redux/Reducers/CategoriesReducer";
import { setSelectedCategories, setCategories } from "../../../Redux/Actions/CategoriesActions";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Autocomplete from 'react-native-autocomplete-input';

export default function AddStoreScreen({ navigation }) {
  const user = useSelector((state) => state.user.userData);
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
  
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const fetchAddressSuggestions = async (text) => {
    setQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
  
    const mapboxToken = 'sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ';
  
    try {
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${mapboxToken}&autocomplete=true&limit=5&country=fr`);
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
    const countryInfo = context.find(c => c.id.includes('country'));
  
    const streetNumber = item.address || '';
    const streetName = item.text || '';
  
    const city = cityInfo ? cityInfo.text : '';
    const postalCode = postalCodeInfo ? postalCodeInfo.text : '';
  
    setStreet(streetName);
    setStreetNumber(streetNumber);
    setCity(city);
    setPostalCode(postalCode);
    setQuery(`${streetNumber} ${streetName}`);
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

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
  ]; 
  
  const daysLabels = {
    monday: "Lundi",
    tuesday: "Mardi",
    wednesday: "Mercredi",
    thursday: "Jeudi",
    friday: "Vendredi",
    saturday: "Samedi",
    sunday: "Dimanche"
  };

  const updateOpeningHour = (day, period, field, value) => {
    if (field !== 'start' && field !== 'end') {
      console.error('Champ non supporté:', field);
      return;
    }
  
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [period]: prev[day][period]
          ? { ...prev[day][period], [field]: value }
          : { [field]: value }
      }
    }));
  };      

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

  const handleAddStore = async () => {
    if (!name || !street || !city || !postalCode || !description || selectedCategories.length === 0) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires !");
      return;
    }

    let imageUrl = null;
  
    try {
      if (selectedImage) {
        const imageName = `store_${Date.now()}.jpg`;
        imageUrl = await uploadImageAsync(selectedImage.uri, imageName);
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
      const latitude = location.lat;
      const longitude = location.lng;
  
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
              address: {street: `${streetNumber} ${street}`},
              city: {
                name: city,
                postal_code: postalCode,
                country_id: "FR",
              },
              geopoint: {
                latitude: latitude,
                longitude: longitude,
              },
            },
          },
        ],
        cityName: city,
        description: { fr: description },
        category: selectedCategories,
        storeStatus: 0,
        website: "",
        openingHours: openingHours,
        imageUrl: imageUrl || '',
        ...(user?.userType === "merchant" && {
          email: storeEmail || "",
          phone: phone || "",
          managerFirstName: managerFirstName || "",
          managerLastName: managerLastName || "",
        })
      };
  
      await addDoc(storesRef, storeData);
  
      Alert.alert("Succès", "Magasin ajouté avec succès !");
      navigation.goBack();
    } catch (error) {
      console.error("Erreur lors de l'ajout du magasin :", error);
      Alert.alert("Erreur", "Impossible d'ajouter le magasin");
    }
  };  

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
    if (!permissionResult.granted) {
      alert("Permission refusée pour accéder aux photos !");
      return;
    }
  
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
  
    if (!result.cancelled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0]);
    }
  };  

  const uploadImageAsync = async (uri, imageName) => {
    const response = await fetch(uri);
    const blob = await response.blob();
  
    const storageRef = ref(storage, `stores/${imageName}`);
    await uploadBytes(storageRef, blob);
  
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };  

  const getOwnerId = async (userId) => {
      try {
        const userRef = doc(firestore, "users", userId);
        const userSnap = await getDoc(userRef);
    
        if (userSnap.exists()) {
          const ownerId = userSnap.data().id;
          console.log("Owner ID récupéré :", ownerId);
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

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 10 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={30} color={AppColors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "bold", marginLeft: 10 }}>
          Ajouter un magasin
        </Text>
      </View>
    <ScrollView 
      contentContainerStyle={styles.scrollContainer} 
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <Text style={styles.label}>Nom du magasin</Text>
        <TextInput style={styles.input} placeholder="Entrez le nom" value={name} onChangeText={setName} />

        <Text style={styles.label}>Adresse</Text>
          <Autocomplete
            data={suggestions}
            defaultValue={query}
            onChangeText={fetchAddressSuggestions}
            placeholder="Tapez l'adresse"
            flatListProps={{
              keyExtractor: (item) => item.id,
              renderItem: ({ item }) => (
                <TouchableOpacity
                  onPress={() => handleAddressSelect(item)}
                  style={styles.suggestionItem}
                >
                  <Text>{item.place_name}</Text>
                </TouchableOpacity>
              ),
            }}
            inputContainerStyle={styles.input}
          />

        <Text style={styles.label}>Ville</Text>
        <TextInput style={styles.input} placeholder="Ville" value={city} onChangeText={setCity} />

        <Text style={styles.label}>Code postal</Text>
        <TextInput style={styles.input} placeholder="Code postal" value={postalCode} onChangeText={setPostalCode} keyboardType="numeric" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Décrivez votre magasin" value={description} onChangeText={setDescription} multiline />

        {days.map((day) => (
          <View key={day} style={styles.dayContainer}>
            <Text style={styles.dayLabel}>{daysLabels[day]}</Text>

            <View style={styles.periodContainer}>
              <Text style={styles.periodLabel}>Matin :</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.hourInput}
                  placeholder="Début"
                  value={openingHours[day].morning?.start || ""}
                  onChangeText={(text) => updateOpeningHour(day, 'morning', 'start', text)}
                />
                <Text style={styles.toText}>à</Text>
                <TextInput
                  style={styles.hourInput}
                  placeholder="Fin"
                  value={openingHours[day].morning?.end || ""}
                  onChangeText={(text) => updateOpeningHour(day, 'morning', 'end', text)}
                />
              </View>
            </View>

            <View style={styles.periodContainer}>
              <Text style={styles.periodLabel}>Après-midi :</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.hourInput}
                  placeholder="Début"
                  value={openingHours[day].afternoon?.start || ""}
                  onChangeText={(text) => updateOpeningHour(day, 'afternoon', 'start', text)}
                />
                <Text style={styles.toText}>à</Text>
                <TextInput
                  style={styles.hourInput}
                  placeholder="Fin"
                  value={openingHours[day].afternoon?.end || ""}
                  onChangeText={(text) => updateOpeningHour(day, 'afternoon', 'end', text)}
                />
              </View>
            </View>
          </View>
        ))}

        {user?.userType === "merchant" && (
          <>
            <Text style={styles.label}>Email du magasin</Text>
            <TextInput
              style={styles.input}
              placeholder="Email du magasin"
              value={storeEmail}
              onChangeText={setStoreEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Site web</Text>
            <TextInput
              style={styles.input}
              placeholder="URL du site web"
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              placeholder="Numéro de téléphone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Prénom du gérant</Text>
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={managerFirstName}
              onChangeText={setManagerFirstName}
            />

            <Text style={styles.label}>Nom du gérant</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom"
              value={managerLastName}
              onChangeText={setManagerLastName}
            />
          </>
        )}

        <Text style={styles.label}>Catégories</Text>
        <TouchableOpacity style={styles.categoryButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.categoryButtonText}>
            {selectedCategories.length > 0 ? `${selectedCategories.length} catégorie(s) sélectionnée(s)` : "Sélectionner des catégories"}
          </Text>
        </TouchableOpacity>

        <ScrollView horizontal={true} style={styles.selectedCategoriesContainer}>
          {selectedCategories.map((categoryID) => (
            <View key={categoryID} style={styles.selectedCategoryItem}>
              <Text style={styles.selectedCategoryText}>{getCategoryName(categoryID)}</Text>
              <TouchableOpacity onPress={() => handleRemoveCategory(categoryID)}>
                <Icon name="close" size={20} color={AppColors.black} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {!selectedImage ? (
          <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
            <Text style={styles.imageButtonText}>Ajouter une image</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.selectedImageContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
              <Icon name="close-circle" size={30} color="red" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={handleAddStore}>
          <Text style={styles.addButtonText}>Ajouter le magasin</Text>
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
    backgroundColor: "#f8f8f8" 
  },
  textArea: {
    height: 80,
    textAlignVertical: "top"
  },
  categoryButton: {
    backgroundColor: AppColors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15
  },
  categoryButtonText: {
    color: "#fff",
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
    marginTop: 10
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
  container: { 
    padding: width(4),
    backgroundColor: AppColors.white_100
  },
  dayContainer: {
    marginBottom: 0,
    padding: 5,
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  periodContainer: {
    marginBottom: 10,
  },
  periodLabel: {
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
  },
  imageButton: {
    backgroundColor: AppColors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
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
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  }  
});

