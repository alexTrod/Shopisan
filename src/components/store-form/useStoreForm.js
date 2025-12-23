import { useState, useEffect } from "react";
import { Alert, Keyboard, Platform } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { collection, addDoc, getDocs, doc, getDoc, query as firestoreQuery, orderBy, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore, functions } from "../../../firebaseconfig";
import { getCategoriesLocale } from "../../Redux/Reducers/CategoriesReducer";
import { setSelectedCategories, setCategories } from "../../Redux/Actions/CategoriesActions";
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { ensureCityExists } from "../../utils/cityManagement";

// Mapbox token
const MAPBOX_TOKEN = 'sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ';

// Helper to add timeout to any promise
const withTimeout = (promise, ms, errorMessage) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage || 'Operation timed out')), ms)
    )
  ]);
};

export const useStoreForm = ({ t, onSuccess, mode = 'standalone' }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.userData);
  const { categories, selectedCategories } = useSelector(state => state.categories);

  // Store fields
  const [name, setName] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [storeEmail, setStoreEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [managerFirstName, setManagerFirstName] = useState('');
  const [managerLastName, setManagerLastName] = useState('');

  // Opening hours
  const [openingHours, setOpeningHours] = useState({
    monday: { morning: null, afternoon: null },
    tuesday: { morning: null, afternoon: null },
    wednesday: { morning: null, afternoon: null },
    thursday: { morning: null, afternoon: null },
    friday: { morning: null, afternoon: null },
    saturday: { morning: null, afternoon: null },
    sunday: { morning: null, afternoon: null },
  });

  // UI state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userProximity, setUserProximity] = useState(null);

  // Validation state
  const [validationErrors, setValidationErrors] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Get user's location for search proximity on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserProximity({
            longitude: location.coords.longitude,
            latitude: location.coords.latitude
          });
        }
      } catch (error) {
        console.log('Could not get location for proximity:', error);
      }
    })();
  }, []);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      const cats = await getCategoriesLocale();
      dispatch(setCategories(cats));
    };
    loadCategories();
  }, []);

  // Clear selected categories when unmounting in wizard mode
  useEffect(() => {
    return () => {
      if (mode === 'wizard') {
        dispatch(setSelectedCategories([]));
      }
    };
  }, [mode]);

  const fetchAddressSuggestions = async (text) => {
    setQuery(text);
    setStreet(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);

    const proximity = userProximity
      ? `${userProximity.longitude},${userProximity.latitude}`
      : '2.3522,48.8566'; // Paris coordinates

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?` +
        `access_token=${MAPBOX_TOKEN}` +
        `&autocomplete=true` +
        `&limit=10` +
        `&country=fr,gr,gb,es,be,it` +
        `&proximity=${proximity}` +
        `&types=address,poi,place,locality,neighborhood`
      );
      const result = await response.json();
      setSuggestions(result.features || []);
    } catch (error) {
      console.error('Mapbox search error:', error);
    }
    setLoadingSuggestions(false);
  };

  const handleAddressSelect = (item) => {
    if (!item) return;

    setSuggestions([]);

    const context = item.context || [];
    const cityInfo = context.find(c => c.id.includes('place'));
    const postalCodeInfo = context.find(c => c.id.includes('postcode'));

    const streetNumberFromItem = item.address || '';
    const streetName = item.text || '';

    const cityName = cityInfo ? cityInfo.text : '';
    const postalCodeValue = postalCodeInfo ? postalCodeInfo.text : '';

    setStreet(streetName);
    setStreetNumber(streetNumberFromItem);
    setCity(cityName);
    setPostalCode(postalCodeValue);
    setQuery(`${streetNumberFromItem} ${streetName}`);

    if (item.center) {
      setSelectedLocation({
        latitude: item.center[1],
        longitude: item.center[0]
      });
      setShowMap(true);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permission_denied') || 'Permission denied',
          t('location_permission_message') || 'We need your location to continue.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      setShowMap(true);

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.coords.longitude},${location.coords.latitude}.json?access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const address = data.features[0];
        handleAddressSelect(address);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        t('error') || 'Error',
        t('location_error') || 'Unable to get your current location'
      );
    }
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

  const getCategoryName = (id) => {
    const category = categories.find(cat => cat.id === id);
    return category ? category.name : null;
  };

  const handlePickImage = async () => {
    try {
      if (Platform.OS === 'android') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            t('permission_required') || 'Permission Required',
            t('gallery_permission_message') || 'Please allow access to your photo library to add an image.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        ...(Platform.OS === 'android' && { exif: false }),
      });

      if (!result?.canceled) {
        if (result?.assets?.length > 0) {
          setSelectedImage(result.assets[0]);
        } else if (result?.uri) {
          setSelectedImage({ uri: result.uri });
        }
      }
    } catch (e) {
      console.error('Image picker error:', e);
      Alert.alert(
        t('error') || 'Error',
        t('image_picker_error') || 'Unable to open image picker. Please try again.'
      );
    }
  };

  const uploadImageToCloudflare = async (uri) => {
    const cloudflareAccountId = 'e593403f5f942f93365e9cd0be4065a1';
    const apiToken = 'mPV6icwf2TUu5e3KWXCRT1L8bo7_0hmg9zqGyi4K';

    const fileName = `photo_${Date.now()}.jpg`;
    const imageUri = Platform.OS === 'android' && !uri.startsWith('file://')
      ? `file://${uri}`
      : uri;

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: fileName,
      type: 'image/jpeg'
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000);

    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/images/v1`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!data.success) {
        console.error("Cloudflare error:", data.errors);
        throw new Error('Cloudflare upload failed');
      }

      return data.result.variants[0];
    } catch (uploadError) {
      clearTimeout(timeoutId);
      if (uploadError.name === 'AbortError') {
        throw new Error('IMAGE_UPLOAD_TIMEOUT');
      }
      throw uploadError;
    }
  };

  const validateField = (fieldName, value) => {
    const requiredFields = ['name', 'street', 'city', 'postalCode', 'description'];
    const isRequired = requiredFields.includes(fieldName);

    if (isRequired && (!value || value.trim() === '')) {
      return true;
    }
    return false;
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

  const getOwnerId = async (userId) => {
    try {
      const userRef = doc(firestore, "users", userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return userSnap.data().id;
      } else {
        console.error("User not found in Firestore.");
        return null;
      }
    } catch (error) {
      console.error("Error getting owner_id:", error);
      return null;
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    Keyboard.dismiss();
  };

  // Build store data object from current form state
  const buildStoreData = async (ownerId, latitude, longitude, imageUrl) => {
    return {
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
      website: website || "",
      openingHours: openingHours,
      imageUrl: imageUrl || "",
      is_validated: false,
      email: storeEmail || "",
      phone: phone || "",
      managerFirstName: managerFirstName || "",
      managerLastName: managerLastName || "",
    };
  };

  // Get raw form data for wizard mode (without Firestore operations)
  const getFormData = () => {
    return {
      name,
      streetNumber,
      street,
      city,
      postalCode,
      description,
      selectedCategories,
      openingHours,
      selectedImage,
      storeEmail,
      website,
      phone,
      managerFirstName,
      managerLastName,
      selectedLocation,
    };
  };

  // Submit store to Firestore (standalone mode)
  const handleSubmit = async () => {
    setHasAttemptedSubmit(true);

    if (!validateAllFields()) {
      Alert.alert(t('error'), t('required_fields_error'));
      return;
    }

    if (suggestions.length > 0) {
      clearSuggestions();
    }

    setIsSubmitting(true);
    let imageUrl = null;

    try {
      // Upload image if selected
      if (selectedImage) {
        try {
          imageUrl = await uploadImageToCloudflare(selectedImage.uri);
        } catch (uploadError) {
          setIsSubmitting(false);
          if (uploadError.message === 'IMAGE_UPLOAD_TIMEOUT') {
            Alert.alert(
              t('error') || 'Error',
              t('image_upload_timeout') || 'Image upload timed out. Please check your internet connection and try again.'
            );
          } else {
            Alert.alert(
              t('error') || 'Error',
              t('image_upload_failed') || 'Image upload failed. Please try again or remove the image.'
            );
          }
          return;
        }
      }

      // Geocode address
      const fullAddress = `${streetNumber} ${street}, ${postalCode} ${city}, France`;
      const apiKey = 'AIzaSyCsGAmEtEu_aox4wHgf4GOQA2nGUgjdfrA';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000);

      let response;
      try {
        response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        setIsSubmitting(false);
        if (fetchError.name === 'AbortError') {
          Alert.alert(t('error') || "Error", t('network_timeout') || "Connection timed out. Check your internet connection.");
        } else {
          Alert.alert(t('error') || "Error", t('network_error') || "Connection error. Check your internet connection.");
        }
        return;
      }

      const data = await response.json();

      if (data.status !== "OK" || data.results.length === 0) {
        setIsSubmitting(false);
        Alert.alert(t('error') || "Error", t('address_not_found') || "Unable to find address. Please check the information.");
        return;
      }

      const location = data.results[0].geometry.location;
      const latitude = Number(location.lat);
      const longitude = Number(location.lng);

      const ownerId = user ? await getOwnerId(user.id) || null : null;

      // Get next store ID
      const storesRef = collection(firestore, "stores");
      const maxIdQuery = firestoreQuery(storesRef, orderBy('id', 'desc'), limit(1));
      const maxIdSnapshot = await withTimeout(getDocs(maxIdQuery), 20000, 'FIRESTORE_TIMEOUT');

      let maxId = 0;
      if (!maxIdSnapshot.empty) {
        const topStore = maxIdSnapshot.docs[0].data();
        maxId = topStore.id || 0;
      }

      const newStoreId = maxId + 1;
      const storeData = await buildStoreData(ownerId, latitude, longitude, imageUrl);
      storeData.id = newStoreId;

      // Add store to Firestore
      await withTimeout(addDoc(storesRef, storeData), 20000, 'FIRESTORE_TIMEOUT');

      // Send notification emails (fire-and-forget)
      const emailToUse = storeEmail || user?.email;
      if (emailToUse) {
        const sendStoreCreationEmail = httpsCallable(functions, 'sendStoreCreationEmail');
        sendStoreCreationEmail({
          storeName: name,
          storeEmail: emailToUse,
          city: city,
          categories: selectedCategories,
          language: t('locale') === 'fr' ? 'fr' : 'en'
        }).catch(emailError => {
          console.error('Error sending store creation emails:', emailError);
        });
      }

      // Update city in background
      ensureCityExists(city, postalCode, latitude, longitude, "FR").catch(cityError => {
        console.error('Error ensuring city exists:', cityError);
      });

      // Clear selected categories
      dispatch(setSelectedCategories([]));

      setIsSubmitting(false);

      if (onSuccess) {
        onSuccess(storeData);
      }
    } catch (error) {
      console.error("Error adding store:", error);
      setIsSubmitting(false);

      if (error.message === 'FIRESTORE_TIMEOUT') {
        Alert.alert(
          t('error') || "Error",
          t('network_timeout') || "Connection timed out. Check your internet connection and try again."
        );
      } else {
        Alert.alert(
          t('error') || "Error",
          t('store_add_error') || "Unable to add store. Check your internet connection and try again."
        );
      }
    }
  };

  // Wizard-mode submit: validate and return data (no Firestore operations)
  const handleWizardSubmit = async () => {
    setHasAttemptedSubmit(true);

    if (!validateAllFields()) {
      Alert.alert(t('error'), t('required_fields_error') || 'Please fill in all required fields');
      return null;
    }

    if (suggestions.length > 0) {
      clearSuggestions();
    }

    return getFormData();
  };

  return {
    // Form values
    name,
    setName,
    streetNumber,
    setStreetNumber,
    street,
    setStreet,
    city,
    setCity,
    postalCode,
    setPostalCode,
    description,
    setDescription,
    storeEmail,
    setStoreEmail,
    website,
    setWebsite,
    phone,
    setPhone,
    managerFirstName,
    setManagerFirstName,
    managerLastName,
    setManagerLastName,
    openingHours,
    setOpeningHours,
    selectedImage,
    setSelectedImage,

    // Categories
    categories,
    selectedCategories,
    modalVisible,
    setModalVisible,
    handleSelectCategory,
    handleRemoveCategory,
    getCategoryName,

    // Address/Location
    query,
    suggestions,
    loadingSuggestions,
    showMap,
    selectedLocation,
    fetchAddressSuggestions,
    handleAddressSelect,
    handleUseCurrentLocation,
    clearSuggestions,

    // Validation
    validationErrors,
    hasAttemptedSubmit,

    // UI state
    isSubmitting,

    // Actions
    handlePickImage,
    handleSubmit,
    handleWizardSubmit,
    getFormData,
    buildStoreData,
    uploadImageToCloudflare,
    getOwnerId,

    // User info
    user,
  };
};

export default useStoreForm;
