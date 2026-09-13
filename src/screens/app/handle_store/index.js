import React, { useState, useEffect, useRef } from "react";
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
  serverTimestamp,
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
import { width } from "../../../utils/dimension";
import { getCategoriesLocale } from "../../../Redux/Reducers/CategoriesReducer";
import { setCategories } from "../../../Redux/Actions/CategoriesActions";
import locationManager from "../../../services/LocationManager";
import { ensureCityExists } from "../../../utils/cityManagement";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "../../../utils/useTranslation";
import OpeningHoursPicker from "../../../components/opening-hours-picker";
import ImageEditor from "../../../components/image-editor";
import MapPickerModal from "../../../components/store-form/MapPickerModal";
import { Ionicons } from "@expo/vector-icons";
import { ScreenNames } from "../../../Routes/routes";
import AddPostIcon from "../../../../assets/icons/add-post-icon";

// Maps a validation key to the i18n label rendered above that input, so the
// "missing fields" alert can name fields the way the form does.
const FIELD_LABEL_KEYS = {
  name: "store_name",
  street: "store_address",
  city: "city",
  postalCode: "postal_code",
  description: "description",
  storeEmail: "store_email",
  website: "website",
  phone: "phone",
  managerFirstName: "manager_first_name",
  managerLastName: "manager_last_name",
  categories: "categories",
};

// Render order of the fields above: the first errored one is scrolled into view.
const FIELD_ORDER = Object.keys(FIELD_LABEL_KEYS);

