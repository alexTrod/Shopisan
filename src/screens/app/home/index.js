import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { View, ActivityIndicator, FlatList, TouchableOpacity, Text, StyleSheet, Modal, Alert, TextInput } from "react-native";
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
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { firestore } from '../../../../firebaseconfig';
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "../../../Redux/Actions/UserActions";
import cities from "../../../components/cities/cities.json";
import * as Location from 'expo-location';
import { height, width } from "../../../utils/dimension";

import { useContext } from 'react';
import { StoreContext } from '../../../context/StoreContext';
import { setCustomLocation } from '../../../Redux/Actions/LocationActions';
import SearchBar from '../../../components/search-bar';
import { useTranslation } from '../../../utils/useTranslation';

const SEARCH_RADIUS_KM = 6;

export default function HomeScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { filteredStores, allStores } = useContext(StoreContext);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const [isNearbyActive, setIsNearbyActive] = useState(false);
  const initialStoreFromMap = route?.params?.initialStoreFromMap;
  const { searchQuery, setSearchQuery } = useContext(StoreContext);
  const { userLocation, customLocation } = useContext(StoreContext);

  const flatListRef = useRef(null);
  const [loggingOut, setLoggingOut] = useState(false);



  useEffect(() => {
    const applyRadiusFilter = async () => {
      if (showFavoritesOnly || showMyStoresOnly) return;

      try {
        const { latitude, longitude } = userLocation || customLocation || {};

        if (!latitude || !longitude) {
          setStores(filteredStores);
          return;
        }

        const nearbyStores = filteredStores
          .map((store) => {
            const geopoint = store?.address?.[0]?.location?.geopoint;
            if (!geopoint) return null;

            const storeLat = Number(geopoint.latitude);
            const storeLng = Number(geopoint.longitude);

            if (isNaN(storeLat) || isNaN(storeLng)) return null;

            const distance = getDistanceInKm(latitude, longitude, storeLat, storeLng);

            if (distance > SEARCH_RADIUS_KM) return null;

            return {
              ...store,
              latitude: storeLat,
              longitude: storeLng,
              distance,
            };
          })
          .filter((s) => s !== null);

        setStores(nearbyStores);
      } catch (error) {
        logging("Erreur lors du filtrage local des magasins :", error);
        setStores(filteredStores);
      } finally {
        setLoading(false);
      }
    };
    
    applyRadiusFilter();
    if (showMyStoresOnly) {
      loadMyStores(true);
    }
  }, [filteredStores, showFavoritesOnly, showMyStoresOnly, searchQuery, customLocation]);

  const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

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
        const storesQuery = query(storesCollection, where("id", "==", internalId));
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

    if (item.type === "city") {
      try {
        const locations = await Location.geocodeAsync(item.label);
        if (locations.length > 0) {
          const { latitude, longitude } = locations[0];

          dispatch(setCustomLocation({ latitude, longitude }));
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Activez la localisation pour continuer.");
        return;
      }
      setSearchQuery('');

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      dispatch(setCustomLocation(coords));
    } catch (error) {
      console.error("Erreur lors de la récupération de la localisation :", error);
    }
  };

  const findClosestStore = async () => { 
    setSearchQuery("");

    if (!userLocation && !customLocation) {
      Alert.alert("Unknown location", "Unable to determine the map position.");
      return;
    }

    const baseLocation = customLocation || userLocation;

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
  }, [dispatch]);

  const handleStoreSearch = useCallback((storeSuggestion) => {
    const filteredByName = filteredStores.filter(store =>
      store.name.toLowerCase().includes(storeSuggestion.label.toLowerCase())
    );
    dispatch(setCustomLocation({ 
      latitude: storeSuggestion.location.latitude, 
      longitude: storeSuggestion.location.longitude 
    }));
    setStores(filteredByName);
  }, [filteredStores, dispatch]);

  const handleSearchChange = useCallback((query) => {
    // This will be handled by the StoreContext
    // The search component will manage its own state
  }, []);


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
            size={1.5}
            color={AppColors.grey_200}
            textDecorationLine="underline"
            textStyles={{ fontFamily: "Mulish-SemiBold" }}
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

        {/* Category filter */}
        <View style={styles.categoryFilterContainer}>
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

        {!loading && stores.length === 0 && (
          <View style={styles.noStoreContainer}>
            <Text style={styles.noStoreText}>{t('no_stores_found')}</Text>

            <TouchableOpacity onPress={findClosestStore}>
              <Text style={styles.closestStoreButtonText}>{t('nearby')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Store List */}
        <FlatList {...flatListProps} ref={flatListRef} style={styles.list} />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.white_100,
    paddingTop: 0,
  },
  searchGroupContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
    zIndex: 1002, // Higher than category filter
    position: 'relative',
  },
  searchBarContainer: {
    marginBottom: 0,
  },
  categoryFilterContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 1000, // Lower than search bar's z-index
    position: 'relative',
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
  noStoreContainer: {
    position: "absolute",
    top: height(35),
    left: width(10),
    right: width(10),
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  
  noStoreText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#444",
    textAlign: "center",
  },
  closestStoreButtonText: {
    marginTop: 10,
    color: AppColors.primary,
    fontWeight: "600",
    fontSize: 15,
    textAlign: "center",
    textDecorationLine: "underline",
  } 
});

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

});


