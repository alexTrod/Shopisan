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
  Keyboard,
  DeviceEventEmitter,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { firestore } from "../../../../firebaseconfig";
import { useSelector, useDispatch } from "react-redux";
import { AppColors } from "../../../utils";
import { isOwnerType, ownsStore } from "../../../utils/userTypes";
import {
  buildStoreAddress,
  readStoreAddress,
} from "../../../utils/storeAddress";
import ChevronLeft from "../../../../assets/icons/chevron-left";
import LocationIcon from "../../../../assets/icons/location-icon";
import CloseIcon from "../../../../assets/icons/close-icon";
import CloseCircleIcon from "../../../../assets/icons/close-circle-icon";
import CameraIcon from "../../../../assets/icons/camera-icon";
import StarIcon from "../../../../assets/icons/star-icon";
import { width, height } from "../../../utils/dimension";
import { getCategoriesLocale } from "../../../Redux/Reducers/CategoriesReducer";
import { setCategories } from "../../../Redux/Actions/CategoriesActions";
import * as Location from "expo-location";
import MapboxGL from "@rnmapbox/maps";
import locationManager from "../../../services/LocationManager";
import { ensureCityExists } from "../../../utils/cityManagement";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "../../../utils/useTranslation";
import OpeningHoursPicker from "../../../components/opening-hours-picker";
import ImageEditor from "../../../components/image-editor";
import { ScreenNames } from "../../../Routes/routes";
import AddPostIcon from "../../../../assets/icons/add-post-icon";

