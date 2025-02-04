import React from "react";

import ScreenWrapper from "../../../components/screen-wrapper";

import { AppColors } from "../../../utils";

import Header from "../../../components/header";

import { height, width } from "../../../utils/dimension";
import ListItem from "../../../components/list-item";
import { View } from "react-native";
import { signOut } from "../../../Redux/Actions/UserActions";
import { useDispatch } from "react-redux";
import CountrySelector from "../../../components/CountrySelector";

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
        containerStyle={{ width: width(90), alignSelf: "center" }}
      />
      <View style={{ padding: 20 }}>  
        <CountrySelector />
      </View>
    </ScreenWrapper>
  );
}
