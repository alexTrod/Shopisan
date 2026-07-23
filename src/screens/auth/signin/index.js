import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, Switch, TouchableOpacity, View } from "react-native";
import { useForm } from "react-hook-form";
import {
  signIn,
  setNoAuthenticationWanted,
} from "../../../Redux/Actions/UserActions";
import SignInFormValidation from "./validation";
import styles from "./styles";
import { yupResolver } from "@hookform/resolvers/yup";
import { height, width } from "../../../utils/dimension";
import { AppColors } from "../../../utils";
import { InputField } from "../../../components/input";
import CustomText from "../../../components/text";
import Button from "../../../components/button";
import { ScreenNames } from "../../../Routes/routes";
import ScreenWrapper from "../../../components/screen-wrapper";
import Spacer from "../../../components/spacer";
import { useDispatch, useSelector } from "react-redux";
import Unlock_outline from "../../../../assets/icons/unlock";
import MailIcon from "../../../../assets/icons/mail-icon";
import EyeIcon from "../../../../assets/icons/eye-icon";
import EyeOffIcon from "../../../../assets/icons/eye-off-icon";
import ChevronLeft from "../../../../assets/icons/chevron-left";
import i18n from "../../../translations/i18n";

export default function SignIn({ navigation }) {
  const [loading, setLoading] = useState(false);
  const locale = useSelector((state) => state.locale.currentLocale);
  const dispatch = useDispatch();

  useEffect(() => {
    i18n.locale = locale;
  }, [locale]);

  const passwordRef = useRef(null);
  const [passwordHide, setPasswordHide] = useState(true);
  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm({
    mode: "all",
    resolver: yupResolver(SignInFormValidation),
  });

  const signinHandler = async (values) => {
    setLoading(true);
    try {
      await dispatch(signIn(values.loginIdentifier, values.password));
      // Navigation is handled by the auth state change in App.js
    } catch (error) {
      Alert.alert(
        i18n.t("error") || "Login Failed",
        i18n.t("login_failed_message") ||
          "Incorrect email or password. Please try again.",
        [{ text: i18n.t("ok") }],
      );
    } finally {
      setLoading(false);
    }
  };

  const [isEnabled, setIsEnabled] = useState(false);
  const toggleSwitch = () => setIsEnabled((prevState) => !prevState);

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
        {/* Back button to return to sign up */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft
            height={height(3)}
            width={height(3)}
            color={AppColors.black}
          />
          <CustomText
            color={AppColors.black}
            size={1.8}
            textStyles={{ marginLeft: 4 }}
          >
            {i18n.t("back")}
          </CustomText>
        </TouchableOpacity>

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
                textProps={{ fontFamily: "Roboto-Medium" }}
                size={2.2}
              >
                {i18n.t("login_title")}
              </CustomText>
            </View>
          </View>

          <Spacer vertical={height(2)} />

          <InputField
            testID="signin-email-input"
            control={control}
            prefix={
              <MailIcon
                height={height(3)}
                width={height(3)}
                color={AppColors.black}
              />
            }
            name="loginIdentifier"
            keyboardType="email-address"
            containerStyles={{
              width: "90%",
              alignSelf: "center",
            }}
            textFieldContainer={{
              width: "100%",
              backgroundColor: AppColors.white,
              borderColor: errors.loginIdentifier
                ? AppColors.red
                : AppColors.secondary,
              borderWidth: width(0.2),
            }}
            textFieldInnerContainer={{ width: "100%" }}
            onSubmit={() => passwordRef.current?.focus()}
            keytype="next"
            placeholder={i18n.t("login_placeholder")}
            error={errors.loginIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <InputField
            testID="signin-password-input"
            ref={passwordRef}
            prefix={<Unlock_outline height={height(3)} width={height(3)} />}
            containerStyles={{ width: "90%", alignSelf: "center" }}
            textFieldContainer={{
              width: "100%",
              backgroundColor: AppColors.white,
              borderColor: errors.password
                ? AppColors.red
                : AppColors.secondary,
              borderWidth: width(0.2),
            }}
            textFieldInnerContainer={{ width: "100%" }}
            control={control}
            name="password"
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
                textProps={{ fontFamily: "Roboto-Medium" }}
                size={1.7}
              >
                {i18n.t("remember_me")}
              </CustomText>
            </View>
            <CustomText
              color={AppColors.pink}
              onPress={() => navigation?.navigate(ScreenNames.FORGOT_PASSWORD)}
              textAlign="right"
              size={1.7}
              textProps={{ fontFamily: "Roboto-Medium" }}
              textStyles={{
                fontFamily: "Roboto-Medium",
                color: AppColors.grey_200,
              }}
            >
              {i18n.t("forgot_password")} ?
            </CustomText>
          </View>

          <Spacer vertical={height(5)} />

          <Button
            testID="signin-login-button"
            disabled={!isValid}
            loading={loading}
            textStyle={{ fontFamily: "Roboto-Medium" }}
            containerStyle={styles.button}
            onPress={handleSubmit(signinHandler)}
          >
            {i18n.t("log_in")}
          </Button>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <CustomText
            color={AppColors.black}
            textStyles={{ fontFamily: "Roboto-Regular" }}
            size={1.5}
            textAlign="center"
          >
            {i18n.t("no_account_yet")}
          </CustomText>
          <CustomText
            onPress={() => {
              navigation.navigate(ScreenNames.SIGN_UP);
            }}
            color={AppColors.primary}
            textStyles={{
              marginLeft: height(0.5),
              fontFamily: "Roboto-Medium",
            }}
            textDecorationLine="underline"
            size={2}
            textAlign="center"
          >
            {i18n.t("sign_up")}
          </CustomText>
        </View>
      </View>

      <View
        style={{ alignItems: "center", marginTop: height(5), width: "100%" }}
      >
        <View style={{ width: "100%", marginTop: height(3) }}>
          <Button
            testID="signin-skip-button"
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
            {i18n.t("create_account_later")}
          </Button>
        </View>
      </View>
    </ScreenWrapper>
  );
}
