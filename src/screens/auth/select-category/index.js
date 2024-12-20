import React, { useEffect, useState } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { AppColors } from "../../../utils";
import ScreenWrapper from "../../../components/screen-wrapper";
import CustomText from "../../../components/text";
import { height } from "../../../utils/dimension";
import { categories, countries } from "../../../utils/dummy-data";
import { AntDesign } from "@expo/vector-icons";
import Button from "../../../components/button";
import SelectCategoryStyles from "./SelectCategoryStyles";
import { useDispatch } from "react-redux";
import { login } from "../../../Redux/Actions/Auth";
import { firestore } from "../../../../firebaseconfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Toast from "react-native-toast-message";

export default function SelectCategory({ navigation, route }) {
  const { userData } = route?.params;
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("fr");
  const [categoryName, setCategoryName] = useState("Mode femme");

  useEffect(() => {
    setLoading(false);
  }, []);

  const loginHandler = async () => {
    setLoading(true);
    const docRef = await doc(
      firestore,
      "DevelopmentUsers",
      userData.email.trim()
    );
    const exists = await getDoc(docRef);
    if (typeof exists.data() != "undefined") {
      console.log("user already exists");
      Toast.show({
        text1: "User already exists",
        type: "error",
        text2: "User with this email already exists",
      });
      setLoading(false);
    } else {
      await setDoc(doc(firestore, "DevelopmentUsers", userData.email.trim()), {
        name: userData.username.trim(),
        password: userData.password.trim(),
        email: userData.email.trim(),
        country: userData.country.trim(),
        category: categoryName.trim(),
      })
        .then(async () => {
          const docRef = await doc(
            firestore,
            "DevelopmentUsers",
            userData.email.trim()
          );
          await getDoc(docRef).then((res) => {
            console.log(res);
            dispatch(login(res.data()));
          });
        })
        .catch((err) => {
          setLoading(false);
          console.log(err);
        });
    }
  };
  // const loginHandler = async (values) => {

  //   // dispatch(login(true));
  //   // setLoading(true);
  // };

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
                onPress={() => {
                  setCategoryName(item.name);
                  setSelectedCategory(item?.id);
                }}
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
          onPress={() => {
            loginHandler();
          }}
        >
          Register
        </Button>
      </View>
    </ScreenWrapper>
  );
}
