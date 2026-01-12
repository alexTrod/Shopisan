import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../../firebaseconfig";

import styles from "./styles";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import { LargeText, SmallText } from "../../../components/text";
import Spacer from "../../../components/spacer";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { height, width } from "../../../utils/dimension";
import Button from "../../../components/button";
import Toast from "react-native-toast-message";
import { useTranslation } from "../../../utils/useTranslation";

export default function ForgotPassword({ navigation }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter code + new password
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSendResetCode = async () => {
    if (!email.trim()) {
      Toast.show({
        type: "error",
        text1: t('error') || "Error",
        text2: t('enter_email') || "Please enter your email address",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Toast.show({
        type: "error",
        text1: t('error') || "Error",
        text2: t('invalid_email') || "Please enter a valid email address",
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
        text1: t('email_sent') || "Email Sent!",
        text2: t('check_inbox_code') || "Check your inbox for the 6-digit code.",
      });

      setStep(2);
    } catch (error) {
      console.error('Error sending reset code:', error);
      Toast.show({
        type: "error",
        text1: t('error') || "Error",
        text2: error.message || t('failed_send_email') || "Failed to send reset email",
      });
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!resetCode.trim() || resetCode.trim().length !== 6) {
      Toast.show({
        type: "error",
        text1: t('error') || "Error",
        text2: t('enter_6_digit_code') || "Please enter the 6-digit code",
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Toast.show({
        type: "error",
        text1: t('error') || "Error",
        text2: t('password_min_6') || "Password must be at least 6 characters",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: t('error') || "Error",
        text2: t('passwords_not_match') || "Passwords do not match",
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
        text1: t('success') || "Success!",
        text2: t('password_reset_success') || "Your password has been reset. You can now sign in.",
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error resetting password:', error);
      let errorMessage = error.message || t('failed_reset_password') || "Failed to reset password";

      // Handle specific error codes
      if (error.code === 'functions/invalid-argument') {
        errorMessage = t('invalid_code') || "Invalid code. Please try again.";
      } else if (error.code === 'functions/failed-precondition') {
        errorMessage = t('code_expired') || "Code has expired. Please request a new one.";
      } else if (error.code === 'functions/permission-denied') {
        errorMessage = t('too_many_attempts') || "Too many attempts. Please request a new code.";
      }

      Toast.show({
        type: "error",
        text1: t('error') || "Error",
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
        text1: t('code_resent') || "Code Resent!",
        text2: t('check_inbox_code') || "Check your inbox for the new code.",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: t('error') || "Error",
        text2: error.message || "Failed to resend code",
      });
    }
    setLoading(false);
  };

  return (
    <ScreenWrapper
      statusBarColor={AppColors.white}
      barStyle="dark-content"
      scrollEnabled
      backgroundColor={AppColors.white}
    >
      <View style={styles.mainViewContainer}>
        <View style={styles.inputContainer}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => step === 2 ? setStep(1) : navigation.goBack()}
            style={localStyles.backButton}
          >
            <AntDesign name="arrowleft" size={24} color={AppColors.black} />
          </TouchableOpacity>

          <LargeText textAlign="center" size={5} textProps={{ fontFamily: "bold" }}>
            {step === 1
              ? (t('forgot_password') || "Forgot Password")
              : (t('reset_password') || "Reset Password")
            }
          </LargeText>
          <Spacer vertical={height(1)} />
          <SmallText textAlign="center" size={2}>
            {step === 1
              ? (t('enter_email_reset') || "Enter your email to receive a reset code.")
              : (t('enter_code_new_password') || "Enter the code and your new password.")
            }
          </SmallText>
          <Spacer vertical={height(2)} />

          {step === 1 ? (
            <>
              {/* Email Input */}
              <View style={localStyles.inputWrapper}>
                <AntDesign name="mail" size={20} color="#888" style={localStyles.inputIcon} />
                <TextInput
                  style={localStyles.input}
                  placeholder={t('enter_email') || "Enter email"}
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Spacer vertical={height(2)} />

              <Button
                loading={loading}
                disabled={!email.trim()}
                textStyle={{ fontWeight: "bold" }}
                containerStyle={styles.button}
                onPress={handleSendResetCode}
              >
                {t('send_reset_code') || "Send Reset Code"}
              </Button>
            </>
          ) : (
            <>
              {/* Email display */}
              <View style={localStyles.emailDisplay}>
                <SmallText size={1.6} color="#666">
                  {t('sending_to') || "Sending to:"} <SmallText size={1.6} color={AppColors.primary}>{email}</SmallText>
                </SmallText>
              </View>

              <Spacer vertical={height(1)} />

              {/* Reset Code Input */}
              <SmallText size={1.6} color={AppColors.black} textStyles={{ fontWeight: '500', marginBottom: 8 }}>
                {t('reset_code') || "Reset Code"}
              </SmallText>
              <View style={localStyles.inputWrapper}>
                <AntDesign name="lock1" size={20} color="#888" style={localStyles.inputIcon} />
                <TextInput
                  style={[localStyles.input, localStyles.codeInput]}
                  placeholder="000000"
                  placeholderTextColor="#999"
                  value={resetCode}
                  onChangeText={(text) => setResetCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <Spacer vertical={height(1.5)} />

              {/* New Password Input */}
              <SmallText size={1.6} color={AppColors.black} textStyles={{ fontWeight: '500', marginBottom: 8 }}>
                {t('new_password') || "New Password"}
              </SmallText>
              <View style={localStyles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#888" style={localStyles.inputIcon} />
                <TextInput
                  style={localStyles.input}
                  placeholder={t('enter_new_password') || "Enter new password"}
                  placeholderTextColor="#999"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={localStyles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#888" />
                </TouchableOpacity>
              </View>

              <Spacer vertical={height(1.5)} />

              {/* Confirm Password Input */}
              <SmallText size={1.6} color={AppColors.black} textStyles={{ fontWeight: '500', marginBottom: 8 }}>
                {t('confirm_password') || "Confirm Password"}
              </SmallText>
              <View style={localStyles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#888" style={localStyles.inputIcon} />
                <TextInput
                  style={localStyles.input}
                  placeholder={t('confirm_new_password') || "Confirm new password"}
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>

              <Spacer vertical={height(2)} />

              <Button
                loading={loading}
                disabled={!resetCode.trim() || !newPassword || !confirmPassword}
                textStyle={{ fontWeight: "bold" }}
                containerStyle={styles.button}
                onPress={handleResetPassword}
              >
                {t('reset_password') || "Reset Password"}
              </Button>

              <Spacer vertical={height(1.5)} />

              {/* Resend code */}
              <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                <SmallText textAlign="center" size={1.6} color={AppColors.primary}>
                  {t('didnt_receive_code') || "Didn't receive the code?"}{" "}
                  <SmallText size={1.6} color={AppColors.primary} textStyles={{ fontWeight: 'bold' }}>
                    {t('resend') || "Resend"}
                  </SmallText>
                </SmallText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
}

const localStyles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: height(2),
    left: width(2),
    padding: 8,
    zIndex: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.grey_200 || '#E0E0E0',
    borderRadius: 12,
    backgroundColor: AppColors.white,
    width: '90%',
    alignSelf: 'center',
  },
  inputIcon: {
    paddingLeft: width(4),
  },
  input: {
    flex: 1,
    paddingVertical: height(1.8),
    paddingHorizontal: width(3),
    fontSize: height(1.9),
    color: AppColors.black,
  },
  codeInput: {
    fontSize: height(2.5),
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  eyeIcon: {
    paddingRight: width(4),
  },
  emailDisplay: {
    backgroundColor: AppColors.primary_faded || '#f8f4f9',
    padding: 12,
    borderRadius: 8,
    width: '90%',
    alignSelf: 'center',
  },
});
