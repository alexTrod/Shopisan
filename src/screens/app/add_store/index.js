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
  BackHandler
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
import { Ionicons } from "@expo/vector-icons";
import MapboxGL from "@rnmapbox/maps";
import { useTranslation } from "../../../utils/useTranslation";
import * as Location from 'expo-location';
import Toast from "react-native-toast-message";

MapboxGL.setAccessToken('sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ');

export default function AddStoreScreen({ navigation }) {
  const { t } = useTranslation();
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
  
  // Validation states
  const [validationErrors, setValidationErrors] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [groupedDays, setGroupedDays] = useState([]);

  const timePresets = [
    { label: "Fermé", type: "closed" },
    { label: "9–12 / 14–19", type: "split", morning: { start: "9", end: "12" }, afternoon: { start: "14", end: "19" } },
    { label: "10–19 (journée)", type: "day", start: "10", end: "19" },
  ];

  const isPeriodEmpty = (p) => !p || ((p.start ?? "") === "" && (p.end ?? "") === "");
  const isClosed = (d) => {
    const day = openingHours[d] || {};
    return isPeriodEmpty(day.morning) && isPeriodEmpty(day.afternoon);
  };
  const isSplit = (d) => openingHours[d].morning && openingHours[d].afternoon;
  const isDay = (d) => openingHours[d].morning && !openingHours[d].afternoon;

  const clampHour = (v) => {
    if (v === "" || v == null) return "";
    const n = Math.max(0, Math.min(23, parseInt(String(v).replace(/[^0-9]/g, ""), 10) || 0));
    return String(n);
  };

  const clampMinute = (v) => {
    if (v === "" || v == null) return "";
    const n = Math.max(0, Math.min(59, parseInt(String(v).replace(/[^0-9]/g, ""), 10) || 0));
    return String(n);
  };

  // Helper function to parse time string (e.g., "9:30" or "9")
  const parseTime = (timeStr) => {
    if (!timeStr) return { hour: "", minute: "" };
    const parts = timeStr.split(':');
    return {
      hour: parts[0] || "",
      minute: parts[1] || "00"
    };
  };

  // Helper function to format time string
  const formatTime = (hour, minute) => {
    if (!hour) return "";
    const min = minute === "00" || !minute ? "" : `:${minute}`;
    return `${hour}${min}`;
  };

  const setDayClosed = (day, closed) => {
    setOpeningHours(prev => {
      const next = { ...prev };
      next[day] = closed
        ? { morning: null, afternoon: null }
        : { morning: { start: "9:00", end: "19:00" }, afternoon: null };
      return next;
    });
  };

  const normalizeDay = (dayObj = {}) => {
    const norm = { ...dayObj };
    if (isPeriodEmpty(norm.morning)) norm.morning = null;
    if (isPeriodEmpty(norm.afternoon)) norm.afternoon = null;
    return norm;
  };

  const setDayMode = (day, mode) => {
    setOpeningHours(prev => {
      const cur = normalizeDay(prev[day] || { morning: null, afternoon: null });
      if (mode === "day") {
        const start = cur.morning?.start ?? "9:00";
        const end = (cur.afternoon?.end ?? cur.morning?.end) ?? "19:00";
        return { ...prev, [day]: normalizeDay({ morning: { start, end }, afternoon: null }) };
      } else {
        const mStart = cur.morning?.start ?? "9:00";
        const mEnd = "12:00";
        return {
          ...prev,
          [day]: normalizeDay({
            morning: { start: mStart, end: mEnd },
            afternoon: { start: "14:00", end: cur.morning?.end ?? "19:00" },
          }),
        };
      }
    });
  };

  const setTime = (day, period, field, hour, minute = "00") => {
    const timeValue = formatTime(hour, minute);
    setOpeningHours(prev => {
      const cur = prev[day] || { morning: null, afternoon: null };
      const p = cur[period] ? { ...cur[period], [field]: timeValue } : { [field]: timeValue, ...(field === "start" ? { end: "" } : { start: "" }) };
      const next = { ...prev, [day]: normalizeDay({ ...cur, [period]: p }) };
      return next;
    });
  };

  const applyPresetToAllDays = (preset) => {
    const next = {};
    days.forEach((d) => {
      if (preset.type === "closed") {
        next[d] = { morning: null, afternoon: null };
      } else if (preset.type === "day") {
        next[d] = { morning: { start: preset.start, end: preset.end }, afternoon: null };
      } else {
        next[d] = { morning: { ...preset.morning }, afternoon: { ...preset.afternoon } };
      }
    });
    setOpeningHours(next);
    setSelectedPreset(preset.label);
  };

  const copyMondayToWeekdays = () => {
    setOpeningHours((prev) => {
      const mon = prev.monday;
      return {
        ...prev,
        tuesday: mon,
        wednesday: mon,
        thursday: mon,
        friday: mon,
      };
    });
  };

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
        'Content-Type': 'multipart/form-data'
      },
      body: formData
    });

    const data = await response.json();

    if (!data.success) {
      console.error("Erreur Cloudflare:", data.errors);
      throw new Error('Échec de l’upload vers Cloudflare');
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
        imageUrl = await uploadImageToCloudflare(selectedImage.uri);
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

      DeviceEventEmitter.emit('stores:refresh');
      dispatch(setSelectedCategories([]));
      
      Toast.show({
        text1: t('success'),
        text2: t('store_added_successfully'),
        type: 'success',
      });
      
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

  const updateGroupedDays = (hours) => {
    const groups = [];
    let currentGroup = { days: [], hours: null };

    days.forEach((day, index) => {
      const dayHours = JSON.stringify(hours[day]);
      
      if (currentGroup.hours === null) {
        currentGroup = { days: [day], hours: dayHours };
      } else if (currentGroup.hours === dayHours) {
        currentGroup.days.push(day);
      } else {
        groups.push(currentGroup);
        currentGroup = { days: [day], hours: dayHours };
      }

      if (index === days.length - 1) {
        groups.push(currentGroup);
      }
    });

    setGroupedDays(groups);
  };

  useEffect(() => {
    updateGroupedDays(openingHours);
  }, [openingHours]);

  const copyToNextDay = (day) => {
    const currentIndex = days.indexOf(day);
    if (currentIndex < days.length - 1) {
      const nextDay = days[currentIndex + 1];
      setOpeningHours(prev => ({
        ...prev,
        [nextDay]: { ...prev[day] }
      }));
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
          <Icon name="arrow-left" size={30} color={AppColors.primary} />
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
        <TextInput
          style={getInputStyle('street')}
          placeholder={t('street')}
          value={street}
          onChangeText={setStreet}
        />

        <Text style={styles.label}>{t('city')}</Text>
        <TextInput
          style={getInputStyle('city')}
          placeholder={t('city')}
          value={city}
          onChangeText={setCity}
        />

        <Text style={styles.label}>{t('postal_code')}</Text>
        <TextInput
          style={getInputStyle('postalCode')}
          placeholder={t('postal_code')}
          value={postalCode}
          onChangeText={setPostalCode}
          keyboardType="numeric"
        />

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
                <Icon name="close" size={20} color={AppColors.black} />
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

        <Text style={styles.label}>{t('opening_hours')}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {timePresets.map((p) => (
            <TouchableOpacity
              key={p.label}
              onPress={() => applyPresetToAllDays(p)}
              style={[
                { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: AppColors.primary },
                selectedPreset === p.label
                  ? { backgroundColor: AppColors.primary }
                  : { backgroundColor: AppColors.white }
              ]}
            >
              <Text style={{ color: selectedPreset === p.label ? AppColors.white : AppColors.primary, fontWeight: "600" }}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={copyMondayToWeekdays}
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: AppColors.grey_200 }}
          >
            <Text style={{ color: AppColors.black }}>Copier Lundi → Ven</Text>
          </TouchableOpacity>
        </View>

        {days.map((day) => {
          const closed = isClosed(day);
          const split = isSplit(day);
          const dayMode = split ? "split" : isDay(day) ? "day" : "closed";

          const m = openingHours[day].morning;
          const a = openingHours[day].afternoon;

          const mErr = m && m.start !== "" && m.end !== "" && parseInt(m.start, 10) >= parseInt(m.end, 10);
          const aErr = a && a.start !== "" && a.end !== "" && parseInt(a.start, 10) >= parseInt(a.end, 10);
          const overlapErr = m && a && m.end !== "" && a.start !== "" && parseInt(m.end, 10) > parseInt(a.start, 10);

          return (
            <View key={day} style={{ borderWidth: 1, borderColor: AppColors.grey_200, borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold" }}>{daysLabels[day]}</Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 12, color: AppColors.grey_200 }}>Fermé</Text>
                  <TouchableOpacity
                    onPress={() => setDayClosed(day, !closed)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: closed ? AppColors.primary : AppColors.grey_200,
                      backgroundColor: closed ? AppColors.primary_faded : AppColors.white_100,
                    }}
                  >
                    <Text style={{ color: closed ? AppColors.primary : AppColors.black, fontSize: 12 }}>{closed ? "Oui" : "Non"}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!closed && (
                <>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <TouchableOpacity
                      onPress={() => setDayMode(day, "day")}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: dayMode === "day" ? AppColors.primary : AppColors.grey_200,
                        backgroundColor: dayMode === "day" ? AppColors.primary_faded : AppColors.white_100,
                      }}
                    >
                      <Text style={{ color: dayMode === "day" ? AppColors.primary : AppColors.black, fontSize: 12 }}>Journée</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setDayMode(day, "split")}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: dayMode === "split" ? AppColors.primary : AppColors.grey_200,
                        backgroundColor: dayMode === "split" ? AppColors.primary_faded : AppColors.white_100,
                      }}
                    >
                      <Text style={{ color: dayMode === "split" ? AppColors.primary : AppColors.black, fontSize: 12 }}>Coupure midi</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginTop: 10, gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ width: 70, fontSize: 12, color: AppColors.grey_200 }}>{split ? "Matin" : "Heures"}</Text>
                      <View style={styles.timeInputContainer}>
                        <TextInput
                          style={[styles.timeInput, mErr && styles.timeInputError]}
                          placeholder="09"
                          value={parseTime(m?.start).hour}
                          onChangeText={(t) => {
                            const hour = clampHour(t);
                            const minute = parseTime(m?.start).minute;
                            setTime(day, "morning", "start", hour, minute);
                          }}
                          keyboardType="numeric"
                          maxLength={2}
                        />
                        <Text style={styles.timeSeparator}>h</Text>
                        <TextInput
                          style={[styles.timeInput, styles.minuteInput, mErr && styles.timeInputError]}
                          placeholder="00"
                          value={parseTime(m?.start).minute}
                          onChangeText={(t) => {
                            const minute = clampMinute(t);
                            const hour = parseTime(m?.start).hour;
                            setTime(day, "morning", "start", hour, minute);
                          }}
                          keyboardType="numeric"
                          maxLength={2}
                        />
                      </View>
                      <Text style={styles.timeSeparator}>-</Text>
                      <View style={styles.timeInputContainer}>
                        <TextInput
                          style={[styles.timeInput, mErr && styles.timeInputError]}
                          placeholder={split ? "12" : "19"}
                          value={parseTime(m?.end).hour}
                          onChangeText={(t) => {
                            const hour = clampHour(t);
                            const minute = parseTime(m?.end).minute;
                            setTime(day, "morning", "end", hour, minute);
                          }}
                          keyboardType="numeric"
                          maxLength={2}
                        />
                        <Text style={styles.timeSeparator}>h</Text>
                        <TextInput
                          style={[styles.timeInput, styles.minuteInput, mErr && styles.timeInputError]}
                          placeholder="00"
                          value={parseTime(m?.end).minute}
                          onChangeText={(t) => {
                            const minute = clampMinute(t);
                            const hour = parseTime(m?.end).hour;
                            setTime(day, "morning", "end", hour, minute);
                          }}
                          keyboardType="numeric"
                          maxLength={2}
                        />
                      </View>
                      {mErr && <Text style={[styles.timeInputErrorText, { marginLeft: 8 }]}>Fin &gt; Début</Text>}
                    </View>

                    {split && (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ width: 70, fontSize: 12, color: AppColors.grey_200 }}>Après-midi</Text>
                        <View style={styles.timeInputContainer}>
                          <TextInput
                            style={[styles.timeInput, (aErr || overlapErr) && styles.timeInputError]}
                            placeholder="14"
                            value={parseTime(a?.start).hour}
                            onChangeText={(t) => {
                              const hour = clampHour(t);
                              const minute = parseTime(a?.start).minute;
                              setTime(day, "afternoon", "start", hour, minute);
                            }}
                            keyboardType="numeric"
                            maxLength={2}
                          />
                          <Text style={styles.timeSeparator}>h</Text>
                          <TextInput
                            style={[styles.timeInput, styles.minuteInput, (aErr || overlapErr) && styles.timeInputError]}
                            placeholder="00"
                            value={parseTime(a?.start).minute}
                            onChangeText={(t) => {
                              const minute = clampMinute(t);
                              const hour = parseTime(a?.start).hour;
                              setTime(day, "afternoon", "start", hour, minute);
                            }}
                            keyboardType="numeric"
                            maxLength={2}
                          />
                        </View>
                        <Text style={styles.timeSeparator}>-</Text>
                        <View style={styles.timeInputContainer}>
                          <TextInput
                            style={[styles.timeInput, (aErr || overlapErr) && styles.timeInputError]}
                            placeholder="19"
                            value={parseTime(a?.end).hour}
                            onChangeText={(t) => {
                              const hour = clampHour(t);
                              const minute = parseTime(a?.end).minute;
                              setTime(day, "afternoon", "end", hour, minute);
                            }}
                            keyboardType="numeric"
                            maxLength={2}
                          />
                          <Text style={styles.timeSeparator}>h</Text>
                          <TextInput
                            style={[styles.timeInput, styles.minuteInput, (aErr || overlapErr) && styles.timeInputError]}
                            placeholder="00"
                            value={parseTime(a?.end).minute}
                            onChangeText={(t) => {
                              const minute = clampMinute(t);
                              const hour = parseTime(a?.end).hour;
                              setTime(day, "afternoon", "end", hour, minute);
                            }}
                            keyboardType="numeric"
                            maxLength={2}
                          />
                        </View>
                        {(aErr || overlapErr) && (
                          <Text style={[styles.timeInputErrorText, { marginLeft: 8 }]}>
                            {aErr ? "Fin > Début" : "Chevauchement"}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          );
        })}

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
