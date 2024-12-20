import React, { useEffect, useRef, useState } from "react";
import { Image, Switch, TouchableOpacity, View } from "react-native";
import { useForm } from "react-hook-form";

import LoginFormValidation from "./valdiation"; // Correct the import path as needed
import styles from "./styles";
import { yupResolver } from "@hookform/resolvers/yup";
import { height, width } from "../../../utils/dimension";
import { AppColors } from "../../../utils";
import { InputField } from "../../../components/input";
import CustomText from "../../../components/text";
import {
  Feather,
  FontAwesome6,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import Button from "../../../components/button";
import { ScreenNames } from "../../../Routes/routes";
import ScreenWrapper from "../../../components/screen-wrapper";
import Spacer from "../../../components/spacer";
import Unlock_outline from "../../../../assets/icons/unlock";
import StoreRegisterValidation from "./valdiation_Store";
import { useSelector } from "react-redux";
import { firestore } from "../../../../firebaseconfig";
import { doc, getDoc } from "firebase/firestore";
import Toast from "react-native-toast-message";

import i18n from '../../../translations/i18n';


export default function Login({ navigation }) {
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const emailRef = useRef(null);
  const [passwordHide, setPasswordHide] = useState(true);
  const [ConfirmpasswordHide, setConfirmpasswordHide] = useState(true);
  const [active, setActive] = useState(0);
  const locale = useSelector(state => state.locale.currentLocale);
  i18n.locale = locale;
  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm({
    mode: "all",
    resolver: yupResolver(LoginFormValidation), // Replace with your validation schema
  });
  const {
    control: storeControl,
    handleSubmit: handleSubmitStore,
    formState: { isValid: isValidStore, errors: storeError },
  } = useForm({
    mode: "all",
    resolver: yupResolver(StoreRegisterValidation), // Replace with your validation schema
  });

  const loginHandler = async (values) => {
    setLoading(true);
    navigation.navigate(ScreenNames.SELECT_COUNTRY, { userData: values });
  };

  const noLoginHandler = () => {
    navigation.navigate(ScreenNames.HOME);
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
      {active === 0 ? (
        <View style={styles.mainViewContainer}>
          {/* <LogoIcon height={height(20)} width={height(20)} /> */}
          <Image
            source={require("../../../../assets/LogoIcon.png")}
            style={{ height: height(10), width: height(10) }}
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
                  onPress={() => {
                    setActive(0);
                  }}
                  textAlign="center"
                  color={active === 0 ? AppColors.primary : AppColors.grey_100}
                  textProps={{ fontFamily: "Mulish-Bold" }}
                  textStyles={{ fontFamily: "Mulish-Bold" }}
                  size={2.2}
                >
                  Register
                </CustomText>
                <CustomText
                  onPress={() => {
                    setActive(1);
                  }}
                  textAlign="center"
                  color={active === 1 ? AppColors.primary : AppColors.grey_100}
                  textProps={{ fontFamily: "Mulish-Bold" }}
                  textStyles={{ fontFamily: "Mulish-Bold" }}
                  size={2.2}
                >
                  Store Register
                </CustomText>
              </View>
              <CustomText
                textAlign="left"
                color={AppColors.grey_200}
                textProps={{
                  fontFamily: "Mulish-Regular",
                  marginTop: height(1),
                }}
                textStyles={{ fontFamily: "Mulish-Regular" }}
                size={1.7}
              >
                Enter your details below
              </CustomText>
            </View>
            <Spacer vertical={height(2)} />
            <InputField
              control={control}
              prefix={
                <FontAwesome6
                  name="user"
                  size={height(2.5)}
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
                  size={height(2.5)}
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
              placeholder="Enter email"
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
              placeholder="Enter Password"
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
              placeholder="Enter Confirm Password"
              error={errors.confirmPassword}
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
                  thumbColor={isEnabled ? AppColors.white : AppColors.white}
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
                // onPress={() =>
                //   navigation?.navigate(ScreenNames.FORGOT_PASSWORD)
                // }
                textAlign="right"
                size={1.7}
                textProps={{
                  fontFamily: "Mulish-Bold",
                }}
                textStyles={{ fontFamily: "Mulish-Bold" }}
              >
                Forgot Password!
              </CustomText>
            </View>

            <Spacer vertical={height(3)} />
            <Button
              disabled={!isValid}
              loading={loading}
              textStyle={{ fontFamily: "Mulish-Bold" }}
              containerStyle={styles.button}
              onPress={handleSubmit(loginHandler)}
            >
              Register
            </Button>
            <Spacer vertical={height(1)} />
            <Button
              textStyle={{ fontFamily: "Mulish-Bold" }}
              containerStyle={styles.button}
              onPress={noLoginHandler}
            >
              No Login
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
              Already have an Account?
            </CustomText>
            <CustomText
              // onPress={() => {
              //   // navigation?.navigate(ScreenNames.LOGIN);
              // }}
              color={AppColors.primary}
              textStyles={{
                marginLeft: height(0.5),
                fontFamily: "Mulish-Bold",
              }}
              textDecorationLine="underline"
              size={2}
              textAlign="center"
            >
              Log in
            </CustomText>
          </View>
        </View>
      ) : (
        <View style={styles.mainViewContainer}>
          {/* <LogoIcon height={height(20)} width={height(20)} /> */}
          <Image
            source={require("../../../../assets/LogoIcon.png")}
            style={{ height: height(10), width: height(10) }}
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
                  onPress={() => {
                    setActive(0);
                  }}
                  color={active === 0 ? AppColors.primary : AppColors.grey_100}
                  textProps={{ fontFamily: "Mulish-Bold" }}
                  textStyles={{ fontFamily: "Mulish-Bold" }}
                  size={2.2}
                >
                  Register
                </CustomText>
                <CustomText
                  onPress={() => {
                    setActive(1);
                  }}
                  textAlign="center"
                  color={active === 1 ? AppColors.primary : AppColors.grey_100}
                  textProps={{ fontFamily: "Mulish-Bold" }}
                  textStyles={{ fontFamily: "Mulish-Bold" }}
                  size={2.2}
                >
                  Store Register
                </CustomText>
              </View>
              <CustomText
                textAlign="left"
                color={AppColors.grey_200}
                textProps={{
                  fontFamily: "Mulish-Regular",
                  marginTop: height(1),
                }}
                textStyles={{ fontFamily: "Mulish-Regular" }}
                size={1.7}
              >
                Enter your details below
              </CustomText>
            </View>
            <Spacer vertical={height(2)} />
            <InputField
              control={storeControl}
              prefix={
                <MaterialCommunityIcons
                  name="store-outline"
                  size={height(3)}
                  style={{ marginRight: height(1) }}
                  color={AppColors.black}
                />
              }
              name="shop"
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
              placeholder="Enter Shop"
              error={storeError.shop}
            />
            <InputField
              control={storeControl}
              prefix={
                <MaterialCommunityIcons
                  name="account-edit-outline"
                  size={height(3)}
                  style={{ marginRight: height(1) }}
                  color={AppColors.black}
                />
              }
              name="firstName"
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
              keytype="next"
              label=""
              textInputStyle={{
                color: AppColors.black,
              }}
              placeholder="Enter First Name"
              error={storeError.firstName}
            />
            <InputField
              control={storeControl}
              prefix={
                <MaterialCommunityIcons
                  name="account-edit-outline"
                  size={height(3)}
                  style={{
                    marginRight: height(1),
                  }}
                  color={AppColors.black}
                />
              }
              name="lastName"
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
              keytype="next"
              label=""
              textInputStyle={{
                color: AppColors.black,
              }}
              placeholder="Enter Last Name"
              error={storeError.lastName}
            />
            <InputField
              control={storeControl}
              prefix={
                <FontAwesome6
                  name="user"
                  size={height(2.5)}
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
              textInputStyle={{
                color: AppColors.black,
              }}
              textFieldContainer={{
                width: "100%",
                backgroundColor: AppColors.white,
                borderColor: AppColors.secondary,
                borderWidth: width(0.2),
              }}
              textFieldInnerContainer={{ width: "100%" }}
              keytype="next"
              label=""
              placeholder="Enter Username"
              error={storeError.username}
            />
            <InputField
              control={storeControl}
              prefix={
                <MaterialCommunityIcons
                  name="email-outline"
                  size={height(2.5)}
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
              textInputStyle={{
                color: AppColors.black,
              }}
              textFieldContainer={{
                width: "100%",
                backgroundColor: AppColors.white,
                borderColor: AppColors.secondary,
                borderWidth: width(0.2),
              }}
              textFieldInnerContainer={{ width: "100%" }}
              keytype="next"
              label=""
              placeholder="Enter email"
              error={storeControl.email}
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
                  thumbColor={isEnabled ? AppColors.white : AppColors.white}
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
                // onPress={() =>
                //   navigation?.navigate(ScreenNames.FORGOT_PASSWORD)
                // }
                textAlign="right"
                size={1.7}
                textProps={{
                  fontFamily: "Mulish-Bold",
                }}
                textStyles={{ fontFamily: "Mulish-Bold" }}
              >
                Forgot Password!
              </CustomText>
            </View>

            <Spacer vertical={height(3)} />
            <Button
              loading={loading}
              textStyle={{ fontFamily: "Mulish-Bold" }}
              containerStyle={styles.button}
              // onPress={}
            >
              Register
            </Button>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}
