import React from "react";
import { View, Text, Image, StyleSheet, FlatList } from "react-native";
import { FontAwesome } from "@expo/vector-icons"; // Assuming you're using Expo
import { height, width } from "../../utils/dimension";

const FloatingCards = ({ data }) => {
  return (
    <View style={styles.floatingContainer}>
      <FlatList
        data={data ?? []}
        keyExtractor={(index) => {
          index.toString();
        }}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        // contentContainerStyle={{ paddingHorizontal: 10, flexGrow: 1 }}
        renderItem={({ item, index }) => {
          return (
            <View key={index} style={styles.card}>
              <Image source={item?.image} style={styles.image} />
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.stars}>
                  {/* Display 5 stars */}
                  {[...Array(5)].map((_, i) => (
                    <FontAwesome
                      key={i}
                      name="star"
                      size={16}
                      color={i < item.rating ? "#FFD700" : "#CCCCCC"} // Full or empty stars
                    />
                  ))}
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    bottom: height(10),
    width: width(100),
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20, // Rounded corners
    // padding: 10,
    paddingRight: height(2),
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // Adjusted width to match the design
    // height: height(15), // Adjusted height
    flexDirection: "row", // Align image and text in a row
    alignItems: "center",
    // flexGrow: 1,
  },
  image: {
    width: width(15),
    height: height(8),
    borderRadius: 15, // Rounded corners for the image
  },
  info: {
    paddingLeft: 10,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333", // Darker text color
  },
  stars: {
    flexDirection: "row",
    marginTop: 5,
  },
});

export default FloatingCards;
