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
import { useTranslation } from "../../../utils/useTranslation";
import { signUp, setNoAuthenticationWanted } from "../../../Redux/Actions/UserActions";

export default function SignUp({ navigation }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const errorMessage = useSelector(state => state.user.signUpError);

  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const emailRef = useRef(null);
  const [passwordHide, setPasswordHide] = useState(true);
  const [confirmPasswordHide, setConfirmPasswordHide] = useState(true);
  const [userType, setUserType] = useState("shopper");

  const { control, handleSubmit, formState: { isValid, errors } } = useForm({
    mode: "all",
    resolver: yupResolver(SignUpFormValidation),
  });

  const signupHandler = async (values) => {
    setLoading(true);
    dispatch(signUp(values.email, values.username, values.password, userType));
    setLoading(false);
  };

  const handleSignup = async (values) => {
    setLoading(true);
    try {
      const userRef = doc(firestore, "users", values.email.trim());
      await setDoc(userRef, {
        email: values.email,
        username: values.username,
        userType,
        createdAt: serverTimestamp(),
      });

      if (userType === "merchant") {
        const merchantRef = doc(firestore, "users", values.email.trim());
        await setDoc(merchantRef, {
          email: values.email,
          stores: [],
          status: "active",
          createdAt: serverTimestamp(),
        });
        navigation.replace("MerchantHome");
      } else {
        navigation.replace("Home");
      }

      Toast.show({
        text1: "Success",
        text2: "Account created successfully",
        type: "success",
      });
    } catch (error) {
      Toast.show({
        text1: "Error",
        text2: error.message,
        type: "error",
      });
    }
    setLoading(false);
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

        <View style={styles.inputContainer}>
          <View style={styles.userTypeContainer}>
            <View style={{
              flexDirection: 'row',
              borderWidth: 1,
              borderColor: AppColors.primary,
              borderRadius: height(2),
              overflow: 'hidden',
              alignSelf: 'center',
              marginBottom: height(2),
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: userType === 'shopper' ? AppColors.primary : 'transparent',
                  paddingVertical: height(1.5),
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTopLeftRadius: height(2),
                  borderBottomLeftRadius: height(2),
                }}
                onPress={() => setUserType('shopper')}
                activeOpacity={0.8}
              >
                <CustomText
                  color={userType === 'shopper' ? AppColors.white : AppColors.primary}
                  textProps={{ fontFamily: 'Mulish-Bold' }}
                  size={1.7}
                >
                  {t('signup_as_shopper')}
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: userType === 'merchant' ? AppColors.primary : 'transparent',
                  paddingVertical: height(1.5),
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTopRightRadius: height(2),
                  borderBottomRightRadius: height(2),
                }}
                onPress={() => setUserType('merchant')}
                activeOpacity={0.8}
              >
                <CustomText
                  color={userType === 'merchant' ? AppColors.white : AppColors.primary}
                  textProps={{ fontFamily: 'Mulish-Bold' }}
                  size={1.7}
                >
                  {t('signup_as_merchant')}
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>

          {errorMessage && (
            <View style={{
              backgroundColor: "#FFE8E8",
              padding: 10,
              marginVertical: 10,
              borderRadius: 5,
              width: "90%",
              alignSelf: "center",
              borderWidth: 1,
              borderColor: AppColors.red,
            }}>
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
            placeholder={t("username_placeholder")}
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
        <View style={{ alignItems: "center", flexDirection: "column", justifyContent: "space-between", flex: 1, width:'100%'}}>
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
          <View style={{ 
         
            backgroundColor: AppColors.white
          }}>
          
          </View>
          <View style={{ width: '100%', marginTop: height(3) }}>
            <Button
                textStyle={{ fontFamily: "Mulish-Bold", color: AppColors.primary}}
                containerStyle={[styles.buttonSecondary, { width: '100%', borderRadius: 0 }]}
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