import React, { useState } from "react";
import { FlatList, Image, Switch, TouchableOpacity, View } from "react-native";

import { AppColors } from "../../../utils";

import ScreenWrapper from "../../../components/screen-wrapper";
import CustomText from "../../../components/text";
import { height } from "../../../utils/dimension";
import FranceFlag from "../../../../assets/icons/france-flag";
import { categories, countries } from "../../../utils/dummy-data";
import { AntDesign } from "@expo/vector-icons";
import GreeceFlag from "../../../../assets/icons/greece-flag";
import SpainFlag from "../../../../assets/icons/spain-flag";
import ItalyFlag from "../../../../assets/icons/italy-flag";
import UKFlag from "../../../../assets/icons/Uk-flag";
import BelgiqueFlag from "../../../../assets/icons/belgique-flag";
import Button from "../../../components/button";
import SelectCategoryStyles from "./SelectCategoryStyles";

export default function SelectCategory({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("fr");
  console.log(countries);

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
      <View style={SelectCategoryStyles.mainViewContainer}>
        <CustomText
          color={AppColors.primary}
          textAlign="left"
          textStyles={{ fontFamily: "Mulish-Bold", marginBottom: height(5) }}
          size={2.2}
        >
          Choice of category
        </CustomText>
        <FlatList
          data={categories}
          keyExtractor={(item) => {
            item?.id;
          }}
          renderItem={({ item, index }) => {
            return (
              <TouchableOpacity
                key={item?.id}
                style={SelectCategoryStyles.countryRow}
                onPress={() => setSelectedCategory(item?.id)}
              >
                <View
                  style={[
                    SelectCategoryStyles.radioButtonOuter,
                    {
                      borderColor:
                        item?.id === selectedCategory
                          ? AppColors.primary
                          : AppColors.grey_400,
                    },
                  ]}
                >
                  {selectedCategory === item?.id && (
                    <AntDesign
                      name="check"
                      size={height(2)}
                      color={AppColors.primary}
                    />
                  )}
                </View>

                {/* <Image source={country.flag} style={SelectCategoryStyles.flag} /> */}
                <CustomText
                  color={
                    item?.id === selectedCategory
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
          containerStyle={SelectCategoryStyles.button}
          // onPress={handleSubmit(loginHandler)}
        >
          Register
        </Button>
      </View>
    </ScreenWrapper>
  );
}
