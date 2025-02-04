import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { height, width } from "../../utils/dimension";
import { useDispatch, useSelector } from "react-redux";
import { toggleFavoriteStore } from '../../Redux/Actions/UserActions';
import { selectFavoriteStores } from '../../Redux/Selectors/UserSelectors';
import { fetchStoreRatings } from "../../utils/storeUtils";
import logging from "../../utils/logging";
import { AppColors } from "../../utils";
import ItemDetailModal from "../item-card/ItemDetailModal";


const CardItem = ({ item, isSelected, onPress }) => {
  const dispatch = useDispatch();
  const favoriteStores = useSelector(selectFavoriteStores);
  const [rating, setRating] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const categories = useSelector(state => state.categories.categories);

  
  const _id = item.id;
  const _description = item.description.en;
  const _tags = item.category;
  const _address = item.address;
  const _title = item.name;

  logging('item content', item);
  logging('_id', _id);
  logging('_description', _description);
  logging('_tags', _tags);
  logging('_address', _address);
  logging('_title', _title);

  const isFavorite = useMemo(() => {
    return favoriteStores.includes(item.id);
  }, [favoriteStores, item.id]);

  useEffect(() => {
    const loadRating = async () => {
      const currentRating = await fetchStoreRatings(item.id);
      setRating(currentRating.averageRating);
    };
    loadRating();
  }, [item.id]);

  const handlePress = () => {
    onPress(); // This will handle the map interaction
    setModalVisible(true); // This will open the modal
  };

  return (
    <>
      <TouchableOpacity 
        onPress={handlePress}
        style={[
          styles.card,
          isSelected && styles.selectedCard
        ]}
      >
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.stars}>
            {[...Array(5)].map((_, i) => (
              <FontAwesome
                key={i}
                name="star"
                size={16}
                color={i < rating ? "#FFD700" : "#CCCCCC"}
              />
            ))}
          </View>
          <View style={styles.favoriteContainer}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation(); // Prevent card press
                dispatch(toggleFavoriteStore(item.id));
              }}
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
      </TouchableOpacity>

      <ItemDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        item={{id:_id, title: _title,description: _description,tags: _tags,address: _address}}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    paddingRight: height(2),
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  info: {
    paddingLeft: 10,
    flex: 1,
    padding:10,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  stars: {
    flexDirection: "row",
    marginTop: 5,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: AppColors.primary,
    transform: [{ scale: 1.05 }],
  },
});

export default CardItem; 