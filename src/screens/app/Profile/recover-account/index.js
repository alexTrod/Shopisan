import React, { useState } from "react";
import { View, TextInput, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "../../../../../firebaseconfig";
import ScreenWrapper from "../../../../components/screen-wrapper";
import Header from "../../../../components/header";
import Button from "../../../../components/button";
import { AppColors } from "../../../../utils";
import { width } from "../../../../utils/dimension";

export default function ChangeNameScreen() {
  return (
    <ScreenWrapper backgroundColor={AppColors.white_100}>
      <Header
        showLeft
        showBack
        title="Récupérer l'ancien compte"
        containerStyle={{ width: width(90), alignSelf: "center" }}
      />
    </ScreenWrapper>
  );
}
