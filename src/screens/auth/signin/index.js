import React, { useEffect, useRef, useState } from "react";
import { Image, Switch, TouchableOpacity, View, StyleSheet } from "react-native";
import { useForm } from "react-hook-form";
import { signIn, setNoAuthenticationWanted } from "../../../Redux/Actions/UserActions";
import SignInFormValidation from "./validation"; // Correct the import path as needed
import styles from "./styles";
import { yupResolver } from "@hookform/resolvers/yup";
import { height, width } from "../../../utils/dimension";
import { AppColors } from "../../../utils";
import { InputField } from "../../../components/input";
import CustomText, { LargeText, SmallText } from "../../../components/text";
import {
  Feather,
  FontAwesome6,
} from "@expo/vector-icons";
import Button from "../../../components/button";
import { ScreenNames } from "../../../Routes/routes";
import ScreenWrapper from "../../../components/screen-wrapper";
import Spacer from "../../../components/spacer";
import { useDispatch } from "react-redux";
import Unlock_outline from "../../../../assets/icons/unlock";
import i18n from '../../../translations/i18n';
import { useSelector } from "react-redux";
import logging, { logError } from "../../../utils/logging";

// import Toast from "react-native-toast-message";
// import { doc, getDoc } from "firebase/firestore";
// import { firestore } from "../../../../firebaseconfig";

