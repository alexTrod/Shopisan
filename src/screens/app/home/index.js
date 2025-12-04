import React, { useEffect, useState, useCallback, useMemo, useRef, useContext } from "react";
import { View, ActivityIndicator, FlatList, TouchableOpacity, Text, StyleSheet, Modal, Alert, TextInput, ScrollView } from "react-native";
import { useSelector, shallowEqual, useDispatch } from "react-redux";
import { getUserFavoriteStoreIds, getFavoriteStoreQuery, fetchStores, getMerchantStoreQuery } from "../../../utils/storeUtils";
import ItemCard from "../../../components/item-card/ItemCard";
import CustomText from "../../../components/text";
import { AppColors } from "../../../utils";
import logging from "../../../utils/logging";
import CategoryFilter from "../../../components/category-filter";
import CityFilter from "../../../components/city-filter";
import ScreenWrapper from "../../../components/screen-wrapper";
import { toggleFavoriteStore } from "../../../Redux/Actions/UserActions";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import Button from '../../../components/button';
import { ScreenNames } from "../../../Routes/routes";
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../../../firebaseconfig';
import { signOut } from "../../../Redux/Actions/UserActions";
// Removed citiesService import
import * as Location from 'expo-location';
import { height, width } from "../../../utils/dimension";
import { StoreContext } from '../../../context/StoreContext';
import { setCustomLocation } from '../../../Redux/Actions/LocationActions';
import { setSelectedCategories } from '../../../Redux/Actions/CategoriesActions';
import SearchBar from '../../../components/search-bar';
import { useTranslation } from '../../../utils/useTranslation';
import EmailVerificationBanner from "../../../components/email-verification";
import locationService from '../../../utils/locationService';
import Toast from 'react-native-toast-message';

const SEARCH_RADIUS_KM = 10; // Synchronized with map screen

