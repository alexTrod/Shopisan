import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { AppColors } from "../../utils";
import { width, height } from "../../utils/dimension";
import EditIcon from "../../../assets/icons/edit-icon";
import TrashIcon from "../../../assets/icons/trash-icon";
import { useTranslation } from "../../utils/useTranslation";
import { formatPostPrice } from "../../utils/price";

/**
 * PostCard - Display a post in the management list
 * @param {Object} props
 * @param {Object} props.post - Post data
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onDelete - Delete handler
 */
const PostCard = ({ post, onEdit, onDelete }) => {
  const { t, locale } = useTranslation();

  // Get images (handle both new flat format and legacy)
  const images = post.images || post.media?.[0]?.images || [];
  const thumbnailUri = images[0];

  // Get description based on locale
  const description =
    locale === "fr"
      ? post.description?.fr || post.description?.en
      : post.description?.en || post.description?.fr;

  const truncatedDescription = description
    ? description.length > 100
      ? description.substring(0, 100) + "..."
      : description
    : t("no_post_description");

  const imageCount = images.length;

  return (
    <View style={styles.card}>
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} />
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Text style={styles.noImageText}>No image</Text>
          </View>
        )}
        {imageCount > 1 && (
          <View style={styles.imageCountBadge}>
            <Text style={styles.imageCountText}>{imageCount}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.description} numberOfLines={2}>
          {truncatedDescription}
        </Text>

        {formatPostPrice(post.price, post.currency) && (
          <Text style={styles.price}>
            {formatPostPrice(post.price, post.currency)}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(post)}
        >
          <EditIcon width={20} height={20} color={AppColors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDelete(post)}
        >
          <TrashIcon width={20} height={20} color="#dc3545" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnailContainer: {
    position: "relative",
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  noImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    color: "#999",
    fontSize: 12,
  },
  imageCountBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  description: {
    fontSize: height(1.7),
    color: "#4A4A4A",
    lineHeight: height(2.2),
  },
  price: {
    fontSize: height(1.6),
    fontWeight: "700",
    color: AppColors.primary,
    marginTop: 4,
  },
  actions: {
    justifyContent: "center",
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
});

export default PostCard;
