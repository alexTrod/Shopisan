import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../../../firebaseconfig';
import { AppColors } from "../../utils";
import { height, width } from "../../utils/dimension";
import { ScreenNames } from "../../Routes/routes";
import logging from '../../utils/logging';
import { useNavigation } from '@react-navigation/native';
import { toggleFavoriteStore } from '../../Redux/Actions/UserActions';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedCategories } from '../../Redux/Actions/CategoriesActions';
import { setCustomLocation } from '../../Redux/Actions/LocationActions';
import CustomText from "../../components/text";
import { useTranslation } from '../../utils/useTranslation';
import StorefrontIcon from "../../../assets/icons/storefront-icon";
import HeartFilled from "../../../assets/icons/heart-filled";
import HeartUnfilled from "../../../assets/icons/heart-unfilled";
import StarIcon from "../../../assets/icons/star-icon";

import AddressComponent from './AddressComponent';
import ImageGallery from './ImageGallery';
import OpeningHoursDisplay from './OpeningHoursDisplay';
import PostsMediaList from './PostsMediaList';
import useStoreRatings from './hooks/useStoreRatings';

const ItemDetailModal = ({ visible, onClose, item }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isFavorite = useSelector(state => state.user.favoriteStores.includes(item.id));
  const user = useSelector(state => state.user.userData);
  const selectedCategories = useSelector(state => state.categories.selectedCategories);
  const categories = useSelector(state => state.categories.categories);

  const [postMedia, setPostMedia] = useState([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const {
    averageRating,
    ratingCount,
    userRating,
    loading: ratingsLoading,
    submitRating,
  } = useStoreRatings(item.id, visible);

  // Get store images (support both images array and single imageUrl)
  const storeImages = item?.images?.length > 0
    ? item.images
    : item?.imageUrl
      ? [item.imageUrl]
      : [];

  const address = (itemAddress) => {
    const location = itemAddress.length > 0 ? itemAddress[0].location : { address: { street: '' }, city: { name: '', postal_code: '' }, geopoint: '' };
    const street = location?.address?.street || '';
    const city = location?.city?.name || '';
    const postalCode = location?.city?.postal_code || '';
    const geoHash = location?.geopoint || '';
    return { street, postalCode, city, geoHash };
  };

  const lastFetchedStoreIdRef = useRef(null);

  const fetchPostMedia = async () => {
    try {
      const postsRef = collection(firestore, 'posts');
      const q = query(postsRef, where('store.id', '==', item.id));
      const snapshot = await getDocs(q);

      const mediaArray = snapshot.docs
        .map(doc => doc.data()?.media)
        .filter(Boolean)
        .flat();

      setPostMedia(mediaArray);
    } catch (error) {
      console.error(t('error_fetching_media'), error);
    }
  };

  useEffect(() => {
    if (!visible || !item?.id) return;
    if (lastFetchedStoreIdRef.current === item.id) return;
    lastFetchedStoreIdRef.current = item.id;
    fetchPostMedia();
  }, [visible, item?.id]);

  const handleGoToHome = (store) => {
    try {
      const geopoint = store?.address?.[0]?.location?.geopoint;
      if (!geopoint) {
        Alert.alert(
          t('no_location') || 'No location',
          t('no_store_coordinates') || 'This store has no coordinates to show on the map.'
        );
        return;
      }
      const latitude = Number(geopoint.latitude);
      const longitude = Number(geopoint.longitude);
      if (isNaN(latitude) || isNaN(longitude)) {
        Alert.alert(
          t('invalid_location') || 'Invalid location',
          t('invalid_store_coordinates') || 'This store has invalid coordinates.'
        );
        return;
      }

      onClose();
      dispatch(setCustomLocation({ latitude, longitude }));
      setTimeout(() => {
        navigation.navigate(ScreenNames.MAP, {
          initialStore: store,
        });
      }, 300);
    } catch (e) {
      logging('handleGoToHome error', e);
    }
  };

  const handleToggleFavoriteFromModal = () => {
    if (!user) {
      Alert.alert(
        t('login_required'),
        t('login_required_add_favorite_message'),
        [
          {
            text: t('ok'),
            onPress: () => {
              onClose();
            }
          },
        ],
        { cancelable: true }
      );
      return;
    }

    dispatch(toggleFavoriteStore(item.id));
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

  if (loggingOut) {
    return (
      <View style={styles.loggingOutContainer}>
        <CustomText>{t('logging_out')}</CustomText>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={styles.backdrop}
        />

        <View style={styles.sheet}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            <View style={styles.imageAreaWrapper}>
              <ImageGallery
                images={storeImages}
                onIndexChange={setCurrentImageIndex}
                currentIndex={currentImageIndex}
              />

              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleGoToHome(item)}
                style={styles.goHomeButton}
              >
                <StorefrontIcon width={15} height={15} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleFavoriteFromModal}
                style={styles.favoriteButton}
              >
                {isFavorite ? (
                  <HeartFilled width={height(3)} height={height(3)} fill="red" />
                ) : (
                  <HeartUnfilled width={height(3)} height={height(3)} fill="gray" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>{item.title}</Text>

            {/* Compact Rating Row */}
            <View style={styles.compactRating}>
              {/* Community rating */}
              <View style={styles.starsRow}>
                {[...Array(5)].map((_, i) => (
                  <StarIcon
                    key={i}
                    width={height(1.8)}
                    height={height(1.8)}
                    color={i < Math.round(averageRating) ? "#FFD700" : "#E0E0E0"}
                    filled={i < Math.round(averageRating)}
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>
                {averageRating.toFixed(1)} ({ratingCount})
              </Text>

              <Text style={styles.ratingSeparator}>·</Text>

              {/* User rating (tappable) */}
              <Text style={styles.yourRatingLabel}>{t('your_rating_short')}:</Text>
              <View style={styles.starsRow}>
                {[...Array(5)].map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => submitRating(i + 1)} disabled={ratingsLoading}>
                    <StarIcon
                      width={height(1.8)}
                      height={height(1.8)}
                      color={i < userRating ? "#FFD700" : "#E0E0E0"}
                      filled={i < userRating}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <AddressComponent address={address(item.address)} />

            <View style={styles.tagsContainer}>
              {item.tags.map((tag, index) => (
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
            </View>

            <Text style={styles.description}>{item.description || t('no_description_yet')}</Text>

            <OpeningHoursDisplay openingHours={item.openingHours} />

            <PostsMediaList media={postMedia} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  loggingOutContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollContent: {
    width: '100%',
    paddingBottom: 20,
  },
  title: {
    fontSize: height(2.4),
    fontWeight: '700',
    marginBottom: 4,
    color: '#1A1A1A',
    lineHeight: height(2.8),
  },
  compactRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  starsRow: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: height(1.5),
    color: '#666',
    marginLeft: 4,
  },
  ratingSeparator: {
    marginHorizontal: 8,
    color: '#999',
    fontSize: height(1.5),
  },
  yourRatingLabel: {
    fontSize: height(1.5),
    color: '#666',
    marginRight: 4,
  },
  description: {
    fontSize: height(1.9),
    marginBottom: 24,
    color: '#4A4A4A',
    lineHeight: height(2.3),
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  selectedTag: {
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
  },
  tagText: {
    fontSize: height(1.3),
    fontFamily: "Roboto-Regular",
    color: 'rgba(108, 99, 255, 0.7)',
  },
  selectedTagText: {
    color: AppColors.primary,
    fontFamily: "Roboto-Medium",
  },
  imageAreaWrapper: {
    position: 'relative',
    width: width(85),
    alignSelf: 'center',
  },
  goHomeButton: {
    position: 'absolute',
    top: 10,
    right: 70,
    padding: 12,
    backgroundColor: AppColors.black,
    borderRadius: 25,
    minWidth: 50,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    minWidth: 50,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});

export default ItemDetailModal;
