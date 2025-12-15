import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, Switch, TouchableOpacity, View } from "react-native";
import { useForm } from "react-hook-form";
import { signIn, setNoAuthenticationWanted } from "../../../Redux/Actions/UserActions";
import SignInFormValidation from "./validation";
import styles from "./styles";
import { yupResolver } from "@hookform/resolvers/yup";
import { height, width } from "../../../utils/dimension";
import { AppColors } from "../../../utils";
import { InputField } from "../../../components/input";
import CustomText from "../../../components/text";
import { Feather, FontAwesome6 } from "@expo/vector-icons";
import Button from "../../../components/button";
import { ScreenNames } from "../../../Routes/routes";
import ScreenWrapper from "../../../components/screen-wrapper";
import Spacer from "../../../components/spacer";
import { useDispatch, useSelector } from "react-redux";
import Unlock_outline from "../../../../assets/icons/unlock";
import i18n from "../../../translations/i18n";

export default function SignIn({ navigation }) {
  const [loading, setLoading] = useState(false);
  const locale = useSelector(state => state.locale.currentLocale);
  const dispatch = useDispatch();

  useEffect(() => {
    i18n.locale = locale;
  }, [locale]);

  const passwordRef = useRef(null);
  const [passwordHide, setPasswordHide] = useState(true);
  const { control, handleSubmit, formState: { isValid, errors } } = useForm({
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
        "Login Failed",
        "Incorrect email or password. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };  

  const [isEnabled, setIsEnabled] = useState(false);
  const toggleSwitch = () => setIsEnabled(prevState => !prevState);

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
          <View style={{ width: "90%", alignSelf: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <CustomText
                textAlign="center"
                color={AppColors.grey_100}
                textProps={{ fontFamily: "Roboto-Medium" }}
                size={2.2}
              >
                Log In
              </CustomText>
            </View>
          </View>


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
              borderColor: errors.loginIdentifier ? AppColors.red : AppColors.secondary,
              borderWidth: width(0.2),
            }}
            textFieldInnerContainer={{ width: "100%" }}
            onSubmit={() => passwordRef.current?.focus()}
            keytype="next"
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
              borderColor: errors.password ? AppColors.red : AppColors.secondary,
              borderWidth: width(0.2),
            }}
            textFieldInnerContainer={{ width: "100%" }}
            control={control}
            name="password"
            placeholder={i18n.t('pwd_placeholder')}
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

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "90%", alignSelf: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Switch
                trackColor={{ false: AppColors.grey_200, true: AppColors.primary }}
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
                Remember
              </CustomText>
            </View>
            <CustomText
              color={AppColors.pink}
              onPress={() => navigation?.navigate(ScreenNames.FORGOT_PASSWORD)}
              textAlign="right"
              size={1.7}
              textProps={{ fontFamily: "Roboto-Medium" }}
              textStyles={{ fontFamily: "Roboto-Medium", color: AppColors.grey_200 }}
            >
              Forgot Password ?
            </CustomText>
          </View>

          <Spacer vertical={height(5)} />

          <Button
            disabled={!isValid}
            loading={loading}
            textStyle={{ fontFamily: "Roboto-Medium" }}
            containerStyle={styles.button}
            onPress={handleSubmit(signinHandler)}
          >
            Log in
          </Button>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <CustomText
            color={AppColors.black}
            textStyles={{ fontFamily: "Roboto-Regular" }}
            size={1.5}
            textAlign="center"
          >
            Create an account ?
          </CustomText>
          <CustomText
            onPress={() => {
              navigation.navigate(ScreenNames.SIGN_UP);
            }}
            color={AppColors.primary}
            textStyles={{ marginLeft: height(0.5), fontFamily: "Roboto-Medium" }}
            textDecorationLine="underline"
            size={2}
            textAlign="center"
          >
            Sign up
          </CustomText>
        </View>

        </View>

        <View style={{ alignItems: "center", marginTop: height(5), width: '100%' }}>
          <View style={{ width: '100%', marginTop: height(3) }}>
            <Button
              textStyle={{ fontFamily: "Roboto-Medium", color: AppColors.primary }}
              containerStyle={[styles.buttonSecondary, { width: '100%', borderRadius: 0 }]}
              onPress={async () => {
                await dispatch(setNoAuthenticationWanted(true));
              }}
            >
              Create an account later
            </Button>
          </View>
      </View>
    </ScreenWrapper>
  );
}