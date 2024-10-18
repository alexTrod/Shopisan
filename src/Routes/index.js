import React from "react";

import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import AuthStackNavigator from "./auth/AuthStack";
import AppNavigator from "./app/appnavigator";
import { useSelector } from "react-redux";

export const navigationRef = React.createRef();

const Routes = () => {
  const isLogin = useSelector((state) => state.Auth.isLogin);
  return (
    <NavigationContainer ref={navigationRef}>
      {/* {!isLogin ? <AuthStackNavigator /> : <AppNavigator />} */}
      <AuthStackNavigator />
    </NavigationContainer>
  );
};
export default Routes;
