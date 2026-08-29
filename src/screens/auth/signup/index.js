import React, { useRef, useState } from "react";
import { Image, TouchableOpacity, View, Text, Linking } from "react-native";
import { useForm } from "react-hook-form";
import SignUpFormValidation from "./validation";
import styles from "./styles";
import { yupResolver } from "@hookform/resolvers/yup";
import { height, width } from "../../../utils/dimension";
import { AppColors } from "../../../utils";
import { USER_TYPES } from "../../../utils/userTypes";
import { InputField } from "../../../components/input";
import CustomText from "../../../components/text";
import {
  FontAwesome6,
  MaterialCommunityIcons,
  Feather,
  Ionicons,
} from "@expo/vector-icons";
import Button from "../../../components/button";
import { ScreenNames } from "../../../Routes/routes";
import ScreenWrapper from "../../../components/screen-wrapper";
import Spacer from "../../../components/spacer";
import { useDispatch, useSelector } from "react-redux";
import Unlock_outline from "../../../../assets/icons/unlock";
import PersonIcon from "../../../../assets/icons/person-icon";
import MailIcon from "../../../../assets/icons/mail-icon";
import EyeIcon from "../../../../assets/icons/eye-icon";
import EyeOffIcon from "../../../../assets/icons/eye-off-icon";
import { functions } from "../../../../firebaseconfig";
import { httpsCallable } from "firebase/functions";
import Toast from "react-native-toast-message";
import i18n from "../../../translations/i18n";
import {
  signUp,
  setNoAuthenticationWanted,
  signUpMerchantWithStore,
} from "../../../Redux/Actions/UserActions";
import { useTranslation } from "../../../utils/useTranslation";
import StepIndicator from "./components/StepIndicator";
import { StoreForm } from "../../../components/store-form";
import { TERMS_URL, PRIVACY_URL } from "../../../config/legal";

