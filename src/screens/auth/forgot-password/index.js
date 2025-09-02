import React, { useState } from "react";
import { View, Alert } from "react-native";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

import styles from "./styles";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import { LargeText, SmallText } from "../../../components/text";
import Spacer from "../../../components/spacer";
import { InputField } from "../../../components/input";
import { AntDesign } from "@expo/vector-icons";
import { height, width } from "../../../utils/dimension";
import Button from "../../../components/button";
import Toast from "react-native-toast-message";
import ForgotPasswordForm from "./valdiation";
import { useTranslation } from "../../../utils/useTranslation";

export default function ForgotPassword({ navigation }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
    watch,
  } = useForm({
    mode: "onChange",
    resolver: yupResolver(ForgotPasswordForm),
    defaultValues: { email: "" },
  });

  const handleForgotPassword = async ({ email }) => {
    if (emailSent) return;

    setLoading(true);
    const auth = getAuth();

    try {
      await sendPasswordResetEmail(auth, email);
      setEmailSent(true);

      Toast.show({
        type: "success",
        text1: "Email Sent!",
        text2: "Check your inbox for the password reset link.",
      });

      Alert.alert(
        "Password Reset Email Sent",
        "A reset link has been sent to your email.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message,
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
          <LargeText textAlign="center" size={5} textProps={{ fontFamily: "bold" }}>
            {t('forgot_password')}
          </LargeText>
          <Spacer vertical={height(1)} />
          <SmallText textAlign="center" size={2}>
            {t('forgot_password_message')}
          </SmallText>
          <Spacer vertical={height(2)} />

          <InputField
            control={control}
            prefix={<AntDesign name="mail" size={height(3)} style={{ marginRight: height(1) }} color={AppColors.wihte5} />}
            name="email"
            keyboardType="email-address"
            containerStyles={{
              width: "90%",
              alignSelf: "center",
              backgroundColor: AppColors.white,
            }}
            textFieldContainer={{
              width: "100%",
              backgroundColor: AppColors.white,
              borderColor: AppColors.secondary,
              borderWidth: width(0.2),
            }}
            textFieldInnerContainer={{ width: "100%" }}
            placeholder={t('email_placeholder')}
            error={errors.email}
          />

          <Spacer vertical={height(2)} />

          {!emailSent && (
            <Button
              loading={loading}
              disabled={!isValid}
              textStyle={{ fontWeight: "bold" }}
              containerStyle={styles.button}
              onPress={handleSubmit(handleForgotPassword)}
            >
              Send Reset Email
            </Button>
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
}
