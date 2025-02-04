import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { AppColors } from "../../utils";
import { height } from "../../utils/dimension";
import { collection, addDoc, updateDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../../firebaseconfig';
import { getAuth } from 'firebase/auth';
import AddressComponent from './AddressComponent';
import logging from '../../utils/logging';

import { toggleFavoriteStore } from '../../Redux/Actions/UserActions';
import { useDispatch, useSelector } from 'react-redux';

const ItemDetailModal = ({ visible, onClose, item }) => {
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const isFavorite = useSelector(state => state.user.favoriteStores.includes(item.id));


  const auth = getAuth();
  logging('passing down item', item);
  const address = (itemAddress) => {
    logging('getting this address', itemAddress);
    const location = itemAddress.length > 0 ? itemAddress[0].location : {address: {street: ''}, city: {name:'', postal_code: ''}, geopoint: ''};
    const street = location?.address?.street || '';
    const city = location?.city?.name || '';
    const postalCode = location?.city?.postal_code || '';
    const geoHash = location?.geopoint || '';
    return {street, postalCode, city, geoHash};
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
    if (!auth.currentUser) {
      Alert.alert('Login Required', 'Please login to rate items');
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

      if (userRatingSnapshot.empty) { //check firebase doc
        await addDoc(ratingsRef, {
          store_id: item.id,
          user_profile_id: auth.currentUser.uid,
          score: score,
          created: serverTimestamp(),
          updated:null,
          comment:null,
          is_active:true,
          is_deleted:false,
        });
      } else {
        const ratingDoc = userRatingSnapshot.docs[0].ref;
        await updateDoc(ratingDoc, {
          score: score,
          updated_at: serverTimestamp()
        });
      }

      setUserRating(score);
      await fetchStoreRatings();
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchStoreRatings();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.title}>{item.title}</Text>
              <AddressComponent address={address(item.address)} />

              <View style={styles.tagsContainer}>
                {item.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.description}>{item.description}</Text>
              <View style={styles.ratingContainer}>
                <View style={styles.ratingSection}>
                  <Text style={styles.sectionTitle}>Your rating</Text>
                  <View style={styles.rating}>
                    {[...Array(5)].map((_, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => submitRating(index + 1)}
                        disabled={loading}
                      >
                        <Ionicons
                          name={index < userRating ? "star" : "star-outline"}
                          size={height(2.5)}
                          color={index < userRating ? "gold" : "gray"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
               
                <View style={styles.ratingSection}>
                  <Text style={styles.sectionTitle}>Shopper's rating</Text>
                  <View style={styles.rating}>
                    {[...Array(5)].map((_, index) => (
                      <Ionicons
                        key={index}
                        name={index < averageRating ? "star" : "star-outline"}
                        size={height(2.5)}
                        color={index < averageRating ? "gold" : "gray"}
                      />
                    ))}
                    <Text style={styles.ratingText}>
                      {loading ? 'Updating...' : 
                       `${averageRating.toFixed(1)} (${ratingCount} ${ratingCount === 1 ? 'rating' : 'ratings'})`}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.favoriteContainer}>
                <TouchableOpacity
                  onPress={() => dispatch(toggleFavoriteStore(item.id))}
                  style={styles.favoriteButton}
                >
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={height(2.5)}
                    color={isFavorite ? "red" : "gray"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  favoriteContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',

  },
  address: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  tag: {
    backgroundColor: "#f0f0f0",
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 5,
  },
  tagText: {
    fontSize: height(1.5),
    fontFamily: "Mulish-Bold",
    color: AppColors.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
    backgroundColor: AppColors.grey_100,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ItemDetailModal; 