import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { AppColors } from "../../utils";
import { height, width } from "../../utils/dimension";
import { useTranslation } from "../../utils/useTranslation";
import { formatPostPrice } from "../../utils/price";

const CARD_WIDTH = width(85);
const CARD_MARGIN = 8;

const PostsCarousel = ({ posts = [] }) => {
  const { t, locale } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  // Normalize posts to consistent format
  const normalizedPosts = posts.map((item) => {
    if (item.images && Array.isArray(item.images)) {
      return {
        id: item.id,
        images: item.images,
        description: item.description || {},
        price: item.price,
        currency: item.currency,
      };
    }
    return {
      id: item.id,
      images: item.image ? [item.image] : [],
      description: item.description || {},
      price: item.price,
      currency: item.currency,
    };
  });

  const getDescription = (desc) => {
    if (!desc) return null;
    return locale === "fr" ? desc.fr || desc.en : desc.en || desc.fr;
  };

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_MARGIN));
    setActiveIndex(index);
  };

  const renderPost = ({ item, index }) => {
    const description = getDescription(item.description);
    const hasImages = item.images && item.images.length > 0;

    return (
      <View style={styles.postCard}>
        {/* Post Image */}
        {hasImages ? (
          <Image source={{ uri: item.images[0] }} style={styles.postImage} />
        ) : (
          <View style={[styles.postImage, styles.noImagePlaceholder]}>
            <Text style={styles.noImageText}>📷</Text>
          </View>
        )}

        {/* Multi-image indicator */}
        {item.images.length > 1 && (
          <View style={styles.multiImageBadge}>
            <Text style={styles.multiImageText}>1/{item.images.length}</Text>
          </View>
        )}

        {/* Post Info */}
        <View style={styles.postInfo}>
          {description && (
            <Text style={styles.postDescription} numberOfLines={2}>
              {description}
            </Text>
          )}
          {/* Not a truthiness check: a price of 0 is "free", not "absent". */}
          {formatPostPrice(item.price, item.currency) && (
            <Text style={styles.postPrice}>
              {formatPostPrice(item.price, item.currency)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{t("no_posts_yet")}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t("posted_announcements")}</Text>

      {normalizedPosts.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={normalizedPosts}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_MARGIN}
            decelerationRate="fast"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyExtractor={(item, index) => item.id || String(index)}
            renderItem={renderPost}
            contentContainerStyle={styles.listContent}
          />

          {/* Pagination dots */}
          {normalizedPosts.length > 1 && (
            <View style={styles.pagination}>
              {normalizedPosts.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    activeIndex === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: height(2),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  listContent: {
    paddingRight: CARD_MARGIN,
  },
  postCard: {
    width: CARD_WIDTH,
    marginRight: CARD_MARGIN,
    borderRadius: 12,
    backgroundColor: "#FFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  postImage: {
    width: "100%",
    height: width(60),
    resizeMode: "cover",
  },
  noImagePlaceholder: {
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    fontSize: 40,
  },
  multiImageBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  multiImageText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  postInfo: {
    padding: 12,
  },
  postDescription: {
    fontSize: height(1.7),
    color: "#4A4A4A",
    lineHeight: height(2.2),
  },
  postPrice: {
    fontSize: height(1.8),
    fontWeight: "700",
    color: AppColors.primary,
    marginTop: 6,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DDD",
  },
  activeDot: {
    backgroundColor: AppColors.primary,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: height(1.7),
    color: "#999",
    fontStyle: "italic",
  },
});

export default PostsCarousel;
