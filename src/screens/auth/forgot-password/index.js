import React from "react";
import { View } from "react-native";
import { useForm } from "react-hook-form";

import styles from "./styles";

import ForgotPasswordForm from "./valdiation";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import { LargeText, SmallText } from "../../../components/text";
import Spacer from "../../../components/spacer";
import { InputField } from "../../../components/input";
import { AntDesign } from "@expo/vector-icons";
import { height, width } from "../../../utils/dimension";
import Button from "../../../components/button";
import { yupResolver } from "@hookform/resolvers/yup";
import { ScreenNames } from "../../../Routes/routes";

export default function ForgotPassword({ navigation }) {
  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm({
    mode: "all",
    resolver: yupResolver(ForgotPasswordForm), // Replace with your validation schema
  });

  const signinHandler = async () => {
    navigation?.navigate(ScreenNames.OTP);
    // dispatch(setIsLoggedIn(true));
  };

  return (
    <ScreenWrapper
      statusBarColor={AppColors.white}
      barStyle="dark-content"
      scrollEnabled
      backgroundColor={AppColors.white}
    >
      <View style={styles.mainViewContainer}>
        {/* <LogoIcon height={height(20)} width={height(20)} /> */}

        <View style={styles.inputContainer}>
          <LargeText
            textAlign="center"
            textProps={{ fontFamily: "bold" }}
            textStyles={{ fontFamily: "bold" }}
            size={5}
          >
            Forget Oassword
          </LargeText>
          <Spacer vertical={height(1)} />
          <SmallText textAlign="center" size={2}>
            Enter your email for a 4-digit verification code
          </SmallText>
          <Spacer vertical={height(2)} />
          <InputField
            control={control}
            prefix={
              <AntDesign
                name={"mail"}
                size={height(3)}
                style={{ marginRight: height(1) }}
                color={AppColors.wihte5}
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
            keytype="next"
            label=""
            placeholder="Enter email"
            error={errors.email}
          />
          <Spacer vertical={height(2)} />
          <Button
            disabled={!isValid}
            textStyle={{ fontWeight: "bold" }}
            containerStyle={styles.button}
            onPress={handleSubmit(signinHandler)}
          >
            Send Code
          </Button>
        </View>
      </View>
    </ScreenWrapper>
  );
}
