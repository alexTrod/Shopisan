import React from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ScreenNames } from "../routes";
import BottomTabs from "../bottom-tab";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName={ScreenNames.BOTTOM_TAB}
      screenOptions={{ header: () => false }}
    >
      <Stack.Screen name={ScreenNames.BOTTOM_TAB} component={BottomTabs} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
