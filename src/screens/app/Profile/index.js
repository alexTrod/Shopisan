import React from "react";

import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import Header from "../../../components/header";
import CustomText from '../../../components/text';
import { height, width } from "../../../utils/dimension";
import { View, TouchableOpacity, StyleSheet, ScrollView, Linking } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { signOut } from "../../../Redux/Actions/UserActions";
import ChevronRight from "../../../../assets/icons/chevron-right";
import InstagramIcon from "../../../../assets/icons/instagram-icon";
import GlobeIcon from "../../../../assets/icons/globe-icon";
import LogoutIcon from "../../../../assets/icons/logout-icon";
import { useTranslation } from "../../../utils/useTranslation";
import { ScreenNames } from "../../../Routes/routes";
import EmailVerificationBanner from "../../../components/email-verification";
import { setLocale } from "../../../Redux/Slices/localeSlice";
import LanguageSelector from "../../../components/language-selector";
import { doc, updateDoc } from "firebase/firestore";
import { firestore, auth } from "../../../../firebaseconfig";
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

  const handleLanguageChange = async (selectedValue) => {
    dispatch(setLocale(selectedValue));

    // Update language in user's Firestore profile
    if (auth.currentUser) {
      try {
        const userRef = doc(firestore, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { language: selectedValue });
      } catch (error) {
        console.warn('Failed to update language in profile:', error);
      }
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
                <ChevronRight width={20} height={20} color={AppColors.grey_300} />
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
                <ChevronRight width={20} height={20} color={AppColors.grey_300} />
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
              <ChevronRight width={20} height={20} color={AppColors.grey_300} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Feedback Section */}
        <View style={styles.sectionContainer}>
          <CustomText size={2.6} color={AppColors.primary} style={{ marginLeft: 4, fontWeight: 'bold' }}>
            {t('feedback')}
          </CustomText>
          <View style={{ height: 20 }} />

          {/* Contact Support */}
          <TouchableOpacity
            style={styles.optionTile}
            onPress={() => handlePress("ContactSupportScreen")}
          >
            <View style={styles.optionContent}>
              <CustomText size={1.8} color={AppColors.black}>
                {t('contact_support')}
              </CustomText>
              <ChevronRight width={20} height={20} color={AppColors.grey_300} />
            </View>
          </TouchableOpacity>

          {/* Social Links */}
          <View style={styles.socialLinksContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://instagram.com/shopisan')}
            >
              <InstagramIcon width={24} height={24} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://shopisan.com')}
            >
              <GlobeIcon width={24} height={24} color={AppColors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogoutIcon width={20} height={20} color={AppColors.white} />
          <CustomText size={2} color={AppColors.white} style={{ marginLeft: 10, fontWeight: '600' }}>
            {user ? t('log_out') : t('go_to_signup')}
          </CustomText>
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
  socialLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 20,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.white_100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    marginTop: 20,
    marginBottom: 40,
    shadowColor: AppColors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
});