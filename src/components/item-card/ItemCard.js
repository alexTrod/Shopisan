// components/Card.js
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import { collection, query, getDocs, where} from 'firebase/firestore';
import { firestore } from '../../../firebaseconfig';
import { Ionicons } from "@expo/vector-icons";
import { height, width } from "../../utils/dimension";
import { AppColors } from "../../utils";
import { useDispatch, useSelector } from 'react-redux';
import { selectFavoriteStores } from '../../Redux/Selectors/UserSelectors';
import ItemDetailModal from './ItemDetailModal';
import { useNavigation } from '@react-navigation/native'
import { ScreenNames } from "../../Routes/routes";
import CityFilter from '../../components/city-filter';
import { setSelectedCategories } from '../../Redux/Actions/CategoriesActions';
import { useTranslation } from '../../utils/useTranslation';
import CustomText from '../text';


const placeholderImage1 = require('../../images/placeholder_store_1.png');	
const placeholderImage2 = require('../../images/placeholder_store_2.png');	
const placeholderImage3 = require('../../images/placeholder_store_3.png');	

const ItemCard = React.memo(({
  title,
  tags,
  description,
  image,
  address,
  id,
  isFavorite,
  onPressFavorite,
  owner_id,
  onPress,
  openingHours,
  is_validated
}) => {

  const { t, locale } = useTranslation();
  const [rating, setRating] = useState({ averageRating: 0, ratingCount: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const dispatch = useDispatch();
  const selectedCategories = useSelector(state => state.categories.selectedCategories);
  const categories = useSelector(state => state.categories.categories);

  const navigation = useNavigation();
  const user = useSelector(state => state.user.userData);
  const isOwner = user?.userType === 'merchant' && user.id === owner_id;

  const handleEditPress = () => {
    navigation.navigate(ScreenNames.HANDLE_STORE, { storeId: id });
  };

  useEffect(() => {
    const getRating = async () => {
      const currentRating = await fetchStoreRatings(id);
      setRating(currentRating);
    };
    
    getRating();
  }, [id]);


  const fetchStoreRatings = async (storeId) => {
    try {

      let _totalRating = 0;
      let _ratingCount = 0;

      const ratingsCollection = collection(firestore, 'ratings');
      const ratingsQuery = query(ratingsCollection, where('store_id', '==', storeId));

      if (ratingsQuery.empty) {
        return { averageRating: 0, ratingCount: 0 };
      }

      const ratingsSnapshot = await getDocs(ratingsQuery);


      ratingsSnapshot.forEach(doc => {
        const ratingData = doc.data();
        _totalRating += ratingData.score;
        _ratingCount += 1;
      });

      const _averageRating = _ratingCount > 0 ? _totalRating / _ratingCount : 0;
      return { averageRating: _averageRating, ratingCount: _ratingCount };

    } catch (error) {
      logging('Error fetching store ratings', error);
      return { averageRating: 0, ratingCount: 0 };
    }
  };

  const handleInfoPress = () => {
    setModalVisible(true);
  };

  const handleCategoryPress = (categoryName) => {
    const category = categories.find(cat => cat.name === categoryName);
    if (category) {
      const newSelectedCategories = selectedCategories.includes(category.id)
        ? selectedCategories.filter(cat => cat !== category.id)
        : [...selectedCategories, category.id];
      dispatch(setSelectedCategories(newSelectedCategories));
    }
  };

  return (
    <View style={[styles.card, !image && styles.cardNoImage]}>
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={handleInfoPress}
        style={{ flex: 1 }}
      >
        <View>
          <View>
            {image && (
              <>
                <Image style={styles.image} source={image} />
                <View
                  style={[
                    styles.image,
                    { position: "absolute", backgroundColor: "rgba(0,0,0,0.2)" },
                  ]}
                />
                <View style={styles.topIconsRowNoImage}>
                  <View style={styles.rightIcons}>
                    <TouchableOpacity 
                      style={[styles.iconButton, { zIndex: 100 }]} 
                      onPress={() => {
                        onPress();
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="map-outline" size={24} color={AppColors.white} />
                    </TouchableOpacity>
                    {isOwner && (
                      <TouchableOpacity 
                        style={[styles.iconButton, { zIndex: 1 }]} 
                        onPress={() => {
                          handleEditPress();
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={24} color={AppColors.white} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={[styles.iconButton, { zIndex: 1 }]} 
                      onPress={() => {
                        handleInfoPress();
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="information-circle-outline" size={24} color={AppColors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.iconButton, { zIndex: 1 }]} 
                      onPress={() => {
                        onPressFavorite();
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={isFavorite ? "heart" : "heart-outline"} 
                        size={24} 
                        color={AppColors.white} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>

          <View style={[styles.cardContent, !image && styles.cardContentNoImage]}>
            {!image && (
              <View style={styles.topIconsRowNoImage}>
                <View style={styles.rightIcons}>
                  {isOwner && (
                    <TouchableOpacity 
                      style={[styles.iconButton, { zIndex: 1 }]} 
                      onPress={() => {
                        handleEditPress();
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={24} color={AppColors.primary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.iconButton, { zIndex: 1 }]} 
                    onPress={() => {
                      onPress();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="map-outline" size={24} color={AppColors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.iconButton, { zIndex: 1 }]} 
                    onPress={() => {
                      handleInfoPress();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="information-circle-outline" size={24} color={AppColors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.iconButton, { zIndex: 1 }]} 
                    onPress={() => {
                      onPressFavorite();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={isFavorite ? "heart" : "heart-outline"} 
                      size={24} 
                      color={AppColors.primary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, !image && styles.titleNoImage, isOwner && styles.titleWithIcon]}
                numberOfLines={2}
                allowFontScaling={true}
                adjustsFontSizeToFit={false}
              >
                {title}
                {isOwner && (
                  <Text>
                    {"  "}
                    <Ionicons
                      name={is_validated ? "checkmark-circle" : "time-outline"}
                      size={16}
                      color={is_validated ? AppColors.primary : "#f59e0b"}
                    />
                  </Text>
                )}
              </Text>
            </View>

            <View style={styles.rating}>
              <View style={styles.starsContainer}>
                {[...Array(5)].map((_, index) => (
                  <Ionicons
                    key={index}
                    name="star"
                    size={height(2.2)}
                    color={index < (Math.round(rating.averageRating) || 0) ? "#FFD700" : "#E0E0E0"}
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
                  ?  `${rating.averageRating.toFixed(1)} (${rating.ratingCount})`
                  : t('no_ratings_yet')}
              </CustomText>
            </View>

            <View style={styles.tags}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {/* Sort tags: selected categories first */}
                {[...tags].sort((a, b) => {
                  const aSelected = selectedCategories.includes(categories.find(cat => cat.name === a)?.id);
                  const bSelected = selectedCategories.includes(categories.find(cat => cat.name === b)?.id);
                  if (aSelected && !bSelected) return -1;
                  if (!aSelected && bSelected) return 1;
                  return 0;
                }).map((tag, index) => {
                  const isSelected = selectedCategories.includes(categories.find(cat => cat.name === tag)?.id);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.tag,
                        isSelected && styles.selectedTag
                      ]}
                      onPress={() => handleCategoryPress(tag)}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          isSelected && styles.selectedTagText
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

            {
              <>
                <Text 
                  style={styles.description} 
                  numberOfLines={2}
                  allowFontScaling={true}
                >
                  {description.length > 150 ? `${description.substring(0, 150)}...` : description}
                </Text>
              </>
            }
          </View>
        </View>
      </TouchableOpacity>

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
        }}
      />
    </View>
  );
});

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
    width: "100%",
    height: height(20),
    borderRadius: height(2),
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
    position: 'relative',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  titleWithIcon: {
    paddingRight: 80, // Less padding when icon is inline
  },
  title: {
    fontSize: height(2),
    fontFamily: "Roboto-Medium",
    flexWrap: 'wrap',
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
    fontWeight: 'bold',
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'absolute',
    top: 6,
    right: 6,
  },
  actionButton: {
    backgroundColor: AppColors.white,
    borderRadius: 50,
    padding: 5,
  },
});

export default ItemCard;