export default function SignUp({ navigation }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const locale = useSelector((state) => state.locale?.currentLocale) || "en";

  if (locale) {
    i18n.locale = locale;
  }

  const dispatch = useDispatch();
  const errorMessage = useSelector((state) => state.user.signUpError);
  const [emailError, setEmailError] = useState(null);

  // Merchant wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [userData, setUserData] = useState(null);

  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const emailRef = useRef(null);
  const [passwordHide, setPasswordHide] = useState(true);
  const [confirmPasswordHide, setConfirmPasswordHide] = useState(true);
  const [userType, setUserType] = useState(USER_TYPES.SHOPPER);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const isOwnerSignup = userType === USER_TYPES.OWNER;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onBlur",
    resolver: yupResolver(SignUpFormValidation),
  });

  // Check if email exists using Cloud Function
  const checkEmailExists = async (email) => {
    try {
      const checkEmail = httpsCallable(functions, "checkEmailExists");
      const result = await checkEmail({ email });
      return { exists: result.data.exists };
    } catch (error) {
      console.error("Email check error:", error);
      return { exists: false, error: "check-failed" };
    }
  };

  const signupHandler = async (values) => {
    // Clear any previous email error
    setEmailError(null);

    if (!acceptedTerms) {
      Toast.show({
        text1: t("error") || "Error",
        text2: t("must_accept_terms"),
        type: "error",
      });
      return;
    }

    // Store owner flow - go to Step 2 (store creation)
    if (isOwnerSignup) {
      setLoading(true);

      // Check if email already exists before proceeding
      const email = values.email.trim().toLowerCase();
      const emailCheck = await checkEmailExists(email);

      if (emailCheck.exists) {
        setEmailError(
          t("email_already_in_use") || "The email address is already in use.",
        );
        setLoading(false);
        return;
      }

      // Store user data and move to step 2
      setUserData({
        email: email,
        username: values.username,
        password: values.password,
      });
      setLoading(false);
      setCurrentStep(2);
      return;
    }

    // Shopper flow remains unchanged
    setLoading(true);
    try {
      await dispatch(
        signUp(
          values.email,
          values.username,
          values.password,
          userType,
          locale,
        ),
      );
      Toast.show({
        text1: t("success") || "Success",
        text2:
          t("account_created_successfully") || "Account created successfully",
        type: "success",
      });
    } catch (error) {
      Toast.show({
        text1: t("error") || "Error",
        text2: error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle store form submission (Step 2)
  const handleStoreSubmit = async (storeData) => {
    if (!userData) {
      Toast.show({
        text1: t("error") || "Error",
        text2:
          t("user_data_missing") ||
          "User data is missing. Please go back and fill in your details.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        signUpMerchantWithStore({
          email: userData.email,
          username: userData.username,
          password: userData.password,
          language: locale,
          store: storeData,
        }),
      );

      Toast.show({
        text1: t("success") || "Success",
        text2:
          t("merchant_registration_complete") ||
          "Your account and store have been registered!",
        type: "success",
      });

      // Navigation will happen automatically via auth state change
    } catch (error) {
      console.error("Merchant signup error:", error);
      Toast.show({
        text1: t("error") || "Error",
        text2:
          error.message ||
          t("registration_failed") ||
          "Registration failed. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle back from Step 2 to Step 1
  const handleBackToStep1 = () => {
    setCurrentStep(1);
  };

  const goToSignIn = () => {
    navigation.navigate(ScreenNames.SIGN_IN);
  };

  // Render Step 1 form fields (Account info)
  const renderStep1Form = () => (
    <>
      {(errorMessage || emailError) && (
        <View
          style={{
            backgroundColor: "#FFE8E8",
            padding: 10,
            marginVertical: 10,
            borderRadius: 5,
            width: "90%",
            alignSelf: "center",
            borderWidth: 1,
            borderColor: AppColors.red,
          }}
        >
          <CustomText color={AppColors.red_100_full} size={1.6}>
            {emailError || errorMessage}
          </CustomText>
        </View>
      )}

      <Spacer vertical={height(1)} />
      <InputField
        control={control}
        prefix={
          <PersonIcon
            height={height(3)}
            width={height(3)}
            color={AppColors.black}
          />
        }
        name="username"
        keyboardType="default"
        containerStyles={{
          width: "90%",
          alignSelf: "center",
        }}
        textFieldContainer={{
          width: "100%",
          backgroundColor: AppColors.white,
          borderColor: AppColors.secondary,
          borderWidth: width(0.2),
        }}
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
          <MailIcon
            height={height(3)}
            width={height(3)}
            color={AppColors.black}
          />
        }
        name="email"
        keyboardType="email-address"
        containerStyles={{
          width: "90%",
          alignSelf: "center",
        }}
        textFieldContainer={{
          width: "100%",
          backgroundColor: AppColors.white,
          borderColor: AppColors.secondary,
          borderWidth: width(0.2),
        }}
        textFieldInnerContainer={{ width: "100%" }}
        onSubmit={() => passwordRef.current?.focus()}
        keytype="next"
        placeholder={i18n.t("email_placeholder")}
        error={errors.email}
      />
      <InputField
        ref={passwordRef}
        control={control}
        prefix={<Unlock_outline height={height(3)} width={height(3)} />}
        name="password"
        containerStyles={{ width: "90%", alignSelf: "center" }}
        textFieldContainer={{
          width: "100%",
          backgroundColor: AppColors.white,
          borderColor: AppColors.secondary,
          borderWidth: width(0.2),
        }}
        textFieldInnerContainer={{ width: "100%" }}
        onSubmit={() => confirmPasswordRef.current?.focus()}
        placeholder={i18n.t("pwd_placeholder")}
        error={errors.password}
        secureTextEntry={passwordHide}
        suffix={
          <TouchableOpacity onPress={() => setPasswordHide(!passwordHide)}>
            {passwordHide ? (
              <EyeOffIcon
                height={height(2.5)}
                width={height(2.5)}
                color="#888888"
              />
            ) : (
              <EyeIcon
                height={height(2.5)}
                width={height(2.5)}
                color="#888888"
              />
            )}
          </TouchableOpacity>
        }
      />
      <InputField
        ref={confirmPasswordRef}
        control={control}
        prefix={<Unlock_outline height={height(3)} width={height(3)} />}
        name="confirmPassword"
        containerStyles={{ width: "90%", alignSelf: "center" }}
        textFieldContainer={{
          width: "100%",
          backgroundColor: AppColors.white,
          borderColor: AppColors.secondary,
          borderWidth: width(0.2),
        }}
        textFieldInnerContainer={{ width: "100%" }}
        placeholder={
          i18n.t("confirm_pwd_placeholder") || "Enter your password again"
        }
        error={errors.confirmPassword}
        secureTextEntry={confirmPasswordHide}
        suffix={
          <TouchableOpacity
            onPress={() => setConfirmPasswordHide(!confirmPasswordHide)}
          >
            {confirmPasswordHide ? (
              <EyeOffIcon
                height={height(2.5)}
                width={height(2.5)}
                color="#888888"
              />
            ) : (
              <EyeIcon
                height={height(2.5)}
                width={height(2.5)}
                color="#888888"
              />
            )}
          </TouchableOpacity>
        }
      />
      <TouchableOpacity
        testID="accept-terms-checkbox"
        style={styles.termsRow}
        onPress={() => setAcceptedTerms((v) => !v)}
        activeOpacity={0.8}
      >
        <View
          style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
        >
          {acceptedTerms ? <Text style={styles.checkboxTick}>✓</Text> : null}
        </View>
        <Text style={styles.termsText}>
          {t("i_accept_the")}{" "}
          <Text
            style={styles.termsLink}
            onPress={() => Linking.openURL(TERMS_URL)}
          >
            {t("terms_and_conditions")}
          </Text>{" "}
          {t("and_the")}{" "}
          <Text
            style={styles.termsLink}
            onPress={() => Linking.openURL(PRIVACY_URL)}
          >
            {t("privacy_policy")}
          </Text>
        </Text>
      </TouchableOpacity>
      <Button
        loading={loading}
        textStyle={{ fontFamily: "Roboto-Medium" }}
        containerStyle={styles.button}
        onPress={handleSubmit(signupHandler)}
      >
        {isOwnerSignup
          ? t("next_step") || "Next: Add Your Store"
          : t("register")}
      </Button>
    </>
  );

  // Render Step 2 form (Store form for store owners)
  const renderStep2Form = () => (
    <StoreForm
      t={t}
      onSubmit={handleStoreSubmit}
      submitButtonText={t("complete_registration") || "Complete Registration"}
      mode="wizard"
      showMerchantFields={true}
      disabled={loading}
    />
  );

  return (
    <ScreenWrapper
      statusBarColor={AppColors.transparent}
      barStyle="dark-content"
      transclucent
      scrollEnabled={currentStep === 1}
      backgroundImage={require("../../../../assets/bgImg.png")}
      backgroundColor={AppColors.white}
    >
      <View
        style={[styles.mainViewContainer, currentStep === 2 && { flex: 1 }]}
      >
        {/* Logo - always visible */}
        <Image
          source={require("../../../../assets/LogoIcon.png")}
          style={{ height: height(5), width: height(5) }}
        />

        <View
          style={[
            styles.inputContainer,
            currentStep === 2 && { flex: 1, width: "100%" },
          ]}
        >
          {/* User type toggle - always visible */}
          <View style={styles.userTypeContainer}>
            <View
              style={{
                flexDirection: "row",
                borderWidth: 1,
                borderColor: AppColors.primary,
                borderRadius: height(2),
                overflow: "hidden",
                alignSelf: "center",
                marginBottom: height(2),
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: !isOwnerSignup
                    ? AppColors.primary
                    : "transparent",
                  paddingVertical: height(1.5),
                  alignItems: "center",
                  justifyContent: "center",
                  borderTopLeftRadius: height(2),
                  borderBottomLeftRadius: height(2),
                }}
                onPress={() => {
                  setUserType(USER_TYPES.SHOPPER);
                  setEmailError(null);
                  setCurrentStep(1);
                }}
                activeOpacity={0.8}
                disabled={currentStep === 2}
              >
                <CustomText
                  color={!isOwnerSignup ? AppColors.white : AppColors.primary}
                  textProps={{ fontFamily: "Roboto-Medium" }}
                  size={1.7}
                >
                  {t("sign_up_as_shopper")}
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: isOwnerSignup
                    ? AppColors.primary
                    : "transparent",
                  paddingVertical: height(1.5),
                  alignItems: "center",
                  justifyContent: "center",
                  borderTopRightRadius: height(2),
                  borderBottomRightRadius: height(2),
                }}
                onPress={() => {
                  setUserType(USER_TYPES.OWNER);
                  setEmailError(null);
                }}
                activeOpacity={0.8}
                disabled={currentStep === 2}
              >
                <CustomText
                  color={isOwnerSignup ? AppColors.white : AppColors.primary}
                  textProps={{ fontFamily: "Roboto-Medium" }}
                  size={1.7}
                >
                  {t("sign_up_as_merchant")}
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Step indicator - always visible for store owner signup */}
          {isOwnerSignup && (
            <StepIndicator
              currentStep={currentStep}
              totalSteps={2}
              labels={[
                t("step_account") || "Account",
                t("step_store") || "Store",
              ]}
              onStepPress={(step) => setCurrentStep(step)}
            />
          )}

          {/* Form content - changes based on step */}
          {isOwnerSignup && currentStep === 2
            ? renderStep2Form()
            : renderStep1Form()}
        </View>

        {/* Bottom section - only show on Step 1 */}
        {currentStep === 1 && (
          <View
            style={{
              alignItems: "center",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              width: "100%",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CustomText
                color={AppColors.black}
                textStyles={{ fontFamily: "Roboto-Regular" }}
                size={1.5}
                textAlign="center"
              >
                {t("already_have_account")}
              </CustomText>
              <CustomText
                onPress={goToSignIn}
                color={AppColors.primary}
                textStyles={{
                  marginLeft: height(0.5),
                  fontFamily: "Roboto-Medium",
                }}
                textDecorationLine="underline"
                size={2}
                textAlign="center"
              >
                {t("log_in")}
              </CustomText>
            </View>
            <View style={{ backgroundColor: AppColors.white }} />
            <View style={{ width: "100%", marginTop: height(3) }}>
              <Button
                textStyle={{
                  fontFamily: "Roboto-Medium",
                  color: AppColors.primary,
                }}
                containerStyle={[
                  styles.buttonSecondary,
                  { width: "100%", borderRadius: 0 },
                ]}
                onPress={async () => {
                  await dispatch(setNoAuthenticationWanted(true));
                }}
              >
                {t("create_account_later")}
              </Button>
            </View>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}
