import React, { useState } from "react";

import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import { isOwnerType, userTypeLabelKey } from "../../../utils/userTypes";
import Header from "../../../components/header";
import CustomText from "../../../components/text";
import { height, width } from "../../../utils/dimension";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useDispatch, useSelector } from "react-redux";
import { signOut, deleteAccount } from "../../../Redux/Actions/UserActions";
import ChevronRight from "../../../../assets/icons/chevron-right";
import CloseIcon from "../../../../assets/icons/close-icon";
import InstagramIcon from "../../../../assets/icons/instagram-icon";
import GlobeIcon from "../../../../assets/icons/globe-icon";
import LogoutIcon from "../../../../assets/icons/logout-icon";
import TrashIcon from "../../../../assets/icons/trash-icon";
import { useTranslation } from "../../../utils/useTranslation";
import { ScreenNames } from "../../../Routes/routes";
import EmailVerificationBanner from "../../../components/email-verification";
import { setLocale } from "../../../Redux/Slices/localeSlice";
import LanguageSelector from "../../../components/language-selector";
import { TERMS_URL, PRIVACY_URL } from "../../../config/legal";
import { firestore, auth } from "../../../../firebaseconfig";
export default function Profile({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.userData);
  const { t, locale } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [ownedStores, setOwnedStores] = useState([]);
  const [storePickerVisible, setStorePickerVisible] = useState(false);

  const openManagePosts = (store) => {
    setStorePickerVisible(false);
    navigation.navigate(ScreenNames.MANAGE_POSTS, {
      storeId: store.id,
      storeName: store.name,
      ownerId: store.owner_id,
    });
  };

  const handleManagePostsPress = async () => {
    if (loadingStores) return;
    setLoadingStores(true);
    try {
      const snapshot = await getDocs(
        query(
          collection(firestore, "stores"),
          where("owner_id", "==", user?.id),
        ),
      );
      const stores = snapshot.docs
        .map((docSnap) => docSnap.data())
        .filter((store) => !store.deleted_at);
      if (stores.length === 0) {
        Alert.alert(t("manage_posts"), t("no_stores_for_posts"));
      } else if (stores.length === 1) {
        openManagePosts(stores[0]);
      } else {
        setOwnedStores(stores);
        setStorePickerVisible(true);
      }
    } catch (error) {
      console.error("Error loading owned stores:", error);
      Alert.alert(t("error"), t("no_stores_found"));
    } finally {
      setLoadingStores(false);
    }
  };

  const handlePress = (screen) => {
    if (screen) {
      navigation.navigate(screen);
    }
  };

  const handleLogout = () => {
    dispatch(signOut());
  };

  const handleDeleteAccount = () => {
    Alert.alert(t("delete_account"), t("delete_account_confirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete_account"),
        style: "destructive",
        onPress: async () => {
          setIsDeleting(true);
          try {
            await dispatch(deleteAccount(user?.id, user?.email));
          } catch (error) {
            setIsDeleting(false);
            Alert.alert(t("error"), t("delete_account_failed"));
          }
        },
      },
    ]);
  };

  const handleLanguageChange = async (selectedValue) => {
    dispatch(setLocale(selectedValue));

    // Update language in user's Firestore profile
    if (auth.currentUser) {
      try {
        const userRef = doc(firestore, "users", auth.currentUser.uid);
        await updateDoc(userRef, { language: selectedValue });
      } catch (error) {
        console.warn("Failed to update language in profile:", error);
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
        title={t("profile_title")}
        containerStyle={{ width: width(90), alignSelf: "center" }}
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
          <View style={styles.sectionHeaderRow}>
            <CustomText
              size={2.6}
              color={AppColors.primary}
              style={{ marginLeft: 4, fontWeight: "bold" }}
            >
              {t("account")}
            </CustomText>
            {/* The only place the app surfaces which account type you are. */}
            <View style={styles.accountTypeBadge}>
              <CustomText size={1.5} color={AppColors.primary}>
                {t(userTypeLabelKey(user?.userType))}
              </CustomText>
            </View>
          </View>
          <View style={{ height: 20 }} />
          {[
            { titleKey: "change_email_name", screen: "ChangeEmailScreen" },
            { titleKey: "forgot_password", screen: "RecoverPasswordScreen" },
            { titleKey: "terms_and_conditions", url: TERMS_URL },
            { titleKey: "privacy_policy", url: PRIVACY_URL },
          ].map((option) => (
            <TouchableOpacity
              key={option.titleKey}
              style={styles.optionTile}
              onPress={() =>
                option.url
                  ? Linking.openURL(option.url)
                  : handlePress(option.screen)
              }
            >
              <View style={styles.optionContent}>
                <CustomText size={1.8} color={AppColors.black}>
                  {t(option.titleKey)}
                </CustomText>
                <ChevronRight
                  width={20}
                  height={20}
                  color={AppColors.grey_300}
                />
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
        {isOwnerType(user) && (
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

        {/* Store Section - store owners only */}
        {isOwnerType(user) && (
          <View style={styles.sectionContainer}>
            <CustomText
              size={2.6}
              color={AppColors.primary}
              style={{ marginLeft: 4, fontWeight: "bold" }}
            >
              Store
            </CustomText>
            <View style={{ height: 20 }} />
            <TouchableOpacity
              style={styles.optionTile}
              onPress={() => handlePress("AddStoreScreen")}
            >
              <View style={styles.optionContent}>
                <CustomText size={1.8} color={AppColors.black}>
                  {t("add_a_store")}
                </CustomText>
                <ChevronRight
                  width={20}
                  height={20}
                  color={AppColors.grey_300}
                />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionTile}
              onPress={handleManagePostsPress}
              disabled={loadingStores}
            >
              <View style={styles.optionContent}>
                <CustomText size={1.8} color={AppColors.black}>
                  {t("manage_posts")}
                </CustomText>
                {loadingStores ? (
                  <ActivityIndicator size="small" color={AppColors.primary} />
                ) : (
                  <ChevronRight
                    width={20}
                    height={20}
                    color={AppColors.grey_300}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Feedback Section */}
        <View style={styles.sectionContainer}>
          <CustomText
            size={2.6}
            color={AppColors.primary}
            style={{ marginLeft: 4, fontWeight: "bold" }}
          >
            {t("feedback")}
          </CustomText>
          <View style={{ height: 20 }} />

          {/* Contact Support */}
          <TouchableOpacity
            style={styles.optionTile}
            onPress={() => handlePress("ContactSupportScreen")}
          >
            <View style={styles.optionContent}>
              <CustomText size={1.8} color={AppColors.black}>
                {t("contact_support")}
              </CustomText>
              <ChevronRight width={20} height={20} color={AppColors.grey_300} />
            </View>
          </TouchableOpacity>

          {/* Social Links */}
          <View style={styles.socialLinksContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() =>
                Linking.openURL("https://www.instagram.com/shopisanapp/")
              }
            >
              <InstagramIcon width={24} height={24} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() =>
                Linking.openURL(
                  locale === "fr"
                    ? "https://shopisan.com/fr"
                    : "https://shopisan.com",
                )
              }
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
          <CustomText
            size={2}
            color={AppColors.white}
            style={{ marginLeft: 10, fontWeight: "600" }}
          >
            {user ? t("log_out") : t("go_to_signup")}
          </CustomText>
        </TouchableOpacity>

        {user && (
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
            disabled={isDeleting}
          >
            <TrashIcon
              width={20}
              height={20}
              color={AppColors.error || "#dc3545"}
            />
            <CustomText
              size={2}
              color={AppColors.error || "#dc3545"}
              style={{ marginLeft: 10, fontWeight: "600" }}
            >
              {isDeleting ? "..." : t("delete_account")}
            </CustomText>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Store picker for post management (owners with several stores) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={storePickerVisible}
        onRequestClose={() => setStorePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <CustomText
                size={2.2}
                color={AppColors.primary}
                style={{ fontWeight: "bold" }}
              >
                {t("select_store_for_posts")}
              </CustomText>
              <TouchableOpacity
                onPress={() => setStorePickerVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CloseIcon width={24} height={24} color={AppColors.black} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={ownedStores}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionTile}
                  onPress={() => openManagePosts(item)}
                >
                  <View style={styles.optionContent}>
                    <CustomText size={1.8} color={AppColors.black}>
                      {item.name}
                    </CustomText>
                    <ChevronRight
                      width={20}
                      height={20}
                      color={AppColors.grey_300}
                    />
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalContent: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sectionContainer: {
    marginBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountTypeBadge: {
    backgroundColor: AppColors.white_100,
    borderWidth: 1,
    borderColor: AppColors.primary,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 20,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.white_100,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: AppColors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: AppColors.white_100,
    borderWidth: 1,
    borderColor: AppColors.error || "#dc3545",
    marginTop: 10,
    marginBottom: 40,
  },
});
