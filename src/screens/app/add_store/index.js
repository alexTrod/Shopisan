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
  Platform,
  ActivityIndicator,
} from "react-native";
import ImageEditor from "../../../components/image-editor";
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
import { firestore, functions } from "../../../../firebaseconfig";
import { useSelector, useDispatch } from "react-redux";
import { AppColors } from "../../../utils";
import { width, height } from "../../../utils/dimension";
import { getCategoriesLocale } from "../../../Redux/Reducers/CategoriesReducer";
import {
  setSelectedCategories,
  setCategories,
} from "../../../Redux/Actions/CategoriesActions";
import * as ImagePicker from "expo-image-picker";
import ChevronLeft from "../../../../assets/icons/chevron-left";
import LocationIcon from "../../../../assets/icons/location-icon";
import CloseIcon from "../../../../assets/icons/close-icon";
import CloseCircleIcon from "../../../../assets/icons/close-circle-icon";
import CameraIcon from "../../../../assets/icons/camera-icon";
import AddCircleIcon from "../../../../assets/icons/add-circle-icon";
import MapboxGL from "@rnmapbox/maps";
import { useTranslation } from "../../../utils/useTranslation";
import * as Location from "expo-location";
import Toast from "react-native-toast-message";
import { ensureCityExists } from "../../../utils/cityManagement";
import OpeningHoursPicker from "../../../components/opening-hours-picker";
import MapPickerModal from "../../../components/store-form/MapPickerModal";
import { Ionicons } from "@expo/vector-icons";

MapboxGL.setAccessToken(
  "sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ",
);

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

