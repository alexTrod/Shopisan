import React, { useContext, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ShopUnfilled from "../../assets/icons/shop-unfilled";
import { height, width } from "../utils/dimension";
import PinFilled from "../../assets/icons/pin-filled";
import PinUnfilled from "../../assets/icons/pin-unfilled";

import ProfileFilled from "../../assets/icons/profile-filled";
import ProfileUnfilled from "../../assets/icons/profile-unfilled";
import ShopFilled from "../../assets/icons/shop-filled";
import { ScreenNames } from "./routes";
import Profile from "../screens/app/Profile";
import HomeScreen from "../screens/app/home";
import MapScreen from "../screens/app/map";

import { AppColors } from "../utils/";
import { StoreProvider, StoreContext } from "../context/StoreContext.js";
import { useTranslation } from "../utils/useTranslation";
import SearchBar from "../components/search-bar";
import CustomText from "../components/text";
import { setCustomLocation } from "../Redux/Actions/LocationActions";
import { auth } from "../../firebaseconfig";

const Tab = createBottomTabNavigator();

// Inner component that has access to StoreContext
function TabsWithSearch() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { allStores, setHasRequestedStores } = useContext(StoreContext);
  const user = useSelector((state) => state.user.userData);
  const emailVerificationStatus = useSelector(
    (state) => state.user.emailVerificationStatus,
  );
  const [currentTab, setCurrentTab] = useState(ScreenNames.HOME);

  // Check Firebase Auth's emailVerified status
  const firebaseUser = auth.currentUser;
  const isFirebaseVerified = firebaseUser?.emailVerified === true;

  // User is verified if any of these are true:
  // 1. Firebase Auth emailVerified is true
  // 2. Firestore emailVerificationStatus is 'verified'
  // 3. Firestore is_active is true
  const isVerified =
    isFirebaseVerified ||
    emailVerificationStatus === "verified" ||
    user?.is_active === true;

  // Show badge only when verification is explicitly needed AND user is not verified
  const needsVerification =
    !isVerified &&
    (emailVerificationStatus === "pending" ||
      emailVerificationStatus === "expired");
  const showVerificationBadge = user && needsVerification;

  // Handler for city selection from unified search
  const handleCitySelect = (cityName, coordinates) => {
    console.log("[UnifiedSearch] City selected:", cityName, coordinates);
    // Update Redux location - this will trigger both Home and Map to update
    dispatch(
      setCustomLocation(
        {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
        "search",
      ),
    );
    setHasRequestedStores(true);
  };

  // Handler for store selection from unified search
  const handleStoreSelect = (storeSuggestion) => {
    console.log("[UnifiedSearch] Store selected:", storeSuggestion);
    if (storeSuggestion.location) {
      dispatch(
        setCustomLocation(
          {
            latitude: storeSuggestion.location.latitude,
            longitude: storeSuggestion.location.longitude,
          },
          "search",
        ),
      );
      setHasRequestedStores(true);
    }
  };

  // Navigate to sign up by exiting guest mode
  const handleSignUp = () => {
    // Dispatch AUTH_LOGOUT to exit guest mode and show auth screens
    dispatch({ type: "AUTH_LOGOUT" });
  };

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      testID="main-tab-bar"
    >
      {/* Header with Sign Up and Search Bar */}
      <View style={styles.headerContainer}>
        {/* Sign Up button - only show if not logged in */}
        {!user && (
          <TouchableOpacity onPress={handleSignUp} style={styles.signUpButton}>
            <CustomText
              size={1.8}
              color={AppColors.white}
              textStyles={{ fontWeight: "600" }}
            >
              {t("sign_up")}
            </CustomText>
          </TouchableOpacity>
        )}
      </View>

      {/* Unified Search Bar - only show on Home and Map tabs */}
      {currentTab !== ScreenNames.PROFILE && (
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder={t("search_placeholder")}
            onCitySelect={handleCitySelect}
            onStoreSelect={handleStoreSelect}
            allStores={allStores}
            containerStyle={styles.searchBarWrapper}
          />
        </View>
      )}

      {/* Tab Navigator */}
      <Tab.Navigator
        initialRouteName={ScreenNames.HOME}
        screenListeners={{
          state: (e) => {
            const routeName = e.data.state.routes[e.data.state.index].name;
            setCurrentTab(routeName);
          },
        }}
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
              return (
                <View style={{ position: "relative" }}>
                  {focused ? (
                    <ProfileFilled height={height(3)} width={height(3)} />
                  ) : (
                    <ProfileUnfilled height={height(3)} width={height(3)} />
                  )}
                  {showVerificationBadge && (
                    <View style={styles.notificationBadge}>
                      <Ionicons
                        name="alert"
                        size={10}
                        color={AppColors.white}
                      />
                    </View>
                  )}
                </View>
              );
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
          options={{ title: t("home_title") }}
        />
        <Tab.Screen
          name={ScreenNames.MAP}
          component={MapScreen}
          options={{ title: t("map_title") }}
        />
        <Tab.Screen
          name={ScreenNames.PROFILE}
          component={Profile}
          options={{ title: t("profile_title") }}
        />
      </Tab.Navigator>
    </View>
  );
}

function BottomTabsNavigator() {
  return (
    <StoreProvider>
      <TabsWithSearch />
    </StoreProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.white,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: width(4),
    paddingTop: height(0.5),
    backgroundColor: AppColors.white,
  },
  signUpButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: height(1),
    paddingHorizontal: width(4),
    borderRadius: 20,
  },
  searchContainer: {
    paddingHorizontal: width(4),
    paddingVertical: height(1),
    backgroundColor: AppColors.white,
    zIndex: 1000,
  },
  searchBarWrapper: {
    marginBottom: 0,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    backgroundColor: AppColors.error || "#FF3B30",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: AppColors.white,
  },
});

export default function BottomTabs() {
  return <BottomTabsNavigator />;
}
