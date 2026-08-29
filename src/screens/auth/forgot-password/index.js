import React, { useState } from "react";
import { View, Image, TouchableOpacity, TextInput } from "react-native";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../../firebaseconfig";

import styles from "./styles";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import CustomText from "../../../components/text";
import Spacer from "../../../components/spacer";
import { height, width } from "../../../utils/dimension";
import Button from "../../../components/button";
import Toast from "react-native-toast-message";
import { useTranslation } from "../../../utils/useTranslation";
import MailIcon from "../../../../assets/icons/mail-icon";
import Unlock_outline from "../../../../assets/icons/unlock";
import ChevronLeft from "../../../../assets/icons/chevron-left";
import EyeIcon from "../../../../assets/icons/eye-icon";
import EyeOffIcon from "../../../../assets/icons/eye-off-icon";

// Styled input component matching the app style - defined outside to prevent re-creation
const StyledInput = ({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, maxLength, suffix }) => (
  <View style={styles.inputWrapper}>
    <View style={styles.inputIconContainer}>
      {icon}
    </View>
    <TextInput
      style={styles.textInput}
      placeholder={placeholder}
      placeholderTextColor={AppColors.snowWhite}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      maxLength={maxLength}
      autoCapitalize="none"
    />
    {suffix && (
      <View style={styles.suffixContainer}>
        {suffix}
      </View>
    )}
  </View>
);

