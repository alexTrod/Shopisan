// components/Card.js
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from "react-native";

import { collection, query, getDocs, where } from "firebase/firestore";
import { firestore } from "../../../firebaseconfig";
import PostService from "../../services/PostService";
import EditIcon from "../../../assets/icons/edit-icon";
import AddCircleIcon from "../../../assets/icons/add-circle-icon";
import PinFilled from "../../../assets/icons/pin-filled";
import InfoIcon from "../../../assets/icons/info-icon";
import HeartFilled from "../../../assets/icons/heart-filled";
import HeartUnfilled from "../../../assets/icons/heart-unfilled";
import CheckmarkCircleIcon from "../../../assets/icons/checkmark-circle-icon";
import ClockIcon from "../../../assets/icons/clock-icon";
import StarIcon from "../../../assets/icons/star-icon";
import { height, width } from "../../utils/dimension";
import { AppColors } from "../../utils";
import { ownsStore } from "../../utils/userTypes";
import { useDispatch, useSelector } from "react-redux";
import { selectFavoriteStores } from "../../Redux/Selectors/UserSelectors";
import ItemDetailModal from "./ItemDetailModal";
import { useNavigation } from "@react-navigation/native";
import { ScreenNames } from "../../Routes/routes";
import CityFilter from "../../components/city-filter";
import { setSelectedCategories } from "../../Redux/Actions/CategoriesActions";
import { useTranslation } from "../../utils/useTranslation";
import CustomText from "../text";

const placeholderImage1 = require("../../images/placeholder_store_1.png");
const placeholderImage2 = require("../../images/placeholder_store_2.png");
const placeholderImage3 = require("../../images/placeholder_store_3.png");

