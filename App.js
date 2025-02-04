import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { store } from './src/Redux/index';
import { checkAuthStatus } from './src/Redux/Actions/UserActions';
import logging from './src/utils/logging';
import BottomTabs from "./src/Routes/bottom-tab";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ScreenNames } from './src/Routes/routes';
import HomeScreen from './src/screens/app/home';
import SignUp from './src/screens/auth/signup';
import SignIn from './src/screens/auth/signin';
import ShopperProfileScreen from './src/screens/app/Profile';
import FavoritesScreen from './src/screens/app/favorites';
import StoreManagementScreen from './src/screens/app/Profile';
import MerchantProfileScreen from './src/screens/app/Profile';
import CustomText from './src/components/text';

const App = () => {
  const Stack = createNativeStackNavigator();
  const dispatch = useDispatch();
  const { isAuthenticated, noAuthenticationWanted, loading, userType } = useSelector(state => state.user);

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, []);


  if (loading) { //todo: fill in
    return <>
        <CustomText>Loading...</CustomText>
    </>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
      screenOptions={{
        headerShown: false 
      }}
    >
        
        {isAuthenticated || noAuthenticationWanted ? (
          userType === 'shopper' ? ( // shopper
            <Stack.Screen 
            name="MainTabs" 
            component={BottomTabs} 
            options={{ headerShown: false }}
          />
          ) : ( //merchant
            <Stack.Screen 
            name="MainTabs" 
            component={BottomTabs} 
            options={{ headerShown: false }}
          />
          )
        ) : (
          // Non-authenticated stack
          <>
            <Stack.Screen name={ScreenNames.SIGN_UP} component={SignUp} />
            <Stack.Screen name={ScreenNames.SIGN_IN} component={SignIn} />
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