export default function HandleStoreScreen({ route, navigation }) {
  const { storeId } = route.params;
  const user = useSelector((state) => state.user.userData);
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [description, setDescription] = useState("");
  const categories = useSelector((state) => state.categories.categories);
  const [storeCategories, setStoreCategories] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [groupedDays, setGroupedDays] = useState([]);
  const [storeEmail, setStoreEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [managerFirstName, setManagerFirstName] = useState("");
  const [managerLastName, setManagerLastName] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [existingImageUrls, setExistingImageUrls] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageToEdit, setImageToEdit] = useState(null);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [expandedDay, setExpandedDay] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const dispatch = useDispatch();

  const timePresets = [
    {
      label: "9h-12h / 14h-19h",
      morning: { start: "9", end: "12" },
      afternoon: { start: "14", end: "19" },
    },
    {
      label: "8h-12h / 13h-18h",
      morning: { start: "8", end: "12" },
      afternoon: { start: "13", end: "18" },
    },
    { label: "10h-19h", morning: { start: "10", end: "19" }, afternoon: null },
    { label: "closed", morning: null, afternoon: null, isTranslationKey: true },
  ];

  const getPresetLabel = (preset) =>
    preset.isTranslationKey ? t(preset.label) : preset.label;

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const getDayLabel = (day) => t(day);

  const [openingHours, setOpeningHours] = useState({
    monday: { morning: null, afternoon: null },
    tuesday: { morning: null, afternoon: null },
    wednesday: { morning: null, afternoon: null },
    thursday: { morning: null, afternoon: null },
    friday: { morning: null, afternoon: null },
    saturday: { morning: null, afternoon: null },
    sunday: { morning: null, afternoon: null },
  });

  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeDocumentId, setStoreDocumentId] = useState(null);

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        const storesRef = collection(firestore, "stores");
        const q = query(storesRef, where("id", "==", storeId));

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const storeSnap = querySnapshot.docs[0];
          const store = storeSnap.data();

          // Reachable by deep link with any storeId, so verify ownership
          // before populating the editor. firestore.rules rejects the write
          // regardless; this avoids showing an editor that cannot save.
          if (!ownsStore(user, store.owner_id)) {
            Alert.alert(
              t("owner_account_required") || "Store owner account required",
              t("not_your_store") || "This store belongs to another account.",
              [
                {
                  text: t("close") || "Close",
                  onPress: () => navigation.goBack(),
                },
              ],
            );
            return;
          }

          setStoreDocumentId(storeSnap.id);

          setStoreData(store);

          const storeAddress = readStoreAddress(store);

          setName(store.name);
          setStreet(storeAddress.street);
          setStreetNumber(storeAddress.streetNumber);
          setAddressQuery(storeAddress.street);
          setCity(store.cityName || "");
          setPostalCode(storeAddress.postalCode);
          setLatitude(storeAddress.latitude?.toString() || "");
          setLongitude(storeAddress.longitude?.toString() || "");
          setDescription(store.description?.fr || "");

          setStoreCategories(
            Array.isArray(store.category) ? store.category : [],
          );

          setStoreEmail(store?.email ?? "");
          setWebsite(store?.website ?? "");
          setPhone(store?.phone ?? "");
          setManagerFirstName(store?.managerFirstName ?? "");
          setManagerLastName(store?.managerLastName ?? "");

          // Load existing images (support both single imageUrl and images array)
          const existingImages = [];
          if (store?.images && Array.isArray(store.images)) {
            existingImages.push(...store.images);
          } else if (store?.imageUrl) {
            existingImages.push(store.imageUrl);
          }
          setExistingImageUrls(existingImages);

          const hours = store?.openingHours ?? {
            monday: { morning: null, afternoon: null },
            tuesday: { morning: null, afternoon: null },
            wednesday: { morning: null, afternoon: null },
            thursday: { morning: null, afternoon: null },
            friday: { morning: null, afternoon: null },
            saturday: { morning: null, afternoon: null },
            sunday: { morning: null, afternoon: null },
          };

          setOpeningHours(hours);
          updateGroupedDays(hours);
        } else {
          Alert.alert(t("error"), t("store_not_found"));
          navigation.goBack();
        }
      } catch (error) {
        console.error("Error loading store:", error);
        Alert.alert(t("error"), t("unable_to_load_store"));
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [storeId, dispatch, navigation, user, t]);

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
    const newCategories = storeCategories.includes(item.value)
      ? storeCategories.filter((cat) => cat !== item.value)
      : [...storeCategories, item.value];
    setStoreCategories(newCategories);
  };

  const handleRemoveCategory = (categoryID) => {
    setStoreCategories(storeCategories.filter((cat) => cat !== categoryID));
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

    // Merchant contact fields are mandatory for store owner accounts
    if (isOwnerType(user)) {
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
      return "required"; // Has error
    }
    if (
      fieldName === "storeEmail" &&
      trimmed !== "" &&
      !EMAIL_REGEX.test(trimmed)
    ) {
      return "invalid_email";
    }
    if (
      fieldName === "website" &&
      trimmed !== "" &&
      !WEBSITE_REGEX.test(trimmed)
    ) {
      return "invalid_website";
    }
    return false; // No error
  };

  const validateAllFields = () => {
    const errors = {};
    const fieldsToCheck = [
      { key: "name", value: name },
      { key: "street", value: street },
      { key: "city", value: city },
      { key: "postalCode", value: postalCode },
      { key: "description", value: description },
    ];

    if (isOwnerType(user)) {
      fieldsToCheck.push(
        { key: "managerFirstName", value: managerFirstName },
        { key: "managerLastName", value: managerLastName },
        { key: "storeEmail", value: storeEmail },
        { key: "phone", value: phone },
        { key: "website", value: website },
      );
    }

    fieldsToCheck.forEach((field) => {
      const fieldError = validateField(field.key, field.value);
      if (fieldError) {
        errors[field.key] = fieldError;
      }
    });

    if (storeCategories.length === 0) {
      errors.categories = true;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getInputStyle = (fieldName, extraStyle) => {
    const hasError = hasAttemptedSubmit && validationErrors[fieldName];
    return [styles.input, extraStyle, hasError && styles.inputError];
  };

  // Per-field validation message shown under the input after a submit attempt
  const renderFieldError = (fieldName) => {
    if (!hasAttemptedSubmit || !validationErrors[fieldName]) {
      return null;
    }
    const errorCode = validationErrors[fieldName];
    let message;
    if (errorCode === "invalid_email") {
      message = t("invalid_email") || "Please enter a valid email address";
    } else if (errorCode === "invalid_website") {
      message = t("invalid_website") || "Please enter a valid website address";
    } else {
      message = t("field_required") || "This field is required";
    }
    return <Text style={styles.errorText}>{message}</Text>;
  };

  const handleUpdateStore = async () => {
    setHasAttemptedSubmit(true);

    if (!validateAllFields()) {
      Alert.alert(t("error"), t("required_fields_error"));
      return;
    }

    if (suggestions.length > 0) {
      setSuggestions([]);
      Keyboard.dismiss();
    }

    let images = [...existingImageUrls];

    try {
      // Upload new images
      for (const img of selectedImages) {
        const uploadedUrl = await uploadImageToCloudflare(img.uri);
        images.push(uploadedUrl);
      }

      // Reorder images so main image is first
      if (mainImageIndex > 0 && mainImageIndex < images.length) {
        const mainImage = images[mainImageIndex];
        images.splice(mainImageIndex, 1);
        images.unshift(mainImage);
      }

      const fullAddress = `${streetNumber} ${street}, ${postalCode} ${city}, France`;

      const apiKey = "AIzaSyCsGAmEtEu_aox4wHgf4GOQA2nGUgjdfrA";
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`,
      );
      const data = await response.json();

      if (data.status !== "OK" || data.results.length === 0) {
        Alert.alert(t("error"), t("address_not_found"));
        return;
      }

      const location = data.results[0].geometry.location;
      const latitude = Number(location.lat);
      const longitude = Number(location.lng);

      const storeRef = doc(firestore, "stores", storeDocumentId);

      const updatedData = {
        id: storeData?.id,
        name,
        owner_id: storeData?.owner_id ?? null,

        address: buildStoreAddress({
          street,
          streetNumber,
          city,
          postalCode,
          // Preserve the country the store was created with rather than
          // forcing FR on every edit.
          countryId: readStoreAddress(storeData).countryId,
          latitude,
          longitude,
        }),

        latitude,
        longitude,

        cityName: city,
        description: { fr: description },
        category: storeCategories,
        storeStatus: storeData?.storeStatus ?? 0,
        website: website || "",
        openingHours,
        images,
        imageUrl: images[0] || "",
        ...(isOwnerType(user) && {
          email: storeEmail || "",
          phone: phone || "",
          managerFirstName: managerFirstName || "",
          managerLastName: managerLastName || "",
        }),
      };

      await updateDoc(storeRef, updatedData);

      // Ensure city exists in the cities collection
      try {
        const cityResult = await ensureCityExists(
          city,
          postalCode,
          latitude,
          longitude,
          "FR",
        );
        if (cityResult.success) {
          console.log(cityResult.message);
        } else {
          console.warn("City creation/update had issues:", cityResult.error);
        }
      } catch (cityError) {
        console.error("Error ensuring city exists:", cityError);
        // Continue even if city creation fails - store is already updated
      }

      DeviceEventEmitter.emit("stores:refresh");
      Alert.alert(t("success"), t("store_updated_success"));
      navigation.goBack();
    } catch (error) {
      console.error("Error updating store:", error);
      Alert.alert(t("error"), t("unable_to_update_store"));
    }
  };

  const handleDeleteStore = async () => {
    if (suggestions.length > 0) {
      setSuggestions([]);
      Keyboard.dismiss();
    }
    Alert.alert(t("delete_store"), t("delete_store_confirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            const storeRef = doc(firestore, "stores", storeDocumentId);
            await deleteDoc(storeRef);
            DeviceEventEmitter.emit("stores:refresh");
            Alert.alert(t("success"), t("store_deleted_success"));
            navigation.goBack();
          } catch (error) {
            console.error("Error deleting store:", error);
            Alert.alert(t("error"), t("unable_to_delete_store"));
          }
        },
      },
    ]);
  };

  const fetchAddressSuggestions = async (text) => {
    setStreet(text);
    setAddressQuery(text);
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

  const applyPresetToAllDays = (preset) => {
    const newOpeningHours = {};
    days.forEach((day) => {
      newOpeningHours[day] = {
        morning: preset.morning ? { ...preset.morning } : null,
        afternoon: preset.afternoon ? { ...preset.afternoon } : null,
      };
    });
    setOpeningHours(newOpeningHours);
    setSelectedPreset(preset.label);
  };

  const handleUseCurrentLocation = async () => {
    const mapboxToken =
      "sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ";

    try {
      // Use LocationManager for GPS location
      const location = await locationManager.getUserLocation({
        useCache: false,
        forceRefresh: true,
      });

      setSelectedLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setShowMap(true);

      // Use Mapbox for reverse geocoding
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.longitude},${location.latitude}.json?access_token=${mapboxToken}`,
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const address = data.features[0];
        handleAddressSelect(address);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(t("error"), t("unable_to_get_location"));
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
      setOpeningHours((prev) => ({
        ...prev,
        [nextDay]: { ...prev[day] },
      }));
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
      console.error("Image picker error", e);
      Alert.alert(t("error"), t("unable_to_open_image_picker"));
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

  const handleRemoveImage = (index, isExisting) => {
    const totalImages = existingImageUrls.length + selectedImages.length;

    if (isExisting) {
      setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
      // Adjust main image index
      if (index < mainImageIndex) {
        setMainImageIndex((prev) => prev - 1);
      } else if (index === mainImageIndex) {
        setMainImageIndex(0);
      }
    } else {
      const actualIndex = existingImageUrls.length + index;
      setSelectedImages((prev) => prev.filter((_, i) => i !== index));
      // Adjust main image index
      if (actualIndex < mainImageIndex) {
        setMainImageIndex((prev) => prev - 1);
      } else if (actualIndex === mainImageIndex) {
        setMainImageIndex(0);
      }
    }
  };

  const handleSetMainImage = (index) => {
    setMainImageIndex(index);
  };

  const getAllImages = () => {
    const existing = existingImageUrls.map((url, i) => ({
      uri: url,
      isExisting: true,
      originalIndex: i,
    }));
    const selected = selectedImages.map((img, i) => ({
      uri: img.uri,
      isExisting: false,
      originalIndex: i,
    }));
    return [...existing, ...selected];
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
    setAddressQuery(`${streetNumber} ${streetName}`.trim());

    if (item.center) {
      setSelectedLocation({
        latitude: item.center[1],
        longitude: item.center[0],
      });
      setShowMap(true);
    }
  };

  const handleBackPress = () => {
    if (suggestions.length > 0) {
      setSuggestions([]);
      Keyboard.dismiss();
      return;
    }
    navigation.goBack();
  };

  const formatHours = (hours) => {
    if (!hours.morning && !hours.afternoon) return t("closed");

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

  const clampHour = (v) => {
    if (v === "" || v == null) return "";
    const n = Math.max(
      0,
      Math.min(23, parseInt(String(v).replace(/[^0-9]/g, ""), 10) || 0),
    );
    return String(n);
  };

  const clampMinute = (v) => {
    if (v === "" || v == null) return "";
    const n = Math.max(
      0,
      Math.min(59, parseInt(String(v).replace(/[^0-9]/g, ""), 10) || 0),
    );
    return String(n);
  };

  const parseTime = (timeStr) => {
    if (!timeStr) return { hour: "", minute: "" };
    const parts = timeStr.split(":");
    return {
      hour: parts[0] || "",
      minute: parts[1] || "00",
    };
  };

  const formatTime = (hour, minute) => {
    if (!hour) return "";
    const min = minute === "00" || !minute ? "" : `:${minute}`;
    return `${hour}${min}`;
  };

  const setDayClosed = (day, closed) => {
    setOpeningHours((prev) => {
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
    setOpeningHours((prev) => {
      const cur = normalizeDay(prev[day] || { morning: null, afternoon: null });
      if (mode === "day") {
        const start = cur.morning?.start ?? "9:00";
        const end = cur.afternoon?.end ?? cur.morning?.end ?? "19:00";
        return {
          ...prev,
          [day]: normalizeDay({ morning: { start, end }, afternoon: null }),
        };
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
    setOpeningHours((prev) => {
      const cur = prev[day] || { morning: null, afternoon: null };
      const p = cur[period]
        ? { ...cur[period], [field]: timeValue }
        : {
            [field]: timeValue,
            ...(field === "start" ? { end: "" } : { start: "" }),
          };
      const next = { ...prev, [day]: normalizeDay({ ...cur, [period]: p }) };
      return next;
    });
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
        <Text style={styles.loadingText}>{t("loading")}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 10 }}>
        <TouchableOpacity onPress={handleBackPress}>
          <ChevronLeft width={30} height={30} color={AppColors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "bold", marginLeft: 10 }}>
          {t("update_store_title")}
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
          {renderFieldError("name")}

          <Text style={styles.label}>{t("store_address")}</Text>
          <View style={styles.addressContainer}>
            <View style={styles.addressInputWrapper}>
              <TextInput
                style={getInputStyle("street")}
                value={addressQuery}
                onChangeText={fetchAddressSuggestions}
                placeholder={t("store_address")}
                onBlur={() => setSuggestions([])}
              />
              {renderFieldError("street")}

              {suggestions.length > 0 && (
                <View
                  style={{
                    height: 200,
                    borderWidth: 1,
                    borderColor: "#ccc",
                    backgroundColor: "#fff",
                  }}
                >
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => handleAddressSelect(item)}
                        style={styles.suggestionItem}
                      >
                        <Text style={styles.suggestionText}>
                          {item.place_name}
                        </Text>
                      </TouchableOpacity>
                    )}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                    scrollEnabled={true}
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleUseCurrentLocation}
            >
              <LocationIcon width={24} height={24} color={AppColors.primary} />
            </TouchableOpacity>
          </View>

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

          <Text style={styles.label}>{t("street_number")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("street_number")}
            value={streetNumber}
            onChangeText={setStreetNumber}
            keyboardType="numeric"
          />

          <Text style={styles.label}>{t("city")}</Text>
          <TextInput
            style={getInputStyle("city")}
            placeholder={t("city")}
            value={city}
            onChangeText={setCity}
          />
          {renderFieldError("city")}

          <Text style={styles.label}>{t("postal_code")}</Text>
          <TextInput
            style={getInputStyle("postalCode")}
            placeholder={t("postal_code")}
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="numeric"
          />
          {renderFieldError("postalCode")}

          <Text style={styles.label}>{t("description")}</Text>
          <TextInput
            style={getInputStyle("description", styles.textArea)}
            placeholder={t("description")}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          {renderFieldError("description")}

          <OpeningHoursPicker
            value={openingHours}
            onChange={setOpeningHours}
            locale={t("locale") === "en" ? "en" : "fr"}
            showPresets={true}
            t={t}
          />

          {isOwnerType(user) && (
            <>
              <Text style={styles.label}>{t("store_email")}</Text>
              <TextInput
                style={getInputStyle("storeEmail")}
                placeholder={t("store_email")}
                value={storeEmail}
                onChangeText={setStoreEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {renderFieldError("storeEmail")}

              <Text style={styles.label}>{t("website")}</Text>
              <TextInput
                style={getInputStyle("website")}
                placeholder={t("website")}
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
              />
              {renderFieldError("website")}

              <Text style={styles.label}>{t("phone")}</Text>
              <TextInput
                style={getInputStyle("phone")}
                placeholder={t("phone")}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              {renderFieldError("phone")}

              <Text style={styles.label}>{t("manager_first_name")}</Text>
              <TextInput
                style={getInputStyle("managerFirstName")}
                placeholder={t("manager_first_name")}
                value={managerFirstName}
                onChangeText={setManagerFirstName}
              />
              {renderFieldError("managerFirstName")}

              <Text style={styles.label}>{t("manager_last_name")}</Text>
              <TextInput
                style={getInputStyle("managerLastName")}
                placeholder={t("manager_last_name")}
                value={managerLastName}
                onChangeText={setManagerLastName}
              />
              {renderFieldError("managerLastName")}
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
              {storeCategories.length > 0
                ? `${storeCategories.length} ${t("categories")}`
                : t("select_categories")}
            </Text>
          </TouchableOpacity>

          <ScrollView
            horizontal={true}
            style={styles.selectedCategoriesContainer}
          >
            {storeCategories.map((categoryID) => (
              <View key={categoryID} style={styles.selectedCategoryItem}>
                <Text style={styles.selectedCategoryText}>
                  {getCategoryName(categoryID)}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveCategory(categoryID)}
                >
                  <CloseIcon width={20} height={20} color={AppColors.black} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Image Gallery */}
          <View style={styles.imageGalleryContainer}>
            {getAllImages().length > 0 ? (
              <>
                <FlatList
                  data={getAllImages()}
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
                      <View style={styles.imageOverlayButtons}>
                        {/* Set as main button */}
                        <TouchableOpacity
                          style={styles.setMainButton}
                          onPress={() => handleSetMainImage(index)}
                        >
                          <StarIcon
                            width={24}
                            height={24}
                            color={
                              index === mainImageIndex ? "#FFD700" : "#888"
                            }
                            filled={index === mainImageIndex}
                          />
                        </TouchableOpacity>
                        {/* Delete button */}
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => {
                            const existingCount = existingImageUrls.length;
                            if (index < existingCount) {
                              handleRemoveImage(index, true);
                            } else {
                              handleRemoveImage(index - existingCount, false);
                            }
                          }}
                        >
                          <CloseCircleIcon width={30} height={30} color="red" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
                {getAllImages().length > 1 && (
                  <View style={styles.paginationDots}>
                    {getAllImages().map((_, index) => (
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
            ) : null}
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={handlePickImage}
            >
              <CameraIcon width={24} height={24} color={AppColors.primary} />
              <Text style={styles.addImageButtonText}>{t("add_image")}</Text>
            </TouchableOpacity>
          </View>

          {/* Manage Posts Button */}
          <TouchableOpacity
            style={[styles.addButton, styles.managePostsButton]}
            onPress={() =>
              navigation.navigate(ScreenNames.MANAGE_POSTS, {
                storeId: storeData?.id,
                storeName: name,
                ownerId: storeData?.owner_id,
              })
            }
          >
            <AddPostIcon width={20} height={20} color="#fff" />
            <Text style={[styles.addButtonText, { marginLeft: 8 }]}>
              {t("manage_posts")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleDeleteStore}
          >
            <Text style={styles.addButtonText}>{t("delete_store")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleUpdateStore}
          >
            <Text style={styles.addButtonText}>{t("update_store")}</Text>
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
                    if (storeCategories.length === categories.length) {
                      setStoreCategories([]);
                    } else {
                      setStoreCategories(
                        categories.map((category) => category.id),
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
                          storeCategories.length === categories.length
                            ? AppColors.primary
                            : AppColors.black,
                      },
                    ]}
                  >
                    {t("select_all")}
                  </Text>
                </TouchableOpacity>
                <FlatList
                  data={data}
                  keyExtractor={(item) => item.value.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleSelectCategory(item)}
                      style={styles.categoryItem}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          {
                            color: storeCategories.includes(item.value)
                              ? AppColors.primary
                              : AppColors.black,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>
                    {t("close_button")}
                  </Text>
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  errorText: {
    color: AppColors.red,
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  categoryButton: {
    backgroundColor: AppColors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  categoryButtonError: {
    borderWidth: 2,
    borderColor: AppColors.red,
  },
  categoryButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  selectedCategoriesContainer: {
    flexDirection: "row",
    marginTop: 10,
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
    height: 40,
  },
  selectedCategoryText: {
    marginRight: 5,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: AppColors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  managePostsButton: {
    flexDirection: "row",
    backgroundColor: "#007BFF",
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
  categoryText: {
    fontSize: 14,
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
    padding: 2,
  },
  imageActionButtons: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  setMainButton: {
    padding: 2,
  },
  setMainButtonActive: {
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  mainImageBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  changeImageButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: AppColors.primary,
    borderRadius: 20,
    padding: 8,
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
  imageOverlayButtons: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: AppColors.grey_300,
  },
});
