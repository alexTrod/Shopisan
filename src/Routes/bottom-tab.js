import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import ShopUnfilled from "../../assets/icons/shop-unfilled";
import { height } from "../utils/dimension";
import PinFilled from "../../assets/icons/pin-filled";
import PinUnfilled from "../../assets/icons/pin-unfilled";

import ProfileFilled from "../../assets/icons/profile-filled";
import ProfileUnfilled from "../../assets/icons/profile-unfilled";
import ShopFilled from "../../assets/icons/shop-filled";
import { ScreenNames } from "./routes";
import Profile from "../screens/app/Profile";
import HomeScreen from "../screens/app/home";
import Map from "../screens/app/map"; // Changed from MapScreen to Map

import { AppColors } from "../utils/";
import { StoreProvider } from "../context/StoreContext.js";
import { useTranslation } from "../utils/useTranslation";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const { t } = useTranslation();

  return (
    <StoreProvider>
      <Tab.Navigator
        initialRouteName={ScreenNames.HOME}
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === ScreenNames.HOME) {
              if (focused) {
                return <ShopFilled height={height(3)} width={height(3)} />;
              } else {
                return <ShopUnfilled height={height(3)} width={height(3)} />;
              }
            } else if (route.name === ScreenNames.MAP) {
              if (focused) {
                return <PinFilled height={height(3)} width={height(3)} />;
              } else {
                return <PinUnfilled height={height(3)} width={height(3)} />;
              }
            } else if (route.name === ScreenNames.PROFILE) {
              if (focused) {
                return <ProfileFilled height={height(3)} width={height(3)} />;
              } else {
                return <ProfileUnfilled height={height(3)} width={height(3)} />;
              }
            }
          },
          tabBarActiveTintColor: AppColors.primary,
          tabBarInactiveTintColor: AppColors.grey_200,
          header: () => false,
        })}
      >        
        <Tab.Screen
          name={ScreenNames.HOME}
          component={HomeScreen}
          options={{
            tabBarLabel: t('home_title')
          }}
        />
        <Tab.Screen
          name={ScreenNames.MAP}
          component={Map} // Changed from MapScreen to Map
          options={{
            tabBarLabel: t('map_title')
          }}
        />
        <Tab.Screen 
          name={ScreenNames.PROFILE} 
          component={Profile}
          options={{
            tabBarLabel: t('profile_title')
          }}
        />
      </Tab.Navigator>
    </StoreProvider>
  );
}