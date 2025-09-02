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
  openingHours
}) => {

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

  // Helper function to get opening hours status
  const getOpeningStatus = () => {
    if (!openingHours) return { isOpen: false, status: 'Hours not available' };
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 100 + now.getMinutes(); // Format: 1430 for 2:30 PM
    
    const todayHours = openingHours[currentDay];
    if (!todayHours || !todayHours.open || !todayHours.close) {
      return { isOpen: false, status: 'Closed today' };
    }
    
    const openTime = parseInt(todayHours.open.replace(':', ''));
    const closeTime = parseInt(todayHours.close.replace(':', ''));
    
    const isOpen = currentTime >= openTime && currentTime <= closeTime;
    return { 
      isOpen, 
      status: isOpen ? 'Open' : 'Closed',
      hours: `${todayHours.open} - ${todayHours.close}`
    };
  };

  const openingStatus = getOpeningStatus();

  return (
    <View style={[styles.card, !image && styles.cardNoImage]}>
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={handleInfoPress}
        style={{ flex: 1 }}
      >
        {/* Image Section */}
        {image && (
          <View style={styles.imageContainer}>
            <Image style={styles.image} source={image} />
            <View style={styles.imageOverlay} />
            
            {/* Top Action Icons */}
            <View style={styles.topActionIcons}>
              <View style={styles.actionIconGroup}>
                <TouchableOpacity 
                  style={styles.actionIconButton} 
                  onPress={() => onPress()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="map-outline" size={20} color={AppColors.white} />
                </TouchableOpacity>
                
                {isOwner && (
                  <TouchableOpacity 
                    style={styles.actionIconButton} 
                    onPress={handleEditPress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={20} color={AppColors.white} />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.actionIconButton} 
                  onPress={handleInfoPress}
                  activeOpacity={0.7}
                >
                  <Ionicons name="information-circle-outline" size={20} color={AppColors.white} />
                </TouchableOpacity>
              </View>
              
              {/* Favorite Icon - Positioned separately */}
              <TouchableOpacity 
                style={styles.favoriteIconButton} 
                onPress={onPressFavorite}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={22} 
                  color={isFavorite ? "#FF6B6B" : AppColors.white} 
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content Section */}
        <View style={[styles.cardContent, !image && styles.cardContentNoImage]}>
          {/* Action Icons for No Image Cards */}
          {!image && (
            <View style={styles.noImageActionIcons}>
              <View style={styles.actionIconGroup}>
                <TouchableOpacity 
                  style={[styles.actionIconButton, styles.noImageActionButton]} 
                  onPress={() => onPress()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="map-outline" size={18} color={AppColors.primary} />
                </TouchableOpacity>
                
                {isOwner && (
                  <TouchableOpacity 
                    style={[styles.actionIconButton, styles.noImageActionButton]} 
                    onPress={handleEditPress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={18} color={AppColors.primary} />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.actionIconButton, styles.noImageActionButton]} 
                  onPress={handleInfoPress}
                  activeOpacity={0.7}
                >
                  <Ionicons name="information-circle-outline" size={18} color={AppColors.primary} />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.favoriteIconButton, styles.noImageFavoriteButton]} 
                onPress={onPressFavorite}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={20} 
                  color={isFavorite ? "#FF6B6B" : AppColors.primary} 
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Store Title */}
          <Text style={[styles.title, !image && styles.titleNoImage]} numberOfLines={2}>
            {title}
          </Text>

          {/* Rating Section */}
          <View style={styles.ratingSection}>
            <View style={styles.ratingStars}>
              {[...Array(5)].map((_, index) => (
                <Ionicons
                  key={index}
                  name="star"
                  size={height(2)}
                  color={index < (Math.round(rating.averageRating) || 0) ? "#FFD700" : "#E0E0E0"}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {rating.ratingCount > 0 
                ? `${rating.averageRating.toFixed(1)} (${rating.ratingCount})`
                : 'No ratings yet'}
            </Text>
          </View>

          {/* Opening Hours Status */}
          <View style={styles.openingStatusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: openingStatus.isOpen ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.openingStatusText}>
              {openingStatus.status}
            </Text>
            {openingStatus.hours && (
              <Text style={styles.openingHoursText}>
                {openingStatus.hours}
              </Text>
            )}
          </View>

          {/* Categories/Tags */}
          {tags && tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {tags.slice(0, 3).map((tag, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[
                      styles.tag,
                      selectedCategories.includes(categories.find(cat => cat.name === tag)?.id) && styles.selectedTag
                    ]}
                    onPress={() => handleCategoryPress(tag)}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        selectedCategories.includes(categories.find(cat => cat.name === tag)?.id) && styles.selectedTagText
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
                {tags.length > 3 && (
                  <View style={styles.moreTagsIndicator}>
                    <Text style={styles.moreTagsText}>+{tags.length - 3}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Description */}
          {description && (
            <Text style={styles.description} numberOfLines={2}>
              {description.length > 120 ? `${description.substring(0, 120)}...` : description}
            </Text>
          )}
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
    backgroundColor: AppColors.white_200,
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    width: width(90),
    alignSelf: "center",
  },
  cardNoImage: {
    paddingVertical: 8,
    minHeight: 0,
    marginVertical: 12,
  },
  
  // Image Section
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: "100%",
    height: height(18),
    borderRadius: 0,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  
  // Action Icons
  topActionIcons: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  noImageActionIcons: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  actionIconGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIconButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: 6,
    marginHorizontal: 2,
  },
  noImageActionButton: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 16,
    padding: 5,
    marginHorizontal: 1,
  },
  favoriteIconButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: 6,
  },
  noImageFavoriteButton: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 16,
    padding: 5,
  },
  
  // Content Section
  cardContent: {
    padding: 16,
  },
  cardContentNoImage: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    position: 'relative',
  },
  
  // Title
  title: {
    fontSize: height(2.2),
    fontFamily: "Mulish-Bold",
    color: "#2C3E50",
    marginBottom: 8,
    lineHeight: height(2.8),
  },
  titleNoImage: {
    fontSize: height(2.4),
    paddingRight: 120,
    marginBottom: 10,
  },
  
  // Rating Section
  ratingSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: "row",
    marginRight: 8,
  },
  ratingText: {
    fontSize: height(1.6),
    color: "#7F8C8D",
    fontFamily: "Mulish-Medium",
  },
  
  // Opening Hours Status
  openingStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  openingStatusText: {
    fontSize: height(1.5),
    fontFamily: "Mulish-SemiBold",
    color: "#2C3E50",
    marginRight: 4,
  },
  openingHoursText: {
    fontSize: height(1.4),
    fontFamily: "Mulish-Regular",
    color: "#7F8C8D",
  },
  
  // Tags/Categories
  tagsContainer: {
    marginBottom: 8,
  },
  tag: {
    backgroundColor: AppColors.primary_faded,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedTag: {
    borderColor: AppColors.primary_faded_dark,
    borderWidth: 2,
  },
  tagText: {
    fontSize: height(1.4),
    fontFamily: "Mulish-SemiBold",
    color: AppColors.primary,
  },
  selectedTagText: {
    color: AppColors.primary,
  },
  moreTagsIndicator: {
    backgroundColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  moreTagsText: {
    fontSize: height(1.3),
    fontFamily: "Mulish-Medium",
    color: "#7F8C8D",
  },
  
  // Description
  description: {
    fontSize: height(1.6),
    fontFamily: "Mulish-Regular",
    color: "#7F8C8D",
    lineHeight: height(2.2),
  },
});

export default ItemCard;