export default function HomeScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { filteredStores, allStores, searchQuery, setSearchQuery, userLocation, customLocation, loadingStores, hasRequestedStores, setHasRequestedStores, refreshStores } = useContext(StoreContext);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const [isNearbyActive, setIsNearbyActive] = useState(false);
  const initialStoreFromMap = route?.params?.initialStoreFromMap;

  const flatListRef = useRef(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [skipNoStoresAlert, setSkipNoStoresAlert] = useState(false);
  const isNavigatingToRandomCity = useRef(false);
  const pendingExpandRef = useRef(false);
  const autoExpandedRef = useRef(false);

  // Remove duplicate suggestions state - handled by SearchBar component

  useEffect(() => {
    const applyRadiusFilter = async () => {
      if (showFavoritesOnly || showMyStoresOnly) return;

      // Don't show stores until user has requested them
      if (!hasRequestedStores && !customLocation) {
        setStores([]);
        setLoading(false);
        return;
      }

      try {
        // Prioritize customLocation over userLocation (customLocation is more recent/user-selected)
        const { latitude, longitude } = customLocation || userLocation || {};

        if (!latitude || !longitude) {
          // If no location, don't show stores - let the user search or find nearby
          setStores([]);
          return;
        }

        // Use location service with expanding radius to find stores
        const nearbyStores = locationService.getStoresWithExpandingRadius(
          allStores, 
          { latitude, longitude }, 
          500 // Max 500km radius
        );

        setStores(nearbyStores);
      } catch (error) {
        logging("Erreur lors du filtrage local des magasins :", error);
        // On error, show empty stores
        setStores([]);
      } finally {
        setLoading(false);
      }
    };

    applyRadiusFilter();
    if (showMyStoresOnly) {
      loadMyStores(true);
    }
  }, [allStores, showFavoritesOnly, showMyStoresOnly, searchQuery, customLocation, hasRequestedStores]); // showMyStoresOnly is defined below


  const selectedCategories = useSelector(state => state.categories.selectedCategories);

  const favoriteStores = useSelector(state => state.user.favoriteStores);
  const [showMyStoresOnly, setShowMyStoresOnly] = useState(false);

  const dispatch = useDispatch();

  const locale = useSelector(state => state.locale.currentLocale);
  const user = useSelector(state => state.user.userData);

  const categories = useSelector(
    state => state.categories.categories,
    shallowEqual
  );
  const selectedCities = useSelector(state => state.cities.selectedCities, shallowEqual);

  // Suggestions are now handled by the SearchBar component  

  // Suggestion functions moved to SearchBar component

  const loadingRef = useRef(loading);

  const [showCityModal, setShowCityModal] = useState(false);

  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // If we already have a valid customLocation (e.g., set to Paris), consider stores "requested"
  // to avoid showing the "expand search" prompt and trigger filtering automatically.
  useEffect(() => {
    if (customLocation?.latitude && customLocation?.longitude && !hasRequestedStores) {
      setHasRequestedStores(true);
    }
  }, [customLocation?.latitude, customLocation?.longitude, hasRequestedStores, setHasRequestedStores]);

  // Auto-expand once when stores are loaded, without requiring a tap.
  // Uses customLocation if available, otherwise uses cached location (no permission prompt).
  useEffect(() => {
    if (!autoExpandedRef.current && !hasRequestedStores && (allStores?.length || 0) > 0) {
      autoExpandedRef.current = true;
      // Mark requested and populate nearby stores
      setHasRequestedStores(true);
      // Defer to next tick to avoid blocking render
      setTimeout(() => {
        findClosestStore();
      }, 0);
    }
  }, [allStores?.length, hasRequestedStores]);

  const getCategoriesNamesByIds = useCallback((ids) => {
    if (!ids?.length) return [];
    return ids.map(id => {
      const category = categories.find(cat => cat.id === id);
      return category ? category.name : 'Unknown';
    });
  }, [categories]);

  useEffect(() => {
    if (favoriteStores.length === 0) {
      dispatch(toggleFavoriteStore(null));
    }
  }, []);

  const handleDirectLogout = () => {
      setLoggingOut(true);
      setTimeout(() => {
        dispatch(signOut());
      }, 100);
  };

  const handleToggleShowFavorites = () => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to view your favorite stores. Do you want to go to the login page?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes",
            onPress: () => {
              setLoggingOut(true);
              setTimeout(() => {
                dispatch(signOut());
              }, 100);
            }
          },
        ],
        { cancelable: true }
      );
      return;
    }

    setShowFavoritesOnly(prev => {
      const newState = !prev;

      if (newState) {
        setShowMyStoresOnly(false);
        setStores([]);
        loadFavoriteStores(true);
      } else {
        setStores([]);
      }

      return newState;
    });
  };

  const handleNavigateAddStore = () => {
    if (!user) {
      Alert.alert(
        t('login_required'),
        t('login_required_add_store_message'),
        [
          { text: t('cancel'), style: "cancel" },
          {
            text: t('go_to_signup'),
            onPress: () => {
              setLoggingOut(true);
              setTimeout(() => {
                dispatch(signOut());
              }, 100);
            }
          },
        ],
        { cancelable: true }
      );
      return;
    }
    navigation.navigate(ScreenNames.ADD_STORE);
  };
  
  const loadFavoriteStores = useCallback(async (isRefreshing = false) => {
    if (!user || !user.id) return;
    setLoading(true);
  
    try {
      const favoriteStoreIds = await getUserFavoriteStoreIds(user.id);

      if (favoriteStoreIds.length === 0) {
        setStores([]);
        return;
      }
  
      const validFavoriteStoreIds = favoriteStoreIds.filter(id => id !== null && id !== undefined);

      const storeQuery = getFavoriteStoreQuery(validFavoriteStoreIds);
      
      if (!storeQuery) {
        setStores([]);
        return;
      }
  
      const { stores: newStores } = await fetchStores(storeQuery);
  
      const updatedStores = newStores.map(store => ({
        ...store,
        isFavorite: true,
      }));
  
      if (isRefreshing) {
        setStores(updatedStores);
      } else {
        setStores(prev => {
          const existingIds = new Set(prev.map(store => store.id));
          const uniqueNewStores = updatedStores.filter(store => !existingIds.has(store.id));
          return [...prev, ...uniqueNewStores];
        });
      }
  
    } catch (error) {
      logging("Erreur lors du chargement des magasins favoris :", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);   

  const handleToggleShowMyStores = () => {
    setShowMyStoresOnly(prev => {
      const newState = !prev;
  
      if (newState) {
        setShowFavoritesOnly(false);
        setStores([]);
        loadMyStores(true);
      } else {
        setStores([]);
      }
  
      return newState;
    });
  };

  const loadMyStores = useCallback(async (isRefreshing = false) => {
    if (!user || !user.id) return;
    setLoading(true);
    try {
      const ownerId = await getOwnerId(user.id);
      if (!ownerId) {
        console.error("Impossible de récupérer l'owner_id.");
        setStores([]);
        return;
      }
  
      const storeQuery = getMerchantStoreQuery(ownerId, null);
  
      if (!storeQuery) {
        console.error("storeQuery invalide :", storeQuery);
        setStores([]);
        return;
      }
  
      const { stores: newStores } = await fetchStores(storeQuery);
  
      if (isRefreshing) {
        setStores(newStores);
      } else {
        setStores(prev => {
          const existingIds = new Set(prev.map(store => store.id));
          const uniqueNewStores = newStores.filter(store => !existingIds.has(store.id));
          return [...prev, ...uniqueNewStores];
        });
      }
      
    } catch (error) {
      console.error("Erreur lors du chargement des magasins du marchand :", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedCategories, categories, selectedCities, filteredStores]);  

  const getOwnerId = async (userId) => {
    try {
      const userRef = doc(firestore, "users", userId);
      const userSnap = await getDoc(userRef);
  
      if (userSnap.exists()) {
        const ownerId = userSnap.data().id;
        return ownerId;
      } else {
        console.error("Utilisateur introuvable dans Firestore.");
        return null;
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'owner_id :", error);
      return null;
    }
  }; 

  useEffect(() => {
    const fetchStoreByInternalId = async (store) => {
      try {
        const storesCollection = collection(firestore, "stores");
        const storesQuery = query(storesCollection, where("id", "==", store.id), where("is_validated", "==", true));
        const querySnapshot = await getDocs(storesQuery);
  
        if (!querySnapshot.empty) {
          const storeDoc = querySnapshot.docs[0];
          const storeData = storeDoc.data();
  
          const completeStore = {
            id: storeDoc.id,
            ...storeData,
            isFavorite: favoriteStores.includes(storeDoc.id),
          };
  
          // Extract location from the store
          const geopoint = completeStore?.address?.[0]?.location?.geopoint;
          if (geopoint) {
            const latitude = Number(geopoint.latitude);
            const longitude = Number(geopoint.longitude);
            
            // Update Redux location so the app knows we're in this city
            dispatch(setCustomLocation({ latitude, longitude }));
            
            // Mark that we have requested stores (to hide "votre ville attend" message)
            setHasRequestedStores(true);
            
            // Fetch nearby stores for this location
            const nearbyStores = locationService.getStoresWithExpandingRadius(
              allStores,
              { latitude, longitude },
              SEARCH_RADIUS_KM
            );
            
            // Set the complete store first, then add nearby stores
            const uniqueStores = [completeStore, ...nearbyStores.filter(s => s.id !== completeStore.id)];
            setStores(uniqueStores);
          } else {
            // No location, just add the store
            setStores((prevStores) => {
              const filteredStores = prevStores.filter(s => s.id !== completeStore.id);
              return [completeStore, ...filteredStores];
            });
          }
  
          setTimeout(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToOffset({ offset: 0, animated: true });
            }
          }, 300);
  
        } else {
          console.warn("Aucun store trouvé avec ce internalId :", store.id);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du store :", error);
      }
    };
  
    if (initialStoreFromMap && initialStoreFromMap.id) {
      fetchStoreByInternalId(initialStoreFromMap);
      navigation.setParams({ initialStoreFromMap: null });
    }
  }, [initialStoreFromMap, favoriteStores, allStores]);  

  const handleToggleFavorite = useCallback((storeId) => {
    if (!user) {
      Alert.alert(
        t('login_required'),
        t('login_required_favorite_message'),
        [
          { text: t('no'), style: "cancel" },
          {
            text: t('yes'),
            onPress: () => {
              setLoggingOut(true);
              setTimeout(() => {
                dispatch(signOut());
              }, 100);
            }
          },
        ],
        { cancelable: true }
      );
      return;
    }
  
    dispatch(toggleFavoriteStore(storeId));
  
    setStores(prevStores => {
      if (showFavoritesOnly) {
        return prevStores.filter(store => store.id !== storeId);
      }
      return prevStores.map(store => 
        store.id === storeId 
          ? { ...store, isFavorite: !store.isFavorite }
          : store
      );
    });
  }, [dispatch, navigation, user, showFavoritesOnly]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    if (showFavoritesOnly) {
      loadFavoriteStores(true);
    } else if (showMyStoresOnly) {
      loadMyStores(true);
    } else if (isNearbyActive) {
      handleNearbyPress();
    } 
    setRefreshing(false);
  }, [loadFavoriteStores, loadMyStores, showFavoritesOnly, showMyStoresOnly, isNearbyActive]);  

  const renderFooter = useCallback(() => {
    if (!loading) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={AppColors.primary} />
      </View>
    );
  }, [loading]);

  const renderItem = useCallback(({ item }) => (
    <ItemCard
      title={item.name}
      id={item.id}
      tags={getCategoriesNamesByIds(item?.category ?? [])}
      description={item?.description?.fr ?? ""}
      address={item.address}
      image={item.imageUrl ? { uri: item.imageUrl } : undefined}
      isFavorite={item.isFavorite}
      onPressFavorite={() => handleToggleFavorite(item.id)}
      owner_id={item.owner_id} 
      onPress={() => {
        const geo = item?.address?.[0]?.location?.geopoint;
        const store = item;

        if (geo?.latitude && geo?.longitude) {
          dispatch(setCustomLocation({latitude: geo.latitude, longitude: geo.longitude}));
          navigation.navigate(ScreenNames.MAP, {
            initialStore: store
          });
        } else {
          console.warn("Pas de coordonnées GPS valides pour cet item :", item);
        }
      }}  
      openingHours={item.openingHours || null}         
    />
  ), [getCategoriesNamesByIds, locale, handleToggleFavorite, navigation]);   

  const flatListProps = useMemo(() => ({
    data: stores,
    keyExtractor: (item, index) => `${item.id}-${index}`,
    renderItem,
    onEndReachedThreshold: 0.5,
    ListFooterComponent: renderFooter,
    refreshing,
    onRefresh: handleRefresh,
  }), [
    stores,
    renderItem,
    renderFooter,
    refreshing,
    handleRefresh
  ]);

  useEffect(() => {
    if (stores.length > 0) {
      setStores(prevStores =>
        prevStores.map(store => ({
          ...store,
          isFavorite: favoriteStores.includes(store.id),
        }))
      );
    }
  }, [favoriteStores]);  

  useEffect(() => {
    const ids = stores.map(store => store.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length) {
      logging('Duplicate store IDs detected:', duplicates);
    }
  }, [stores]);





  const handleSearch = async (item) => {
    if (!item) return;

    if (item.type === "city") {
      try {
        const location = await locationService.geocodeCity(item.label);
        if (location) {
          dispatch(setCustomLocation({ latitude: location.latitude, longitude: location.longitude }));
        } else {
          console.warn("Ville non trouvée :", item.label);
        }
      } catch (error) {
        console.error("Erreur lors de la géolocalisation de la ville :", error);
      }
    } else if (item.type === "store") {
      const filteredByName = filteredStores.filter(store =>
        store.name.toLowerCase().includes(item.label.toLowerCase())
      );
      dispatch(setCustomLocation({ latitude: item.location.latitude, longitude: item.location.longitude }));
      setStores(filteredByName);
    }
  };

  const updateLocationToCurrent = async () => {
    console.log("updateLocationToCurrent - Getting current location");
    
    try {
      setSearchQuery('');
      setLoading(true);

      const location = await locationService.getUserLocation({
        useCache: false,
        showToast: false  // Disable location service toast, we'll show our own
      });

      if (location) {
        console.log("📍 User Location:", {
          latitude: location.latitude,
          longitude: location.longitude,
          source: location.source,
          timestamp: new Date(location.timestamp).toLocaleString()
        });
        
        locationService.updateReduxLocation(dispatch, location);
        setHasRequestedStores(true);
        
        Toast.show({
          type: 'success',
          text1: t('location_updated') || 'Location Updated',
          position: 'bottom',
          visibilityTime: 2000,
        });
        
        console.log("Location updated successfully");
      }
      
    } catch (error) {
      console.error("Error getting location:", error);
      // No toast on error - locationService already handles permission messages
    } finally {
      setLoading(false);
    }
  };

  const findClosestStore = async () => { 
    // Skip if we're currently navigating to a random city
    if (isNavigatingToRandomCity.current) {
      return;
    }
    
    // Mark that user has requested stores
    setHasRequestedStores(true);
    
    // Clear search query and filters to show all stores
    setSearchQuery("");
    dispatch(setSelectedCategories([]));

    setLoading(true);
    
    try {
      // Ensure we have stores loaded; if not, fetch them and retry after load
      if (!allStores || allStores.length === 0) {
        // Fetch stores and continue once available (no second tap required)
        await refreshStores?.();
      }

      // Prefer already-selected customLocation; fallback to user's current GPS location
      let location = customLocation;
      if (!location?.latitude || !location?.longitude) {
        location = await locationService.getUserLocation({
          useCache: true,  // prefer cached to avoid permission delay on first tap
          showToast: false 
        });
      }
      
      if (!location) {
        Alert.alert(
          t('location_required') || "Location Required", 
          t('enable_location_message') || "Please enable location services to find nearby stores."
        );
        setLoading(false);
        return;
      }

      // Update the context with the user's location
      locationService.updateReduxLocation(dispatch, location);

      // Use expanding radius against existing allStores
      const nearbyStores = locationService.getStoresWithExpandingRadius(
        allStores,
        { latitude: location.latitude, longitude: location.longitude },
        500
      );

      setStores(nearbyStores);
      
    } catch (error) {
      console.error("Error finding closest store:", error);
      Alert.alert(
        t('error') || "Error", 
        t('location_error_message') || "Unable to find nearby stores. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // If expand was requested before stores loaded, retry automatically once they arrive
  useEffect(() => {
    if (pendingExpandRef.current && allStores && allStores.length > 0) {
      pendingExpandRef.current = false;
      // Defer to next tick to ensure state updates are flushed
      setTimeout(() => {
        findClosestStore();
      }, 0);
    }
  }, [allStores?.length]);

  const findClosestStoreWithLocation = async (baseLocation, storesToSearch = null) => {
    try {    
      let closestStore = null;
      let minDistance = Infinity;

      // Use provided stores or fall back to allStores from context
      const storesList = storesToSearch || allStores;

      if (!storesList || storesList.length === 0) {
        console.warn("No stores available to search");
        Alert.alert(
          t('no_stores_found') || "No Stores Found",
          t('no_stores_description') || "No stores available to display."
        );
        return;
      }

      storesList.forEach((store) => {
        const geopoint = store?.address?.[0]?.location?.geopoint;
        if (!geopoint) return;

        let { latitude: storeLat, longitude: storeLng } = geopoint;
        storeLat = Number(storeLat);
        storeLng = Number(storeLng);

        if (isNaN(storeLat) || isNaN(storeLng)) return;

        const distance = getDistanceInKm(
          baseLocation.latitude,
          baseLocation.longitude,
          storeLat,
          storeLng
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestStore = {
            ...store,
            latitude: storeLat,
            longitude: storeLng,
            distance: distance.toFixed(2),
          };
        }
      });

      if (closestStore) {
        // Set custom location to the closest store's location
        dispatch(setCustomLocation({ 
          latitude: closestStore.latitude, 
          longitude: closestStore.longitude 
        }));
        
        // Show success message
        Toast.show({
          text1: t('success') || 'Success',
          text2: `${t('nearest_store_found') || 'Nearest store found'}: ${closestStore.name} (${closestStore.distance} km)`,
          type: 'success',
          position: 'bottom',
          visibilityTime: 3000,
        });
        
        console.log(`Found closest store: ${closestStore.name} at ${closestStore.distance} km`);
      } else {
        Alert.alert(
          t('no_stores_found') || "No Stores Found",
          t('no_stores_nearby') || "No stores found nearby. Try expanding your search area."
        );
        logging("findClosestStoreWithLocation", "No store found");
      }
    } catch (error) {
      console.error("Error finding closest store with location:", error);
      Alert.alert(
        t('error') || "Error",
        t('error_finding_stores') || "An error occurred while searching for nearby stores."
      );
    }
  };

  // Normalize city selection from SearchBar:
  // Supports signatures:
  // - (cityName: string, coordinates: { latitude, longitude })
  // - ({ label, coordinates })
  // - (cityName: string)
  const handleCitySearch = useCallback((arg1, arg2) => {
    setHasRequestedStores(true);

    if (typeof arg1 === 'string' && arg2 && typeof arg2.latitude === 'number' && typeof arg2.longitude === 'number') {
      setSearchQuery(arg1);
      dispatch(setCustomLocation({ latitude: arg2.latitude, longitude: arg2.longitude }));
      return;
    }

    if (typeof arg1 === 'object' && arg1?.label) {
      setSearchQuery(arg1.label);
      if (arg1.coordinates?.latitude && arg1.coordinates?.longitude) {
        dispatch(setCustomLocation({ latitude: arg1.coordinates.latitude, longitude: arg1.coordinates.longitude }));
      }
      return;
    }

    if (typeof arg1 === 'string') {
      setSearchQuery(arg1);
      return;
    }

    // Fallback: if older call style passed coordinates directly
    if (arg1?.latitude && arg1?.longitude) {
      dispatch(setCustomLocation({ latitude: arg1.latitude, longitude: arg1.longitude }));
      setSearchQuery('');
    }
  }, [dispatch, setSearchQuery, setHasRequestedStores]);

  const handleStoreSearch = useCallback((storeSuggestion) => {
    setHasRequestedStores(true);
    const filteredByName = filteredStores.filter(store =>
      store.name.toLowerCase().includes(storeSuggestion.label.toLowerCase())
    );
    dispatch(setCustomLocation({
      latitude: storeSuggestion.location.latitude,
      longitude: storeSuggestion.location.longitude
    }));
    setStores(filteredByName);
    setSearchQuery(storeSuggestion.label);
  }, [filteredStores, dispatch, setSearchQuery]);

  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
  }, [setSearchQuery]);

  if (loggingOut) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <CustomText>Déconnexion en cours...</CustomText>
      </View>
    );
  }

    return (
      <ScreenWrapper
        backgroundColor={AppColors.white_100}
        statusBarColor={AppColors.white_100}
        barStyle="dark-content"
      >
        {!user && (
          <TouchableOpacity
            onPress={handleDirectLogout}
            style={{
              alignSelf: 'flex-end',
              marginTop: 0,
              marginRight: 20,
            }}
          >
            <CustomText
              size={3}
              color={AppColors.primary}
              textDecorationLine="underline"
              textStyles={{ fontFamily: "Roboto-Medium", fontWeight: "bold" }}
            >
              {t('sign_up')}
            </CustomText>
          </TouchableOpacity>
        )}

        <View style={styles.container}>
          {/* Search bar and category filter with proper z-index layering */}
          <View style={styles.searchGroupContainer}>
            <SearchBar
              placeholder={t('search_placeholder')}
              onCitySelect={handleCitySearch}
              onStoreSelect={handleStoreSearch}
              onSearch={handleSearchChange}
              allStores={allStores}
              containerStyle={styles.searchBarContainer}
            />
          </View>

          {/* Email Verification Banner */}
          <EmailVerificationBanner />

          {/* Category filter handled by SearchBar component */}

          <View style={styles.categoryChipRow}>
            <CategoryFilter />
          </View>

          {/* Filters */}
          <View style={styles.filtersRow}>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {user?.userType === 'merchant' && (
              <TouchableOpacity onPress={handleToggleShowMyStores} style={styles.switchButton}>
                <MaterialIcons
                  name={showMyStoresOnly ? "store" : "storefront"}
                  size={24}
                  color={showMyStoresOnly ? AppColors.primary : AppColors.grey_200}
                />
                <Text style={styles.switchText}>{showMyStoresOnly ? t('my_stores') : t('all_categories')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Store List, Loading, or No Store Message */}
          <View style={styles.contentContainer}>
            {loadingStores ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={AppColors.primary} />
                <Text style={styles.loadingText}>{t('loading_stores')}</Text>
              </View>
            ) : !loading && (!hasRequestedStores || stores.length === 0) ? (
              <ScrollView 
                style={styles.scrollContainer}
                contentContainerStyle={styles.noStoreIntegratedContainer}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                <View style={styles.noStoreContent}>
                  <Text style={styles.noStoreIntegratedText}>
                    {!hasRequestedStores ? t('welcome_message') : t('no_stores_found')}
                  </Text>
                  <Text style={styles.noStoreSubText}>
                    {!hasRequestedStores 
                      ? t('welcome_description') || 'Discover local stores and unique finds near you. Start by finding stores nearby or search for a specific location.'
                      : selectedCategories && selectedCategories.length > 0
                        ? t('no_stores_with_filters') || 'No stores found with current filters. Try removing some category filters.'
                        : t('no_stores_description') || 'Try adjusting your search or location to find stores nearby.'
                    }
                  </Text>
                  {selectedCategories && selectedCategories.length > 0 && hasRequestedStores && (
                    <TouchableOpacity 
                      onPress={() => dispatch(setSelectedCategories([]))}
                      style={styles.clearFiltersButton}
                    >
                      <Text style={styles.clearFiltersButtonText}>
                        {t('clear_filters') || 'Clear filters'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.welcomeButtonsContainer}>
                    <TouchableOpacity 
                      onPress={findClosestStore} 
                      style={[styles.expandSearchButton, loading && styles.nearbyButtonLoading]}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color={AppColors.black} />
                      ) : (
                        <Ionicons name="location-outline" size={20} color={AppColors.black} />
                      )}
                      <Text style={styles.expandSearchButtonText}>
                        {loading ? t('finding_location') : t('expand_search_around_me')}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={handleNavigateAddStore} 
                      style={styles.addStoreButton}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={styles.addStoreButtonText}>
                        {t('add_a_store')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            ) : (
              <FlatList {...flatListProps} ref={flatListRef} style={styles.list} />
            )}
          </View>

          {/* Floating Location Button (single tap only) */}
          <TouchableOpacity
            onPress={updateLocationToCurrent}
            style={styles.fabLocation}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={AppColors.primary} />
            ) : (
              <Ionicons name="location-outline" size={28} color={AppColors.primary} />
            )}
          </TouchableOpacity>

          {/* Floating Add New Store Button */}
          <TouchableOpacity
            onPress={handleNavigateAddStore}
            style={styles.fabAdd}
          >
            <MaterialIcons
              name="add"
              size={32}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Floating Favorite Button */}
          <TouchableOpacity
            onPress={handleToggleShowFavorites}
            style={styles.fabFavorite}
          >
            <MaterialIcons
              name={showFavoritesOnly ? "favorite" : "favorite-border"}
              size={28}
              color={showFavoritesOnly ? AppColors.primary : AppColors.grey_200}
            />
          </TouchableOpacity>
        </View>
        <CityFilter onSelect={() => setShowCityModal(false)} isVisible={showCityModal} />
        <Modal visible={showNearbyModal} transparent animationType="fade">
          <View style={modalStyles.container}>
            <View style={modalStyles.modal}>
              <ActivityIndicator size="large" color={AppColors.primary} />
              <Text style={modalStyles.text}>{t('loading')}</Text>
            </View>
          </View>
        </Modal>
      </ScreenWrapper>
    );
  }

