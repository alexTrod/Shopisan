import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AppColors } from "../../utils";
import { width, height } from "../../utils/dimension";
import CameraIcon from "../../../assets/icons/camera-icon";
import CloseCircleIcon from "../../../assets/icons/close-circle-icon";
import { useTranslation } from "../../utils/useTranslation";
import ImageEditor from "../image-editor";

/**
 * PostForm - Form for creating/editing posts
 * @param {Object} props
 * @param {Object} [props.initialData] - Initial data for editing
 * @param {Function} props.onSubmit - Called with { imageUris, existingImages, description, price }
 * @param {Function} props.onCancel - Cancel handler
 * @param {boolean} props.loading - Loading state
 */
const PostForm = ({ initialData, onSubmit, onCancel, loading }) => {
  const { t, locale } = useTranslation();

  // Images state
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageToEdit, setImageToEdit] = useState(null);

  // Form fields
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionFr, setDescriptionFr] = useState("");
  const [price, setPrice] = useState("");

  // Initialize from initial data (edit mode)
  useEffect(() => {
    if (initialData) {
      setExistingImages(initialData.images || []);

      // Set descriptions
      if (initialData.description) {
        setDescriptionEn(initialData.description.en || "");
        setDescriptionFr(initialData.description.fr || "");
      }

      // Set price
      if (initialData.price !== null && initialData.price !== undefined) {
        setPrice(String(initialData.price));
      }
    }
  }, [initialData]);

  const isEditMode = !!initialData?.id;
  const allImages = [
    ...existingImages.map((uri) => ({ uri, isExisting: true })),
    ...newImages.map((img) => ({ uri: img.uri, isExisting: false })),
  ];

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
    setNewImages((prev) => [...prev, { uri: editedUri }]);
    setImageToEdit(null);
  };

  // Cancel image editing
  const handleCancelEdit = () => {
    setImageToEdit(null);
  };

  const handleRemoveImage = (index) => {
    const existingCount = existingImages.length;

    if (index < existingCount) {
      // Remove from existing
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      // Remove from new
      const newIndex = index - existingCount;
      setNewImages((prev) => prev.filter((_, i) => i !== newIndex));
    }

    // Adjust current index if needed
    if (currentImageIndex >= allImages.length - 1 && currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    // Validate at least one image
    if (allImages.length === 0) {
      Alert.alert(t("error"), t("post_image_required"));
      return;
    }

    const description = {};
    if (descriptionEn.trim()) description.en = descriptionEn.trim();
    if (descriptionFr.trim()) description.fr = descriptionFr.trim();

    onSubmit({
      imageUris: newImages.map((img) => img.uri),
      existingImages,
      description,
      price: price.trim() || null,
    });
  };

  return (
    <View style={styles.container}>
      {/* Image Gallery */}
      <View style={styles.imageSection}>
        {allImages.length > 0 && (
          <>
            <FlatList
              data={allImages}
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
            {allImages.length > 1 && (
              <View style={styles.paginationDots}>
                {allImages.map((_, index) => (
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

      {/* Description - show based on locale or both */}
      <View style={styles.formSection}>
        {(locale === "en" || !locale) && (
          <>
            <Text style={styles.label}>{t("description")} (EN)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t("post_description_placeholder")}
              value={descriptionEn}
              onChangeText={setDescriptionEn}
              multiline
              numberOfLines={3}
            />
          </>
        )}

        {locale === "fr" && (
          <>
            <Text style={styles.label}>{t("description")} (FR)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t("post_description_placeholder")}
              value={descriptionFr}
              onChangeText={setDescriptionFr}
              multiline
              numberOfLines={3}
            />
          </>
        )}

        {/* Price (optional) */}
        <Text style={styles.label}>
          {t("price")} ({t("optional")})
        </Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>{t("cancel")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.submitButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditMode ? t("save") : t("create_post")}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Image Editor Modal */}
      <Modal visible={!!imageToEdit} animationType="fade" transparent={true}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageSlide: {
    width: width(80),
    marginHorizontal: 5,
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
    top: 10,
    right: 10,
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
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: "#f8f8f8",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: AppColors.primary,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default PostForm;