const GEOCODE_TIMEOUT_MS = 15000;

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
  const [showMapPicker, setShowMapPicker] = useState(false);
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
  const [validationErrors, setValidationErrors] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();
  const scrollViewRef = useRef(null);
  // y offset of each field label inside the ScrollView content, captured
  // via onLayout so validation can scroll to the first error.
  const fieldPositions = useRef({});

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
          if (store.deleted_at) {
            Alert.alert(t("error"), t("store_not_found"));
            navigation.goBack();
            return;
          }

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
    // `t` deliberately left out: it only feeds alert copy, and re-running the
    // fetch whenever translations re-render is exactly what froze this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, dispatch, navigation, user?.id]);

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
      // Optional, but validated for shape when filled in.
      { key: "website", value: website },
    ];

    if (isOwnerType(user)) {
      fieldsToCheck.push(
        { key: "managerFirstName", value: managerFirstName },
        { key: "managerLastName", value: managerLastName },
        { key: "storeEmail", value: storeEmail },
        { key: "phone", value: phone },
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
    return errors;
  };

  const registerFieldLayout = (fieldKey) => (event) => {
    fieldPositions.current[fieldKey] = event.nativeEvent.layout.y;
  };

  const scrollToField = (fieldKey) => {
    const y = fieldPositions.current[fieldKey];
    if (typeof y !== "number") return;
    scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
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

  // Resolves the typed address to coordinates. Returns null (after showing
  // the appropriate alert) when it cannot, so the caller aborts the save.
  const geocodeAddress = async (countryId) => {
    const fullAddress =
      `${streetNumber} ${street}, ${postalCode} ${city}, ${countryId}`.trim();
    const apiKey = "AIzaSyCsGAmEtEu_aox4wHgf4GOQA2nGUgjdfrA";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&region=${countryId.toLowerCase()}&key=${apiKey}`,
        { signal: controller.signal },
      );
    } catch (fetchError) {
      Alert.alert(
        t("error"),
        fetchError.name === "AbortError"
          ? t("network_timeout")
          : t("network_error"),
      );
      return null;
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json();
    if (data.status === "OK" && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { latitude: Number(location.lat), longitude: Number(location.lng) };
    }

    // A pin dropped on the map (or a picked suggestion) is a valid location
    // even when Google cannot resolve the reverse-geocoded text.
    if (selectedLocation?.latitude && selectedLocation?.longitude) {
      return {
        latitude: Number(selectedLocation.latitude),
        longitude: Number(selectedLocation.longitude),
      };
    }

    Alert.alert(t("error"), t("address_not_found"));
    return null;
  };

  const handleUpdateStore = async () => {
    setHasAttemptedSubmit(true);

    const errors = validateAllFields();
    const erroredFields = FIELD_ORDER.filter((key) => errors[key]);
    if (erroredFields.length > 0) {
      const missingLabels = erroredFields.map((key) =>
        t(FIELD_LABEL_KEYS[key]),
      );
      Alert.alert(
        t("error"),
        `${t("required_fields_error")}\n\n${missingLabels.join(", ")}`,
      );
      scrollToField(erroredFields[0]);
      return;
    }

    if (suggestions.length > 0) {
      setSuggestions([]);
      Keyboard.dismiss();
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Geocode first: a bad address must fail before any image is
      // uploaded, so nothing is left orphaned on Cloudflare.
      // Preserve the country the store was created with rather than forcing
      // FR on every edit.
      const countryId = readStoreAddress(storeData).countryId || "FR";
      const coords = await geocodeAddress(countryId);
      if (!coords) return;
      const { latitude, longitude } = coords;

      // 2. Upload new images; abort the whole save on the first failure.
      const images = [...existingImageUrls];
      if (selectedImages.length > 0) {
        try {
          for (const img of selectedImages) {
            const uploadedUrl = await uploadImageToCloudflare(img.uri);
            images.push(uploadedUrl);
          }
        } catch (uploadError) {
          Alert.alert(
            t("error"),
            uploadError.message === "IMAGE_UPLOAD_TIMEOUT"
              ? t("image_upload_timeout")
              : t("image_upload_failed"),
          );
          return;
        }
      }

      // Reorder images so main image is first
      if (mainImageIndex > 0 && mainImageIndex < images.length) {
        const mainImage = images[mainImageIndex];
        images.splice(mainImageIndex, 1);
        images.unshift(mainImage);
      }

      // 3. Persist
      const storeRef = doc(firestore, "stores", storeDocumentId);

      const updatedData = {
        id: storeData?.id,
        name,
        // Only echo owner_id when the store has one; writing null would make
        // a legacy store permanently un-editable under firestore.rules.
        ...(storeData?.owner_id && { owner_id: storeData.owner_id }),

        address: buildStoreAddress({
          street,
          streetNumber,
          city,
          postalCode,
          countryId,
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

      // 4. Ensure city exists in the cities collection (non-fatal)
      try {
        const cityResult = await ensureCityExists(
          city,
          postalCode,
          latitude,
          longitude,
          countryId,
        );
        if (!cityResult.success) {
          console.warn("City creation/update had issues:", cityResult.error);
        }
      } catch (cityError) {
        console.error("Error ensuring city exists:", cityError);
        // Continue even if city creation fails - store is already updated
      }

      // 5. Uploaded images are now persisted: a retry must not re-upload them.
      setSelectedImages([]);
      setExistingImageUrls(images);
      setMainImageIndex(0);

      DeviceEventEmitter.emit("stores:refresh");
      Alert.alert(t("success"), t("store_updated_success"));
      navigation.goBack();
    } catch (error) {
      console.error("Error updating store:", error);
      Alert.alert(t("error"), t("unable_to_update_store"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStore = async () => {
    if (suggestions.length > 0) {
      setSuggestions([]);
      Keyboard.dismiss();
    }
    Alert.alert(t("delete_store"), t("delete_store_confirm_soft"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            const storeRef = doc(firestore, "stores", storeDocumentId);
            // Soft delete: the store is hidden everywhere immediately and can
            // be restored from the admin panel for 30 days, after which a
            // scheduled function purges it (see functions/index.js).
            await updateDoc(storeRef, {
              deleted_at: serverTimestamp(),
              deleted_by: user?.id ?? null,
            });
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
    }
  };

  const handleMapPickerConfirm = (mapboxFeature) => {
    setShowMapPicker(false);
    handleAddressSelect(mapboxFeature);
  };

  const handleBackPress = () => {
    if (suggestions.length > 0) {
      setSuggestions([]);
      Keyboard.dismiss();
      return;
    }
    navigation.goBack();
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
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={styles.container}>
          <Text style={styles.label} onLayout={registerFieldLayout("name")}>
            {t("store_name")}
          </Text>
          <TextInput
            style={getInputStyle("name")}
            placeholder={t("store_name")}
            value={name}
            onChangeText={setName}
          />
          {renderFieldError("name")}

          <Text style={styles.label} onLayout={registerFieldLayout("street")}>
            {t("store_address")}
          </Text>
          <View style={styles.addressContainer}>
            <View style={styles.addressInputWrapper}>
              {/* Suggestions float over the fields below instead of pushing
                  them down: an in-flow list swallowed the page scroll. */}
              <View style={styles.suggestionsAnchor}>
                <TextInput
                  style={getInputStyle("street")}
                  value={addressQuery}
                  onChangeText={fetchAddressSuggestions}
                  placeholder={t("store_address")}
                  onBlur={() => setSuggestions([])}
                />
                {suggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <FlatList
                      data={suggestions}
                      keyExtractor={(item, index) => `${item.id}-${index}`}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled={true}
                      style={{ maxHeight: 200 }}
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
                    />
                  </View>
                )}
              </View>
              {renderFieldError("street")}
            </View>

            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleUseCurrentLocation}
            >
              <LocationIcon width={24} height={24} color={AppColors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.mapPickerRow}>
            <TouchableOpacity
              onPress={() => setShowMapPicker(true)}
              style={styles.mapPickerLink}
            >
              <Ionicons name="map" size={16} color={AppColors.primary} />
              <Text style={styles.mapPickerLinkText} numberOfLines={1}>
                {t("pick_on_map")}
              </Text>
            </TouchableOpacity>
            {selectedLocation && (
              <View style={styles.locationSetBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={AppColors.primary}
                />
                <Text style={styles.locationSetText} numberOfLines={1}>
                  {t("location_updated")}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.label}>{t("street_number")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("street_number")}
            value={streetNumber}
            onChangeText={setStreetNumber}
            keyboardType="numeric"
          />

          <Text
            style={styles.label}
            onLayout={registerFieldLayout("city")}
          >
            {t("city")}
          </Text>
          <TextInput
            style={getInputStyle("city")}
            placeholder={t("city")}
            value={city}
            onChangeText={setCity}
          />
          {renderFieldError("city")}

          <Text
            style={styles.label}
            onLayout={registerFieldLayout("postalCode")}
          >
            {t("postal_code")}
          </Text>
          <TextInput
            style={getInputStyle("postalCode")}
            placeholder={t("postal_code")}
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="numeric"
          />
          {renderFieldError("postalCode")}

          <Text
            style={styles.label}
            onLayout={registerFieldLayout("description")}
          >
            {t("description")}
          </Text>
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
              <Text
                style={styles.label}
                onLayout={registerFieldLayout("storeEmail")}
              >
                {t("store_email")}
              </Text>
              <TextInput
                style={getInputStyle("storeEmail")}
                placeholder={t("store_email")}
                value={storeEmail}
                onChangeText={setStoreEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {renderFieldError("storeEmail")}

              <Text
                style={styles.label}
                onLayout={registerFieldLayout("website")}
              >
                {t("website")}
              </Text>
              <TextInput
                style={getInputStyle("website")}
                placeholder={t("website")}
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
              />
              {renderFieldError("website")}

              <Text
                style={styles.label}
                onLayout={registerFieldLayout("phone")}
              >
                {t("phone")}
              </Text>
              <TextInput
                style={getInputStyle("phone")}
                placeholder={t("phone")}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              {renderFieldError("phone")}

              <Text
                style={styles.label}
                onLayout={registerFieldLayout("managerFirstName")}
              >
                {t("manager_first_name")}
              </Text>
              <TextInput
                style={getInputStyle("managerFirstName")}
                placeholder={t("manager_first_name")}
                value={managerFirstName}
                onChangeText={setManagerFirstName}
              />
              {renderFieldError("managerFirstName")}

              <Text
                style={styles.label}
                onLayout={registerFieldLayout("managerLastName")}
              >
                {t("manager_last_name")}
              </Text>
              <TextInput
                style={getInputStyle("managerLastName")}
                placeholder={t("manager_last_name")}
                value={managerLastName}
                onChangeText={setManagerLastName}
              />
              {renderFieldError("managerLastName")}
            </>
          )}

          <Text
            style={styles.label}
            onLayout={registerFieldLayout("categories")}
          >
            {t("categories")}
          </Text>
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
            style={[styles.addButton, isSubmitting && styles.addButtonDisabled]}
            onPress={handleDeleteStore}
            disabled={isSubmitting}
          >
            <Text style={styles.addButtonText}>{t("delete_store")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="update-store-submit-button"
            style={[styles.addButton, isSubmitting && styles.addButtonDisabled]}
            onPress={handleUpdateStore}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.addButtonText}>{t("updating_store")}</Text>
              </View>
            ) : (
              <Text style={styles.addButtonText}>{t("update_store")}</Text>
            )}
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

      <MapPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleMapPickerConfirm}
        initialLocation={
          selectedLocation ||
          (latitude && longitude
            ? { latitude: Number(latitude), longitude: Number(longitude) }
            : null)
        }
        t={t}
      />
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
  selectedImage: {
    width: width(80),
    height: width(80),
    borderRadius: 10,
  },
  removeImageButton: {
    padding: 2,
  },
  setMainButton: {
    padding: 2,
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
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    // Lift the row above the fields that follow so the floating suggestion
    // list draws over them (Android honours zIndex between siblings).
    zIndex: 1000,
    overflow: "visible",
  },
  addressInputWrapper: {
    flex: 1,
    overflow: "visible",
  },
  suggestionsAnchor: {
    position: "relative",
    zIndex: 1000,
    overflow: "visible",
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    // The input carries marginBottom 15; pull the list up to its border.
    marginTop: -11,
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
  mapPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -5,
    marginBottom: 10,
  },
  mapPickerLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    flexShrink: 1,
  },
  mapPickerLinkText: {
    color: AppColors.primary,
    fontSize: 14,
    marginLeft: 4,
    fontWeight: "500",
  },
  locationSetBadge: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  locationSetText: {
    color: AppColors.primary,
    fontSize: 13,
    marginLeft: 4,
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