export default function ForgotPassword({ navigation }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSendResetCode = async () => {
    if (!email.trim()) {
      Toast.show({
        type: "error",
        text1: t('error'),
        text2: t('enter_email'),
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Toast.show({
        type: "error",
        text1: t('error'),
        text2: t('invalid_email'),
      });
      return;
    }

    setLoading(true);
    try {
      const sendCustomPasswordReset = httpsCallable(functions, 'sendCustomPasswordReset');
      await sendCustomPasswordReset({
        email: email.trim(),
        language: t('locale') || 'fr'
      });

      Toast.show({
        type: "success",
        text1: t('email_sent'),
        text2: t('check_inbox_code'),
      });

      setStep(2);
    } catch (error) {
      console.error('Error sending reset code:', error);
      const notFound = error?.code === 'functions/not-found';
      Toast.show({
        type: "error",
        text1: t('error'),
        text2: notFound
          ? t('no_account_for_email')
          : error.message || t('failed_send_email'),
      });
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!resetCode.trim() || resetCode.trim().length !== 6) {
      Toast.show({
        type: "error",
        text1: t('error'),
        text2: t('enter_6_digit_code'),
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Toast.show({
        type: "error",
        text1: t('error'),
        text2: t('password_min_6'),
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: t('error'),
        text2: t('passwords_not_match'),
      });
      return;
    }

    setLoading(true);
    try {
      const resetPasswordWithCode = httpsCallable(functions, 'resetPasswordWithCode');
      await resetPasswordWithCode({
        email: email.trim(),
        code: resetCode.trim(),
        newPassword: newPassword
      });

      Toast.show({
        type: "success",
        text1: t('success'),
        text2: t('password_reset_success'),
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error resetting password:', error);
      let errorMessage = error.message || t('failed_reset_password');

      if (error.code === 'functions/invalid-argument') {
        errorMessage = t('invalid_code');
      } else if (error.code === 'functions/failed-precondition') {
        errorMessage = t('code_expired');
      } else if (error.code === 'functions/permission-denied') {
        errorMessage = t('too_many_attempts');
      }

      Toast.show({
        type: "error",
        text1: t('error'),
        text2: errorMessage,
      });
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const sendCustomPasswordReset = httpsCallable(functions, 'sendCustomPasswordReset');
      await sendCustomPasswordReset({
        email: email.trim(),
        language: t('locale') || 'fr'
      });

      Toast.show({
        type: "success",
        text1: t('code_resent'),
        text2: t('check_inbox_code'),
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: t('error'),
        text2:
          error?.code === 'functions/not-found'
            ? t('no_account_for_email')
            : error.message || t('failed_send_email'),
      });
    }
    setLoading(false);
  };

  return (
    <ScreenWrapper
      statusBarColor={AppColors.transparent}
      barStyle="dark-content"
      transclucent
      scrollEnabled
      backgroundImage={require("../../../../assets/bgImg.png")}
      backgroundColor={AppColors.white}
    >
      <View style={styles.mainViewContainer}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => step === 2 ? setStep(1) : navigation.goBack()}
        >
          <ChevronLeft height={height(3)} width={height(3)} color={AppColors.black} />
          <CustomText
            color={AppColors.black}
            size={1.8}
            textStyles={{ marginLeft: 4 }}
          >
            {t('back')}
          </CustomText>
        </TouchableOpacity>

        {/* Logo */}
        <Image
          source={require("../../../../assets/LogoIcon.png")}
          style={{ height: height(5), width: height(5) }}
        />

        <View style={styles.inputContainer}>
          <View style={{ width: "90%", alignSelf: "center" }}>
            <CustomText
              textAlign="center"
              color={AppColors.grey_100}
              textProps={{ fontFamily: "Roboto-Medium" }}
              size={2.2}
            >
              {step === 1 ? t('forgot_password') : t('reset_password')}
            </CustomText>
          </View>

          <Spacer vertical={height(1)} />

          <CustomText
            textAlign="center"
            color={AppColors.grey_200}
            size={1.6}
          >
            {step === 1 ? t('enter_email_reset') : t('enter_code_new_password')}
          </CustomText>

          <Spacer vertical={height(2)} />

          {step === 1 ? (
            <>
              <StyledInput
                icon={<MailIcon height={height(3)} width={height(3)} color={AppColors.black} />}
                placeholder={t('email_placeholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />

              <Spacer vertical={height(3)} />

              <Button
                loading={loading}
                disabled={!email.trim()}
                textStyle={{ fontFamily: "Roboto-Medium" }}
                containerStyle={styles.button}
                onPress={handleSendResetCode}
              >
                {t('send_reset_code')}
              </Button>
            </>
          ) : (
            <>
              {/* Email display */}
              <View style={{ width: "90%", alignSelf: "center", marginBottom: height(1) }}>
                <CustomText size={1.5} color={AppColors.grey_200}>
                  {t('sending_to')} <CustomText size={1.5} color={AppColors.primary}>{email}</CustomText>
                </CustomText>
              </View>

              <StyledInput
                icon={<Unlock_outline height={height(3)} width={height(3)} />}
                placeholder={t('reset_code')}
                value={resetCode}
                onChangeText={(text) => setResetCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />

              <StyledInput
                icon={<Unlock_outline height={height(3)} width={height(3)} />}
                placeholder={t('new_password')}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                suffix={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeIcon height={height(2.5)} width={height(2.5)} color="#888888" />
                    ) : (
                      <EyeOffIcon height={height(2.5)} width={height(2.5)} color="#888888" />
                    )}
                  </TouchableOpacity>
                }
              />

              <StyledInput
                icon={<Unlock_outline height={height(3)} width={height(3)} />}
                placeholder={t('confirm_password')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />

              <Spacer vertical={height(2)} />

              <Button
                loading={loading}
                disabled={!resetCode.trim() || !newPassword || !confirmPassword}
                textStyle={{ fontFamily: "Roboto-Medium" }}
                containerStyle={styles.button}
                onPress={handleResetPassword}
              >
                {t('reset_password')}
              </Button>

              <Spacer vertical={height(2)} />

              <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                <CustomText textAlign="center" size={1.5} color={AppColors.grey_200}>
                  {t('didnt_receive_code')}{" "}
                  <CustomText size={1.5} color={AppColors.primary} textStyles={{ fontWeight: 'bold' }}>
                    {t('resend')}
                  </CustomText>
                </CustomText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
}
