import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Alert } from 'react-native';
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
                <Ionicons name="home-outline" size={15} color="white" />
              </TouchableOpacity>
              
                <TouchableOpacity
                  onPress={handleToggleFavoriteFromModal}
                  style={styles.favoriteButton}
                >
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={height(2.5)}
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

            <Text style={styles.description}>{item.description || "aa"}</Text>

            {item.openingHours && (
              <View style={{ width: '100%', marginTop: 20 }}>
                <Text style={styles.sectionTitle}>Horaires d'ouverture</Text>
                {days.map((dayKey) => {
                  const dayHours = item.openingHours[dayKey];
                  const dayLabel = daysLabels[dayKey];

                  let hoursText = "";

                  if (dayHours?.morning && dayHours?.afternoon) {
                    hoursText = `${dayHours.morning.start}h - ${dayHours.morning.end}h / ${dayHours.afternoon.start}h - ${dayHours.afternoon.end}h`;
                  } else if (dayHours?.morning) {
                    hoursText = `${dayHours.morning.start}h - ${dayHours.morning.end}h`;
                  } else if (dayHours?.afternoon) {
                    hoursText = `${dayHours.afternoon.start}h - ${dayHours.afternoon.end}h`;
                  } else {
                    hoursText = "Close";
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
  },
  address: {
    fontSize: height(1.8),
    marginBottom: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
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
  title: {
    fontSize: height(2.3),
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: height(1.8),
    marginBottom: 20,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: height(1.8),
    color: '#666',
  },
  closeButtonText: {
    color: AppColors.primary,
    fontWeight: 'bold',
  },
  goHomeButton: {
    position: 'absolute',
    top: 0,
    right: 40,
    padding: 10,
    backgroundColor: AppColors.black,
    borderRadius: 30,
    elevation: 5,
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
  }
});

export default ItemDetailModal; 