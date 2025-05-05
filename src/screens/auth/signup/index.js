import React, { useEffect, useRef, useState } from "react";
import { Image, Switch, TouchableOpacity, View } from "react-native";
import { useForm } from "react-hook-form";
import SignUpFormValidation from "./validation";
import styles from "./styles";
import { yupResolver } from "@hookform/resolvers/yup";
import { height, width } from "../../../utils/dimension";
import { AppColors } from "../../../utils";
import { InputField } from "../../../components/input";
import CustomText from "../../../components/text";
import { FontAwesome6, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import Button from "../../../components/button";
import { ScreenNames } from "../../../Routes/routes";
import ScreenWrapper from "../../../components/screen-wrapper";
import Spacer from "../../../components/spacer";
import { useDispatch, useSelector } from "react-redux";
import Unlock_outline from "../../../../assets/icons/unlock";
import { firestore } from "../../../../firebaseconfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import Toast from "react-native-toast-message";
import i18n from "../../../translations/i18n";
import { signUp, setNoAuthenticationWanted } from "../../../Redux/Actions/UserActions";

export default function SignUp({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const locale = useSelector(state => state.locale.currentLocale);
  i18n.locale = locale;
  const dispatch = useDispatch();

  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const emailRef = useRef(null);
  const [passwordHide, setPasswordHide] = useState(true);
  const [confirmPasswordHide, setConfirmPasswordHide] = useState(true);
  const [userType, setUserType] = useState(route?.params?.role || "shopper");

  const { control, handleSubmit, formState: { isValid, errors } } = useForm({
    mode: "all",
    resolver: yupResolver(SignUpFormValidation),
  });
  const signupHandler = async (values) => {
    console.log("signing up", values);
    try {
      setLoading(true);
      await dispatch(signUp(values.email, values.username, values.password, userType));
      
      // Add a small delay to ensure the toast is visible
      setTimeout(() => {
        Toast.show({
          type: 'success',
          text1: 'Registration Successful',
          text2: 'Once we validate your account, you will be notified. You can start browsing stores!s',
          position: 'bottom',
          visibilityTime: 3000,
        });
        navigation.navigate(ScreenNames.SIGN_IN);
      }, 100);
    } catch (error) {
      // Add a small delay to ensure the toast is visible
      setTimeout(() => {
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: error.message || 'Please try again',
          position: 'bottom',
          visibilityTime: 3000,
        });
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const goToSignIn = () => {
    navigation.navigate(ScreenNames.SIGN_IN);
  };

  const [isEnabled, setIsEnabled] = useState(false);
  const toggleSwitch = () => setIsEnabled(prev => !prev);

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
        <Image
          source={require("../../../../assets/LogoIcon.png")}
          style={{ height: height(5), width: height(5) }}
        />

        <View style={styles.userTypeToggleContainer}>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                styles.toggleButtonLeft,
                userType === "shopper" && styles.toggleButtonSelected
              ]}
              onPress={() => setUserType("shopper")}
            >
              <CustomText
                color={userType === "shopper" ? AppColors.primary_darker : AppColors.grey_200}
                textProps={{ fontFamily: "Mulish-Bold" }}
                size={1.7}
              >
                Shopper
              </CustomText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                styles.toggleButtonRight,
                userType === "merchant" && styles.toggleButtonSelected
              ]}
              onPress={() => setUserType("merchant")}
            >
              <CustomText
                color={userType === "merchant" ? AppColors.primary_darker : AppColors.grey_100}
                textProps={{ fontFamily: "Mulish-Bold" }}
                size={1.7}
              >
                Store owner
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
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
            containerStyles={{ width: "90%", alignSelf: "center" }}
            textFieldContainer={{
              width: "100%",
              backgroundColor: AppColors.white,
              borderColor: AppColors.secondary,
              borderWidth: width(0.2),
            }}
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
          <Spacer vertical={height(3)} />
          <Button
            disabled={!isValid}
            loading={loading}
            textStyle={{ fontFamily: "Mulish-Bold" }}
            containerStyle={styles.button}
            onPress={handleSubmit(signupHandler)}
          >
            Register
          </Button>
        </View>
        <View style={{ alignItems: "center", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <CustomText color={AppColors.black} textStyles={{ fontFamily: "Mulish-Regular" }} size={1.5} textAlign="center">
              Already have an Account?
            </CustomText>
            <CustomText
              onPress={goToSignIn}
              color={AppColors.primary}
              textStyles={{ marginLeft: height(0.5), fontFamily: "Mulish-Bold" }}
              textDecorationLine="underline"
              size={2}
              textAlign="center"
            >
              Log in
            </CustomText>
          </View>
          <View style={{ alignItems: "center", marginTop: height(5) }}>
            <Button
              textStyle={{ fontFamily: "Mulish-Bold", color: AppColors.primary_darker }}
              containerStyle={styles.buttonSecondary}
              onPress={async () => {
                await dispatch(setNoAuthenticationWanted(true));
              }}
            >
              Create an account later
            </Button>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}
