import React, { useState, useRef } from "react";
import { View, TouchableOpacity, Alert, StyleSheet, Image } from "react-native";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons, FontAwesome6, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../../firebaseconfig";

import ScreenWrapper from "../../../components/screen-wrapper";
import CustomText from "../../../components/text";
import { InputField } from "../../../components/input";
import Button from "../../../components/button";
import Spacer from "../../../components/spacer";
import { StoreForm } from "../../../components/store-form";
import StepIndicator from "./components/StepIndicator";
import Unlock_outline from "../../../../assets/icons/unlock";

import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";
import { useTranslation } from "../../../utils/useTranslation";
import SignUpFormValidation from "./validation";
import { signUpMerchantWithStore } from "../../../Redux/Actions/UserActions";
import i18n from "../../../translations/i18n";

export default function MerchantSignupWizard({ navigation, route }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const locale = useSelector(state => state.locale?.currentLocale) || 'en';

  // Get initial data from signup page (if coming from there)
  const initialUserData = route?.params?.initialUserData;
  const startAtStep = route?.params?.startAtStep || (initialUserData ? 2 : 1);

  if (locale) {
    i18n.locale = locale;
  }

  // Wizard state - start at Step 2 if we have initial user data
  const [currentStep, setCurrentStep] = useState(startAtStep);
  const [userData, setUserData] = useState(initialUserData || null);
  const [loading, setLoading] = useState(false);
  const errorMessage = useSelector(state => state.user.signUpError);

  // Step 1 form
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const emailRef = useRef(null);
  const [passwordHide, setPasswordHide] = useState(true);
  const [confirmPasswordHide, setConfirmPasswordHide] = useState(true);

  const { control, handleSubmit, formState: { isValid, errors } } = useForm({
    mode: "onBlur",
    resolver: yupResolver(SignUpFormValidation),
  });

  // Helper function to check if email already exists in Firebase Auth
  // Uses Cloud Function with Admin SDK for reliable email checking
  const checkEmailExists = async (email) => {
    try {
      const checkEmail = httpsCallable(functions, 'checkEmailExists');
      const result = await checkEmail({ email });
      return { exists: result.data.exists };
    } catch (error) {
      console.error('Email check error:', error);
      // If Cloud Function fails, let user proceed and catch error at final submission
      return { exists: false, error: 'check-failed' };
    }
  };

  // Step 1: Handle user registration data
  const handleStep1Submit = async (values) => {
    setLoading(true);

    try {
      const email = values.email.trim().toLowerCase();

      // Check if email already exists using Cloud Function
      const emailCheck = await checkEmailExists(email);

      if (emailCheck.exists) {
        Toast.show({
          text1: t('error') || "Error",
          text2: t('email_already_in_use') || "This email address is already in use.",
          type: "error",
        });
        setLoading(false);
        return;
      }

      // Email is available, proceed to step 2
      setUserData({
        email: email,
        username: values.username,
        password: values.password,
      });
      setLoading(false);
      setCurrentStep(2);
    } catch (error) {
      console.error('Email check error:', error);
      Toast.show({
        text1: t('error') || "Error",
        text2: t('error_checking_email') || "Error checking email. Please try again.",
        type: "error",
      });
      setLoading(false);
    }
  };

  // Step 2: Handle store creation and complete registration
  const handleStep2Submit = async (storeData) => {
    if (!userData) {
      Alert.alert(t('error') || 'Error', t('user_data_missing') || 'User data is missing. Please go back and fill in your details.');
      return;
    }

    setLoading(true);
    try {
      await dispatch(signUpMerchantWithStore({
        email: userData.email,
        username: userData.username,
        password: userData.password,
        language: locale,
        store: storeData,
      }));

      Toast.show({
        text1: t('success') || "Success",
        text2: t('merchant_registration_complete') || "Your account and store have been registered!",
        type: "success",
      });

      // Navigation will happen automatically via auth state change
    } catch (error) {
      console.error('Merchant signup error:', error);
      Toast.show({
        text1: t('error') || "Error",
        text2: error.message || t('registration_failed') || "Registration failed. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (currentStep === 2) {
      // If we came from the signup page with initial data, go back there
      // Otherwise, go to Step 1
      if (initialUserData) {
        navigation.goBack();
      } else {
        setCurrentStep(1);
      }
    } else {
      navigation.goBack();
    }
  };

  const stepLabels = [
    t('step_account') || 'Account',
    t('step_store') || 'Store'
  ];

  return (
    <ScreenWrapper
      statusBarColor={AppColors.transparent}
      barStyle="dark-content"
      transclucent
      scrollEnabled={false}
      backgroundImage={require("../../../../assets/bgImg.png")}
      backgroundColor={AppColors.white}
    >
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={AppColors.primary} />
        </TouchableOpacity>
        <CustomText
          color={AppColors.black}
          size={2.2}
          textStyles={{ fontFamily: "Roboto-Bold" }}
        >
          {currentStep === 2
            ? (t('add_your_store') || 'Add Your Store')
            : (t('merchant_signup_title') || 'Merchant Registration')
          }
        </CustomText>
        <View style={{ width: 24 }} />
      </View>

      {/* Step Indicator */}
      <StepIndicator
        currentStep={currentStep}
        totalSteps={2}
        labels={stepLabels}
      />

      {/* Step 1: User Registration */}
      {currentStep === 1 && (
        <View style={styles.mainViewContainer}>
          <Image
            source={require("../../../../assets/LogoIcon.png")}
            style={{ height: height(5), width: height(5), alignSelf: 'center' }}
          />

          <CustomText
            color={AppColors.black}
            size={1.8}
            textStyles={{ fontFamily: "Roboto-Medium", textAlign: 'center', marginTop: height(2) }}
          >
            {t('step_1_of_2') || 'Step 1 of 2'}: {t('create_your_account') || 'Create Your Account'}
          </CustomText>

          <View style={styles.inputContainer}>
            {errorMessage && (
              <View style={styles.errorContainer}>
                <CustomText color={AppColors.red_100_full} size={1.6}>
                  {errorMessage}
                </CustomText>
              </View>
            )}

            <Spacer vertical={height(1)} />
            <InputField
              control={control}
              prefix={
                <FontAwesome6
                  name="user"
                  size={height(3)}
                  style={{ marginRight: height(1) }}
                  color={AppColors.black}
                />
              }
              name="username"
              keyboardType="default"
              containerStyles={styles.inputFieldContainer}
              textFieldContainer={styles.textFieldContainer}
              textFieldInnerContainer={{ width: "100%" }}
              onSubmit={() => emailRef.current?.focus()}
              keytype="next"
              placeholder={i18n.t("username_placeholder")}
              error={errors.username}
            />
            <InputField
              control={control}
              ref={emailRef}
              prefix={
                <MaterialCommunityIcons
                  name="email-outline"
                  size={height(3)}
                  style={{ marginRight: height(1) }}
                  color={AppColors.black}
                />
              }
              name="email"
              keyboardType="email-address"
              containerStyles={styles.inputFieldContainer}
              textFieldContainer={styles.textFieldContainer}
              textFieldInnerContainer={{ width: "100%" }}
              onSubmit={() => passwordRef.current?.focus()}
              keytype="next"
              placeholder={i18n.t("email_placeholder")}
              error={errors.email}
            />
            <InputField
              ref={passwordRef}
              control={control}
              prefix={
                <Unlock_outline
                  height={height(3)}
                  width={height(3)}
                  style={{ marginRight: height(1) }}
                />
              }
              name="password"
              containerStyles={styles.inputFieldContainer}
              textFieldContainer={styles.textFieldContainer}
              textFieldInnerContainer={{ width: "100%" }}
              onSubmit={() => confirmPasswordRef.current?.focus()}
              placeholder={i18n.t("pwd_placeholder")}
              error={errors.password}
              secureTextEntry={passwordHide}
              suffix={
                <TouchableOpacity onPress={() => setPasswordHide(!passwordHide)}>
                  <Feather
                    name={passwordHide ? "eye-off" : "eye"}
                    color={AppColors.secondary}
                    size={height(2)}
                  />
                </TouchableOpacity>
              }
            />
            <InputField
              ref={confirmPasswordRef}
              control={control}
              prefix={
                <Unlock_outline
                  height={height(3)}
                  width={height(3)}
                  style={{ marginRight: height(1) }}
                />
              }
              name="confirmPassword"
              containerStyles={styles.inputFieldContainer}
              textFieldContainer={styles.textFieldContainer}
              textFieldInnerContainer={{ width: "100%" }}
              placeholder={i18n.t("confirm_pwd_placeholder") || "Enter your password again"}
              error={errors.confirmPassword}
              secureTextEntry={confirmPasswordHide}
              suffix={
                <TouchableOpacity onPress={() => setConfirmPasswordHide(!confirmPasswordHide)}>
                  <Feather
                    name={confirmPasswordHide ? "eye-off" : "eye"}
                    color={AppColors.secondary}
                    size={height(2)}
                  />
                </TouchableOpacity>
              }
            />

            <Button
              loading={loading}
              textStyle={{ fontFamily: "Roboto-Medium" }}
              containerStyle={styles.button}
              onPress={handleSubmit(handleStep1Submit)}
              disabled={loading}
            >
              {t('next_step') || 'Next: Add Your Store'}
            </Button>
          </View>
        </View>
      )}

      {/* Step 2: Store Creation */}
      {currentStep === 2 && (
        <View style={styles.step2Container}>
          <StoreForm
            t={t}
            onSubmit={handleStep2Submit}
            submitButtonText={t('complete_registration') || 'Complete Registration'}
            mode="wizard"
            showMerchantFields={true}
            disabled={loading}
          />
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width(4),
    paddingTop: height(2),
    paddingBottom: height(1),
  },
  backButton: {
    padding: 5,
  },
  mainViewContainer: {
    flex: 1,
    paddingHorizontal: width(4),
    paddingTop: height(2),
  },
  inputContainer: {
    marginTop: height(2),
  },
  inputFieldContainer: {
    width: "100%",
    alignSelf: "center",
    backgroundColor: AppColors.white,
  },
  textFieldContainer: {
    width: "100%",
    backgroundColor: AppColors.white,
    borderColor: AppColors.secondary,
    borderWidth: width(0.2),
  },
  errorContainer: {
    backgroundColor: "#FFE8E8",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    width: "100%",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: AppColors.red,
  },
  button: {
    width: "100%",
    marginTop: height(2),
    backgroundColor: AppColors.primary,
    borderRadius: height(1),
    paddingVertical: height(1.5),
  },
  step2Container: {
    flex: 1,
  },
});
