import React, { useRef, useState } from "react";
import { Image, TextInput, TouchableOpacity, View } from "react-native";
import { useForm } from "react-hook-form";

import styles from "./styles";
import ScreenWrapper from "../../../components/screen-wrapper";
import { LargeText, SmallText } from "../../../components/text";
import Spacer from "../../../components/spacer";
import { InputField } from "../../../components/input";
import { EvilIcons, Feather } from "@expo/vector-icons";
import Button from "../../../components/button";
import ResetFormValidation from "./valdiation";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";
import { yupResolver } from "@hookform/resolvers/yup";
import { ScreenNames } from "../../../Routes/routes";

export default function ResetPassword({ navigation }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const [passwordHide, setPasswordHide] = useState(true);
  const [ConfirmpasswordHide, setConfirmpasswordHide] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm({
    mode: "all",
    resolver: yupResolver(ResetFormValidation), // Replace with your validation schema
  });

  const signinHandler = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation?.navigate(ScreenNames.SIGN_IN);
      setModalVisible(true);
    }, 2000);
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
            Reset Password
          </LargeText>
          <Spacer vertical={height(1)} />
          <SmallText textAlign="center" size={2}>
            Create a strong password
          </SmallText>
          <Spacer vertical={height(2)} />
          <InputField
            ref={passwordRef}
            prefix={
              <EvilIcons
                name={"lock"}
                size={height(4)}
                color={AppColors.wihte5}
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
              <EvilIcons
                name={"lock"}
                size={height(4)}
                color={AppColors.wihte5}
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

          <Spacer vertical={height(2)} />
          <Button
            loading={loading}
            disabled={!isValid}
            textStyle={{ fontWeight: "bold" }}
            containerStyle={styles.button}
            onPress={handleSubmit(signinHandler)}
          >
            Reset
          </Button>
        </View>
      </View>
    </ScreenWrapper>
  );
}
