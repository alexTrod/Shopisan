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
import { MaterialIcons } from "@expo/vector-icons";
import Button from '../../../components/button';
import { ScreenNames } from "../../../Routes/routes";
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../../../firebaseconfig';
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "../../../Redux/Actions/UserActions";
// Removed citiesService import
import * as Location from 'expo-location';
import { height, width } from "../../../utils/dimension";
import { StoreContext } from '../../../context/StoreContext';
import { setCustomLocation } from '../../../Redux/Actions/LocationActions';
import SearchBar from '../../../components/search-bar';
import { useTranslation } from '../../../utils/useTranslation';
import EmailVerificationBanner from "../../../components/email-verification";
import locationService from '../../../utils/locationService';

const SEARCH_RADIUS_KM = 6;

export default function HomeScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { filteredStores, allStores, searchQuery, setSearchQuery, userLocation, customLocation, loadingStores } = useContext(StoreContext);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const [isNearbyActive, setIsNearbyActive] = useState(false);
  const initialStoreFromMap = route?.params?.initialStoreFromMap;

  const flatListRef = useRef(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Remove duplicate suggestions state - handled by SearchBar component

  useEffect(() => {
    const applyRadiusFilter = async () => {
      if (showFavoritesOnly || showMyStoresOnly) return;

      try {
        const { latitude, longitude } = userLocation || customLocation || {};

        if (!latitude || !longitude) {
          // If no location, show all stores (should rarely happen with Brussels fallback)
          setStores(filteredStores);
          return;
        }

        // Use location service with expanding radius to find stores
        // This will automatically fall back to Brussels stores if no stores found within 500km
        const nearbyStores = locationService.getStoresWithExpandingRadius(
          filteredStores, 
          { latitude, longitude }, 
          500 // Max 500km radius
        );

        setStores(nearbyStores);
      } catch (error) {
        logging("Erreur lors du filtrage local des magasins :", error);
        // Fallback to showing all stores if filtering fails
        setStores(filteredStores);
      } finally {
        setLoading(false);
      }
    };

    applyRadiusFilter();
    if (showMyStoresOnly) {
      loadMyStores(true);
    }
  }, [filteredStores, showFavoritesOnly, showMyStoresOnly, searchQuery, customLocation]); // showMyStoresOnly is defined below


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
    const fetchStoreByInternalId = async (internalId) => {
      try {
        const storesCollection = collection(firestore, "stores");
        const storesQuery = query(storesCollection, where("id", "==", internalId), where("is_validated", "==", true));
        const querySnapshot = await getDocs(storesQuery);
  
        if (!querySnapshot.empty) {
          const storeDoc = querySnapshot.docs[0];
          const storeData = storeDoc.data();
  
          const completeStore = {
            id: storeDoc.id,
            ...storeData,
            isFavorite: favoriteStores.includes(storeDoc.id),
          };
  
          setStores((prevStores) => {
            const filteredStores = prevStores.filter(store => store.id !== completeStore.id);
            return [completeStore, ...filteredStores];
          });
  
          setTimeout(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToOffset({ offset: 0, animated: true });
            }
          }, 300);
  
        } else {
          console.warn("Aucun store trouvé avec ce internalId :", internalId);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du store :", error);
      }
    };
  
    if (initialStoreFromMap && initialStoreFromMap.id) {
      fetchStoreByInternalId(initialStoreFromMap.id);
      navigation.setParams({ initialStoreFromMap: null });
    }
  }, [initialStoreFromMap, favoriteStores]);  

  const handleToggleFavorite = useCallback((storeId) => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to add a favorite. Do you want to go to the login page?",
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

    setSuggestions([]);

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
    try {
      setSearchQuery('');
      setSuggestions([]);

      // Use location service with toast notifications
      const location = await locationService.getUserLocation({
        useCache: false, // Force fresh location
        showToast: true
      });

      // Update Redux store
      locationService.updateReduxLocation(dispatch, location);
      
    } catch (error) {
      console.error("Erreur lors de la récupération de la localisation :", error);
    }
  };

  const findClosestStore = async () => { 
    setSuggestions([]);
    setSearchQuery("");

    // If no location is available, try to get it first
    if (!userLocation && !customLocation) {
      setLoading(true);
      try {
        // Try to get current location
        const location = await locationService.getUserLocation({
          useCache: false,
          showToast: false // Don't show toast during this operation
        });
        
        if (location) {
          // Update Redux store with the new location
          locationService.updateReduxLocation(dispatch, location);
          // Use the newly obtained location
          const baseLocation = location;
          
          // Continue with finding closest store
          await findClosestStoreWithLocation(baseLocation);
        } else {
          Alert.alert("Location Required", "Please enable location services or search for a city to find nearby stores.");
        }
      } catch (error) {
        console.error("Error getting location for closest store:", error);
        Alert.alert("Location Error", "Unable to determine your location. Please search for a city or enable location services.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const baseLocation = customLocation || userLocation;
    await findClosestStoreWithLocation(baseLocation);
  };

  const findClosestStoreWithLocation = async (baseLocation) => {
    try {    
      let closestStore = null;
      let minDistance = Infinity;

      allStores.forEach((store) => {
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
        const region = {
          latitude: closestStore.latitude,
          longitude: closestStore.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        dispatch(setCustomLocation({ latitude: region.latitude, longitude: region.longitude }));
      } else {
        console.log("Aucun magasin trouvé.");
      }
    } catch (error) {
      console.error("Erreur lors de la recherche du magasin le plus proche :", error);
    }
  };

  const handleCitySearch = useCallback((cityName, coordinates) => {
    dispatch(setCustomLocation(coordinates));
    // Update the search query to show what was searched
    setSearchQuery(cityName);
  }, [dispatch, setSearchQuery]);

  const handleStoreSearch = useCallback((storeSuggestion) => {
    const filteredByName = filteredStores.filter(store =>
      store.name.toLowerCase().includes(storeSuggestion.label.toLowerCase())
    );
    dispatch(setCustomLocation({
      latitude: storeSuggestion.location.latitude,
      longitude: storeSuggestion.location.longitude
    }));
    setStores(filteredByName);
    // Update the search query to show what was searched
    setSearchQuery(storeSuggestion.label);
  }, [filteredStores, dispatch, setSearchQuery]);

  const handleSearchChange = useCallback((query) => {
    // Update the search query in StoreContext so it's synchronized across screens
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
              color={AppColors.grey_200}
              textDecorationLine="underline"
              textStyles={{ fontFamily: "Mulish-SemiBold", fontWeight: "bold" }}
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
                <Text style={styles.loadingText}>{t('loading') || 'Loading stores...'}</Text>
              </View>
            ) : !loading && stores.length === 0 ? (
              <ScrollView 
                style={styles.scrollContainer}
                contentContainerStyle={styles.noStoreIntegratedContainer}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                <View style={styles.noStoreContent}>
                  <Text style={styles.noStoreIntegratedText}>{t('no_stores_found')}</Text>
                  <Text style={styles.noStoreSubText}>
                    {t('no_stores_description') || 'Try adjusting your search or location to find stores nearby.'}
                  </Text>
                  <TouchableOpacity 
                    onPress={findClosestStore} 
                    style={[styles.nearbyButton, loading && styles.nearbyButtonLoading]}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialIcons name="location-on" size={20} color="#fff" />
                    )}
                    <Text style={styles.nearbyButtonText}>
                      {loading ? 'Finding location...' : t('nearby')}
                    </Text>
                  </TouchableOpacity>
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
          >
            <Ionicons name="location-outline" size={28} color={AppColors.primary} />
          </TouchableOpacity>

          {/* Floating Add New Store Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate(ScreenNames.ADD_STORE)}
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