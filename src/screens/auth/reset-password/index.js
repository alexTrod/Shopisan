import React, { useState } from "react";
import { Image, TouchableOpacity, View, Modal, Text } from "react-native";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ScreenWrapper from "../../../components/screen-wrapper";
import { LargeText, SmallText } from "../../../components/text";
import Spacer from "../../../components/spacer";
import { InputField } from "../../../components/input";
import Button from "../../../components/button";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";
import { ScreenNames } from "../../../Routes/routes";
import Toast from "react-native-toast-message";
import i18n from "../../../translations/i18n";
import ResetFormValidation from "./validation";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

import styles from "./styles";

export default function ResetPassword({ navigation }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { isValid, errors } } = useForm({
    mode: "all",
    resolver: yupResolver(ResetFormValidation),
  });

  const resetHandler = async (values) => {
    setLoading(true);
    const auth = getAuth();
    try {
      await sendPasswordResetEmail(auth, values.email);
      setModalVisible(true);
    } catch (error) {
      Toast.show({
        text1: "Error",
        text2: error.message,
        type: "error",
      });
    }
    setLoading(false);
  };  

  return (
    <ScreenWrapper
      statusBarColor={AppColors.white}
      barStyle="dark-content"
      scrollEnabled
      backgroundColor={AppColors.white}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Image
          source={require("../../../../assets/LogoIcon.png")}
          style={{ height: height(5), width: height(5), marginBottom: height(2) }}
        />

        <View style={{ width: "90%", alignSelf: "center" }}>
          <LargeText textAlign="center" size={5} textProps={{ fontFamily: "bold" }}>
            Reset Password
          </LargeText>
          <Spacer vertical={height(1)} />
          <SmallText textAlign="center" size={2}>
            Enter your email to receive a password reset link.
          </SmallText>
          <Spacer vertical={height(2)} />

          <InputField
            control={control}
            name="email"
            keyboardType="email-address"
            containerStyles={{ width: "90%", alignSelf: "center" }}
            textFieldContainer={{
              width: "100%",
              backgroundColor: AppColors.white,
              borderColor: AppColors.secondary,
              borderWidth: width(0.2),
            }}
            textFieldInnerContainer={{ width: "100%" }}
            placeholder="Enter your email"
            error={errors.email}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Spacer vertical={height(2)} />

          <Button
            loading={loading}
            textStyle={{ fontWeight: "bold" }}
            containerStyle={styles.button}
            onPress={() => handleSubmit(resetHandler)()}
          >
            Reset
          </Button>
        </View>

        {/* Popup Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
            <View style={{ width: "80%", padding: 20, backgroundColor: AppColors.white, borderRadius: 10, alignItems: "center" }}>
              <LargeText textAlign="center" size={4}>
                Email Sent
              </LargeText>
              <Spacer vertical={height(1)} />
              <SmallText textAlign="center" size={2}>
                A password reset email has been sent to your email address.
              </SmallText>
              <Spacer vertical={height(2)} />
              <Button onPress={() => setModalVisible(false)} textStyle={{ fontWeight: "bold" }}>
                Close
              </Button>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
}
