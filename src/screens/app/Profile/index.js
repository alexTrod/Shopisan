import React from "react";

import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import Header from "../../../components/header";
import CustomText from '../../../components/text';
import { height, width } from "../../../utils/dimension";
import { View, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { signOut } from "../../../Redux/Actions/UserActions";
import { Ionicons } from "@expo/vector-icons";

export default function Profile({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.userData);

  const profileOptions = [
    { title: "Changer Adresse e-mail et nom", screen: "ChangeEmailScreen" },
    user?.userType === "merchant" && { title: "Accéder au support", screen: "SupportScreen" },
    { title: "Récupérer le mot de passe", screen: "RecoverPasswordScreen" },
    { title: "Récupérer l'ancien compte", screen: "RecoverAccountScreen" },
    { title: "Ajouter un magasin", screen: "AddStoreScreen" },
    { title: "Signaler quelque chose", screen: "ReportIssueScreen" },
    { title: "Donner une idée / signaler un bug", screen: "SuggestIdeaScreen" },
  ].filter(Boolean);

  const handlePress = (screen) => {
    if (screen) {
      navigation.navigate(screen);
    }
  };

  const handleLogout = () => {
    dispatch(signOut());
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
        containerStyle={{ width: width(90), alignSelf: "center"}}
      />
      
      <ScrollView style={{ paddingHorizontal: 20, marginTop: 30 }}>
        {/* Account Section */}
        <View style={styles.sectionContainer}>
          <CustomText size={2.6} color={AppColors.primary} style={{ marginLeft: 4, fontWeight: 'bold' }}>
            Account
          </CustomText>
          <View style={{ height: 20 }} />
          {[
            { title: "Changer Adresse e-mail et nom", screen: "ChangeEmailScreen" },
            { title: "Récupérer le mot de passe", screen: "RecoverPasswordScreen" },
            { title: "Récupérer l'ancien compte", screen: "RecoverAccountScreen" },
          ].map((option) => (
            <TouchableOpacity
              key={option.title}
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

        {/* Support Section */}
        {user?.userType === "merchant" && (
          <View style={styles.sectionContainer}>
            <CustomText size={2.6} color={AppColors.primary} style={{ marginLeft: 4, fontWeight: 'bold' }}>
              Support
            </CustomText>
            <View style={{ height: 20 }} />
            <TouchableOpacity
              style={styles.optionTile}
              onPress={() => handlePress("SupportScreen")}
            >
              <View style={styles.optionContent}>
                <CustomText size={1.8} color={AppColors.black}>
                  Accéder au support
                </CustomText>
                <Ionicons name="chevron-forward" size={20} color={AppColors.grey_300} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Magasin Section */}
        <View style={styles.sectionContainer}>
          <CustomText size={2.6} color={AppColors.primary} style={{ marginLeft: 4, fontWeight: 'bold' }}>
            Magasin
          </CustomText>
          <View style={{ height: 20 }} />
          <TouchableOpacity
            style={styles.optionTile}
            onPress={() => handlePress("AddStoreScreen")}
          >
            <View style={styles.optionContent}>
              <CustomText size={1.8} color={AppColors.black}>
                Ajouter un magasin
              </CustomText>
              <Ionicons name="chevron-forward" size={20} color={AppColors.grey_300} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Feedback Section */}
        <View style={styles.sectionContainer}>
          <CustomText size={2.6} color={AppColors.primary} style={{ marginLeft: 4, fontWeight: 'bold' }}>
            Feedback
          </CustomText>
          <View style={{ height: 20 }} />
          {[
            { title: "Signaler quelque chose", screen: "ReportIssueScreen" },
            { title: "Donner une idée / signaler un bug", screen: "SuggestIdeaScreen" },
          ].map((option) => (
            <TouchableOpacity
              key={option.title}
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


        <TouchableOpacity
          style={[styles.optionTile, { backgroundColor: AppColors.red }]}
          onPress={handleLogout}
        >
          <View style={styles.optionContent}>
            <CustomText size={1.8} color={AppColors.white}>
              {user ? 'Se déconnecter' : 'Accéder à l\'inscription'}
            </CustomText>
            <Ionicons name="log-out-outline" size={20} color={AppColors.white} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 40,
  },
  optionTile: {
    backgroundColor: AppColors.white_100,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
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