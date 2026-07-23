import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { AppColors } from "../../utils";
import ChevronLeft from "../../../assets/icons/chevron-left";
import PostForm from "../post-form";
import { useStorePosts } from "../../hooks/useStorePosts";
import { useTranslation } from "../../utils/useTranslation";

/**
 * PostFormModal - Standalone modal for creating/editing posts
 * @param {Object} props
 * @param {boolean} props.visible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {string} props.storeId - Store ID
 * @param {string} props.storeName - Store name for header
 * @param {Function} [props.onPostCreated] - Optional callback after post created
 * @param {Object} [props.editingPost] - Post to edit (null for create mode)
 * @param {Function} [props.onPostUpdated] - Optional callback after post updated
 */
const PostFormModal = ({
  visible,
  onClose,
  storeId,
  storeName,
  onPostCreated,
  editingPost = null,
  onPostUpdated,
}) => {
  const { t } = useTranslation();
  const { createPost, updatePost } = useStorePosts(storeId);
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = !!editingPost;

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      if (isEditMode) {
        await updatePost(editingPost.id, formData);
        Alert.alert(t("success"), t("post_updated_success"));
        onPostUpdated?.();
      } else {
        await createPost(formData);
        Alert.alert(t("success"), t("post_created_success"));
        onPostCreated?.();
      }
      onClose();
    } catch (error) {
      console.error("Post submit error:", error);
      Alert.alert(
        t("error"),
        isEditMode ? t("post_update_failed") : t("post_create_failed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <ChevronLeft width={30} height={30} color={AppColors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEditMode ? t("edit_post") : t("create_post")}
          </Text>
          <View style={{ width: 30 }} />
        </View>

        {storeName && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {storeName}
          </Text>
        )}

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <PostForm
            initialData={editingPost}
            onSubmit={handleSubmit}
            onCancel={onClose}
            loading={submitting}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
  },
});

export default PostFormModal;
