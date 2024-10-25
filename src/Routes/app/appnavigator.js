import React from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ScreenNames } from "../routes";
import BottomTabs from "../bottom-tab";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  //   const dispatch = useDispatch()

  //   const hasCompletedProfile = useSelector(selectHasCompletedProfile)
  //   const hasDocumentUploaded = useSelector(selectHasDocumentUploaded)
  //   const isLoggedIn = useSelector(selectIsLoggedIn)

  //   const getRouteName = () => {
  //     if (!isLoggedIn) {
  //       return ScreenNames.SELECT_ROLE
  //     }
  //     if (!hasDocumentUploaded) {
  //       return ScreenNames.DOCUMENT_VERIFICATION
  //     } else if (!hasCompletedProfile) {
  //       return ScreenNames.COMPLETE_PROFILE
  //     } else {
  //       return ScreenNames.SELECT_ROLE
  //     }
  //   }

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
