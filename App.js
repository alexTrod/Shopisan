import React from "react";
import Toast from "react-native-toast-message";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "./src/Redux";
import Routes from "./src/Routes";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import * as Localization from 'expo-localization';
import { setLocale } from './src/Redux/Actions/LocaleActions';
import { setShopperCountry } from "./src/Redux/Actions/ShopperProfileActions";


// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";

// Import the functions you need from the SDKs you need

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

export default function App() {
  const [loaded, error] = useFonts({
    "Mulish-Black": require("./assets/fonts/Mulish-Black.ttf"),
    "Mulish-BlackItalic": require("./assets/fonts/Mulish-BlackItalic.ttf"),
    "Mulish-Bold": require("./assets/fonts/Mulish-Bold.ttf"),
    "Mulish-BoldItalic": require("./assets/fonts/Mulish-BoldItalic.ttf"),
    "Mulish-ExtraBold": require("./assets/fonts/Mulish-ExtraBold.ttf"),
    "Mulish-ExtraBoldItalic": require("./assets/fonts/Mulish-ExtraBoldItalic.ttf"),
    "Mulish-ExtraLight": require("./assets/fonts/Mulish-ExtraLight.ttf"),
    "Mulish-Light": require("./assets/fonts/Mulish-Light.ttf"),
    "Mulish-Medium": require("./assets/fonts/Mulish-Medium.ttf"),
    "Mulish-Regular": require("./assets/fonts/Mulish-Regular.ttf"),
    "Mulish-SemiBold": require("./assets/fonts/Mulish-SemiBold.ttf"),
  });


  useEffect(() => {
    const deviceLanguage = Localization.getLocales()[0].languageCode;
    const deviceCountry = Localization.getLocales()[0].regionCode;
    store.dispatch(setShopperCountry(deviceCountry));
    console.log("SHOPPER LOCATED AT ", deviceCountry)
    store.dispatch(setLocale(deviceLanguage));
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  return (
    <Provider store={store}>
      
      <PersistGate loading={null} persistor={persistor}>
        <Routes />
        <Toast />
      </PersistGate>
    </Provider>
  );
}
