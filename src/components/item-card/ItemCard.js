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
import { toggleFavoriteStore } from "../../Redux/Actions/UserActions";
import { useDispatch, useSelector } from 'react-redux';
import { selectFavoriteStores } from '../../Redux/Selectors/UserSelectors';
import ItemDetailModal from './ItemDetailModal';


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
}) => {

  const dispatch = useDispatch();

  const favoriteStores = useSelector(selectFavoriteStores);
  
  const isFavorite = useMemo(() => {
    return favoriteStores.includes(id);
  }, [favoriteStores, id]);

  const [rating, setRating] = useState({ averageRating: 0, ratingCount: 0 });
  const [modalVisible, setModalVisible] = useState(false);

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

  return (
    <View style={styles.card}>
      {/* Image Section */}
      <View>
        <Image style={styles.image} source={image || placeholders[Math.floor(id % placeholders.length)]} />
        <View
          style={[
            styles.image,
            { position: "absolute", backgroundColor: "rgba(0,0,0,0.2)" },
          ]}
        />
        {
          <TouchableOpacity style={styles.infoIcon} onPress={handleInfoPress}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={AppColors.white}
            />
          </TouchableOpacity>
        }
      </View>

      {/* Content Section */}
      <View style={styles.cardContent}>
        <Text style={styles.title}>{title}</Text>

        {/* Rating Section */}
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

        {/* Tags Section */}
        {
          <View style={styles.tags}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {tags.map((tag, index) => (
                <TouchableOpacity key={index} style={styles.tag}>
                  <Text
                    style={{
                      fontSize: height(1.5),
                      fontFamily: "Mulish-Bold",
                      color: AppColors.primary,
                    }}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }

        {/* Description */}
        {
          <>
            <View style={styles.descriptionrating}>


            </View>
            <Text style={styles.description}>
              {description.length > 150 ? `${description.substring(0, 150)}...` : description}
            </Text>
            <TouchableOpacity style={styles.favoriteIcon} onPress={() => dispatch(toggleFavoriteStore(id))}>
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={24} 
                color={AppColors.primary} 
              />
            </TouchableOpacity>
          </>
        }

        {/* Posts (Optional Placeholder for now) */}
      </View>
      <ItemDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        item={{ id, title, description, tags, address }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.white_200,
    borderRadius: 10,
    overflow: "hidden",
    marginVertical: 10,
    // marginHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 5, // For Android
    width: width(85),
    alignSelf: "center",
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
  cardContent: {
    padding: 10,
  },
  title: {
    fontSize: height(2),
    fontFamily: "Mulish-Bold",
  },
  descriptionHeading: {
    fontSize: height(1.8),
    fontFamily: "Mulish-Bold",
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
  descriptionrating: {
    flexDirection: "row",
    alignItems: "center",

    marginVertical: 5,
    justifyContent: "space-between",
  },
  ratingText: {
    marginLeft: 5,
    color: "gray",
  },
  tags: {
    flexDirection: "row",
    marginVertical: 5,
  },
  tag: {
    backgroundColor: "#f0f0f0",
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 5,
  },
  description: {
    marginTop: 10,
    color: "gray",
  },
  posts: {
    marginTop: 15,
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default ItemCard;
