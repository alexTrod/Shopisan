import React from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ScreenNames } from "../routes";
import Login from "../../screens/auth/login";
import { SelectCategoryScreen, SelectCountryScreen } from "../../screens/auth";

const Stack = createNativeStackNavigator();

const AuthStackNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName={ScreenNames.LOGIN}
      screenOptions={{ header: () => false }}
    >
      <Stack.Screen name={ScreenNames.LOGIN} component={Login} />
      <Stack.Screen
        name={ScreenNames.SELECT_COUNTRY}
        component={SelectCountryScreen}
      />
      <Stack.Screen
        name={ScreenNames.SELECT_CATEGORY}
        component={SelectCategoryScreen}
      />
    </Stack.Navigator>
  );
};

export default AuthStackNavigator;
