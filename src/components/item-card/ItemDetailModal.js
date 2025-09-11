import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Alert } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { AppColors } from "../../utils";
import { height, width } from "../../utils/dimension";
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
import CustomText from "../../components/text";
import { ScrollView } from 'react-native';

const ItemDetailModal = ({ visible, onClose, item }) => {
  const navigation = useNavigation();
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
  
  const daysLabels = {
    monday: "Lundi",
    tuesday: "Mardi",
    wednesday: "Mercredi",
    thursday: "Jeudi",
    friday: "Vendredi",
    saturday: "Samedi",
    sunday: "Dimanche"
  };  

  const auth = getAuth();
  const address = (itemAddress) => {
    const location = itemAddress.length > 0 ? itemAddress[0].location : {
      address: {street: ''}, 
      city: {name:'', postal_code: ''}, 
      geopoint: null  // Change from empty string to null for better validation
    };
    const street = location?.address?.street || '';
    const city = location?.city?.name || '';
    const postalCode = location?.city?.postal_code || '';
    const geoHash = location?.geopoint || null;  // Change from empty string to null
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
      console.error("Erreur lors de la récupération des médias :", error);
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
        "Login Required",
        "You need to be logged in to view your favorite stores. Do you want to go to the login page?",
        [
          { text: "No", style: "cancel" },
          { text: "Yes", onPress: () => {
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
      Alert.alert('Erreur', 'Impossible de soumettre la note');
    } finally {
      setLoading(false);
    }
  };  

  useEffect(() => {
    if (visible && item?.id) {
      fetchStoreRatings();
      fetchPostMedia();
    }
  }, [visible, item?.id]);

  const handleGoToHome = (store) => {
    onClose();
    setTimeout(() => {
      navigation.navigate(ScreenNames.HOME, {
        merge: true,
        initialStoreFromMap: store,
      });
    }, 300);
  };  
  
  const handleToggleFavoriteFromModal = () => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to add a favorite.",
        [
          { 
            text: "Ok", 
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
        <CustomText>Déconnexion en cours...</CustomText>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>   
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTop}>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={AppColors.primary} />
                  </TouchableOpacity>
                  
                  <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => handleGoToHome(item)} style={styles.goHomeButton}>
                      <Ionicons name="home-outline" size={16} color="white" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={handleToggleFavoriteFromModal}
                      style={styles.favoriteButton}
                    >
                      <Ionicons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={22}
                        color={isFavorite ? "#FF6B6B" : "#7F8C8D"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Store Title */}
                <View style={styles.titleSection}>
                  <Text style={styles.title}>{item.title}</Text>
                </View>

                {/* Address */}
                <View style={styles.addressSection}>
                  <AddressComponent address={address(item.address)} />
                </View>

                {/* Categories */}
                {item.tags && item.tags.length > 0 && (
                  <View style={styles.categoriesSection}>
                    <Text style={styles.sectionTitle}>Categories</Text>
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
                  </View>
                )}

                {/* Description */}
                {item.description && (
                  <View style={styles.descriptionSection}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.description}>{item.description}</Text>
                  </View>
                )}

                {/* Opening Hours */}
                {item.openingHours && (
                  <View style={styles.openingHoursSection}>
                    <Text style={styles.sectionTitle}>Horaires d'ouverture</Text>
                    <View style={styles.openingHoursContainer}>
                      {days.map((dayKey) => {
                        const dayHours = item.openingHours[dayKey];
                        const dayLabel = daysLabels[dayKey];

                        let hoursText = "";
                        let isOpen = false;

                        if (dayHours?.morning && dayHours?.afternoon) {
                          hoursText = `${dayHours.morning.start}h - ${dayHours.morning.end}h / ${dayHours.afternoon.start}h - ${dayHours.afternoon.end}h`;
                          isOpen = true;
                        } else if (dayHours?.morning) {
                          hoursText = `${dayHours.morning.start}h - ${dayHours.morning.end}h`;
                          isOpen = true;
                        } else if (dayHours?.afternoon) {
                          hoursText = `${dayHours.afternoon.start}h - ${dayHours.afternoon.end}h`;
                          isOpen = true;
                        } else {
                          hoursText = "Fermé";
                          isOpen = false;
                        }

                        return (
                          <View key={dayKey} style={styles.openingHourRow}>
                            <Text style={styles.openingHourDay}>{dayLabel}</Text>
                            <View style={styles.openingHourContent}>
                              <View style={[styles.statusIndicator, { backgroundColor: isOpen ? '#4CAF50' : '#F44336' }]} />
                              <Text style={[styles.openingHourText, { color: isOpen ? '#2C3E50' : '#7F8C8D' }]}>
                                {hoursText}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Ratings */}
                <View style={styles.ratingsSection}>
                  <Text style={styles.sectionTitle}>Ratings</Text>
                  
                  {/* User Rating */}
                  <View style={styles.ratingCard}>
                    <Text style={styles.ratingLabel}>Your rating</Text>
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
                    <Text style={styles.ratingLabel}>Community rating</Text>
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
                          ? 'Updating...'
                          : `${averageRating.toFixed(1)} (${ratingCount} ${ratingCount === 1 ? 'rating' : 'ratings'})`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Posts/Media */}
                {postMedia.length > 0 && (
                  <View style={styles.postsSection}>
                    <Text style={styles.sectionTitle}>Annonces postées</Text>
                    <View style={styles.postsContainer}>
                      {postMedia.map((media, index) => (
                        <View key={index} style={styles.postCard}>
                          <Text style={styles.postDescription}>
                            {media?.description?.en || media?.description?.fr || "Pas de description."}
                          </Text>
                          {media?.price !== null && (
                            <View style={styles.priceContainer}>
                              <Text style={styles.priceLabel}>Prix:</Text>
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
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({   
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
  },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTop: {

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    padding: 5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goHomeButton: {
    padding: 8,
    backgroundColor: AppColors.black,
    borderRadius: 20,
  },
  favoriteButton: {
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
  },
  
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  
  // Title Section
  titleSection: {
    marginTop: 20,
    marginBottom: 15,
  },
  title: {
    fontSize: height(2.8),
    fontFamily: "Mulish-Bold",
    color: "#2C3E50",
    lineHeight: height(3.4),
  },
  
  // Address Section
  addressSection: {
    marginBottom: 20,
  },
  
  // Categories Section
  categoriesSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: height(2),
    fontFamily: "Mulish-Bold",
    color: "#2C3E50",
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: AppColors.primary_faded,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  
  // Description Section
  descriptionSection: {
    marginBottom: 25,
  },
  description: {
    fontSize: height(1.6),
    fontFamily: "Mulish-Regular",
    color: "#7F8C8D",
    lineHeight: height(2.4),
  },
  
  // Opening Hours Section
  openingHoursSection: {
    marginBottom: 25,
  },
  openingHoursContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  openingHourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  openingHourDay: {
    fontSize: height(1.5),
    fontFamily: "Mulish-SemiBold",
    color: "#2C3E50",
    flex: 1,
  },
  openingHourContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  openingHourText: {
    fontSize: height(1.4),
    fontFamily: "Mulish-Regular",
  },
  
  // Ratings Section
  ratingsSection: {
    marginBottom: 25,
  },
  ratingCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: height(1.6),
    fontFamily: "Mulish-SemiBold",
    color: "#2C3E50",
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    marginRight: 4,
  },
  ratingText: {
    marginLeft: 12,
    fontSize: height(1.4),
    fontFamily: "Mulish-Medium",
    color: '#7F8C8D',
  },
  
  // Posts Section
  postsSection: {
    marginBottom: 20,
  },
  postsContainer: {
    gap: 12,
  },
  postCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  postDescription: {
    fontSize: height(1.5),
    fontFamily: "Mulish-Regular",
    color: "#2C3E50",
    marginBottom: 8,
    lineHeight: height(2.2),
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: height(1.4),
    fontFamily: "Mulish-Medium",
    color: "#7F8C8D",
    marginRight: 6,
  },
  priceValue: {
    fontSize: height(1.5),
    fontFamily: "Mulish-Bold",
    color: AppColors.primary,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  linkText: {
    fontSize: height(1.3),
    fontFamily: "Mulish-Regular",
    color: AppColors.primary,
    textDecorationLine: 'underline',
    marginLeft: 4,
    flex: 1,
  },
});

export default ItemDetailModal; 