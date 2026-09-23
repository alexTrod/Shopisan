import React, { useEffect } from "react";
import { View, Alert, DeviceEventEmitter } from "react-native";
import { useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { isOwnerType } from "../../../utils/userTypes";
import { ScreenNames } from "../../../Routes/routes";
import { useTranslation } from "../../../utils/useTranslation";
import StoreForm from "../../../components/store-form/StoreForm";

/**
 * Add a store (owners who are already signed up).
 *
 * Uses the same StoreForm as the merchant signup, with every field shown:
 * the owner is approved, so hours, photos and categories are filled in now.
 * The store is still created with status "pending" and waits for admin
 * review (Merchant requests > New stores from approved owners).
 */
export default function AddStoreScreen({ navigation }) {
  const { t } = useTranslation();
  const user = useSelector((state) => state.user.userData);

  // Auth check - only signed-up store owners can add stores
  useEffect(() => {
    if (!user) {
      Alert.alert(
        t("login_required") || "Login Required",
        t("login_required_add_store_message") ||
          "Please sign up or log in to add a store.",
        [
          { text: t("cancel") || "Cancel", onPress: () => navigation.goBack() },
          {
            text: t("sign_up") || "Sign Up",
            onPress: () => navigation.navigate(ScreenNames.SIGN_UP),
          },
        ],
      );
      return;
    }

    // Backstop for deep links: firestore.rules would reject the write anyway,
    // but bounce here so shoppers never fill out a form that cannot save.
    if (!isOwnerType(user)) {
      Alert.alert(
        t("owner_account_required") || "Store owner account required",
        t("owner_account_required_message") ||
          "Only store owner accounts can add a store.",
        [{ text: t("close") || "Close", onPress: () => navigation.goBack() }],
      );
    }
  }, [user, navigation, t]);

  const handleStoreCreated = (store) => {
    DeviceEventEmitter.emit("stores:refresh");
    Toast.show(
      store?.duplicate
        ? {
            type: "success",
            text1: t("store_already_added_title"),
            text2: t("store_already_added_description"),
          }
        : {
            type: "success",
            text1: t("store_submitted_title"),
            text2: t("store_submitted_description"),
            visibilityTime: 6000,
          },
    );
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      <StoreForm
        t={t}
        mode="standalone"
        showHeader
        onBack={() => navigation.goBack()}
        onSubmit={handleStoreCreated}
        submitButtonText={t("submit_store_for_review") || "Submit for review"}
        showMerchantFields
        testIDPrefix="add-store"
      />
    </View>
  );
}
