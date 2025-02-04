import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { collection, query, getDocs, orderBy, limit, startAfter, where } from "firebase/firestore";
import { firestore } from "../../../../firebaseconfig";
import { useSelector } from "react-redux";
import ItemCard from "../../../components/item-card/ItemCard";
import CustomText from "../../../components/text";
import { AppColors, CommonStyles } from "../../../utils";
import logging from "../../../utils/logging";
import Header from "../../../components/header";
import CategoryFilter from "../../../components/category-filter";
import CityFilter from "../../../components/city-filter";
import i18n from '../../../translations/i18n';
import StoreManagement from "../merchant/StoreManagement";
import { width } from "../../../utils/dimension";
import ScreenWrapper from "../../../components/screen-wrapper";
import { getStoreQuery, fetchStores, getCategoriesNamesByIds } from "../../../utils/storeUtils";

export default function HomeScreen({ navigation }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const locale = useSelector(state => state.locale.currentLocale);
  const user = useSelector((state) => state?.Auth?.user);
  const selectedCategories = useSelector(state => state.categories.selectedCategories);
  const categories = useSelector(state => state.categories.categories);
  const getCategoriesNamesByIds = useCallback((ids) => {
  
    if (!ids?.length) return [];
    return ids.map(id => {
      const category = categories.find(cat => cat.id === id);
      return category ? category.name : 'Unknown';
    });
  }, [useSelector(state => state.categories.categories)]);
  
  const favoriteStores = useSelector(state => state.user.favoriteStores);


  const loadStores = useCallback(async (isRefreshing = false) => {
    try {
      if (loading || (!hasMore && !isRefreshing)) return;

      setLoading(true);
      const storeQuery = getStoreQuery(selectedCategories, lastVisible, categories);
      const { stores: newStores, lastVisible: newLastVisible, hasMore: newHasMore } = await fetchStores(storeQuery);

      if (isRefreshing) {
        setStores(newStores);
        setLastVisible(newLastVisible);
      } else {
        setStores(prev => {
          const existingIds = new Set(prev.map(store => store.id));
          const uniqueNewStores = newStores.filter(store => !existingIds.has(store.id));
          return [...prev, ...uniqueNewStores];
        });
        setLastVisible(newLastVisible);
      }

      setHasMore(newHasMore);
    } catch (error) {
      logging('Error loading stores:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, hasMore, selectedCategories, lastVisible, categories]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setLastVisible(null);
    setHasMore(true);
    loadStores(true);
  }, [loadStores]);

  const handleEndReached = useCallback(() => {
    if (hasMore) loadStores();
  }, [hasMore, loadStores]);

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
      website={item.website}
      key={item.id}
      id={item.id}
      tags={getCategoriesNamesByIds(item.category)}
      description={item.description[locale]}
      address={item.address}
    />
  ), [getCategoriesNamesByIds, locale, favoriteStores]);

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
  }, [selectedCategories]);

  useEffect(() => {
    const ids = stores.map(store => store.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      logging('Duplicate store IDs detected:', 
        ids.filter((id, index) => ids.indexOf(id) !== index)
      );
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
            <View style={{
              zIndex: 9999,
              elevation: 9999,
            }}>
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
