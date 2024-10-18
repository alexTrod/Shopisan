import { View, Pressable, ImageBackground } from "react-native";

import React from "react";

import ScreenWrapper from "../../../components/screen-wrapper";

import { AppColors } from "../../../utils";

import Header from "../../../components/header";

import CustomText from "../../../components/text";

import { height, width } from "../../../utils/dimension";

import Spacer from "../../../components/spacer";

import { ScreenNames } from "../../../Routes/routes";

import { logout } from "../../../Redux/Actions/Auth";

import { useDispatch } from "react-redux";

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();

  return (
    <ScreenWrapper
      backgroundColor={AppColors.white}
      statusBarColor={AppColors.primary}
      barStyle="dark-content"
    >
      <Header
        showLeft={false}
        showBack
        title="Home"
        rightIcon
        onRightPress={() => dispatch(logout())}
      />
      {/* <View style={{ flex: 1, alignItems: "center" }}>
        <Spacer vertical={height(5)} />
        <Pressable
          onPress={() => {
            navigation?.navigate(ScreenNames.ANIMAL);
          }}
          style={{
            height: height(15),
            alignItems: "center",
            justifyContent: "center",
            width: width(90),
            borderRadius: height(3),
            zIndex: 100,
          }}
        >
          <ImageBackground
            source={require("../../../../assets/animalbg.jpg")}
            style={{
              height: "100%",
              width: width(90),
              // alignItems: "center",
              justifyContent: "center",
            }}
            imageStyle={{ borderRadius: height(3) }}
            resizeMode="repeat"
          >
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.1)",
                height: "100%",
                width: "100%",
                position: "absolute",
                borderRadius: height(3),
              }}
            ></View>
          </ImageBackground>
          <CustomText
            color={AppColors.white}
            size={5}
            fontWeight="bold"
            textAlign="center"
            textStyles={{
              zIndex: 1,
              position: "absolute",
              bottom: height(4.5),
              fontWeight: "bold",

              alignSelf: "center",
            }}
          >
            ANIMAL
          </CustomText>
        </Pressable>
        <Spacer vertical={height(4)} />
        <Pressable
          onPress={() => {
            navigation?.navigate(ScreenNames.LAND);
          }}
          style={{
            height: height(15),
            alignItems: "center",
            justifyContent: "center",
            width: width(90),
            borderRadius: height(3),
            zIndex: 100,
          }}
        >
          <ImageBackground
            source={require("../../../../assets/land.jpg")}
            style={{
              height: "100%",
              width: width(90),
              justifyContent: "center",
            }}
            imageStyle={{ borderRadius: height(3) }}
            resizeMode="repeat"
          >
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.1)",
                height: "100%",
                width: "100%",
                position: "absolute",
                borderRadius: height(3),
              }}
            ></View>
          </ImageBackground>
          <CustomText
            color={AppColors.white}
            size={5}
            fontWeight="bold"
            textAlign="center"
            textStyles={{
              zIndex: 1,
              position: "absolute",
              bottom: height(4.5),

              alignSelf: "center",
              fontWeight: "bold",
            }}
          >
            LAND
          </CustomText>
        </Pressable>
        <Spacer vertical={height(4)} />
        <Pressable
          onPress={() => {
            navigation?.navigate(ScreenNames.TODO);
          }}
          style={{
            height: height(15),
            alignItems: "center",
            justifyContent: "center",
            width: width(90),
            borderRadius: height(3),
            zIndex: 100,
          }}
        >
          <ImageBackground
            source={require("../../../../assets/todo.jpeg")}
            style={{
              height: "100%",
              width: width(90),
              // alignItems: "center",
              justifyContent: "center",
            }}
            imageStyle={{ borderRadius: height(3) }}
            resizeMode="cover"
          >
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.1)",
                height: "100%",
                width: "100%",
                position: "absolute",
                borderRadius: height(3),
              }}
            ></View>
          </ImageBackground>
          <CustomText
            color={AppColors.white}
            size={5}
            fontWeight="bold"
            textAlign="center"
            textStyles={{
              zIndex: 1,
              position: "absolute",
              bottom: height(4.5),
              alignSelf: "center",
              fontWeight: "bold",
            }}
          >
            To Do
          </CustomText>
        </Pressable>
        <Pressable
          style={{
            height: height(8),
            alignItems: "center",
            justifyContent: "center",
            width: width(90),
            borderRadius: height(3),
            zIndex: 100,
            position: "absolute",
            bottom: height(2),
          }}
          onPress={() => {
            navigation?.navigate(ScreenNames.SEARCH);
          }}
        >
          <ImageBackground
            source={require("../../../../assets/search1.avif")}
            style={{
              height: "100%",
              width: width(90),
              // alignItems: "center",
              justifyContent: "center",
            }}
            imageStyle={{ borderRadius: height(3) }}
            resizeMode="cover"
          >
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.2)",
                height: "100%",
                width: "100%",
                position: "absolute",
                borderRadius: height(3),
              }}
            ></View>
          </ImageBackground>
          <CustomText
            color={AppColors.white}
            size={3}
            fontWeight="bold"
            textAlign="center"
            textStyles={{
              zIndex: 1,
              position: "absolute",
              bottom: height(2),
              alignSelf: "center",
              fontWeight: "bold",
            }}
          >
            SEARCH
          </CustomText>
        </Pressable>
      </View> */}
    </ScreenWrapper>
  );
}
