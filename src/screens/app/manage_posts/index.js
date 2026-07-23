import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { AppColors } from "../../../utils";
import ChevronLeft from "../../../../assets/icons/chevron-left";
import AddCircleIcon from "../../../../assets/icons/add-circle-icon";
import PostFormModal from "../../../components/post-form-modal";
import PostCard from "../../../components/post-card";
import { useStorePosts } from "../../../hooks/useStorePosts";
import { useTranslation } from "../../../utils/useTranslation";

export default function ManagePostsScreen({ route, navigation }) {
  const { storeId, storeName } = route.params;
  const { t } = useTranslation();

  const { posts, loading, deletePost, refreshPosts, hasPosts } =
    useStorePosts(storeId);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const handleOpenCreate = () => {
    setEditingPost(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (post) => {
    setEditingPost(post);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingPost(null);
  };

  const handleDelete = (post) => {
    Alert.alert(t("delete_post"), t("delete_post_confirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(post.id);
            Alert.alert(t("success"), t("post_deleted_success"));
          } catch (error) {
            console.error("Delete error:", error);
            Alert.alert(t("error"), t("post_delete_failed"));
          }
        },
      },
    ]);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{t("no_posts_yet")}</Text>
      <Text style={styles.emptyDescription}>{t("no_posts_description")}</Text>
      <TouchableOpacity
        style={styles.createFirstButton}
        onPress={handleOpenCreate}
      >
        <AddCircleIcon width={24} height={24} color="#fff" />
        <Text style={styles.createFirstButtonText}>
          {t("create_first_post")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft width={30} height={30} color={AppColors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t("manage_posts")}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {storeName}
          </Text>
        </View>
      </View>

      {/* Create Button */}
      {hasPosts && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleOpenCreate}
        >
          <AddCircleIcon width={24} height={24} color="#fff" />
          <Text style={styles.createButtonText}>{t("create_post")}</Text>
        </TouchableOpacity>
      )}

      {/* Posts List */}
      {loading && !hasPosts ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
          <Text style={styles.loadingText}>{t("loading")}</Text>
        </View>
      ) : !hasPosts ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refreshPosts}
              colors={[AppColors.primary]}
            />
          }
        />
      )}

      {/* Create/Edit Modal */}
      <PostFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        storeId={storeId}
        storeName={storeName}
        editingPost={editingPost}
        onPostCreated={handleCloseModal}
        onPostUpdated={handleCloseModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primary,
    margin: 16,
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  createFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  createFirstButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
