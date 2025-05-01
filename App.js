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

import ChangeNameScreen from './src/screens/app/Profile/change-name/';
import ChangeEmailScreen from './src/screens/app/Profile/change-email/';
import SupportScreen from './src/screens/app/Profile/support/';
import RecoverPasswordScreen from './src/screens/app/Profile/recover-password/';
import RecoverAccountScreen from './src/screens/app/Profile/recover-account/';
import ReportIssueScreen from './src/screens/app/Profile/report-issue';
import SuggestIdeaScreen from './src/screens/app/Profile/suggest-idea';

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
            <Stack.Screen name="ChangeNameScreen" component={ChangeNameScreen} />
            <Stack.Screen name="ChangeEmailScreen" component={ChangeEmailScreen} />
            <Stack.Screen name="SupportScreen" component={SupportScreen} />
            <Stack.Screen name="RecoverPasswordScreen" component={RecoverPasswordScreen} />
            <Stack.Screen name="RecoverAccountScreen" component={RecoverAccountScreen} />
            <Stack.Screen name="AddStoreScreen" component={AddStore} />
            <Stack.Screen name="ReportIssueScreen" component={ReportIssueScreen} />
            <Stack.Screen name="SuggestIdeaScreen" component={SuggestIdeaScreen} />
          </>
        ) : (
          <>
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
  </Provider>
);

export default WrappedApp;
