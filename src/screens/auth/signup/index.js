import React, { useEffect, useRef, useState } from "react";
import { Image, Switch, TouchableOpacity, View, StyleSheet } from "react-native";
import { useForm } from "react-hook-form";

import SignUpFormValidation from "./validation"; // Correct the import path as needed
import styles from "./styles";
import { yupResolver } from "@hookform/resolvers/yup";
import { height, width } from "../../../utils/dimension";
import { AppColors } from "../../../utils";
import { InputField } from "../../../components/input";
import CustomText, { LargeText, SmallText } from "../../../components/text";
import {
  AntDesign,
  EvilIcons,
  Feather,
  FontAwesome6,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import Button from "../../../components/button";
import { ScreenNames } from "../../../Routes/routes";
import ScreenWrapper from "../../../components/screen-wrapper";
import Spacer from "../../../components/spacer";
import { useDispatch } from "react-redux";
import Unlock_outline from "../../../../assets/icons/unlock";
import StoreRegisterValidation from "./validation_Store";
import { useSelector } from "react-redux";
import { firestore } from "../../../../firebaseconfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import Toast from "react-native-toast-message";
import i18n from '../../../translations/i18n';
import { signUp, setNoAuthenticationWanted} from "../../../Redux/Actions/UserActions";

// import Toast from "react-native-toast-message";
// import { doc, getDoc } from "firebase/firestore";
// import { firestore } from "../../../../firebaseconfig";

export default function SignUp({ navigation }) {
  const [loading, setLoading] = useState(false);
  const locale = useSelector(state => state.locale.currentLocale);
  i18n.locale = locale;
  const dispatch = useDispatch();

  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const emailRef = useRef(null);
  const [passwordHide, setPasswordHide] = useState(true);
  const [ConfirmpasswordHide, setConfirmpasswordHide] = useState(true);
  const [active, setActive] = useState(1);
  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm({
    mode: "all",
    resolver: yupResolver(SignUpFormValidation), 
});

  // const checkUser = async (email, password) => {
  //   console.log("checking user", email, password);
  //   let res;
  //   try {
  //     const docRef = doc(firestore, "DevelopmentUsers", email.trim());
  //     const userDoc = await getDoc(docRef);
  //     res = userDoc.data();
  //   } catch (err) {
  //     console.log(err);
  //     setLoading(false);
  //     return;
  //   }
  //   if (res) {
  //     if (res.password === password) {
  //       dispatch(signin(res));
  //     } else {
  //       console.log("wrong password");
  //       Toast.show({
  //         text1: "Wrong password",
  //         type: "error",
  //         text2: "Your password is incorrect",
  //       });
  //     }
  //   } else {
  //     console.log("user not found");
  //     Toast.show({
  //       text1: "User not found",
  //       type: "error",
  //       text2: "No user with this email exists",
  //     });
  //   }
  //   setLoading(false);
  // };
  const signupHandler = async (values) => {
    setLoading(true);
    dispatch(signUp(values.email, values.username, values.password, userType));

    // checkUser(values.email, values.password);
  };

  const [isEnabled, setIsEnabled] = useState(false);
  const toggleSwitch = () => setIsEnabled((previousState) => !previousState);
  const { isAuthenticated, noAuthenticationWanted } = useSelector(state => state.user);

  const [userType, setUserType] = useState('shopper');

  const handleSignup = async (values) => {
    setLoading(true);
    try {
      const userRef = doc(firestore, "users", values.email.trim());
      await setDoc(userRef, { //todo : modify with collection values
        email: values.email,
        username: values.username,
        userType: userType,
        createdAt: serverTimestamp(),
      }); 

      if (userType === 'merchant') {
        const merchantRef = doc(firestore, "users", values.email.trim());
        await setDoc(merchantRef, { //todo : modify with collection values
          email: values.email, 
          stores: [],
          status: 'active',
          createdAt: serverTimestamp(),
        });

        navigation.replace('MerchantHome'); // create merchant home screen
      } else {

        navigation.replace('Home');
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
            onSubmit={() => emailRef?.current?.focus()}
            keytype="next"
            label=""
            placeholder={i18n.t('username_placeholder')}
            error={errors.username}
          />
          <InputField
            control={control}
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
            onSubmit={() => passwordRef?.current?.focus()}
            keytype="next"
            label=""
            placeholder={i18n.t('email_placeholder')}
            error={errors.email}
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
              borderColor: AppColors.secondary,
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
          <InputField
            ref={confirmPasswordRef}
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
              borderColor: AppColors.secondary,
              borderWidth: width(0.2),
            }}
            textFieldInnerContainer={{ width: "100%" }}
            label=""
            secureTextEntry={ConfirmpasswordHide}
            suffix={
              <TouchableOpacity
                onPress={() => {
                  setConfirmpasswordHide(!ConfirmpasswordHide);
                }}
              >
                <Feather
                  name={ConfirmpasswordHide ? "eye-off" : "eye"}
                  color={AppColors.secondary}
                  size={height(2)}
                />
              </TouchableOpacity>
            }
            control={control}
            name="confirmPassword"
            placeholder="Enter your password again"
            error={errors.confirmPassword}
          />
          <View style={styles.userTypeContainer}>
            <CustomText
              color={AppColors.grey_200}
              textProps={{ fontFamily: "Mulish-Regular" }}
              size={1.7}
            >
              I want to:
            </CustomText>
            <View style={styles.radioGroup}>
              <TouchableOpacity 
                style={[
                  styles.radioButton,
                  userType === 'shopper' && styles.radioButtonSelected
                ]}
                onPress={() => setUserType('shopper')}
              >
                <CustomText
                  color={userType === 'shopper' ? AppColors.primary : AppColors.grey_200}
                  textProps={{ fontFamily: "Mulish-Bold" }}
                  size={1.7}
                >
                  Shop at stores
                </CustomText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.radioButton,
                  userType === 'merchant' && styles.radioButtonSelected
                ]}
                onPress={() => setUserType('merchant')}
              >
                <CustomText
                  color={userType === 'merchant' ? AppColors.primary : AppColors.grey_200}
                  textProps={{ fontFamily: "Mulish-Bold" }}
                  size={1.7}
                >
                  Manage my store
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "90%",
              alignSelf: "center",
            }}
          >
      
          </View>
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
        <View style={{ alignItems: 'center', flexDirection: 'column', justifyContent: 'space-between', flex: 1}}>
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
        <View style={{ alignItems: 'center', marginTop: height(5)}}>
          <Button
              textStyle={{ fontFamily: "Mulish-Bold", color:AppColors.primary_darker  }}
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
