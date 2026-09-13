import React, { useState } from "react";
import { Image, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "../../../components/screen-wrapper";
import CustomText from "../../../components/text";
import Button from "../../../components/button";
import EmailVerificationBanner from "../../../components/email-verification";
import { AppColors } from "../../../utils";
import { useTranslation } from "../../../utils/useTranslation";
import { isMerchantRejected } from "../../../utils/userTypes";
import {
  refreshCurrentUser,
  signOut,
} from "../../../Redux/Actions/UserActions";
import styles from "./styles";

/**
 * Shown to a store owner whose registration request is still pending (or
 * was rejected). The merchant is signed in but gated here by App.js, so the
 * tabs, location prompt and store fetch never mount. Approval flips
 * users.merchantStatus server-side; "Check again" re-reads the document.
 */
export default function PendingApproval() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.userData);
  const [checking, setChecking] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const rejected = isMerchantRejected(user);

  const handleCheckAgain = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await dispatch(refreshCurrentUser());
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await dispatch(signOut());
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ScreenWrapper
      statusBarColor={AppColors.transparent}
      barStyle="dark-content"
      transclucent
      scrollEnabled
      contentContainerStyle={styles.container}
      backgroundImage={require("../../../../assets/bgImg.png")}
      backgroundColor={AppColors.white}
    >
      <Image
        source={require("../../../../assets/LogoIcon.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.iconCircle}>
        <Ionicons
          name={rejected ? "close-circle-outline" : "time-outline"}
          size={40}
          color={rejected ? AppColors.red : AppColors.primary}
        />
      </View>

      <CustomText
        size={2.6}
        textAlign="center"
        color={AppColors.black}
        textStyles={styles.title}
      >
        {rejected ? t("merchant_rejected_title") : t("pending_approval_title")}
      </CustomText>

      <CustomText
        size={1.8}
        textAlign="center"
        color={AppColors.grey_200}
        textStyles={styles.message}
      >
        {rejected
          ? t("merchant_rejected_message")
          : t("pending_approval_message")}
      </CustomText>

      {!!user?.email && (
        <CustomText
          size={1.8}
          textAlign="center"
          color={AppColors.black}
          textStyles={styles.email}
        >
          {user.email}
        </CustomText>
      )}

      {/* Self-contained (reads Redux): keeps "resend verification" reachable
          while Profile is not. */}
      <View style={styles.bannerContainer}>
        <EmailVerificationBanner />
      </View>

      <View style={styles.actions}>
        {!rejected && (
          <Button
            loading={checking}
            containerStyle={styles.checkButton}
            onPress={handleCheckAgain}
            testID="pending-check-again"
          >
            {t("pending_approval_check_again")}
          </Button>
        )}
        <Button
          buttonTextColor={AppColors.primary}
          containerStyle={styles.logoutButton}
          onPress={handleLogout}
          testID="pending-log-out"
        >
          {t("log_out")}
        </Button>
      </View>
    </ScreenWrapper>
  );
}
