import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { View, ActivityIndicator, FlatList, TouchableOpacity, Text } from "react-native";
import { useSelector, shallowEqual, useDispatch } from "react-redux";
import { getUserFavoriteStoreIds, getFavoriteStoreQuery, getStoreQuery, fetchStores, getMerchantStoreQuery } from "../../../utils/storeUtils";
import ItemCard from "../../../components/item-card/ItemCard";
import CustomText from "../../../components/text";
import { AppColors } from "../../../utils";
import logging from "../../../utils/logging";
import CategoryFilter from "../../../components/category-filter";
import CityFilter from "../../../components/city-filter";
import i18n from "../../../translations/i18n";
import { width } from "../../../utils/dimension";
import ScreenWrapper from "../../../components/screen-wrapper";
import { toggleFavoriteStore } from "../../../Redux/Actions/UserActions";
import { MaterialIcons } from "@expo/vector-icons";
import Button from '../../../components/button';
import { ScreenNames } from "../../../Routes/routes";
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../../../firebaseconfig';

export default function HomeScreen({ navigation }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const favoriteStores = useSelector(state => state.user.favoriteStores);
  const [showMyStoresOnly, setShowMyStoresOnly] = useState(false);

  const dispatch = useDispatch();

  const locale = useSelector(state => state.locale.currentLocale);
  const user = useSelector(state => state.user.userData);
  const selectedCategories = useSelector(
    state => state.categories.selectedCategories,
    shallowEqual
  );
  const categories = useSelector(
    state => state.categories.categories,
    shallowEqual
  );
  const selectedCities = useSelector(state => state.cities.selectedCities, shallowEqual);

  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  const lastVisibleRef = useRef(lastVisible);

  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { lastVisibleRef.current = lastVisible; }, [lastVisible]);

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

  const handleToggleShowFavorites = () => {
    setShowFavoritesOnly(prev => {
      const newState = !prev;

      if (newState) {
        setShowMyStoresOnly(false);
        setStores([]);
        setLastVisible(null);
        setHasMore(true);
        loadFavoriteStores(true);
      } else {
        setStores([]);
        setLastVisible(null);
        setHasMore(true);
        loadStores(true);
      }
  
      return newState;
    });
  };
  
  const loadFavoriteStores = useCallback(async (isRefreshing = false) => {
    if (!user || !user.id) return;
    setLoading(true);
  
    try {
      const favoriteStoreIds = await getUserFavoriteStoreIds(user.id);
      console.log("Liste des favoris  :", favoriteStoreIds);
      if (favoriteStoreIds.length === 0) {
        setStores([]);
        setHasMore(false);
        return;
      }
  
      const validFavoriteStoreIds = favoriteStoreIds.filter(id => id !== null && id !== undefined);
      console.log("Liste des favoris après nettoyage :", validFavoriteStoreIds);

      const storeQuery = getFavoriteStoreQuery(validFavoriteStoreIds, lastVisibleRef.current);
      
      if (!storeQuery) {
        setStores([]);
        setHasMore(false);
        return;
      }
  
      const { stores: newStores, lastVisible: newLastVisible, hasMore: newHasMore } = await fetchStores(storeQuery);
  
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
  
      setLastVisible(newLastVisible);
      setHasMore(newHasMore);
    } catch (error) {
      logging("Erreur lors du chargement des magasins favoris :", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, lastVisible]);   

  const handleToggleShowMyStores = () => {
    setShowMyStoresOnly(prev => {
      const newState = !prev;
  
      if (newState) {
        setShowFavoritesOnly(false);
        setStores([]);
        setLastVisible(null);
        setHasMore(true);
        loadMyStores(true);
      } else {
        setStores([]);
        setLastVisible(null);
        setHasMore(true);
        loadStores(true);
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
        setHasMore(false);
        return;
      }
  
      const storeQuery = getMerchantStoreQuery(ownerId, isRefreshing ? null : lastVisibleRef.current);
  
      if (!storeQuery) {
        console.error("storeQuery invalide :", storeQuery);
        setStores([]);
        setHasMore(false);
        return;
      }
  
      console.log("Requête finale pour les magasins du marchand :", storeQuery);
  
      const { stores: newStores, lastVisible: newLastVisible, hasMore: newHasMore } = await fetchStores(storeQuery);
  
      if (isRefreshing) {
        setStores(newStores);
      } else {
        setStores(prev => {
          const existingIds = new Set(prev.map(store => store.id));
          const uniqueNewStores = newStores.filter(store => !existingIds.has(store.id));
          return [...prev, ...uniqueNewStores];
        });
      }
  
      setLastVisible(newLastVisible);
      setHasMore(newHasMore);
    } catch (error) {
      console.error("Erreur lors du chargement des magasins du marchand :", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, lastVisible, selectedCategories, categories, selectedCities]);  

  const getOwnerId = async (userId) => {
    try {
      const userRef = doc(firestore, "users", userId);
      const userSnap = await getDoc(userRef);
  
      if (userSnap.exists()) {
        const ownerId = userSnap.data().id;
        console.log("Owner ID récupéré :", ownerId);
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

  const loadStores = useCallback(async (isRefreshing = false) => {
    if (!favoriteStores || loadingRef.current || (!hasMoreRef.current && !isRefreshing)) return;
  
    setLoading(true);
    console.log("selectedCategories avant requête :", selectedCategories);
    
    const storeQuery = getStoreQuery(
      selectedCategories,
      lastVisibleRef.current,
      categories,
      selectedCities
    );
    console.log("storeQuery générée :", storeQuery);
    try {
      const { stores: newStores, lastVisible: newLastVisible, hasMore: newHasMore } = await fetchStores(storeQuery);
      console.log("Stores récupérés après requête :", newStores);

      const updatedStores = newStores.map(store => ({
        ...store,
        isFavorite: favoriteStores.includes(store.id),
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

      setLastVisible(newLastVisible);
      setHasMore(newHasMore);
    } catch (error) {
      logging('Error loading stores:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategories, categories, selectedCities, favoriteStores]);  


  const handleToggleFavorite = useCallback((storeId) => {
    dispatch(toggleFavoriteStore(storeId));
  
    setStores(prevStores => {
      return prevStores.filter(store => {
        if (showFavoritesOnly) {
          return store.id !== storeId;
        }
        return store;
      });
    });
  
  }, [dispatch, showFavoritesOnly]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setLastVisible(null);
    setHasMore(true);
    loadStores(true);
  }, [loadStores]);

  const handleEndReached = useCallback(() => {
    if (hasMoreRef.current) {
      if (showFavoritesOnly) {
        loadFavoriteStores();
      } else {
        loadStores();
      }
    }
  }, [showFavoritesOnly, loadFavoriteStores, loadStores]);  

  const renderFooter = useCallback(() => {
    if (!loading) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={AppColors.primary} />
      </View>
    );
  }, [loading]);

  const renderEmpty = useCallback(() => (
    <CustomText
      textAlign="center"
      color={AppColors.grey_100}
      textProps={{ fontFamily: "Mulish-Bold" }}
      textStyles={{ fontFamily: "Mulish-Bold" }}
      size={2.2}
    >
      No stores available
    </CustomText>
  ), []);

  const renderItem = useCallback(({ item }) => (
    <ItemCard
      title={item.name}
      id={item.id}
      tags={getCategoriesNamesByIds(item?.category ?? [])}
      description={item?.description?.[locale] ?? ""}
      address={item.address}
      isFavorite={item.isFavorite}
      onPressFavorite={() => handleToggleFavorite(item.id)}
      owner_id={item.owner_id} 
    />
  ), [getCategoriesNamesByIds, locale, handleToggleFavorite]);    

  const flatListProps = useMemo(() => ({
    data: stores,
    keyExtractor: (item, index) => `${item.id}-${index}`,
    renderItem,
    onEndReached: handleEndReached,
    onEndReachedThreshold: 0.5,
    ListFooterComponent: renderFooter,
    ListEmptyComponent: renderEmpty,
    refreshing,
    onRefresh: handleRefresh,
  }), [
    stores,
    renderItem,
    handleEndReached,
    renderFooter,
    renderEmpty,
    refreshing,
    handleRefresh
  ]);

  useEffect(() => {
    setStores([]);
    setLastVisible(null);
    setHasMore(true);
    loadStores(true);
  }, [selectedCategories, selectedCities]);

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

  return (
    <ScreenWrapper
      backgroundColor={AppColors.white_100}
      statusBarColor={AppColors.white_100}
      barStyle="dark-content"
    >
      <View style={{ flex: 1 }}>
        
        <View style={styles.filterRow}>
          <CategoryFilter />
        </View>

        <View style={styles.filterRow}>
          <CityFilter />
        </View>

        <View style={styles.rowContainer}>          
          <TouchableOpacity onPress={handleToggleShowFavorites} style={styles.switchButton}>
            <MaterialIcons 
              name={showFavoritesOnly ? "favorite" : "favorite-border"} 
              size={24} 
              color={showFavoritesOnly ? AppColors.primary : AppColors.grey_200} 
            />
            <Text style={styles.switchText}>{showFavoritesOnly ? "Favoris" : "Tous"}</Text>
          </TouchableOpacity>

          {user?.userType === 'merchant' && (
            <TouchableOpacity onPress={handleToggleShowMyStores} style={styles.switchButton}>
              <MaterialIcons 
                name={showMyStoresOnly ? "store" : "storefront"} 
                size={24} 
                color={showMyStoresOnly ? AppColors.primary : AppColors.grey_200} 
              />
              <Text style={styles.switchText}>{showMyStoresOnly ? "Mes Magasins" : "Tous"}</Text>
            </TouchableOpacity>
          )}

          {user?.userType === 'merchant' && (
            <Button
              onPress={() => navigation.navigate(ScreenNames.ADD_STORE)}
              containerStyle={styles.addButton}
            >
              Add New Store
            </Button>
          )}
        </View>

        <FlatList {...flatListProps} />
      </View>
    </ScreenWrapper>
  );
}

const styles = {
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
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
};


