import React, { useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator, FlatList } from "react-native";
import ScreenWrapper from "../../../components/screen-wrapper";
import Header from "../../../components/header";
import ItemCard from "../../../components/item-card/ItemCard";
import CustomText from "../../../components/text";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";
import { firestore } from "../../../../firebaseconfig";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useSelector, useDispatch } from "react-redux";
import logging from "../../../utils/logging";

import { toggleFavoriteStore } from "../../../Redux/Actions/UserActions";
import { setCustomLocation } from "../../../Redux/Actions/LocationActions";
import { ScreenNames } from "../../../Routes/routes";

const STORES_PER_PAGE = 10;

export default function FavoritesScreen({ navigation }) {
  const [favoriteStoresData, setFavoriteStoresData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [favoriteStoreIds, setFavoriteStoreIds] = useState([]);

  const user = useSelector(state => state.user.userData);
  const locale = useSelector(state => state.locale.currentLocale);
  const favoriteStores = useSelector(state => state.user.favoriteStores);

  const dispatch = useDispatch();

  const handleToggleFavorite = (storeId) => {
    dispatch(toggleFavoriteStore(storeId));

    setFavoriteStoresData(prevStores => prevStores.filter(store => store.id !== storeId));
  };

  useEffect(() => {
    if (user?.id) {
      fetchFavoriteStoreIds();
    }
  }, [user]);

  const fetchFavoriteStoreIds = async () => {
    try {
      const userRef = doc(firestore, "users", user.id);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        const data = userSnapshot.data();
        setFavoriteStoreIds(Array.isArray(data.favoriteStores) ? data.favoriteStores : []);
      } else {
        setFavoriteStoreIds([]);
      }
    } catch (error) {
      logging("Error fetching favorite store IDs:", error);
    }
  };

  useEffect(() => {
    setFavoriteStoresData([]);
    setLastVisible(null);
    setHasMore(true);
    if (favoriteStoreIds.length > 0) {
      fetchFavoriteStores(true);
    }
  }, [favoriteStoreIds]);

  useEffect(() => {
    if (favoriteStores.length > 0) {
      setFavoriteStoreIds(favoriteStores);
    } else {
      setFavoriteStoreIds([]);
    }
  }, [favoriteStores]);

  const fetchFavoriteStores = async (isRefreshing = false) => {
    if (loading || (!hasMore && !isRefreshing) || favoriteStoreIds.length === 0) return;

    setLoading(true);
    try {
      const storesRef = collection(firestore, "stores");
      let batchIds = favoriteStoreIds.slice(0, STORES_PER_PAGE);

      const storePromises = batchIds.map(async (storeId) => {
        const storeQuery = query(storesRef, where("id", "==", storeId), where("is_validated", "==", true));
        const snapshot = await getDocs(storeQuery);
        return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      });

      const newStores = (await Promise.all(storePromises)).filter(store => store !== null);

      setFavoriteStoresData(prevStores => {
        const existingIds = new Set(prevStores.map(store => store.id));
        return [...prevStores, ...newStores.filter(store => !existingIds.has(store.id))];
      });

      setHasMore(newStores.length === STORES_PER_PAGE);
    } catch (error) {
      logging("Error fetching favorite stores:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = useCallback(({ item }) => (
    <ItemCard
      title={item.name}
      id={item.id}
      tags={item.tags || []}
      description={item.description?.[locale] || "No description available"}
      address={item.address}
      image={{ uri: item.image }}
      isFavorite={favoriteStores.includes(item.id)}
      onPressFavorite={() => handleToggleFavorite(item.id)}
      onPress={() => {
        const geo = item?.address?.[0]?.location?.geopoint;
        const store = item;

        if (geo?.latitude && geo?.longitude) {
          dispatch(setCustomLocation({ latitude: geo.latitude, longitude: geo.longitude }));
          navigation.navigate(ScreenNames.MAP, {
            initialStore: store,
          });
        } else {
          console.warn("No valid GPS coordinates for this store:", item);
        }
      }}
      openingHours={item.openingHours || null}
    />
  ), [locale, favoriteStores, dispatch, navigation]);

  return (
    <ScreenWrapper
      backgroundColor={AppColors.white_100}
      statusBarColor={AppColors.white_100}
      barStyle="dark-content"
    >
      <Header
        showLeft={true}
        showBack
        title="Favorites"
        rightIcon
        onRightPress={() => {}}
        containerStyle={{ width: width(90), alignSelf: "center" }}
      />
      <CustomText
        textAlign="left"
        color={AppColors.black}
        textProps={{ fontFamily: "Roboto-Medium" }}
        textStyles={{
          fontFamily: "Roboto-Medium",
          paddingHorizontal: width(8),
          marginTop: height(4),
        }}
        size={2.2}
      >
        Your Favorite Stores
      </CustomText>
      {loading && favoriteStoresData.length === 0 ? (
        <ActivityIndicator color={"black"} size={"large"} />
      ) : (
        <FlatList
          data={favoriteStoresData}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderItem}
          onEndReached={() => hasMore && fetchFavoriteStores()}
          onEndReachedThreshold={0.5}
        />
      )}
    </ScreenWrapper>
  );
}
