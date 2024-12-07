import React, { useState } from "react";
import { FlatList, Image, Switch, TouchableOpacity, View } from "react-native";

import styles from "./styles";

import { AppColors } from "../../../utils";

import ScreenWrapper from "../../../components/screen-wrapper";
import CustomText from "../../../components/text";
import { height } from "../../../utils/dimension";
import FranceFlag from "../../../../assets/icons/france-flag";
import { countries } from "../../../utils/dummy-data";
import { AntDesign } from "@expo/vector-icons";
import GreeceFlag from "../../../../assets/icons/greece-flag";
import SpainFlag from "../../../../assets/icons/spain-flag";
import ItalyFlag from "../../../../assets/icons/italy-flag";
import UKFlag from "../../../../assets/icons/Uk-flag";
import BelgiqueFlag from "../../../../assets/icons/belgique-flag";
import Button from "../../../components/button";
import { ScreenNames } from "../../../Routes/routes";

export default function SelectCountry({ navigation, route }) {
  const { userData } = route?.params;
  const [loading, setLoading] = useState(false);
  const [selectedCountryName, setSelectedCountryName] = useState("France");
  const [selectedCountry, setSelectedCountry] = useState("1");
  console.log(userData);

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
  //       dispatch(login(res));
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
  const loginHandler = async (values) => {
    // setLoading(true);
  };

  return (
    <ScreenWrapper
      statusBarColor={AppColors.white}
      barStyle="dark-content"
      // transclucent
      scrollEnabled
      backgroundColor={AppColors.white}
    >
      <View style={styles.mainViewContainer}>
        <CustomText
          color={AppColors.primary}
          textAlign="left"
          textStyles={{ fontFamily: "Mulish-Bold", marginBottom: height(5) }}
          size={2.2}
        >
          Choice of country
        </CustomText>
        <FlatList
          data={countries}
          keyExtractor={(item) => {
            item?.id;
          }}
          renderItem={({ item, index }) => {
            return (
              <TouchableOpacity
                key={item?.id}
                style={styles.countryRow}
                onPress={() => {
                  setSelectedCountryName(item?.name),
                    setSelectedCountry(item?.id);
                }}
              >
                <View
                  style={[
                    styles.radioButtonOuter,
                    {
                      borderColor:
                        item?.id === selectedCountry
                          ? AppColors.primary
                          : AppColors.grey_400,
                    },
                  ]}
                >
                  {selectedCountry === item?.id && (
                    <AntDesign
                      name="check"
                      size={height(2)}
                      color={AppColors.primary}
                    />
                  )}
                </View>
                <View
                  style={{
                    backgroundColor:
                      item?.id === selectedCountry
                        ? AppColors.red_100
                        : AppColors.grey_300,
                    padding: height(1.6),
                    borderRadius: height(1),
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {item?.id === "fr" ? (
                    <FranceFlag height={height(4.5)} width={height(4.5)} />
                  ) : item?.id === "be" ? (
                    <BelgiqueFlag height={height(4.5)} width={height(4.5)} />
                  ) : item?.id === "uk" ? (
                    <UKFlag height={height(4.5)} width={height(4.5)} />
                  ) : item?.id === "it" ? (
                    <ItalyFlag height={height(4.5)} width={height(4.5)} />
                  ) : item?.id === "es" ? (
                    <SpainFlag height={height(4.5)} width={height(4.5)} />
                  ) : (
                    <GreeceFlag height={height(4.5)} width={height(4.5)} />
                  )}
                </View>
                {/* <Image source={country.flag} style={styles.flag} /> */}
                <CustomText
                  color={
                    item?.id === selectedCountry
                      ? AppColors.primary
                      : AppColors.black
                  }
                  textAlign="left"
                  textStyles={{
                    fontFamily: "Mulish-Bold",
                    marginLeft: height(1),
                  }}
                  size={1.8}
                >
                  {item?.name}
                </CustomText>
              </TouchableOpacity>
            );
          }}
        />
        <Button
          loading={loading}
          textStyle={{ fontFamily: "Mulish-Bold" }}
          containerStyle={styles.button}
          onPress={() => {
            let data = {
              ...userData,
              country: selectedCountryName,
            };
            navigation?.navigate(ScreenNames.SELECT_CATEGORY, {
              userData: data,
            });
          }}
        >
          Register
        </Button>
      </View>
    </ScreenWrapper>
  );
}
