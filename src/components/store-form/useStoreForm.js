import { useState, useEffect, useRef } from "react";
import { Alert, Keyboard, Platform } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  query as firestoreQuery,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore, functions } from "../../../firebaseconfig";
import { getCategoriesLocale } from "../../Redux/Reducers/CategoriesReducer";
import {
  setSelectedCategories,
  setCategories,
} from "../../Redux/Actions/CategoriesActions";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { ensureCityExists } from "../../utils/cityManagement";
import { buildStoreAddress } from "../../utils/storeAddress";

// Mapbox token
const MAPBOX_TOKEN =
  "sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ";

// Helper to add timeout to any promise
const withTimeout = (promise, ms, errorMessage) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage || "Operation timed out")),
        ms,
      ),
    ),
  ]);
};

// Helper for delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch with retry and exponential backoff
const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      // Non-ok response, retry if not last attempt
      if (i < maxRetries - 1) {
        await delay(500 * Math.pow(2, i));
        continue;
      }
      // Last attempt failed with non-ok response
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
      // Don't retry if aborted
      if (err.name === "AbortError") throw err;
      if (i < maxRetries - 1) {
        await delay(500 * Math.pow(2, i));
      }
    }
  }
  throw lastError;
};

export const useStoreForm = ({
  t,
  onSuccess,
  mode = "standalone",
  showMerchantFields = false,
}) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.userData);
  const { categories, selectedCategories } = useSelector(
    (state) => state.categories,
  );

  // Store fields
  const [name, setName] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [storeEmail, setStoreEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [managerFirstName, setManagerFirstName] = useState("");
  const [managerLastName, setManagerLastName] = useState("");

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
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userProximity, setUserProximity] = useState(null);

  // Image editor state
  const [imageToEdit, setImageToEdit] = useState(null);

  // Address search robustness
  const abortControllerRef = useRef(null);
  const [searchError, setSearchError] = useState(null);
  const [manualEntryMode, setManualEntryMode] = useState(false);

  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false);

  // City autocomplete state
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [selectedCityCoords, setSelectedCityCoords] = useState(null);
  const [loadingCitySuggestions, setLoadingCitySuggestions] = useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Get user's location for search proximity on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({});
          setUserProximity({
            longitude: location.coords.longitude,
            latitude: location.coords.latitude,
          });
        }
      } catch (error) {
        console.log("Could not get location for proximity:", error);
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
      if (mode === "wizard") {
        dispatch(setSelectedCategories([]));
      }
    };
  }, [mode]);

  const fetchAddressSuggestions = async (text) => {
    setQuery(text);
    setStreet(text);
    setSearchError(null);

    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    // Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoadingSuggestions(true);

    try {
      // Use Mapbox with French language preference for better French results
      // Add proximity biasing if user location is available
      const proximityParam = userProximity
        ? `&proximity=${userProximity.longitude},${userProximity.latitude}`
        : "";
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?` +
        `access_token=${MAPBOX_TOKEN}` +
        `&autocomplete=true` +
        `&limit=10` +
        `&language=fr` +
        `&types=address,poi,place,locality,neighborhood` +
        proximityParam;

      const response = await fetchWithRetry(
        url,
        { signal: abortControllerRef.current.signal },
        3,
      );

      if (!response.ok) {
        throw new Error(`Mapbox error: ${response.status}`);
      }

      const result = await response.json();
      setSuggestions(result.features || []);
      setSearchError(null);
    } catch (error) {
      // Ignore abort errors (user typed new text)
      if (error.name === "AbortError") {
        return;
      }
      console.error("Mapbox search error:", error);
      setSuggestions([]);
      setSearchError(
        t("address_search_error") ||
          "Address search failed. Try entering manually.",
      );
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddressSelect = (item) => {
    if (!item) return;

    setSuggestions([]);

    // Parse Mapbox response
    const context = item.context || [];
    const cityInfo = context.find((c) => c.id.includes("place"));
    const postalCodeInfo = context.find((c) => c.id.includes("postcode"));

    const streetNumberFromItem = item.address || "";
    const streetName = item.text || "";

    const cityName = cityInfo ? cityInfo.text : "";
    const postalCodeValue = postalCodeInfo ? postalCodeInfo.text : "";

    setStreet(streetName);
    setStreetNumber(streetNumberFromItem);
    setCity(cityName);
    setPostalCode(postalCodeValue);
    setQuery(`${streetNumberFromItem} ${streetName}`.trim());

    if (item.center) {
      setSelectedLocation({
        latitude: item.center[1],
        longitude: item.center[0],
      });
      setSelectedCityCoords({
        longitude: item.center[0],
        latitude: item.center[1],
      });
      setShowMap(true);
    }
  };

  // City autocomplete functions
  const fetchCitySuggestions = async (text) => {
    setCity(text);
    // Clear selected coords when user edits city
    setSelectedCityCoords(null);

    // In manual mode, skip autocomplete
    if (manualEntryMode) {
      setCitySuggestions([]);
      return;
    }

    if (text.length < 2) {
      setCitySuggestions([]);
      return;
    }
    setLoadingCitySuggestions(true);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?` +
          `access_token=${MAPBOX_TOKEN}&types=place,locality&country=fr,be,ch,lu,mc&limit=5&language=fr`,
      );
      const data = await response.json();
      setCitySuggestions(data.features || []);
    } catch (error) {
      console.error("City search error:", error);
      setCitySuggestions([]);
    }
    setLoadingCitySuggestions(false);
  };

  const handleCitySelect = (item) => {
    setCitySuggestions([]);
    setCity(item.text);

    // Extract postal code from context if available
    const context = item.context || [];
    const postcodeInfo = context.find((c) => c.id.includes("postcode"));
    if (postcodeInfo) {
      setPostalCode(postcodeInfo.text);
    }

    // Store city coordinates for street search
    if (item.center) {
      setSelectedCityCoords({
        longitude: item.center[0],
        latitude: item.center[1],
      });
    }
  };

  const clearCitySuggestions = () => {
    setCitySuggestions([]);
  };

  const handleUseCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("permission_denied") || "Permission denied",
          t("location_permission_message") ||
            "We need your location to continue.",
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setShowMap(true);

      // Use Mapbox for reverse geocoding
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.coords.longitude},${location.coords.latitude}.json?access_token=${MAPBOX_TOKEN}`,
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const address = data.features[0];
        handleAddressSelect(address);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(
        t("error") || "Error",
        t("location_error") || "Unable to get your current location",
      );
    }
  };

  // Handle map picker confirmation
  const handleMapPickerConfirm = (mapboxFeature) => {
    setShowMapPicker(false);
    handleAddressSelect(mapboxFeature);
  };

  const handleSelectCategory = (item) => {
    const newSelectedCategories = selectedCategories.includes(item.value)
      ? selectedCategories.filter((cat) => cat !== item.value)
      : [...selectedCategories, item.value];
    dispatch(setSelectedCategories(newSelectedCategories));
  };

  const handleRemoveCategory = (categoryID) => {
    dispatch(
      setSelectedCategories(
        selectedCategories.filter((cat) => cat !== categoryID),
      ),
    );
  };

  const getCategoryName = (id) => {
    const category = categories.find((cat) => cat.id === id);
    return category ? category.name : null;
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false, // Disable native editing, use our ImageEditor
        quality: 1, // Keep full quality, ImageEditor will compress
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        // Show image editor instead of adding directly
        setImageToEdit(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Image picker error:", e);
      Alert.alert(
        t("error") || "Error",
        t("image_picker_error") ||
          "Unable to open image picker. Please try again.",
      );
    }
  };

  // Callback when image editing is complete
  const handleImageEdited = (editedUri) => {
    setSelectedImages((prev) => [...prev, { uri: editedUri }]);
    setImageToEdit(null);
  };

  // Cancel image editing
  const handleCancelEdit = () => {
    setImageToEdit(null);
  };

  const handleRemoveImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImageToCloudflare = async (uri) => {
    const cloudflareAccountId = "e593403f5f942f93365e9cd0be4065a1";
    const apiToken = "mPV6icwf2TUu5e3KWXCRT1L8bo7_0hmg9zqGyi4K";

    const fileName = `photo_${Date.now()}.jpg`;
    const imageUri =
      Platform.OS === "android" && !uri.startsWith("file://")
        ? `file://${uri}`
        : uri;

    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      name: fileName,
      type: "image/jpeg",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000);

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/images/v1`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
          body: formData,
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!data.success) {
        console.error("Cloudflare error:", data.errors);
        throw new Error("Cloudflare upload failed");
      }

      return data.result.variants[0];
    } catch (uploadError) {
      clearTimeout(timeoutId);
      if (uploadError.name === "AbortError") {
        throw new Error("IMAGE_UPLOAD_TIMEOUT");
      }
      throw uploadError;
    }
  };

  // Basic email shape: something@something.tld
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // Website accepted with or without protocol: "shopisan.com" or "https://shopisan.com/page"
  const WEBSITE_REGEX = /^(https?:\/\/)?([\w-]+\.)+[a-zA-Z]{2,}([/?#]\S*)?$/;

  // Returns an error code ("required" | "invalid_email" | "invalid_website")
  // or false when the field is valid.
  const validateField = (fieldName, value) => {
    const requiredFields = [
      "name",
      "street",
      "city",
      "postalCode",
      "description",
    ];

    // Add merchant-specific required fields
    if (showMerchantFields) {
      requiredFields.push(
        "managerFirstName",
        "managerLastName",
        "storeEmail",
        "phone",
        "website",
      );
    }

    const trimmed = value ? value.trim() : "";

    if (requiredFields.includes(fieldName) && trimmed === "") {
      return "required";
    }
    if (fieldName === "storeEmail" && trimmed !== "" && !EMAIL_REGEX.test(trimmed)) {
      return "invalid_email";
    }
    if (fieldName === "website" && trimmed !== "" && !WEBSITE_REGEX.test(trimmed)) {
      return "invalid_website";
    }
    return false;
  };

  const validateAllFields = () => {
    const errors = {};
    const requiredFields = [
      { key: "name", value: name },
      { key: "street", value: street },
      { key: "city", value: city },
      { key: "postalCode", value: postalCode },
      { key: "description", value: description },
    ];

    // Add merchant-specific required fields
    if (showMerchantFields) {
      requiredFields.push(
        { key: "managerFirstName", value: managerFirstName },
        { key: "managerLastName", value: managerLastName },
        { key: "storeEmail", value: storeEmail },
        { key: "phone", value: phone },
        { key: "website", value: website },
      );
    }

    requiredFields.forEach((field) => {
      const fieldError = validateField(field.key, field.value);
      if (fieldError) {
        errors[field.key] = fieldError;
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
  const buildStoreData = async (ownerId, latitude, longitude, images) => {
    return {
      name,
      owner_id: ownerId,
      address: buildStoreAddress({
        street,
        streetNumber,
        city,
        postalCode,
        latitude,
        longitude,
      }),
      latitude,
      longitude,
      cityName: city,
      description: { fr: description },
      category: selectedCategories,
      storeStatus: 0,
      website: website || "",
      openingHours: openingHours,
      images: images || [],
      imageUrl: images?.[0] || "",
      // Stores are live on creation. is_validated is legacy: it is written only
      // so app builds released before this change, which still filter their
      // store list on it, show new stores too. Drop it once those builds age
      // out (same deprecation window as merchant/owner in firestore.rules).
      is_validated: true,
      // New stores start pending admin review. This is the server-owned
      // moderation field from firestore.rules ('pending' | 'approved');
      // only admins can change it.
      status: "pending",
      created: serverTimestamp(),
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
      selectedImages,
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
      Alert.alert(t("error"), t("required_fields_error"));
      return;
    }

    if (suggestions.length > 0) {
      clearSuggestions();
    }

    setIsSubmitting(true);
    let images = [];

    try {
      // Upload all selected images
      if (selectedImages.length > 0) {
        try {
          for (const img of selectedImages) {
            const uploadedUrl = await uploadImageToCloudflare(img.uri);
            images.push(uploadedUrl);
          }
        } catch (uploadError) {
          setIsSubmitting(false);
          if (uploadError.message === "IMAGE_UPLOAD_TIMEOUT") {
            Alert.alert(
              t("error") || "Error",
              t("image_upload_timeout") ||
                "Image upload timed out. Please check your internet connection and try again.",
            );
          } else {
            Alert.alert(
              t("error") || "Error",
              t("image_upload_failed") ||
                "Image upload failed. Please try again or remove the image.",
            );
          }
          return;
        }
      }

      // Geocode address
      const fullAddress = `${streetNumber} ${street}, ${postalCode} ${city}, France`;
      const apiKey = "AIzaSyCsGAmEtEu_aox4wHgf4GOQA2nGUgjdfrA";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000);

      let response;
      try {
        response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`,
          { signal: controller.signal },
        );
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        setIsSubmitting(false);
        if (fetchError.name === "AbortError") {
          Alert.alert(
            t("error") || "Error",
            t("network_timeout") ||
              "Connection timed out. Check your internet connection.",
          );
        } else {
          Alert.alert(
            t("error") || "Error",
            t("network_error") ||
              "Connection error. Check your internet connection.",
          );
        }
        return;
      }

      const data = await response.json();

      if (data.status !== "OK" || data.results.length === 0) {
        setIsSubmitting(false);
        Alert.alert(
          t("error") || "Error",
          t("address_not_found") ||
            "Unable to find address. Please check the information.",
        );
        return;
      }

      const location = data.results[0].geometry.location;
      const latitude = Number(location.lat);
      const longitude = Number(location.lng);

      // Fall back to the session uid: firestore.rules requires
      // owner_id == request.auth.uid, so a null owner is never writable.
      const ownerId = user ? (await getOwnerId(user.id)) || user.id : null;

      // Get next store ID
      const storesRef = collection(firestore, "stores");
      const maxIdQuery = firestoreQuery(
        storesRef,
        orderBy("id", "desc"),
        limit(1),
      );
      const maxIdSnapshot = await withTimeout(
        getDocs(maxIdQuery),
        20000,
        "FIRESTORE_TIMEOUT",
      );

      let maxId = 0;
      if (!maxIdSnapshot.empty) {
        const topStore = maxIdSnapshot.docs[0].data();
        maxId = topStore.id || 0;
      }

      const newStoreId = maxId + 1;
      const storeData = await buildStoreData(
        ownerId,
        latitude,
        longitude,
        images,
      );
      storeData.id = newStoreId;

      // Add store to Firestore
      await withTimeout(
        addDoc(storesRef, storeData),
        20000,
        "FIRESTORE_TIMEOUT",
      );

      // Send notification emails (fire-and-forget)
      const emailToUse = storeEmail || user?.email;
      if (emailToUse) {
        const sendStoreCreationEmail = httpsCallable(
          functions,
          "sendStoreCreationEmail",
        );
        sendStoreCreationEmail({
          storeName: name,
          storeEmail: emailToUse,
          city: city,
          categories: selectedCategories,
          language: t("locale") === "fr" ? "fr" : "en",
        }).catch((emailError) => {
          console.error("Error sending store creation emails:", emailError);
        });
      }

      // Update city in background
      ensureCityExists(city, postalCode, latitude, longitude, "FR").catch(
        (cityError) => {
          console.error("Error ensuring city exists:", cityError);
        },
      );

      // Clear selected categories
      dispatch(setSelectedCategories([]));

      setIsSubmitting(false);

      if (onSuccess) {
        onSuccess(storeData);
      }
    } catch (error) {
      console.error("Error adding store:", error);
      setIsSubmitting(false);

      if (error.message === "FIRESTORE_TIMEOUT") {
        Alert.alert(
          t("error") || "Error",
          t("network_timeout") ||
            "Connection timed out. Check your internet connection and try again.",
        );
      } else {
        Alert.alert(
          t("error") || "Error",
          t("store_add_error") ||
            "Unable to add store. Check your internet connection and try again.",
        );
      }
    }
  };

  // Wizard-mode submit: validate and return data (no Firestore operations)
  const handleWizardSubmit = async () => {
    setHasAttemptedSubmit(true);

    if (!validateAllFields()) {
      Alert.alert(
        t("error"),
        t("required_fields_error") || "Please fill in all required fields",
      );
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
    selectedImages,
    setSelectedImages,
    currentImageIndex,
    setCurrentImageIndex,

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
    searchError,
    manualEntryMode,
    setManualEntryMode,
    showMapPicker,
    setShowMapPicker,
    handleMapPickerConfirm,
    userProximity,

    // City autocomplete
    citySuggestions,
    loadingCitySuggestions,
    fetchCitySuggestions,
    handleCitySelect,
    clearCitySuggestions,
    selectedCityCoords,

    // Validation
    validationErrors,
    hasAttemptedSubmit,

    // UI state
    isSubmitting,

    // Actions
    handlePickImage,
    handleRemoveImage,
    handleSubmit,
    handleWizardSubmit,
    getFormData,
    buildStoreData,
    uploadImageToCloudflare,
    getOwnerId,

    // Image editor
    imageToEdit,
    setImageToEdit,
    handleImageEdited,
    handleCancelEdit,

    // User info
    user,
  };
};

export default useStoreForm;
