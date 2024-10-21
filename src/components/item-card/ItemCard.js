// components/Card.js
import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { height, width } from "../../utils/dimension";
import { AppColors } from "../../utils";

const ItemCard = ({
  title,
  rating,
  tags,
  description,
  image,
  fromFavorite = false,
}) => {
  return (
    <View style={styles.card}>
      {/* Image Section */}
      <View>
        <Image style={styles.image} source={image} />
        <View
          style={[
            styles.image,
            { position: "absolute", backgroundColor: "rgba(0,0,0,0.2)" },
          ]}
        />
        {fromFavorite ? null : (
          <TouchableOpacity style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={AppColors.white}
            />
          </TouchableOpacity>
        )}
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
              color={index < Math.round(rating) ? "gold" : "gray"}
            />
          ))}
        </View>

        {/* Tags Section */}
        {fromFavorite ? null : (
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
        )}

        {/* Description */}
        {fromFavorite ? (
          <Text style={styles.description}>{description}</Text>
        ) : (
          <>
            <View style={styles.descriptionrating}>
              <Text style={styles.descriptionHeading}>Description</Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <Ionicons name="star" size={height(2.5)} color={"gold"} />
                <Text style={styles.ratingText}> ({rating.toFixed(1)})</Text>
              </View>
            </View>
            <Text style={styles.description}>{description}</Text>
            <TouchableOpacity style={styles.favoriteIcon}>
              <Ionicons name="heart" size={24} color={AppColors.white} />
            </TouchableOpacity>
          </>
        )}

        {/* Posts (Optional Placeholder for now) */}
      </View>
    </View>
  );
};

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
    backgroundColor: AppColors.primary,
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
