import React, { useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ScrollView,
  Image,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapboxGL from "@rnmapbox/maps";
import { AppColors } from "../../utils";
import { width, height } from "../../utils/dimension";
import OpeningHoursPicker from "../opening-hours-picker";
import { useStoreForm } from "./useStoreForm";
import MapPickerModal from "./MapPickerModal";
import ImageEditor from "../image-editor";

MapboxGL.setAccessToken(
  "sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ",
);

/**
 * Reusable Store Form Component
 *
 * @param {Object} props
 * @param {Function} props.t - Translation function
 * @param {Function} props.onSubmit - Called with store data on successful submission
 * @param {string} props.submitButtonText - Custom text for submit button
 * @param {boolean} props.showHeader - Whether to show the back button and title
 * @param {Function} props.onBack - Called when back button is pressed
 * @param {string} props.mode - 'standalone' | 'wizard' - Controls behavior
 * @param {boolean} props.disabled - Disable all inputs
 * @param {boolean} props.showMerchantFields - Show merchant-specific fields (email, phone, etc.)
 */
export const StoreForm = ({
  t,
  onSubmit,
  submitButtonText,
  showHeader = false,
  onBack,
  mode = "standalone",
  disabled = false,
  showMerchantFields = true,
}) => {
  const form = useStoreForm({
    t,
    onSuccess: mode === "standalone" ? onSubmit : undefined,
    mode,
    showMerchantFields,
  });

  const {
    name,
    setName,
    streetNumber,
    setStreetNumber,
    street,
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
    currentImageIndex,
    setCurrentImageIndex,
    categories,
    selectedCategories,
    modalVisible,
    setModalVisible,
    handleSelectCategory,
    handleRemoveCategory,
    getCategoryName,
    suggestions,
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
    citySuggestions,
    loadingCitySuggestions,
    fetchCitySuggestions,
    handleCitySelect,
    clearCitySuggestions,
    validationErrors,
    hasAttemptedSubmit,
    isSubmitting,
    handlePickImage,
    handleRemoveImage,
    handleSubmit,
    handleWizardSubmit,
    imageToEdit,
    handleImageEdited,
    handleCancelEdit,
  } = form;

  // Handle hardware back button
  useEffect(() => {
    const onHardwareBack = () => {
      if (suggestions.length > 0) {
        clearSuggestions();
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

  // Clean up suggestions on unmount
  useEffect(() => {
    return () => clearSuggestions();
  }, []);

  const handleBackPress = () => {
    if (suggestions.length > 0) {
      clearSuggestions();
      return;
    }
    if (onBack) {
      onBack();
    }
  };

  const handleFormSubmit = async () => {
    if (mode === "wizard") {
      const formData = await handleWizardSubmit();
      if (formData && onSubmit) {
        onSubmit(formData);
      }
    } else {
      await handleSubmit();
    }
  };

  const getInputStyle = (fieldName) => {
    const hasError = hasAttemptedSubmit && validationErrors[fieldName];
    return [
      styles.input,
      hasError && styles.inputError,
      disabled && styles.inputDisabled,
    ];
  };

  const data = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const isLoading = isSubmitting || disabled;

  return (
    <View style={{ flex: 1 }}>
      {showHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} disabled={disabled}>
            <Ionicons name="arrow-back" size={30} color={AppColors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("add_store") || "Add a store"}
          </Text>
        </View>
      )}

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
            editable={!disabled}
          />

          {/* City - with autocomplete (same order as user flow) */}
          <Text style={styles.label}>{t("city")}</Text>
          <View
            style={{ position: "relative", zIndex: 1100, overflow: "visible" }}
          >
            <TextInput
              style={getInputStyle("city")}
              placeholder={t("city")}
              value={city}
              onChangeText={manualEntryMode ? setCity : fetchCitySuggestions}
              editable={!disabled}
            />
            {!manualEntryMode && citySuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={citySuggestions}
                  keyExtractor={(item, index) => `city-${item.id}-${index}`}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  style={{ maxHeight: 200 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => handleCitySelect(item)}
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

          <Text style={styles.label}>{t("postal_code")}</Text>
          <TextInput
            style={getInputStyle("postalCode")}
            placeholder={t("postal_code")}
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="numeric"
            editable={!disabled}
          />

          <Text style={styles.label}>{t("street_number")}</Text>
          <TextInput
            style={[styles.input, disabled && styles.inputDisabled]}
            placeholder={t("street_number")}
            value={streetNumber}
            onChangeText={setStreetNumber}
            keyboardType="numeric"
            editable={!disabled}
          />

          <Text style={styles.label}>{t("street")}</Text>
          <View
            style={{ position: "relative", zIndex: 1000, overflow: "visible" }}
          >
            <TextInput
              style={getInputStyle("street")}
              placeholder={t("street")}
              value={street}
              onChangeText={
                manualEntryMode ? form.setStreet : fetchAddressSuggestions
              }
              editable={!disabled}
            />
            {!manualEntryMode && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  style={{ maxHeight: 200 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => handleAddressSelect(item)}
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

          {/* Search error message */}
          {searchError && !manualEntryMode && (
            <Text style={styles.errorText}>{searchError}</Text>
          )}

          {/* Manual entry toggle and map picker */}
          <View style={styles.addressOptionsRow}>
            {!manualEntryMode ? (
              <TouchableOpacity
                onPress={() => setManualEntryMode(true)}
                style={styles.manualEntryLink}
                disabled={disabled}
              >
                <Text style={styles.manualEntryLinkText}>
                  {t("enter_address_manually") ||
                    "Can't find your address? Enter manually"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setManualEntryMode(false)}
                style={styles.manualEntryLink}
                disabled={disabled}
              >
                <Text style={styles.manualEntryLinkText}>
                  {t("back_to_search") || "Back to search"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowMapPicker(true)}
              style={styles.mapPickerLink}
              disabled={disabled}
            >
              <Ionicons name="map" size={16} color={AppColors.primary} />
              <Text style={styles.mapPickerLinkText}>
                {t("pick_on_map") || "Pick on map"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleUseCurrentLocation}
              disabled={disabled}
            >
              <Ionicons name="location" size={20} color={AppColors.primary} />
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
            editable={!disabled}
          />

          {showMerchantFields && (
            <>
              <Text style={styles.label}>{t("manager_first_name")}</Text>
              <TextInput
                style={getInputStyle("managerFirstName")}
                placeholder={t("manager_first_name")}
                value={managerFirstName}
                onChangeText={setManagerFirstName}
                editable={!disabled}
              />

              <Text style={styles.label}>{t("manager_last_name")}</Text>
              <TextInput
                style={getInputStyle("managerLastName")}
                placeholder={t("manager_last_name")}
                value={managerLastName}
                onChangeText={setManagerLastName}
                editable={!disabled}
              />

              <Text style={styles.label}>{t("store_email")}</Text>
              <TextInput
                style={getInputStyle("storeEmail")}
                placeholder={t("store_email")}
                value={storeEmail}
                onChangeText={setStoreEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!disabled}
              />

              <Text style={styles.label}>{t("phone")}</Text>
              <TextInput
                style={getInputStyle("phone")}
                placeholder={t("phone")}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!disabled}
              />

              <Text style={styles.label}>
                {t("website")}{" "}
                <Text style={styles.optionalText}>({t("optional")})</Text>
              </Text>
              <TextInput
                style={[styles.input, disabled && styles.inputDisabled]}
                placeholder={t("website")}
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
                editable={!disabled}
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
              disabled && styles.categoryButtonDisabled,
            ]}
            onPress={() => setModalVisible(true)}
            disabled={disabled}
          >
            <Text style={styles.categoryButtonText}>
              {selectedCategories.length > 0
                ? `${selectedCategories.length} ${t("categories_selected") || "category(ies) selected"}`
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
                  disabled={disabled}
                >
                  <Ionicons name="close" size={20} color={AppColors.black} />
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
                        disabled={disabled}
                      >
                        <Ionicons name="close-circle" size={30} color="red" />
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
              style={[styles.addImageButton, disabled && styles.buttonDisabled]}
              onPress={handlePickImage}
              disabled={disabled}
            >
              <Ionicons name="camera" size={24} color={AppColors.primary} />
              <Text style={styles.addImageButtonText}>{t("add_image")}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.addButton, isLoading && styles.addButtonDisabled]}
            onPress={handleFormSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={{ marginRight: 8 }}
              />
            ) : (
              <Ionicons
                name="add-circle"
                size={20}
                color="#fff"
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={styles.addButtonText}>
              {isLoading
                ? t("adding_store") || "Adding..."
                : submitButtonText || t("add_store")}
            </Text>
          </TouchableOpacity>

          {/* Map Picker Modal */}
          <MapPickerModal
            visible={showMapPicker}
            onClose={() => setShowMapPicker(false)}
            onConfirm={handleMapPickerConfirm}
            initialLocation={selectedLocation || userProximity}
            t={t}
          />

          {/* Categories Modal */}
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
                      // Deselect all - handled in hook
                      categories.forEach((cat) => {
                        if (selectedCategories.includes(cat.id)) {
                          handleRemoveCategory(cat.id);
                        }
                      });
                    } else {
                      // Select all
                      categories.forEach((cat) => {
                        if (!selectedCategories.includes(cat.id)) {
                          handleSelectCategory({ value: cat.id });
                        }
                      });
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
                    {t("select_all") || "Select all"}
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
                            color: selectedCategories.includes(item.value)
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
                    {t("close") || "Close"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>

      {/* Image Editor - Full screen overlay (not Modal, gestures don't work in Modal) */}
      {imageToEdit && (
        <View style={StyleSheet.absoluteFill}>
          <ImageEditor
            imageUri={imageToEdit}
            onDone={handleImageEdited}
            onCancel={handleCancelEdit}
            outputSize={800}
            t={t}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
  },
  container: {
    flex: 1,
    padding: width(4),
    backgroundColor: AppColors.white_100,
  },
  scrollContainer: {
    paddingBottom: 20,
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
  inputDisabled: {
    backgroundColor: "#e0e0e0",
    color: "#999",
  },
  errorText: {
    color: AppColors.red,
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
  },
  addressOptionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  manualEntryLink: {
    paddingVertical: 5,
    flex: 1,
  },
  manualEntryLinkText: {
    color: AppColors.primary,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  mapPickerLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  mapPickerLinkText: {
    color: AppColors.primary,
    fontSize: 14,
    marginLeft: 4,
    fontWeight: "500",
  },
  mapPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  mapPickerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationButton: {
    padding: 10,
    marginLeft: 10,
    backgroundColor: AppColors.primary_faded,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
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
  categoryButtonDisabled: {
    opacity: 0.6,
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
  suggestionsContainer: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    backgroundColor: AppColors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    marginBottom: 4,
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
  mapContainer: {
    height: 200,
    marginBottom: 15,
    borderRadius: 8,
    overflow: "hidden",
  },
  map: {
    flex: 1,
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
  buttonDisabled: {
    opacity: 0.6,
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
  optionalText: {
    fontSize: 14,
    fontWeight: "normal",
    color: AppColors.grey_200,
    fontStyle: "italic",
  },
});

export default StoreForm;
