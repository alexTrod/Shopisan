// components/Card.js
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
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

const placeholders = [placeholderImage1, placeholderImage2, placeholderImage3];
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
    console.log('Opening info modal for store:', title);
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
                <View style={styles.topIconsRow}>
                  <View style={styles.leftIcons}>
                    <TouchableOpacity 
                      style={[styles.iconButton, { zIndex: 1 }]} 
                      onPress={() => {
                        console.log('Map button pressed');
                        onPress();
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="map-outline" size={24} color={AppColors.white} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.rightIcons}>
                    {isOwner && (
                      <TouchableOpacity 
                        style={[styles.iconButton, { zIndex: 1 }]} 
                        onPress={() => {
                          console.log('Edit button pressed');
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
                        console.log('Info button pressed');
                        handleInfoPress();
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="information-circle-outline" size={24} color={AppColors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.iconButton, { zIndex: 1 }]} 
                      onPress={() => {
                        console.log('Favorite button pressed');
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
                        console.log('Edit button pressed (no image)');
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
                      console.log('Info button pressed (no image)');
                      handleInfoPress();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="information-circle-outline" size={24} color={AppColors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.iconButton, { zIndex: 1 }]} 
                    onPress={() => {
                      console.log('Favorite button pressed (no image)');
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
            <Text style={[styles.title, !image && styles.titleNoImage]} numberOfLines={2}>{title}</Text>

            <View style={styles.rating}>
              {[...Array(5)].map((_, index) => (
                <Ionicons
                  key={index}
                  name="star"
                  size={height(2.5)}
                  color={index < (Math.round(rating.averageRating) || 0) ? "gold" : "gray"}
                />
              ))}
              <Text style={styles.ratingText}>
                {rating.ratingCount > 0 
                  ? rating.averageRating + ' (' + rating.ratingCount + ')'
                  : 'No ratings yet'}
              </Text>
            </View>

            <View style={styles.tags}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {tags.map((tag, index) => (
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
              </ScrollView>
            </View>

            {
              <>
                <Text style={styles.description} numberOfLines={2}>
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
    backgroundColor: AppColors.white_200,
    borderRadius: 10,
    overflow: "hidden",
    marginVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 5, // For Android
    width: width(85),
    alignSelf: "center",
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
    padding: 10,
  },
  cardContentNoImage: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    position: 'relative',
  },
  title: {
    fontSize: height(2),
    fontFamily: "Mulish-Bold",
    flexWrap: 'wrap',
    flexShrink: 1,
    paddingRight: 100, // Make space for the icons
  },
  titleNoImage: {
    fontSize: height(2.2),
    paddingRight: 100, // Make space for the icons
  },
  descriptionHeading: {
    fontSize: height(1.8),
    fontFamily: "Mulish-Bold",
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  descriptionrating: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
    justifyContent: "flex-end",
    gap: 10,
  },
  ratingText: {
    marginLeft: 5,
    color: "gray",
  },
  tags: {
    flexDirection: "row",
    marginVertical: 2,
  },
  tag: {
    backgroundColor: AppColors.primary_faded,
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 5,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedTag: {
    borderColor: AppColors.primary_faded_dark,
    borderWidth: 2,
  },
  tagText: {
    fontSize: height(1.5),
    fontFamily: "Mulish-Bold",
    color: AppColors.primary,
  },
  selectedTagText: {
    color: AppColors.primary,
  },
  description: {
    marginTop: 2,
    color: "gray",
    minHeight: 0,
  },
  posts: {
    marginTop: 15,
    fontWeight: "bold",
    fontSize: 16,
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