const styles = {
  container: {
    flex: 1,
    backgroundColor: AppColors.white_100,
    paddingTop: 0,
  },
  searchGroupContainer: {
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    borderRadius: 0,
    width: '100%',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 8,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    fontSize: 16,
    paddingHorizontal: 12,
    borderWidth: 0,
    marginBottom: 0,
  },
  categoryChipRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    zIndex: 1000,
    position: 'relative',
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  contentContainer: {
    flex: 1,
    marginTop: 0,
  },
  scrollContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
    paddingHorizontal: 0,
  },
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 20,
    backgroundColor: AppColors.white_100,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    marginLeft: 20,
  },
  switchText: {
    marginLeft: 5,
    fontSize: 14,
    color: AppColors.black,
  },
  addButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  fabAdd: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  fabFavorite: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
  },
  fabLocation: {
    position: 'absolute',
    bottom: 170,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    overflow: 'visible',
  },
  citySearchButton: {
    marginLeft: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityDropdownContainer: {
    position: 'absolute',
    top: 56, // below the search bar
    right: 16,
    zIndex: 100,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 180,
    padding: 8,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    backgroundColor: 'transparent',
  },
  noStoreIntegratedContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 40,
  },
  noStoreContent: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 300,
    paddingTop: 10,
    paddingBottom: 20,
  },
  noStoreIntegratedText: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.black,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 8,
  },
  noStoreSubText: {
    fontSize: 16,
    color: AppColors.grey_200,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  nearbyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nearbyButtonLoading: {
    opacity: 0.7,
  },
  nearbyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  welcomeButtonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
  expandSearchButton: {
    backgroundColor: AppColors.white,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 48,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    width: '100%',
  },
  expandSearchButtonText: {
    color: AppColors.black,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  addStoreButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    width: '100%',
  },
  addStoreButtonText: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  clearFiltersButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: AppColors.white,
    borderWidth: 1,
    borderColor: AppColors.primary,
    borderRadius: 6,
    alignSelf: 'center',
  },
  clearFiltersButtonText: {
    color: AppColors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
};

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 25,
    alignItems: "center",
  },
  text: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  searchInput: {
    flex: 1, 
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  // Removed old suggestions styles - handled by SearchBar component
});