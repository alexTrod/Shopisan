import React from "react";

import ScreenWrapper from "../../../components/screen-wrapper";

import { AppColors } from "../../../utils";

import Header from "../../../components/header";

import { height, width } from "../../../utils/dimension";
import ListItem from "../../../components/list-item";
import { View } from "react-native";
import { logout } from "../../../Redux/Actions/Auth";
import { useDispatch } from "react-redux";

export default function Profile({ navigation }) {
  const dispatch = useDispatch();
  return (
    <ScreenWrapper
      backgroundColor={AppColors.white_100}
      statusBarColor={AppColors.white_100}
      barStyle="dark-content"
    >
      <Header
        showLeft={true}
        showBack
        title="Profile"
        rightIcon
        onRightPress={() => {}}
        containerStyle={{ width: width(90), alignSelf: "center" }}
      />
      <View
        style={{ width: width(90), alignSelf: "center", marginTop: height(4) }}
      >
        <ListItem
          iconType="shop"
          text="Inspection boutique"
          onPress={() => alert("Go to Shop Inspection")}
        />
        <ListItem
          iconType="post"
          text="Publier un post"
          onPress={() => alert("Go to Post Publishing")}
        />
        <ListItem
          iconType="logout"
          text="Se deconnecter"
          onPress={() => {
            dispatch(logout());
          }}
        />
      </View>
    </ScreenWrapper>
  );
}
