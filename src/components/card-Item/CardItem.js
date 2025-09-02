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
  const [modalVisible, setModalVisible] = useState(false);
  
  const _id = item.id;
  const _description = item.description?.en || item.description?.fr || "";
  const _tags = item.tags ?? item.category ?? [];
  const _address = item.address;
  const _title = item.name;
  const _openingHours = item.openingHours;

  const isFavorite = useMemo(() => {
    return favoriteStores.includes(item.id);
  }, [favoriteStores, item.id]);

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
        <View style={styles.cardContent}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.name} numberOfLines={1}>{_title}</Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation(); // Prevent card press
                dispatch(toggleFavoriteStore(item.id));
              }}
              style={styles.favoriteButton}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={height(2.2)}
                color={isFavorite ? "#FF6B6B" : "#7F8C8D"}
              />
            </TouchableOpacity>
          </View>

          {/* Categories Preview */}
          {_tags && _tags.length > 0 && (
            <View style={styles.categoriesPreview}>
              <Text style={styles.categoriesText} numberOfLines={1}>
                {_tags.slice(0, 2).join(' • ')}
                {_tags.length > 2 && ` +${_tags.length - 2} more`}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <ItemDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        item={{
          id: _id,
          title: _title,
          description: _description,
          tags: _tags,
          address: _address,
          openingHours: _openingHours || null,
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minWidth: width(70),
    maxWidth: width(75),
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: AppColors.primary,
    transform: [{ scale: 1.02 }],
  },
  cardContent: {
    padding: 12,
  },
  
  // Header Section
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  name: {
    fontSize: height(1.8),
    fontFamily: "Mulish-Bold",
    color: "#2C3E50",
    flex: 1,
    marginRight: 8,
  },
  favoriteButton: {
    padding: 2,
  },
  
  // Categories Preview
  categoriesPreview: {
    marginTop: 2,
  },
  categoriesText: {
    fontSize: height(1.3),
    fontFamily: "Mulish-Regular",
    color: "#7F8C8D",
    lineHeight: height(1.8),
  },
});

export default CardItem; 