export default function SignIn({ navigation }) {
  const [loading, setLoading] = useState(false);
  const errorMessage = useSelector(state => state.user.error);
  const locale = useSelector(state => state.locale.currentLocale);
  i18n.locale = locale;
  const dispatch = useDispatch();

  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const emailRef = useRef(null);
  const [passwordHide, setPasswordHide] = useState(true);
  const [active, setActive] = useState(1);
  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm({
    mode: "all",
    resolver: yupResolver(SignInFormValidation), 
  });


  const checkUser = async (email, password) => {
    let message = "";
    try {
      await dispatch(signIn(email, password));
    } catch (error) {
      console.log('error is', error);
      if (error.code === 'auth/invalid-credential') {
        message = "No user with this email exists";
      } else if (error.code === 'auth/wrong-password') {  
        message = "Your password is incorrect";
      } else {
        message = error.message;
      }
    } finally {
      setLoading(false);
    }
    setErrorMessage(message);
  };
  
  const signinHandler = async (values) => {
    setLoading(true);
    await dispatch(signIn(values.loginIdentifier, values.password));
  };

  const [isEnabled, setIsEnabled] = useState(false);
  const toggleSwitch = () => setIsEnabled((previousState) => !previousState);

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
        {/* <LogoIcon height={height(20)} width={height(20)} /> */}
        <Image
          source={require("../../../../assets/LogoIcon.png")}
          style={{ height: height(5), width: height(5) }}
        />

        <View style={styles.inputContainer}>
          <View style={{ width: "90%", alignSelf: "center" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <CustomText
                textAlign="center"
                color={AppColors.grey_100}
                textProps={{ fontFamily: "Mulish-Bold" }}
                textStyles={{ fontFamily: "Mulish-Bold" }}
                size={2.2}
              >
                Log In
              </CustomText>
            </View>
          </View>

          {errorMessage && (
            <View style={{
              backgroundColor: '#FFE8E8',
              padding: 10,
              marginVertical: 10,
              borderRadius: 5,
              width: '90%',
              alignSelf: 'center'
            }}>
              <CustomText color={AppColors.red} size={1.6}>
                {errorMessage}
              </CustomText>
            </View>
          )}

          <Spacer vertical={height(2)} />
          <InputField
            control={control}
            prefix={
              <FontAwesome6
                name="envelope"
                size={height(3)}
                style={{ marginRight: height(1) }}
                color={AppColors.black}
              />
            }
            name="loginIdentifier"
            keyboardType="email-address"
            containerStyles={{
              width: "90%",
              alignSelf: "center",
              backgroundColor: AppColors.white,
            }}
            textFieldContainer={{
              width: "100%",
              backgroundColor: AppColors.white,
              borderColor: errors.email || errorMessage ? AppColors.red : AppColors.secondary,
              borderWidth: width(0.2),
            }}
            textFieldInnerContainer={{ width: "100%" }}
            onSubmit={() => passwordRef?.current?.focus()}
            keytype="next"
            label=""
            placeholder={i18n.t('login_placeholder')}
            error={errors.loginIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <InputField
            ref={passwordRef}
            prefix={
              <Unlock_outline
                height={height(3)}
                width={height(3)}
                style={{ marginRight: height(1) }}
              />
            }
            containerStyles={{ width: "90%", alignSelf: "center" }}
            textFieldContainer={{
              width: "100%",
              backgroundColor: AppColors.white,
              borderColor: errors.password || errorMessage ? AppColors.red : AppColors.secondary,
              borderWidth: width(0.2),
            }}
            textFieldInnerContainer={{ width: "100%" }}
            label=""
            control={control}
            onSubmit={() => confirmPasswordRef?.current?.focus()}
            name="password"
            placeholder={i18n.t('pwd_placeholder')}
            error={errors.password}
            secureTextEntry={passwordHide}
            suffix={
              <>
                <TouchableOpacity
                  onPress={() => {
                    setPasswordHide(!passwordHide);
                  }}
                >
                  <Feather
                    name={passwordHide ? "eye-off" : "eye"}
                    color={AppColors.secondary}
                    size={height(2)}
                  />
                </TouchableOpacity>
              </>
            }
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "90%",
              alignSelf: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Switch
                trackColor={{
                  false: AppColors.grey_200,
                  true: AppColors.primary,
                }} 
                thumbColor={isEnabled ? AppColors.red : AppColors.white}
                ios_backgroundColor={AppColors.primary} 
                onValueChange={toggleSwitch}
                value={isEnabled}
                style={styles.switch}
              />
              <CustomText
                color={AppColors.black}
                textProps={{
                  fontFamily: "Mulish-SemiBold",
                }}
                textStyles={{ fontFamily: "Mulish-SemiBold" }}
                size={1.7}
              >
                Remember
              </CustomText>
            </View>
            <CustomText
              color={AppColors.pink}
              onPress={() => navigation?.navigate(ScreenNames.FORGOT_PASSWORD)}
              textAlign="right"
              size={1.7}
              textProps={{
                fontFamily: "Mulish-Bold",
              }}
              textStyles={{ fontFamily: "Mulish-Bold", color:AppColors.grey_200}}
            >
              Forgot Password ?
            </CustomText>
          </View>
          <Spacer vertical={height(5)} />
          <Button
            disabled={!isValid}
            loading={loading}
            textStyle={{ fontFamily: "Mulish-Bold" }}
            containerStyle={styles.button}
            onPress={handleSubmit(signinHandler)}
          >
            Log in
          </Button>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <CustomText
            color={AppColors.black}
            textStyles={{ fontFamily: "Mulish-Regular" }}
            size={1.5}
            textAlign="center"
          >
            Create an account ?
          </CustomText>
          <CustomText
            onPress={() => {
                navigation.navigate(ScreenNames.SIGN_UP);
                console.log('sign up');

            }}
            color={AppColors.primary}
            textStyles={{ marginLeft: height(0.5), fontFamily: "Mulish-Bold" }}
            textDecorationLine="underline"
            size={2}
            textAlign="center"
          >
            Sign up
          </CustomText>

        </View>
        <View style={{ alignItems: 'center', marginTop: height(5)}}>
          <Button
            textStyle={{ fontFamily: "Mulish-Bold", color:AppColors.primary_darker}}
            containerStyle={styles.buttonSecondary}
            onPress={async () => {
              await dispatch({ type: 'SET_NO_AUTHENTICATION_WANTED' });
              console.log('noAuthenticationWanted:', noAuthenticationWanted);
              //navigation.navigate(ScreenNames.HOME);
            }}
          >
            Create an account later
          </Button>
        </View>
      </View>
    </ScreenWrapper>
  );
}
