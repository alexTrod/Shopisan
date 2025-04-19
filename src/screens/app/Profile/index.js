import React from "react";

import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import Header from "../../../components/header";
import CustomText from '../../../components/text';
import { height, width } from "../../../utils/dimension";
import ListItem from "../../../components/list-item";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useDispatch } from "react-redux";
import { signOut } from "../../../Redux/Actions/UserActions";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function Profile({ navigation }) {
  const dispatch = useDispatch();

  const profileOptions = [
    { title: "Changer le nom", screen: "ChangeNameScreen" },
    { title: "Changer Adresse e-mail", screen: "ChangeEmailScreen" },
    { title: "Accéder au support", screen: "SupportScreen" },
    { title: "Récupérer le mot de passe", screen: "RecoverPasswordScreen" },
    { title: "Récupérer l'ancien compte", screen: "RecoverAccountScreen" },
    { title: "Ajouter un magasin", screen: "AddStoreScreen" },
    { title: "Signaler quelque chose", screen: "ReportIssueScreen" },
    { title: "Donner une idée / signaler un bug", screen: "SuggestIdeaScreen" },
  ];

  const handlePress = (screen) => {
    if (screen) {
      navigation.navigate(screen);
    }
  };

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
      <View style={{ paddingHorizontal: 20, marginTop: 30 }}>
        {profileOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionTile}
            onPress={() => handlePress(option.screen)}
          >
            <View style={styles.optionContent}>
              <CustomText size={1.8} color={AppColors.black}>
                {option.title}
              </CustomText>
              <Ionicons name="chevron-forward" size={20} color={AppColors.grey_300} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  optionTile: {
    backgroundColor: AppColors.white_100,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: height(1.5),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  optionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
});
