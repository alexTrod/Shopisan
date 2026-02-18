import React, { useEffect, useState, useRef } from 'react';
import { View, Image, StyleSheet, BackHandler, Text } from 'react-native';
import { useDispatch, useSelector, Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './src/Redux/index';
import { checkAuthStatus } from './src/Redux/Actions/UserActions';
import BottomTabs from './src/Routes/bottom-tab';
import { ScreenNames } from './src/Routes/routes';
import SignUp from './src/screens/auth/signup';
import MerchantSignupWizard from './src/screens/auth/signup/MerchantSignupWizard';
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
import ReportIssueScreen from './src/screens/app/Profile/report-issue';
import SuggestIdeaScreen from './src/screens/app/Profile/suggest-idea';
import ContactSupportScreen from './src/screens/app/Profile/contact-support';
import Toast from 'react-native-toast-message';
import { useTranslation } from './src/utils/useTranslation';
//import LanguageSelectionScreen from './src/screens/app/language-selection';
//import initializeLogging from './src/utils/initLogging'; // Initialize logging system
import { runCitiesMigration } from './src/utils/citiesMigration';

// Initialize i18n with error handling
try {
  require('./src/translations/i18n'); // Initialize i18n
  console.log('App.js: i18n module required successfully');
  if (global.i18n) {
   // console.log('App.js: global.i18n properties:', Object.keys(global.i18n));
  }
} catch (error) {
//console.error('App.js: Failed to require i18n module:', error);
}

// Load persisted locale from AsyncStorage and update i18n
const loadPersistedLocale = async () => {
  try {
    const persistedState = await AsyncStorage.getItem('persist:root');
    if (persistedState) {
      const parsed = JSON.parse(persistedState);
      if (parsed.locale) {
        const localeState = JSON.parse(parsed.locale);
        const persistedLocale = localeState.currentLocale;
        if (persistedLocale && global.i18n && global.i18n.locale !== persistedLocale) {
          console.log('🌍 Loading persisted locale:', persistedLocale);
          global.i18n.locale = persistedLocale;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load persisted locale:', error);
  }
};

const Stack = createNativeStackNavigator();

const SplashScreen = () => {
  // Use global i18n directly since it's initialized synchronously before render
  const tagline = global.i18n?.t?.('splash_tagline') || 'Shop local, shop different, discover original';

  return (
    <View style={styles.splashContainer}>
      <Image
        source={require('./assets/logo_icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.brandName}>SHOPISAN</Text>
      <Text style={styles.tagline}>{tagline}</Text>
    </View>
  );
};

const App = () => {
  const dispatch = useDispatch();
  const navigationRef = useRef(null);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [i18nReady, setI18nReady] = useState(false);
  const { isAuthenticated, noAuthenticationWanted, loading } = useSelector(state => state.user);

  useEffect(() => {
    let timeoutId = null;
    let retryTimeoutId = null;
    let isCleanedUp = false;

    // Check if i18n is ready
    const checkI18n = () => {
      if (isCleanedUp) return;

      try {
        console.log('App.js: Checking i18n readiness...');
        console.log('App.js: global.i18n exists:', !!global.i18n);
        if (global.i18n) {
          console.log('App.js: global.i18n properties:', Object.keys(global.i18n));
          console.log('App.js: global.i18n.isInitialized exists:', !!global.i18n.isInitialized);
        }

        if (global.i18n && global.i18n.isInitialized && global.i18n.isInitialized()) {
          console.log('App.js: i18n is ready!');
          // Clear the fallback timeout since i18n is ready
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          setI18nReady(true);
        } else {
          console.log('App.js: i18n not ready yet, retrying...');
          // Retry after a short delay
          retryTimeoutId = setTimeout(checkI18n, 100);
        }
      } catch (error) {
        console.warn('App.js: Error checking i18n readiness:', error);
        retryTimeoutId = setTimeout(checkI18n, 100);
      }
    };

    // Set a timeout to prevent infinite waiting
    timeoutId = setTimeout(() => {
      console.warn('i18n initialization timeout, proceeding anyway');
      setI18nReady(true);
    }, 5000); // 5 second timeout

    checkI18n();
    dispatch(checkAuthStatus());

    // Run cities migration (one-time setup)
    runCitiesMigration().then(result => {
      if (result.success) {
        console.log('✅ Cities migration completed successfully');
      } else {
        console.log('ℹ️ Cities migration not needed or failed:', result.message);
      }
    }).catch(error => {
      console.error('❌ Cities migration error:', error);
    });

    return () => {
      isCleanedUp = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
    };
  }, [dispatch]);

  useEffect(() => {
    const backAction = () => {
      if (currentRoute === ScreenNames.MAP) {
        navigationRef.current?.navigate(ScreenNames.HOME);
        return true;
      }
      if (currentRoute === ScreenNames.PROFILE) {
        navigationRef.current?.navigate(ScreenNames.MAP);
        return true;
      }
      if (currentRoute === ScreenNames.HOME) {
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [currentRoute]);

  // Debug: log which condition is blocking
  console.log('App render check:', {
    loading,
    i18nReady,
    isAuthenticated,
    noAuthenticationWanted,
    showSplash: loading || !i18nReady,
    willShowMainTabs: isAuthenticated || noAuthenticationWanted
  });

  // Show logo while loading for seamless experience
  if (loading || !i18nReady) {
    console.log('🔴 Showing SPLASH because:', { loading, i18nReady: !i18nReady });
    // Use global i18n directly since it may be initialized before React state updates
    const tagline = global.i18n?.t?.('splash_tagline') || 'Shop local, shop different, discover original';
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('./assets/logo_icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandName}>SHOPISAN</Text>
        <Text style={styles.tagline}>{tagline}</Text>
      </View>
    );
  }

  console.log('🟢 Showing NAVIGATION - auth screens:', !(isAuthenticated || noAuthenticationWanted));

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={() => {
        const route = navigationRef.current?.getCurrentRoute();
        setCurrentRoute(route?.name || null);
      }}
    >
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        key={isAuthenticated || noAuthenticationWanted ? 'main' : 'auth'}
      >
        {isAuthenticated || noAuthenticationWanted ? (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabs} />
            <Stack.Screen name={ScreenNames.ADD_STORE} component={AddStore} options={{ presentation: "modal" }} />
            <Stack.Screen name={ScreenNames.HANDLE_STORE} component={HandleStore} options={{ presentation: "modal" }} />
            <Stack.Screen name="ChangeNameScreen" component={ChangeNameScreen} />
            <Stack.Screen name="ChangeEmailScreen" component={ChangeEmailScreen} />
            <Stack.Screen name="SupportScreen" component={SupportScreen} />
            <Stack.Screen name="RecoverPasswordScreen" component={RecoverPasswordScreen} />
                        <Stack.Screen name="AddStoreScreen" component={AddStore} />
            <Stack.Screen name="ReportIssueScreen" component={ReportIssueScreen} />
            <Stack.Screen name="SuggestIdeaScreen" component={SuggestIdeaScreen} />
            <Stack.Screen name="ContactSupportScreen" component={ContactSupportScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name={ScreenNames.SIGN_UP} component={SignUp} />
            <Stack.Screen name="MerchantSignupWizard" component={MerchantSignupWizard} />
            <Stack.Screen name={ScreenNames.SIGN_IN} component={SignIn} />
            <Stack.Screen name={ScreenNames.FORGOT_PASSWORD} component={ForgotPassword} />
          </>
        )}
      </Stack.Navigator>
      <Toast 
        position="bottom"
        bottomOffset={100}
      />
    </NavigationContainer>
  );
};

const WrappedApp = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [localeLoaded, setLocaleLoaded] = useState(false);

  useEffect(() => {
    // Load persisted locale first, then start splash timer
    const init = async () => {
      await loadPersistedLocale();
      setLocaleLoaded(true);

      console.log('⏳ WrappedApp: Starting 2-second splash timer');
      setTimeout(() => {
        console.log('⏳ WrappedApp: 2-second splash timer DONE, showing App');
        setShowSplash(false);
      }, 2000);
    };
    init();
  }, []);

  console.log('⏳ WrappedApp render:', { showSplash, localeLoaded });

  // Show nothing until locale is loaded, then show splash
  if (!localeLoaded) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('./assets/logo_icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandName}>SHOPISAN</Text>
      </View>
    );
  }

  return (
    <Provider store={store}>
      {showSplash ? <SplashScreen /> : <App />}
    </Provider>
  );
};

export default WrappedApp;

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 16,
    marginTop: -80,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
