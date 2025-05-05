import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { store } from './src/Redux/index';
import { checkAuthStatus } from './src/Redux/Actions/UserActions';
import BottomTabs from './src/Routes/bottom-tab';
import { ScreenNames } from './src/Routes/routes';
import SignUp from './src/screens/auth/signup';
import SignIn from './src/screens/auth/signin';
import ResetPassword from './src/screens/auth/reset-password';
import CustomText from './src/components/text';
import ForgotPassword from './src/screens/auth/forgot-password';
import AddStore from "./src/screens/app/add_store";
import HandleStore from "./src/screens/app/handle_store";
import ChooseRoleScreen from './src/screens/auth/choose-role';
import Toast from 'react-native-toast-message';

const Stack = createNativeStackNavigator();

const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, noAuthenticationWanted, loading } = useSelector(state => state.user);

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  if (loading) {
    return <CustomText>Loading...</CustomText>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated || noAuthenticationWanted ? (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabs} />

            <Stack.Screen 
              name={ScreenNames.ADD_STORE} 
              component={AddStore} 
              options={{ presentation: "modal" }}
            />
            <Stack.Screen 
              name={ScreenNames.HANDLE_STORE} 
              component={HandleStore} 
              options={{ presentation: "modal" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name={ScreenNames.CHOOSE_ROLE} component={ChooseRoleScreen} />
            <Stack.Screen name={ScreenNames.SIGN_UP} component={SignUp} />
            <Stack.Screen name={ScreenNames.SIGN_IN} component={SignIn} />
            <Stack.Screen name={ScreenNames.FORGOT_PASSWORD} component={ForgotPassword} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const WrappedApp = () => (
  <Provider store={store}>
    <App />
    <Toast />
  </Provider>
);

export default WrappedApp;
