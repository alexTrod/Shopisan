// App.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../screens/app/home";
import FavoritesScreen from "../screens/app/favorites";
import ShopUnfilled from "../../assets/icons/shop-unfilled";
import { height } from "../utils/dimension";
import PinFilled from "../../assets/icons/pin-filled";
import PinUnfilled from "../../assets/icons/pin-unfilled";
import HeartFilled from "../../assets/icons/heart-filled";
import HeartUnfilled from "../../assets/icons/heart-unfilled";
import ProfileFilled from "../../assets/icons/profile-filled";
import ProfileUnfilled from "../../assets/icons/profile-unfilled";
import ShopFilled from "../../assets/icons/shop-filled";
import { ScreenNames } from "./routes";
import Profile from "../screens/app/Profile";
import Carte from "../screens/app/carte";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      initialRouteName={ScreenNames.HOME}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          console.log(route.name);
          if (route.name === ScreenNames.HOME) {
            if (focused) {
              return <ShopFilled height={height(3)} width={height(3)} />;
            } else {
              return <ShopUnfilled height={height(3)} width={height(3)} />;
            }
          } else if (route.name === ScreenNames.CARTE) {
            if (focused) {
              return <PinFilled height={height(3)} width={height(3)} />;
            } else {
              return <PinUnfilled height={height(3)} width={height(3)} />;
            }
          } else if (route.name === ScreenNames.FAVORITE) {
            if (focused) {
              return <HeartFilled height={height(3)} width={height(3)} />;
            } else {
              return <HeartUnfilled height={height(3)} width={height(3)} />;
            }
          } else if (route.name === ScreenNames.PROFILE) {
            if (focused) {
              return <ProfileFilled height={height(3)} width={height(3)} />;
            } else {
              return <ProfileUnfilled height={height(3)} width={height(3)} />;
            }
          }
        },
        tabBarActiveTintColor: "tomato",
        tabBarInactiveTintColor: "gray",
        header: () => false,
      })}
    >
      <Tab.Screen name={ScreenNames.HOME} component={HomeScreen} />
      <Tab.Screen name={ScreenNames.CARTE} component={Carte} />
      <Tab.Screen name={ScreenNames.FAVORITE} component={FavoritesScreen} />
      <Tab.Screen name={ScreenNames.PROFILE} component={Profile} />
    </Tab.Navigator>
  );
}
