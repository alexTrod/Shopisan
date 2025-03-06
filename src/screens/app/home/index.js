import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { View, ActivityIndicator, FlatList } from "react-native";
import { useSelector, shallowEqual, useDispatch } from "react-redux";
import { getStoreQuery, fetchStores } from "../../../utils/storeUtils";
import ItemCard from "../../../components/item-card/ItemCard";
import CustomText from "../../../components/text";
import { AppColors } from "../../../utils";
import logging from "../../../utils/logging";
import Header from "../../../components/header";
import CategoryFilter from "../../../components/category-filter";
import CityFilter from "../../../components/city-filter";
import i18n from "../../../translations/i18n";
import StoreManagement from "../merchant/StoreManagement";
import { width } from "../../../utils/dimension";
import ScreenWrapper from "../../../components/screen-wrapper";
import { selectFavoriteStores } from '../../../Redux/Selectors/UserSelectors';
import { toggleFavoriteStore } from "../../../Redux/Actions/UserActions";

export default function HomeScreen({ navigation }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const favoriteStores = useSelector(state => state.user.favoriteStores);
  console.log("Current favoriteStores in Redux:", favoriteStores);

  const dispatch = useDispatch();

  const locale = useSelector(state => state.locale.currentLocale);
  const user = useSelector(state => state?.Auth?.user);
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

  const loadStores = useCallback(async (isRefreshing = false) => {
    if (!favoriteStores || loadingRef.current || (!hasMoreRef.current && !isRefreshing)) return;
  
    setLoading(true);
    const storeQuery = getStoreQuery(
      selectedCategories,
      lastVisibleRef.current,
      categories,
      selectedCities
    );
  
    try {
      const { stores: newStores, lastVisible: newLastVisible, hasMore: newHasMore } = await fetchStores(storeQuery);
  
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
  
    setStores(prevStores =>
      prevStores.map(store =>
        store.id === storeId ? { ...store, isFavorite: !store.isFavorite } : store
      )
    );
  }, [dispatch]);         

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setLastVisible(null);
    setHasMore(true);
    loadStores(true);
  }, [loadStores]);

  const handleEndReached = useCallback(() => {
    if (hasMoreRef.current) loadStores();
  }, [loadStores]);

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
      tags={getCategoriesNamesByIds(item.category)}
      description={item.description[locale]}
      address={item.address}
      isFavorite={item.isFavorite}
      onPressFavorite={() => handleToggleFavorite(item.id)}
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
        <Header
          showLeft={true}
          showBack
          title={user?.userType === 'merchant' ? 'My Stores' : i18n.t('home_title')}
          rightIcon
          onRightPress={() => {}}
          containerStyle={{ width: width(90), alignSelf: "center" }}
        />
        {user?.userType === 'merchant' ? (
          <StoreManagement navigation={navigation} />
        ) : (
          <>
            <View style={{ zIndex: 9999, elevation: 9999 }}>
              <CategoryFilter />
              <CityFilter />
            </View>
            <FlatList {...flatListProps} />
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}