export default function AddStoreScreen({ navigation }) {
  const { t } = useTranslation();
  const user = useSelector((state) => state.user.userData);

  // Auth check - only signed-up users can add stores
  useEffect(() => {
    if (!user) {
      Alert.alert(
        t("login_required") || "Login Required",
        t("login_required_add_store_message") ||
          "Please sign up or log in to add a store.",
        [
          { text: t("cancel") || "Cancel", onPress: () => navigation.goBack() },
          {
            text: t("sign_up") || "Sign Up",
            onPress: () => navigation.navigate("Signup"),
          },
        ],
      );
    }
  }, [user, navigation, t]);

  const [name, setName] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [description, setDescription] = useState("");
  const { categories, selectedCategories } = useSelector(
    (state) => state.categories,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const dispatch = useDispatch();
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageToEdit, setImageToEdit] = useState(null);
  const [storeEmail, setStoreEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [managerFirstName, setManagerFirstName] = useState("");
  const [managerLastName, setManagerLastName] = useState("");

  // Validation states
  const [validationErrors, setValidationErrors] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [userProximity, setUserProximity] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Handle map picker confirmation
  const handleMapPickerConfirm = (mapboxFeature) => {
    setShowMapPicker(false);
    handleAddressSelect(mapboxFeature);
  };

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

  const fetchAddressSuggestions = async (text) => {
    setQuery(text);
    setStreet(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);

    const mapboxToken =
      "sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ";

    try {
      // Use Mapbox with French language preference for better French results
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?` +
          `access_token=${mapboxToken}` +
          `&autocomplete=true` +
          `&limit=10` +
          `&language=fr` +
          `&types=address,poi,place,locality,neighborhood`,
      );
      const result = await response.json();
      setSuggestions(result.features || []);
    } catch (error) {
      console.error("Mapbox search error:", error);
      setSuggestions([]);
    }
    setLoadingSuggestions(false);
  };

  const handleAddressSelect = (item) => {
    if (!item) return;

    setSuggestions([]);

    // Parse Mapbox response
    const context = item.context || [];
    const cityInfo = context.find((c) => c.id.includes("place"));
    const postalCodeInfo = context.find((c) => c.id.includes("postcode"));

    const streetNumber = item.address || "";
    const streetName = item.text || "";

    const city = cityInfo ? cityInfo.text : "";
    const postalCode = postalCodeInfo ? postalCodeInfo.text : "";

    setStreet(streetName);
    setStreetNumber(streetNumber);
    setCity(city);
    setPostalCode(postalCode);
    setQuery(`${streetNumber} ${streetName}`.trim());

    if (item.center) {
      setSelectedLocation({
        latitude: item.center[1],
        longitude: item.center[0],
      });
      setShowMap(true);
    }
  };

  const handleUseCurrentLocation = async () => {
    const mapboxToken =
      "sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ";

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission refusée",
          "Nous avons besoin de votre localisation pour continuer.",
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
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.coords.longitude},${location.coords.latitude}.json?access_token=${mapboxToken}`,
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const address = data.features[0];
        handleAddressSelect(address);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Erreur", "Impossible d'obtenir votre position actuelle");
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

  const data = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const getCategoryName = (id) => {
    const category = categories.find((cat) => cat.id === id);
    return category ? category.name : null;
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

  const uploadImageToCloudflare = async (uri) => {
    const cloudflareAccountId = "e593403f5f942f93365e9cd0be4065a1";
    const apiToken = "mPV6icwf2TUu5e3KWXCRT1L8bo7_0hmg9zqGyi4K";

    const fileName = `photo_${Date.now()}.jpg`;

    // On Android, ensure the URI is properly formatted
    const imageUri =
      Platform.OS === "android" && !uri.startsWith("file://")
        ? `file://${uri}`
        : uri;

    console.log("[AddStore] Uploading image from URI:", imageUri);

    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      name: fileName,
      type: "image/jpeg",
    });

    // Add timeout for image upload (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("[AddStore] Image upload timeout after 30s");
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
      console.log(
        "[AddStore] Cloudflare response:",
        data.success ? "success" : "failed",
      );

      if (!data.success) {
        console.error("Erreur Cloudflare:", data.errors);
        throw new Error("Échec de l'upload vers Cloudflare");
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

  const validateField = (fieldName, value) => {
    const requiredFields = [
      "name",
      "street",
      "city",
      "postalCode",
      "description",
    ];
    const isRequired = requiredFields.includes(fieldName);

    if (isRequired && (!value || value.trim() === "")) {
      return true; // Has error
    }
    return false; // No error
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

    requiredFields.forEach((field) => {
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
    return [styles.input, hasError && styles.inputError];
  };

  const handleAddStore = async () => {
    setHasAttemptedSubmit(true);

    if (!validateAllFields()) {
      Alert.alert(t("error"), t("required_fields_error"));
      return;
    }

    if (
      !name ||
      !street ||
      !city ||
      !postalCode ||
      !description ||
      selectedCategories.length === 0
    ) {
      Alert.alert(
        "Erreur",
        "Les champs obligatoires sont : nom, adresse, ville, code postal, description et au moins une catégorie.",
      );
      return;
    }

    if (suggestions.length > 0) {
      setSuggestions([]);
      Keyboard.dismiss();
    }

    setIsAddingStore(true);
    let images = [];

    try {
      // Upload all selected images
      if (selectedImages.length > 0) {
        try {
          console.log("[AddStore] Starting image uploads...");
          for (const img of selectedImages) {
            const uploadedUrl = await uploadImageToCloudflare(img.uri);
            images.push(uploadedUrl);
          }
          console.log("[AddStore] Image uploads successful:", images);
        } catch (uploadError) {
          console.error("[AddStore] Image upload failed:", uploadError);
          setIsAddingStore(false);

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

      const fullAddress = `${streetNumber} ${street}, ${postalCode} ${city}, France`;
      console.log("[AddStore] Full address:", fullAddress);

      const apiKey = "AIzaSyCsGAmEtEu_aox4wHgf4GOQA2nGUgjdfrA";

      // Add timeout for geocoding API call (15 seconds)
      console.log("[AddStore] Starting geocoding...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("[AddStore] Geocoding timeout after 15s");
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
        setIsAddingStore(false);
        if (fetchError.name === "AbortError") {
          Alert.alert(
            t("error") || "Erreur",
            t("network_timeout") ||
              "La connexion a pris trop de temps. Vérifiez votre connexion internet.",
          );
        } else {
          Alert.alert(
            t("error") || "Erreur",
            t("network_error") ||
              "Erreur de connexion. Vérifiez votre connexion internet.",
          );
        }
        return;
      }

      const data = await response.json();

      if (data.status !== "OK" || data.results.length === 0) {
        setIsAddingStore(false);
        Alert.alert(
          "Erreur",
          "Impossible de trouver l'adresse. Vérifiez les informations.",
        );
        return;
      }

      const location = data.results[0].geometry.location;
      const latitude = Number(location.lat);
      const longitude = Number(location.lng);
      console.log("[AddStore] Geocoding successful:", latitude, longitude);

      console.log("[AddStore] Getting owner ID...");
      let ownerId = null;
      if (user) {
        try {
          ownerId = await withTimeout(
            getOwnerId(user.id),
            15000,
            "OWNER_ID_TIMEOUT",
          );
        } catch (ownerError) {
          console.warn(
            "[AddStore] Could not fetch owner ID, continuing without it:",
            ownerError.message,
          );
          // Continue without owner ID - store can still be created
        }
      }
      console.log("[AddStore] Owner ID:", ownerId);

      const storesRef = collection(firestore, "stores");

      // Only fetch the store with highest ID instead of all stores (20s timeout)
      console.log("[AddStore] Fetching max store ID...");
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
      console.log("[AddStore] Max ID found:", maxId);

      const newStoreId = maxId + 1;
      console.log("[AddStore] New store ID:", newStoreId);

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
        images: images,
        imageUrl: images[0] || "",
        is_validated: false,
        created: serverTimestamp(),
        ...(user?.userType === "merchant" && {
          email: storeEmail || "",
          phone: phone || "",
          managerFirstName: managerFirstName || "",
          managerLastName: managerLastName || "",
        }),
      };

      // Add store to Firestore (20s timeout)
      console.log("[AddStore] Adding store to Firestore...");
      await withTimeout(
        addDoc(storesRef, storeData),
        20000,
        "FIRESTORE_TIMEOUT",
      );
      console.log("[AddStore] Store added successfully!");

      // Fire-and-forget: send store creation notification emails
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
          username: user?.username || user?.name || name, // Pass user's name for greeting
        })
          .then(() => {
            console.log("Store creation emails sent successfully");
          })
          .catch((emailError) => {
            console.error("Error sending store creation emails:", emailError);
          });
      }

      // Fire-and-forget: update city in background (don't block UI)
      ensureCityExists(city, postalCode, latitude, longitude, "FR")
        .then((cityResult) => {
          if (cityResult.success) {
            console.log(cityResult.message);
          } else {
            console.warn("City creation/update had issues:", cityResult.error);
          }
        })
        .catch((cityError) => {
          console.error("Error ensuring city exists:", cityError);
        });

      DeviceEventEmitter.emit("stores:refresh");
      dispatch(setSelectedCategories([]));

      Toast.show({
        text1: t("store_added_title"),
        text2: t("store_added_description"),
        type: "success",
        visibilityTime: 6000,
      });

      setIsAddingStore(false);
      navigation.goBack();
    } catch (error) {
      console.error("Erreur lors de l'ajout du magasin :", error);
      setIsAddingStore(false);

      // Check for timeout error
      if (error.message === "FIRESTORE_TIMEOUT") {
        Alert.alert(
          t("error") || "Erreur",
          t("network_timeout") ||
            "La connexion a pris trop de temps. Vérifiez votre connexion internet et réessayez.",
        );
      } else {
        Alert.alert(
          t("error") || "Erreur",
          t("store_add_error") ||
            "Impossible d'ajouter le magasin. Vérifiez votre connexion internet et réessayez.",
        );
      }
    }
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
      console.error("[AddStore] Image picker error:", e);
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
      const parts = timeStr.split(":");
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
    let error = "";
    if (value && !/^\d{1,2}$/.test(value)) {
      error = "notNumber";
    }
    const otherField = field === "start" ? "end" : "start";
    const otherValue = openingHours[day][period]?.[otherField];
    if (
      value &&
      otherValue &&
      /^\d{1,2}$/.test(value) &&
      /^\d{1,2}$/.test(otherValue)
    ) {
      const v1 = field === "start" ? value : otherValue;
      const v2 = field === "end" ? value : otherValue;
      if (parseInt(v1) >= parseInt(v2)) {
        error = "order";
      }
    }
    setHoursErrors((prev) => ({
      ...prev,
      [`${day}_${period}_${field}`]: error,
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

    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack,
    );
    return () => sub.remove();
  }, [suggestions]);

  useEffect(() => {
    return () => setSuggestions([]);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 10 }}>
        <TouchableOpacity onPress={handleBackPress}>
          <ChevronLeft width={30} height={30} color={AppColors.primary} />
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
          <Text style={styles.label}>{t("store_name")}</Text>
          <TextInput
            style={getInputStyle("name")}
            placeholder={t("store_name")}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>{t("street_number")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("street_number")}
            value={streetNumber}
            onChangeText={setStreetNumber}
            keyboardType="numeric"
          />

          <Text style={styles.label}>{t("street")}</Text>
          <View style={styles.streetInputRow}>
            <View style={{ position: "relative", zIndex: 1000, flex: 1 }}>
              <TextInput
                style={getInputStyle("street")}
                placeholder={t("street")}
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
                        key={`${item.id}-${index}`}
                        style={styles.suggestionItem}
                        onPress={() => handleAddressSelect(item)}
                      >
                        <Text style={styles.suggestionText}>
                          {item.place_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.mapPickerButton}
              onPress={() => setShowMapPicker(true)}
            >
              <Ionicons
                name="map-outline"
                size={22}
                color={AppColors.primary}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t("city")}</Text>
          <TextInput
            style={getInputStyle("city")}
            placeholder={t("city")}
            value={city}
            onChangeText={setCity}
          />

          <Text style={styles.label}>{t("postal_code")}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[getInputStyle("postalCode"), { flex: 1 }]}
              placeholder={t("postal_code")}
              value={postalCode}
              onChangeText={setPostalCode}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleUseCurrentLocation}
            >
              <LocationIcon width={20} height={20} color={AppColors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t("description")}</Text>
          <TextInput
            style={[getInputStyle("description"), styles.textArea]}
            placeholder={t("description")}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          {user?.userType === "merchant" && (
            <>
              <Text style={styles.label}>
                {t("store_email")}{" "}
                <Text style={styles.optionalText}>({t("optional")})</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t("store_email")}
                value={storeEmail}
                onChangeText={setStoreEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>
                {t("website")}{" "}
                <Text style={styles.optionalText}>({t("optional")})</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t("website")}
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
              />

              <Text style={styles.label}>
                {t("phone")}{" "}
                <Text style={styles.optionalText}>({t("optional")})</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t("phone")}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>
                {t("manager_first_name")}{" "}
                <Text style={styles.optionalText}>({t("optional")})</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t("manager_first_name")}
                value={managerFirstName}
                onChangeText={setManagerFirstName}
              />

              <Text style={styles.label}>
                {t("manager_last_name")}{" "}
                <Text style={styles.optionalText}>({t("optional")})</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t("manager_last_name")}
                value={managerLastName}
                onChangeText={setManagerLastName}
              />
            </>
          )}

          <Text style={styles.label}>{t("categories")}</Text>
          <TouchableOpacity
            style={[
              styles.categoryButton,
              hasAttemptedSubmit &&
                validationErrors.categories &&
                styles.categoryButtonError,
            ]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.categoryButtonText}>
              {selectedCategories.length > 0
                ? `${selectedCategories.length} catégorie(s) sélectionnée(s)`
                : t("select_categories")}
            </Text>
          </TouchableOpacity>

          <ScrollView
            horizontal={true}
            style={styles.selectedCategoriesContainer}
          >
            {selectedCategories.map((categoryID) => (
              <View key={categoryID} style={styles.selectedCategoryItem}>
                <Text style={styles.selectedCategoryText}>
                  {getCategoryName(categoryID)}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveCategory(categoryID)}
                >
                  <CloseIcon width={18} height={18} color="#6B21A8" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {showMap && selectedLocation && (
            <View style={styles.mapContainer}>
              <MapboxGL.MapView style={styles.map}>
                <MapboxGL.Camera
                  centerCoordinate={[
                    selectedLocation.longitude,
                    selectedLocation.latitude,
                  ]}
                  zoomLevel={14}
                />
                <MapboxGL.PointAnnotation
                  id="selected-location"
                  coordinate={[
                    selectedLocation.longitude,
                    selectedLocation.latitude,
                  ]}
                />
              </MapboxGL.MapView>
            </View>
          )}

          <OpeningHoursPicker
            value={openingHours}
            onChange={setOpeningHours}
            locale={t("locale") === "en" ? "en" : "fr"}
            showPresets={true}
            t={t}
          />

          {/* Image Gallery */}
          <View style={styles.imageGalleryContainer}>
            {selectedImages.length > 0 && (
              <>
                <FlatList
                  data={selectedImages}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(
                      e.nativeEvent.contentOffset.x / (width(80) + 10),
                    );
                    setCurrentImageIndex(index);
                  }}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={({ item, index }) => (
                    <View style={styles.imageSlide}>
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.selectedImage}
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(index)}
                      >
                        <CloseCircleIcon width={30} height={30} color="red" />
                      </TouchableOpacity>
                    </View>
                  )}
                />
                {selectedImages.length > 1 && (
                  <View style={styles.paginationDots}>
                    {selectedImages.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.dot,
                          currentImageIndex === index && styles.activeDot,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={handlePickImage}
            >
              <CameraIcon width={24} height={24} color={AppColors.primary} />
              <Text style={styles.addImageButtonText}>{t("add_image")}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              isAddingStore && styles.addButtonDisabled,
            ]}
            onPress={handleAddStore}
            disabled={isAddingStore}
          >
            {isAddingStore ? (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={{ marginRight: 8 }}
              />
            ) : (
              <AddCircleIcon
                width={20}
                height={20}
                color="#fff"
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={styles.addButtonText}>
              {isAddingStore
                ? t("adding_store") || "Adding..."
                : t("add_store")}
            </Text>
          </TouchableOpacity>

          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedCategories.length === categories.length) {
                      dispatch(setSelectedCategories([]));
                    } else {
                      dispatch(
                        setSelectedCategories(
                          categories.map((category) => category.id),
                        ),
                      );
                    }
                  }}
                  style={styles.categoryItem}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color:
                          selectedCategories.length === categories.length
                            ? AppColors.primary
                            : AppColors.black,
                      },
                    ]}
                  >
                    Tout sélectionner
                  </Text>
                </TouchableOpacity>
                <FlatList
                  data={data}
                  keyExtractor={(item) => item.value.toString()}
                  renderItem={({ item }) => {
                    const isSelected = selectedCategories.includes(item.value);
                    return (
                      <TouchableOpacity
                        onPress={() => handleSelectCategory(item)}
                        style={[
                          styles.categoryItem,
                          isSelected && styles.categoryItemSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            isSelected && styles.categoryTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Image Editor Modal */}
          <Modal
            visible={!!imageToEdit}
            animationType="fade"
            transparent={true}
          >
            {imageToEdit && (
              <ImageEditor
                imageUri={imageToEdit}
                onDone={handleImageEdited}
                onCancel={handleCancelEdit}
                outputSize={800}
                t={t}
              />
            )}
          </Modal>

          {/* Map Picker Modal */}
          <MapPickerModal
            visible={showMapPicker}
            onClose={() => setShowMapPicker(false)}
            onConfirm={handleMapPickerConfirm}
            initialLocation={selectedLocation || userProximity}
            t={t}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: width(4),
    backgroundColor: AppColors.white_100,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
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
    textAlignVertical: "top",
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
    fontSize: 16,
  },
  selectedCategoriesContainer: {
    flexDirection: "row",
    marginTop: 10,
  },
  selectedCategoryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E8FF",
    borderWidth: 1.5,
    borderColor: "#6B21A8",
    borderRadius: 25,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    marginRight: 6,
  },
  selectedCategoryText: {
    marginRight: 5,
    fontSize: 14,
    color: "#6B21A8",
    fontWeight: "bold",
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
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    height: "80%",
    backgroundColor: AppColors.white,
    borderRadius: 10,
    padding: 20,
  },
  categoryItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_200,
    flexDirection: "row",
  },
  categoryItemSelected: {
    backgroundColor: "#F3E8FF",
    borderRadius: 8,
    marginHorizontal: -5,
    paddingHorizontal: 20,
  },
  categoryText: {
    fontSize: 14,
  },
  categoryTextSelected: {
    color: "#6B21A8",
    fontWeight: "bold",
  },
  cancelButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: AppColors.red,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButtonText: {
    color: AppColors.white,
    fontWeight: "bold",
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
    height: width(80),
    borderRadius: 10,
  },
  removeImageButton: {
    position: "absolute",
    top: 5,
    right: 5,
  },
  imageGalleryContainer: {
    marginVertical: 10,
  },
  imageSlide: {
    width: width(80),
    marginHorizontal: 5,
    position: "relative",
    alignItems: "center",
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: AppColors.primary,
  },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: AppColors.primary,
    borderRadius: 8,
    borderStyle: "dashed",
    marginTop: 10,
  },
  addImageButtonText: {
    color: AppColors.primary,
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: AppColors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    shadowColor: "#000",
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
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  presetsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 15,
  },
  presetButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.primary_faded,
    borderWidth: 1,
    borderColor: "transparent",
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
    fontWeight: "bold",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    fontStyle: "italic",
    textAlign: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  dayGroupTitle: {
    flex: 1,
  },
  dayGroupText: {
    fontSize: 12,
    fontWeight: "bold",
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
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 2,
    minHeight: 48,
  },
  block: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: 0,
    marginRight: 4,
  },

  blockActions: {
    marginTop: 6,
  },

  timeInputs: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },

  timeInput: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    borderRadius: 6,
    textAlign: "center",
    fontSize: 14,
    marginHorizontal: 4,
    backgroundColor: AppColors.white_100,
    paddingVertical: 2,
  },
  hoursContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeInputs: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeInput: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    borderRadius: 6,
    textAlign: "center",
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
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  hoursHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  hoursHeaderBlock: {
    flex: 1,
    alignItems: "center",
  },
  hoursHeaderText: {
    fontSize: 13,
    fontWeight: "bold",
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
    backgroundColor: "#fff0f0",
  },
  timeInputErrorText: {
    color: AppColors.red,
    fontSize: 11,
    marginTop: -4,
    marginBottom: 4,
    marginLeft: 8,
  },
  dayActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: 48,
    marginLeft: 4,
  },
  actionButton: {
    padding: 4,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  addressInputWrapper: {
    flex: 1,
  },
  locationButton: {
    marginLeft: 8,
  },
  timeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  streetInputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  mapPickerButton: {
    padding: 10,
    marginLeft: 10,
    marginTop: 0,
    backgroundColor: AppColors.primary_faded,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    width: 48,
  },
});
