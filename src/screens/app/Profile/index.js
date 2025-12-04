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
import { useTranslation } from "../../../utils/useTranslation";
import { ScreenNames } from "../../../Routes/routes";
import EmailVerificationBanner from "../../../components/email-verification";
import { setLocale } from "../../../Redux/Slices/localeSlice";
import LanguageSelector from "../../../components/language-selector";
export default function Profile({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.userData);
  const { t, locale } = useTranslation();

  const handlePress = (screen) => {
    if (screen) {
      navigation.navigate(screen);
    }
  };

  const handleLogout = () => {
    dispatch(signOut());
  };

  const handleLanguageChange = (selectedValue) => {
    dispatch(setLocale(selectedValue));
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
        title={t('profile_title')}
        containerStyle={{ width: width(90), alignSelf: "center"}}
      />
      
      {/* Email Verification Banner */}
      <EmailVerificationBanner />
      
      <ScrollView 
        style={{ paddingHorizontal: 20, marginTop: 30 }}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account Section */}
        <View style={styles.sectionContainer}>
          <CustomText size={2.6} color={AppColors.primary} style={{ marginLeft: 4, fontWeight: 'bold' }}>
            {t('account')}
          </CustomText>
          <View style={{ height: 20 }} />
          {[
            { titleKey: "change_email_name", screen: "ChangeEmailScreen" },
            { titleKey: "forgot_password", screen: "RecoverPasswordScreen" },
            { titleKey: "recover_old_account", screen: "RecoverAccountScreen" },
          ].map((option) => (
            <TouchableOpacity
              key={option.titleKey}
              style={styles.optionTile}
              onPress={() => handlePress(option.screen)}
            >
              <View style={styles.optionContent}>
                <CustomText size={1.8} color={AppColors.black}>
                  {t(option.titleKey)}
                </CustomText>
                <Ionicons name="chevron-forward" size={20} color={AppColors.grey_300} />
              </View>
            </TouchableOpacity>
          ))}

          {/* Language Selector */}
          <View style={styles.languageDropdownContainer}>
            <LanguageSelector
              currentLocale={locale}
              onLanguageChange={handleLanguageChange}
            />
          </View>
        </View>

        {/* Support Section *
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
                {t('contact_support')}
              </CustomText>
                <Ionicons name="chevron-forward" size={20} color={AppColors.grey_300} />
              </View>
            </TouchableOpacity>
          </View>
        )}
        */}

        {/* Store Section */}
        <View style={styles.sectionContainer}>
          <CustomText size={2.6} color={AppColors.primary} style={{ marginLeft: 4, fontWeight: 'bold' }}>
            Store
          </CustomText>
          <View style={{ height: 20 }} />
          <TouchableOpacity
            style={styles.optionTile}
            onPress={() => handlePress("AddStoreScreen")}
          >
            <View style={styles.optionContent}>
              <CustomText size={1.8} color={AppColors.black}>
                {t('add_a_store')}
              </CustomText>
              <Ionicons name="chevron-forward" size={20} color={AppColors.grey_300} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Feedback Section */}
        <View style={styles.sectionContainer}>
          <CustomText size={2.6} color={AppColors.primary} style={{ marginLeft: 4, fontWeight: 'bold' }}>
            {t('feedback')}
          </CustomText>
          <View style={{ height: 20 }} />
          {[
            { titleKey: "report_issue", screen: "ReportIssueScreen" },
            { titleKey: "suggest_idea", screen: "SuggestIdeaScreen" },
          ].map((option) => (
            <TouchableOpacity
              key={option.titleKey}
              style={styles.optionTile}
              onPress={() => handlePress(option.screen)}
            >
              <View style={styles.optionContent}>
                <CustomText size={1.8} color={AppColors.black}>
                  {t(option.titleKey)}
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
            <CustomText size={3} color={AppColors.white} >
              {user ? t('log_out') : t('go_to_signup')}
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
  languageIndicator: {
    backgroundColor: AppColors.grey_100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  languageDropdownContainer: {
    backgroundColor: AppColors.white_100,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 60,
    zIndex: 9999,
    elevation: 9999,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
});