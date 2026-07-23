import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  FlatList,
  Modal,
} from "react-native";
import LinkIcon from "../../../assets/icons/link-icon";
import { AppColors } from "../../utils";
import { height, width } from "../../utils/dimension";
import { useTranslation } from "../../utils/useTranslation";

const THUMBNAIL_SIZE = width(28);
const THUMBNAIL_GAP = 8;

const PostsMediaList = ({ media = [], showEmptyState = true }) => {
  const { t, locale } = useTranslation();
  const [allPostsModalVisible, setAllPostsModalVisible] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);

  if (media.length === 0) {
    if (!showEmptyState) return null;
    return (
      <View style={styles.postsSection}>
        <Text style={styles.sectionTitle}>{t("posted_announcements")}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{t("no_posts_yet")}</Text>
        </View>
      </View>
    );
  }

  // Normalize items to handle both old media[] format and new flat format
  const normalizedItems = media.map((item) => {
    // New flat format with images array
    if (item.images && Array.isArray(item.images)) {
      return {
        id: item.id,
        images: item.images,
        description: item.description || {},
        price: item.price,
      };
    }
    // Old format - item itself has description and price (from media[] array)
    return {
      id: item.id,
      images: item.image ? [item.image] : [],
      description: item.description || {},
      price: item.price,
    };
  });

  const displayedPosts = normalizedItems.slice(0, 3);
  const hasMorePosts = normalizedItems.length > 3;

  const handleThumbnailPress = (index) => {
    setSelectedPostIndex(index);
    setAllPostsModalVisible(true);
  };

  const handleSeeAllPress = () => {
    setSelectedPostIndex(0);
    setAllPostsModalVisible(true);
  };

  return (
    <View style={styles.postsSection}>
      <Text style={styles.sectionTitle}>{t("posted_announcements")}</Text>

      {/* Thumbnail Grid */}
      <View style={styles.thumbnailGrid}>
        {displayedPosts.map((item, index) => (
          <TouchableOpacity
            key={item.id || index}
            style={styles.thumbnailWrapper}
            onPress={() => handleThumbnailPress(index)}
            activeOpacity={0.8}
          >
            {item.images.length > 0 ? (
              <Image
                source={{ uri: item.images[0] }}
                style={styles.thumbnail}
              />
            ) : (
              <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
                <Text style={styles.placeholderText}>📷</Text>
              </View>
            )}
            {item.images.length > 1 && (
              <View style={styles.multiImageBadge}>
                <Text style={styles.multiImageText}>{item.images.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* See All Link */}
      {hasMorePosts && (
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={handleSeeAllPress}
        >
          <Text style={styles.seeAllText}>
            {t("see_all_posts")} ({normalizedItems.length}) →
          </Text>
        </TouchableOpacity>
      )}

      {/* All Posts Modal */}
      <Modal
        visible={allPostsModalVisible}
        animationType="slide"
        onRequestClose={() => setAllPostsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t("posted_announcements")} ({normalizedItems.length})
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAllPostsModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            style={styles.modalFlatList}
            data={normalizedItems}
            keyExtractor={(item, index) => item.id || String(index)}
            renderItem={({ item }) => (
              <PostCard item={item} t={t} locale={locale} />
            )}
            contentContainerStyle={styles.modalScrollContent}
          />
        </View>
      </Modal>
    </View>
  );
};

const PostCard = ({ item, t, locale }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const images = item.images || [];
  const hasImages = images.length > 0;

  // Get description based on locale
  const description =
    locale === "fr"
      ? item.description?.fr || item.description?.en
      : item.description?.en || item.description?.fr;

  return (
    <View style={styles.postCard}>
      {/* Image Gallery */}
      {hasImages && (
        <View style={styles.imageContainer}>
          {images.length === 1 ? (
            <Image source={{ uri: images[0] }} style={styles.singleImage} />
          ) : (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(
                    e.nativeEvent.contentOffset.x / width(90),
                  );
                  setActiveImageIndex(index);
                }}
              >
                {images.map((uri, idx) => (
                  <Image
                    key={idx}
                    source={{ uri }}
                    style={styles.carouselImage}
                  />
                ))}
              </ScrollView>
              {images.length > 1 && (
                <View style={styles.paginationDots}>
                  {images.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.dot,
                        activeImageIndex === idx && styles.activeDot,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Description */}
      {description ? (
        <Text style={styles.postDescription}>{description}</Text>
      ) : (
        <Text style={[styles.postDescription, styles.noDescription]}>
          {t("no_post_description")}
        </Text>
      )}

      {/* Price */}
      {item.price !== null && item.price !== undefined && (
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>{t("price")}</Text>
          <Text style={styles.priceValue}>{item.price} €</Text>
        </View>
      )}

      {/* Link extraction */}
      {description?.match(/(https?:\/\/[^\s]+)/gi) && (
        <TouchableOpacity style={styles.linkContainer}>
          <LinkIcon width={16} height={16} color={AppColors.primary} />
          <Text style={styles.linkText} numberOfLines={1}>
            {description.match(/(https?:\/\/[^\s]+)/gi)?.[0]}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  postsSection: {
    marginTop: 24,
    width: "100%",
  },
  sectionTitle: {
    fontSize: height(2.2),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: height(1.7),
    color: "#999",
    fontStyle: "italic",
  },

  // Thumbnail Grid Styles
  thumbnailGrid: {
    flexDirection: "row",
    gap: THUMBNAIL_GAP,
  },
  thumbnailWrapper: {
    position: "relative",
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
  placeholderThumbnail: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 24,
  },
  multiImageBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  multiImageText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "600",
  },

  // See All Button
  seeAllButton: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  seeAllText: {
    fontSize: height(1.7),
    color: AppColors.primary,
    fontWeight: "500",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingTop: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  modalTitle: {
    fontSize: height(2.2),
    fontWeight: "700",
    color: "#1A1A1A",
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  modalFlatList: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 50,
  },

  // PostCard Styles (used in modal)
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    width: "100%",
  },
  singleImage: {
    width: "100%",
    height: width(70),
    resizeMode: "cover",
  },
  carouselImage: {
    width: width(90),
    height: width(70),
    resizeMode: "cover",
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ccc",
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: AppColors.primary,
  },
  postDescription: {
    fontSize: height(1.8),
    color: "#4A4A4A",
    lineHeight: height(2.4),
    padding: 16,
    paddingBottom: 8,
  },
  noDescription: {
    fontStyle: "italic",
    color: "#999",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: height(1.6),
    color: "#666",
    marginRight: 8,
    fontWeight: "500",
  },
  priceValue: {
    fontSize: height(1.8),
    fontWeight: "700",
    color: "#007BFF",
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBDEFB",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  linkText: {
    fontSize: height(1.6),
    color: "#007BFF",
    marginLeft: 6,
    textDecorationLine: "underline",
    flex: 1,
  },
});

export default PostsMediaList;
