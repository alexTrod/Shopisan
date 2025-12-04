import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Alert, TextInput } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { AppColors } from "../../utils";
import { height } from "../../utils/dimension";
import { collection, addDoc, updateDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../../firebaseconfig';
import { getAuth } from 'firebase/auth';
import AddressComponent from './AddressComponent';
import { ScreenNames } from "../../Routes/routes";
import logging from '../../utils/logging';
import { useNavigation } from '@react-navigation/native';

import { toggleFavoriteStore } from '../../Redux/Actions/UserActions';
import { useDispatch, useSelector } from 'react-redux';
import { signOut } from "../../Redux/Actions/UserActions";
import { setSelectedCategories } from '../../Redux/Actions/CategoriesActions';
import { setCustomLocation } from '../../Redux/Actions/LocationActions';
import CustomText from "../../components/text";
import { ScrollView } from 'react-native';
import { useTranslation } from '../../utils/useTranslation';

const ItemDetailModal = ({ visible, onClose, item }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const isFavorite = useSelector(state => state.user.favoriteStores.includes(item.id));
  const user = useSelector(state => state.user.userData);
  const selectedCategories = useSelector(state => state.categories.selectedCategories);
  const categories = useSelector(state => state.categories.categories);
  const [postMedia, setPostMedia] = useState([]);
  const [loggingOut, setLoggingOut] = useState(false);

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
  ];  

  const auth = getAuth();
  const address = (itemAddress) => {
    const location = itemAddress.length > 0 ? itemAddress[0].location : {address: {street: ''}, city: {name:'', postal_code: ''}, geopoint: ''};
    const street = location?.address?.street || '';
    const city = location?.city?.name || '';
    const postalCode = location?.city?.postal_code || '';
    const geoHash = location?.geopoint || '';
    return {street, postalCode, city, geoHash};
  }

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
  }

  const fetchStoreRatings = async () => {
    try {
      let totalRating = 0;
      let count = 0;

      const ratingsRef = collection(firestore, 'ratings');
      const q = query(ratingsRef, where('store_id', '==', item.id));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        totalRating += doc.data().score;
        count += 1;
      });

      setAverageRating(count > 0 ? totalRating / count : 0);
      setRatingCount(count);

      if (auth.currentUser) {
        const userRatingQuery = query(
          ratingsRef, 
          where('store_id', '==', item.id),
          where('user_id', '==', auth.currentUser.uid)
        );
        const userRatingSnapshot = await getDocs(userRatingQuery);
        if (!userRatingSnapshot.empty) {
          setUserRating(userRatingSnapshot.docs[0].data().score);
        }
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const submitRating = async (score) => {
    if (!user) {
      Alert.alert(
        t('login_required'),
        t('login_required_favorite_message'),
        [
          { text: t('no'), style: "cancel" },
          { text: t('yes'), onPress: () => {
              dispatch(signOut());
            }
          },
        ],
        { cancelable: true }
      );
      return;
    }
  
    try {
      setLoading(true);
      const ratingsRef = collection(firestore, 'ratings');
  
      const userRatingQuery = query(
        ratingsRef, 
        where('store_id', '==', item.id),
        where('user_id', '==', auth.currentUser.uid)
      );
      const userRatingSnapshot = await getDocs(userRatingQuery);
  
      if (userRatingSnapshot.empty) {
        await addDoc(ratingsRef, {
          store_id: item.id,
          user_profile_id: auth.currentUser.uid,
          score: score,
          created: serverTimestamp(),
          updated: serverTimestamp(),
          comment: null,
          is_active: true,
          is_deleted: false,
        });
      } else {
        const ratingDoc = userRatingSnapshot.docs[0].ref;
        await updateDoc(ratingDoc, {
          score: score,
          updated: serverTimestamp(),
        });
      }
  
      setUserRating(score);
      await fetchStoreRatings();
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert(t('error'), t('error_submitting_rating'));
    } finally {
      setLoading(false);
    }
  };  

  const lastFetchedStoreIdRef = React.useRef(null);
  useEffect(() => {
    if (!visible || !item?.id) return;
    if (lastFetchedStoreIdRef.current === item.id) return;
    lastFetchedStoreIdRef.current = item.id;
    fetchStoreRatings();
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

      // Close modal then navigate to Map centered on the store
      onClose();
      // Update custom location so Map syncs with the selected city
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
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
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={AppColors.primary} />
              </TouchableOpacity>
            
              <TouchableOpacity onPress={() => handleGoToHome(item)} style={styles.goHomeButton}>
                <Ionicons name="storefront-outline" size={15} color="white" />
              </TouchableOpacity>
              
                <TouchableOpacity
                  onPress={handleToggleFavoriteFromModal}
                  style={styles.favoriteButton}
                >
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={height(3)}
                    color={isFavorite ? "red" : "gray"}
                  />
              </TouchableOpacity>
            </View>
            <Text style={styles.title}>{item.title}</Text>
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

            {item.openingHours && (
              <View style={{ width: '100%', marginTop: 20 }}>
                <Text style={styles.sectionTitle}>{t('opening_hours')}</Text>
                {days.map((dayKey) => {
                  const dayHours = item.openingHours[dayKey];
                  const dayLabel = t(dayKey);

                  let hoursText = "";

                  if (dayHours?.morning && dayHours?.afternoon) {
                    const formatTimeDisplay = (timeStr) => {
                      if (!timeStr) return "";
                      const parts = timeStr.split(':');
                      const hour = parts[0];
                      const minute = parts[1];
                      return minute === "00" || !minute ? `${hour}h` : `${hour}h${minute}`;
                    };
                    
                    hoursText = `${formatTimeDisplay(dayHours.morning.start)} - ${formatTimeDisplay(dayHours.morning.end)} / ${formatTimeDisplay(dayHours.afternoon.start)} - ${formatTimeDisplay(dayHours.afternoon.end)}`;
                  } else if (dayHours?.morning) {
                    const formatTimeDisplay = (timeStr) => {
                      if (!timeStr) return "";
                      const parts = timeStr.split(':');
                      const hour = parts[0];
                      const minute = parts[1];
                      return minute === "00" || !minute ? `${hour}h` : `${hour}h${minute}`;
                    };
                    hoursText = `${formatTimeDisplay(dayHours.morning.start)} - ${formatTimeDisplay(dayHours.morning.end)}`;
                  } else if (dayHours?.afternoon) {
                    const formatTimeDisplay = (timeStr) => {
                      if (!timeStr) return "";
                      const parts = timeStr.split(':');
                      const hour = parts[0];
                      const minute = parts[1];
                      return minute === "00" || !minute ? `${hour}h` : `${hour}h${minute}`;
                    };
                    hoursText = `${formatTimeDisplay(dayHours.afternoon.start)} - ${formatTimeDisplay(dayHours.afternoon.end)}`;
                  } else {
                    hoursText = t('closed');
                  }

                  return (
                    <View key={dayKey} style={styles.openingHourRow}>
                      <Text style={styles.openingHourDay}>{dayLabel} :</Text>
                      <Text style={styles.openingHourText}>{hoursText}</Text>
                    </View>
                  );
                })}
              </View>
            )}

                {/* Ratings */}
                <View style={styles.ratingsSection}>
                  <Text style={styles.sectionTitle}>{t('ratings')}</Text>
                  
                  {/* User Rating */}
                  <View style={styles.ratingCard}>
                    <Text style={styles.ratingLabel}>{t('your_rating')}</Text>
                    <View style={styles.ratingStars}>
                      {[...Array(5)].map((_, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => submitRating(index + 1)}
                          disabled={loading}
                          style={styles.starButton}
                        >
                          <Ionicons
                            name={index < userRating ? "star" : "star-outline"}
                            size={height(2.5)}
                            color={index < userRating ? "#FFD700" : "#E0E0E0"}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                
                  {/* Community Rating */}
                  <View style={styles.ratingCard}>
                    <Text style={styles.ratingLabel}>{t('community_rating')}</Text>
                    <View style={styles.ratingStars}>
                      {[...Array(5)].map((_, index) => (
                        <Ionicons
                          key={index}
                          name={index < averageRating ? "star" : "star-outline"}
                          size={height(2.5)}
                          color={index < averageRating ? "#FFD700" : "#E0E0E0"}
                        />
                      ))}
                      <Text style={styles.ratingText}>
                        {loading
                          ? t('updating')
                          : `${averageRating.toFixed(1)} (${ratingCount} ${ratingCount === 1 ? t('rating') : t('ratings_plural')})`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Posts/Media */}
                {postMedia.length > 0 && (
                  <View style={styles.postsSection}>
                    <Text style={styles.sectionTitle}>{t('posted_announcements')}</Text>
                    <View style={styles.postsContainer}>
                      {postMedia.map((media, index) => (
                        <View key={index} style={styles.postCard}>
                          <Text style={styles.postDescription}>
                            {media?.description?.en || media?.description?.fr || t('no_post_description')}
                          </Text>
                          {media?.price !== null && (
                            <View style={styles.priceContainer}>
                              <Text style={styles.priceLabel}>{t('price')}</Text>
                              <Text style={styles.priceValue}>{media.price} €</Text>
                            </View>
                          )}
                          {media?.description?.en?.match(/(https?:\/\/[^\s]+)/gi) && (
                            <TouchableOpacity style={styles.linkContainer}>
                              <Ionicons name="link-outline" size={16} color={AppColors.primary} />
                              <Text style={styles.linkText}>
                                {media.description.en.match(/(https?:\/\/[^\s]+)/gi)?.[0]}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
          </ScrollView>
        </View>
      </View>   
    </Modal>
  );
}

const styles = StyleSheet.create({   
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 10,
  },
  favoriteButton: {
    position: 'absolute',
    top: 20,
    right: 20,
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
  address: {
    fontSize: height(1.8),
    marginBottom: 20,
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
  ratingContainer:{
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    padding: 20,
    alignItems: 'center',
    maxHeight: '60%',
  },
  scrollContent: {
    width: '100%',
    paddingBottom: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  tag: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  selectedTag: {
    borderColor: AppColors.primary_faded_dark,
    borderWidth: 2,
  },
  tagText: {
    fontSize: height(1.5),
    fontFamily: "Roboto-Medium",
    color: AppColors.primary,
  },
  selectedTagText: {
    color: AppColors.primary,
  },
  title: {
    fontSize: height(2.4),
    fontWeight: '700',
    marginBottom: 12,
    color: '#1A1A1A',
    lineHeight: height(2.8),
  },
  description: {
    fontSize: height(1.9),
    marginBottom: 24,
    color: '#4A4A4A',
    lineHeight: height(2.3),
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  ratingLabel: {
    fontSize: height(1.8),
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
    marginRight: 2,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: height(1.8),
    color: '#666',
    fontWeight: '500',
  },
  closeButtonText: {
    color: AppColors.primary,
    fontWeight: 'bold',
  },
  goHomeButton: {
    position: 'absolute',
    top: 20,
    right: 80,
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
  mediaContainer: {
    marginTop: 20,
    width: '100%',
  },
  mediaCard: {
    backgroundColor: AppColors.white_200,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
  },
  mediaText: {
    fontSize: 14,
    color: AppColors.black,
    marginBottom: 6,
  },
  mediaPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: AppColors.primary,
  },
  mediaLink: {
    fontSize: 13,
    color: AppColors.primary,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  minuteInput: {
    width: 36,
  },
  // Opening hours styles
  openingHourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  openingHourDay: {
    fontSize: height(1.8),
    fontWeight: '600',
    color: '#333',
    minWidth: 100,
  },
  openingHourText: {
    fontSize: height(1.8),
    color: '#666',
    textAlign: 'right',
  },
  // Ratings related styles
  ratingsSection: {
    marginTop: 24,
    width: '100%',
  },
  // Post/Media related styles
  postsSection: {
    marginTop: 24,
    width: '100%',
  },
  sectionTitle: {
    fontSize: height(2.2),
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  postsContainer: {
    width: '100%',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postDescription: {
    fontSize: height(1.8),
    color: '#4A4A4A',
    lineHeight: height(2.2),
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: height(1.6),
    color: '#666',
    marginRight: 8,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: height(1.8),
    fontWeight: '700',
    color: '#007BFF',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  linkText: {
    fontSize: height(1.6),
    color: '#007BFF',
    marginLeft: 6,
    textDecorationLine: 'underline',
    flex: 1,
  },
});

export default ItemDetailModal; 