import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { height, width } from "../../utils/dimension";
import { useDispatch, useSelector } from "react-redux";
import { toggleFavoriteStore } from "../../Redux/Actions/UserActions";
import { selectFavoriteStores } from "../../Redux/Selectors/UserSelectors";
import { fetchStoreRatings } from "../../utils/storeUtils";
import logging from "../../utils/logging";
import { AppColors } from "../../utils";
import ItemDetailModal from "../item-card/ItemDetailModal";
import toDetailItem from "../item-card/toDetailItem";
import { useTranslation } from "../../utils/useTranslation";
import CustomText from "../text";

const CardItem = ({ item, isSelected, onPress }) => {
  const dispatch = useDispatch();
  const { t, locale } = useTranslation();
  const favoriteStores = useSelector(selectFavoriteStores);
  const user = useSelector((state) => state.user.userData);
  const [rating, setRating] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const detailItem = useMemo(
    () => toDetailItem(item, { locale }),
    [item, locale],
  );

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

  const handleToggleFavorite = (e) => {
    e.stopPropagation(); // Prevent card press

    if (!user) {
      Alert.alert(
        t("login_required"),
        t("login_required_add_favorite_message"),
        [
          {
            text: t("ok"),
            style: "cancel",
          },
        ],
        { cancelable: true },
      );
      return;
    }

    dispatch(toggleFavoriteStore(item.id));
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.card, isSelected && styles.selectedCard]}
      >
        <View style={styles.info}>
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              onPress={handleToggleFavorite}
              style={styles.favoriteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={height(3)}
                color={isFavorite ? "red" : "gray"}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {[...Array(5)].map((_, i) => (
                <FontAwesome
                  key={i}
                  name="star"
                  size={14}
                  color={i < rating ? "#FFD700" : "#E0E0E0"}
                  style={styles.starIcon}
                />
              ))}
            </View>
            <CustomText style={styles.ratingText}>
              {rating > 0 ? rating.toFixed(1) : t("no_rating")}
            </CustomText>
          </View>
        </View>
      </TouchableOpacity>

      <ItemDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        item={detailItem}
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
    padding: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    width: "100%",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  favoriteButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 36,
    minHeight: 36,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stars: {
    flexDirection: "row",
    marginRight: 8,
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: AppColors.primary,
    transform: [{ scale: 1.05 }],
  },
});

export default CardItem;