const ItemCard = React.memo(
  ({
    title,
    tags,
    description,
    image,
    images,
    imageUrl,
    address,
    id,
    isFavorite,
    onPressFavorite,
    owner_id,
    onPress,
    openingHours,
    is_validated,
  }) => {
    const { t, locale } = useTranslation();
    const [rating, setRating] = useState({ averageRating: 0, ratingCount: 0 });
    const [modalVisible, setModalVisible] = useState(false);
    const [showCityModal, setShowCityModal] = useState(false);
    const [posts, setPosts] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const dispatch = useDispatch();
    const selectedCategories = useSelector(
      (state) => state.categories.selectedCategories,
    );
    const categories = useSelector((state) => state.categories.categories);

    const navigation = useNavigation();
    const user = useSelector((state) => state.user.userData);
    // Ownership is the permission, not account type: firestore.rules keys off
    // owner_id, and only owner accounts can create stores in the first place.
    const isOwner = ownsStore(user, owner_id);

    const handleEditPress = () => {
      navigation.navigate(ScreenNames.HANDLE_STORE, { storeId: id });
    };

    const handleAddPostPress = () => {
      navigation.navigate(ScreenNames.MANAGE_POSTS, {
        storeId: id,
        storeName: title,
        ownerId: owner_id,
      });
    };

    useEffect(() => {
      const getRating = async () => {
        const currentRating = await fetchStoreRatings(id);
        setRating(currentRating);
      };

      const fetchPosts = async () => {
        try {
          const storePosts = await PostService.getPostsForDisplay(id);
          setPosts(storePosts || []);
        } catch (error) {
          console.error("Error fetching posts:", error);
        }
      };

      getRating();
      fetchPosts();
    }, [id]);

    const fetchStoreRatings = async (storeId) => {
      try {
        let _totalRating = 0;
        let _ratingCount = 0;

        const ratingsCollection = collection(firestore, "ratings");
        const ratingsQuery = query(
          ratingsCollection,
          where("store_id", "==", storeId),
        );

        if (ratingsQuery.empty) {
          return { averageRating: 0, ratingCount: 0 };
        }

        const ratingsSnapshot = await getDocs(ratingsQuery);

        ratingsSnapshot.forEach((doc) => {
          const ratingData = doc.data();
          _totalRating += ratingData.score;
          _ratingCount += 1;
        });

        const _averageRating =
          _ratingCount > 0 ? _totalRating / _ratingCount : 0;
        return { averageRating: _averageRating, ratingCount: _ratingCount };
      } catch (error) {
        logging("Error fetching store ratings", error);
        return { averageRating: 0, ratingCount: 0 };
      }
    };

    const handleInfoPress = () => {
      setModalVisible(true);
    };

    const handleCategoryPress = (categoryName) => {
      const category = categories.find((cat) => cat.name === categoryName);
      if (category) {
        const newSelectedCategories = selectedCategories.includes(category.id)
          ? selectedCategories.filter((cat) => cat !== category.id)
          : [...selectedCategories, category.id];
        dispatch(setSelectedCategories(newSelectedCategories));
      }
    };

    // Combine store images + post images into one carousel
    const allImages = useMemo(() => {
      const combined = [];

      // Add store image first
      if (image) {
        combined.push({ type: "store", source: image });
      }

      // Add post images
      posts.forEach((post) => {
        if (post.images && post.images.length > 0) {
          post.images.forEach((uri) => {
            combined.push({ type: "post", source: { uri } });
          });
        }
      });

      return combined;
    }, [image, posts]);

    const hasImages = allImages.length > 0;

    const handleImageScroll = (event) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / width(85));
      setCurrentImageIndex(index);
    };

    // Render the action buttons (edit, map, info, favorite)
    const renderActionButtons = (forImage = false) => {
      const iconColor = forImage ? AppColors.white : AppColors.primary;
      return (
        <View
          style={[
            styles.topIconsRowNoImage,
            forImage && styles.topIconsRowImage,
          ]}
        >
          <View style={styles.rightIcons}>
            {isOwner && (
              <>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleAddPostPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <AddCircleIcon width={24} height={24} color={iconColor} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleEditPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <EditIcon width={24} height={24} color={iconColor} />
                </TouchableOpacity>
              </>
            )}
            {is_validated && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onPress}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <PinFilled width={24} height={24} fill={iconColor} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleInfoPress}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <InfoIcon width={24} height={24} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onPressFavorite}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isFavorite ? (
                <HeartFilled width={24} height={24} fill={iconColor} />
              ) : (
                <HeartUnfilled width={24} height={24} fill={iconColor} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    };

    return (
      <View style={[styles.card, !hasImages && styles.cardNoImage]}>
        {/* Image carousel section */}
        {hasImages && (
          <View>
            <FlatList
              data={allImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleImageScroll}
              scrollEventThrottle={16}
              keyExtractor={(item, index) => `img-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity activeOpacity={0.9} onPress={handleInfoPress}>
                  <Image style={styles.image} source={item.source} />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.image,
                      {
                        position: "absolute",
                        backgroundColor: "rgba(0,0,0,0.15)",
                      },
                    ]}
                  />
                </TouchableOpacity>
              )}
            />
            {/* Pagination dots */}
            {allImages.length > 1 && (
              <View style={styles.paginationContainer}>
                {allImages.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      currentImageIndex === index && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
            {renderActionButtons(true)}
          </View>
        )}

        {/* Card content section */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleInfoPress}
          style={{ flex: hasImages ? 0 : 1 }}
        >
          <View
            style={[
              styles.cardContent,
              !hasImages && styles.cardContentNoImage,
            ]}
          >
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.title,
                  !hasImages && styles.titleNoImage,
                  isOwner && styles.titleWithIcon,
                ]}
                numberOfLines={2}
                allowFontScaling={true}
                adjustsFontSizeToFit={false}
              >
                {title}
                {isOwner && (
                  <View
                    style={{
                      marginLeft: 4,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    {is_validated ? (
                      <CheckmarkCircleIcon
                        width={16}
                        height={16}
                        color={AppColors.primary}
                      />
                    ) : (
                      <ClockIcon width={16} height={16} color="#f59e0b" />
                    )}
                  </View>
                )}
              </Text>
            </View>

            <View style={styles.rating}>
              <View style={styles.starsContainer}>
                {[...Array(5)].map((_, index) => (
                  <StarIcon
                    key={index}
                    width={height(2.2)}
                    height={height(2.2)}
                    color={
                      index < (Math.round(rating.averageRating) || 0)
                        ? "#FFD700"
                        : "#E0E0E0"
                    }
                    filled={index < (Math.round(rating.averageRating) || 0)}
                    style={styles.starIcon}
                  />
                ))}
              </View>
              <CustomText
                style={styles.ratingText}
                allowFontScaling={true}
                numberOfLines={1}
              >
                {rating.ratingCount > 0
                  ? `${rating.averageRating.toFixed(1)} (${rating.ratingCount})`
                  : t("no_ratings_yet")}
              </CustomText>
            </View>

            <View style={styles.tags}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {/* Sort tags: selected categories first */}
                {[...tags]
                  .sort((a, b) => {
                    const aSelected = selectedCategories.includes(
                      categories.find((cat) => cat.name === a)?.id,
                    );
                    const bSelected = selectedCategories.includes(
                      categories.find((cat) => cat.name === b)?.id,
                    );
                    if (aSelected && !bSelected) return -1;
                    if (!aSelected && bSelected) return 1;
                    return 0;
                  })
                  .map((tag, index) => {
                    const isSelected = selectedCategories.includes(
                      categories.find((cat) => cat.name === tag)?.id,
                    );
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.tag, isSelected && styles.selectedTag]}
                        onPress={() => handleCategoryPress(tag)}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            isSelected && styles.selectedTagText,
                          ]}
                          allowFontScaling={true}
                          numberOfLines={1}
                        >
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>

            <Text
              style={styles.description}
              numberOfLines={2}
              allowFontScaling={true}
            >
              {description.length > 150
                ? `${description.substring(0, 150)}...`
                : description}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action buttons for no-image cards - rendered outside TouchableOpacity */}
        {!hasImages && renderActionButtons(false)}

        <ItemDetailModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          item={{
            id,
            title,
            description,
            tags,
            address,
            openingHours: openingHours || null,
            images: images || [],
            imageUrl: imageUrl || null,
            owner_id,
          }}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6, // For Android
    width: width(85),
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  cardNoImage: {
    paddingVertical: 6,
    minHeight: 0,
    marginVertical: 15,
  },
  image: {
    width: width(85),
    height: height(20),
    borderRadius: height(2),
  },
  paginationContainer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  paginationDotActive: {
    backgroundColor: "#FFF",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  favoriteIcon: {
    backgroundColor: AppColors.white,
    borderRadius: 50,
    padding: 5,
    alignSelf: "flex-end",
  },
  infoIcon: {
    borderRadius: 50,
    padding: 5,
    alignSelf: "flex-end",
    position: "absolute",
    top: height(1),
    right: height(1),
  },
  topIconsRow: {
    position: "absolute",
    top: height(1),
    left: height(1),
    right: height(1),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  leftIcons: {
    flexDirection: "row",
  },
  rightIcons: {
    flexDirection: "row",
  },
  iconButton: {
    marginHorizontal: 2,
    padding: 5,
    zIndex: 1,
  },
  iconButton2: {
    marginRight: 20,
    marginTop: 1,
    padding: 5,
  },
  cardContent: {
    padding: 16,
  },
  cardContentNoImage: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: "relative",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  titleWithIcon: {
    paddingRight: 80, // Less padding when icon is inline
  },
  title: {
    fontSize: height(2),
    fontFamily: "Roboto-Medium",
    flexWrap: "wrap",
    flexShrink: 1,
    paddingRight: 100, // Make space for the icons
    lineHeight: height(2.5), // Better line height for readability
  },
  titleNoImage: {
    fontSize: height(2.2),
    paddingRight: 100, // Make space for the icons
    lineHeight: height(2.7), // Better line height for readability
  },
  descriptionHeading: {
    fontSize: height(1.8),
    fontFamily: "Roboto-Medium",
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  starIcon: {
    marginRight: 1,
  },
  descriptionrating: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
    justifyContent: "flex-end",
    gap: 10,
  },
  ratingText: {
    color: "#666",
    flexShrink: 1, // Allow text to shrink if needed
    fontSize: height(1.5), // Use responsive font size
    fontWeight: "500",
  },
  tags: {
    flexDirection: "row",
    marginVertical: 6,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "transparent",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  selectedTag: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
    borderWidth: 2,
  },
  tagText: {
    fontSize: height(1.5),
    fontFamily: "Roboto-Medium",
    color: AppColors.primary,
  },
  selectedTagText: {
    color: AppColors.white,
    fontWeight: "bold",
  },
  description: {
    marginTop: 2,
    color: "gray",
    minHeight: 0,
    lineHeight: height(2.2), // Better line height for readability
    fontSize: height(1.7), // Use responsive font size
  },
  posts: {
    marginTop: 15,
    fontWeight: "bold",
    fontSize: height(2), // Use responsive font size
  },
  topIconsRowNoImage: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 10,
  },
  topIconsRowImage: {
    position: "absolute",
    top: height(1),
    right: height(1),
    zIndex: 10,
  },
  actionButton: {
    backgroundColor: AppColors.white,
    borderRadius: 50,
    padding: 5,
  },
});

export default ItemCard;
