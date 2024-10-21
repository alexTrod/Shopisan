// components/ListItem.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // For the right arrow icon
import ShopFilled from "../../../assets/icons/shop-filled";
import { height, width } from "../../utils/dimension";
import { AppColors } from "../../utils";
import LogoutIcon from "../../../assets/icons/logout";
import PostIcon from "../../../assets/icons/add-post-icon";

const ListItem = ({ iconName, iconType, text, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.iconContainer}>
        {iconType === "shop" ? (
          <ShopFilled height={height(2)} width={height(2)} />
        ) : iconType === "post" ? (
          <PostIcon height={height(2.5)} width={height(2.5)} />
        ) : (
          <LogoutIcon height={height(2.5)} width={height(2.5)} />
        )}
      </View>

      <Text style={styles.text}>{text}</Text>

      <Ionicons
        name="chevron-forward-outline"
        size={height(2)}
        color="#4C4B5E"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "white",
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3, // For Android
  },
  iconContainer: {
    marginRight: 15,
  },
  text: {
    flex: 1,
    fontSize: height(2),
    color: AppColors.primary,
    fontFamily: "Mulish-Bold",
  },
});

export default ListItem;
