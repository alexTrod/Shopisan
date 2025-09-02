import { collection, query, doc, getDocs, getDoc, orderBy, limit, startAfter, where } from "firebase/firestore";
import { firestore } from "../../firebaseconfig";
import logging from "./logging";

const STORES_PER_PAGE = 10;

export const getStoreQuery = (selectedCategories, lastVisible, categories, selectedCities) => {

  const storeCollection = collection(firestore, 'stores');
  const queryConstraints = [];

  if (selectedCategories && selectedCategories.length > 0) {
    queryConstraints.push(where('category', 'array-contains-any', selectedCategories));
  }

  if (selectedCities && selectedCities.length > 0) {
    queryConstraints.push(where('cityName', 'in', selectedCities));
  }

  queryConstraints.push(orderBy('id', 'desc'));
  //queryConstraints.push(limit(STORES_PER_PAGE));

  let baseQuery = query(storeCollection, ...queryConstraints);

  if (lastVisible) {
    baseQuery = query(baseQuery, startAfter(lastVisible));
  }

  return baseQuery;
};

export const fetchStoreRatings = async (storeId) => {
  try {
    let _totalRating = 0;
    let _ratingCount = 0;

    const ratingsCollection = collection(firestore, 'ratings');
    logging('Fetching ratings for store id', storeId);
    const ratingsQuery = query(ratingsCollection, where('store_id', '==', storeId));
    
    const ratingsSnapshot = await getDocs(ratingsQuery);
    if (ratingsSnapshot.empty) {
      return { averageRating: 0, ratingCount: 0 };
    }

    ratingsSnapshot.forEach(doc => {
      const ratingData = doc.data();
      _totalRating += ratingData.score;
      _ratingCount += 1;
    });

    const _averageRating = _ratingCount > 0 ? _totalRating / _ratingCount : 0;
    return { averageRating: _averageRating, ratingCount: _ratingCount };

  } catch (error) {
    logging('Error fetching store ratings', error);
    return { averageRating: 0, ratingCount: 0 };
  }
};

export const fetchStores = async (storeQuery) => {
  try {
    const snapshot = await getDocs(storeQuery);
    const newStores = snapshot.docs.map(doc => {
      return {
        id: doc.id,
        ...doc.data()
      };
    });

    return {
      stores: newStores,
      lastVisible: snapshot.docs[snapshot.docs.length - 1],
      hasMore: snapshot.docs.length === STORES_PER_PAGE
    };
  } catch (error) {
    logging('Error loading stores:', error);
    throw error;
  }
};

export const getUserFavoriteStoreIds = async (userId) => {
  try {
    const userDocRef = doc(firestore, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      return userData.favoriteStores || [];
    } else {
      console.warn("L'utilisateur n'existe pas dans Firestore :", userId);
      return [];
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des favoris :", error);
    return [];
  }
};

export const getFavoriteStoreQuery = (favoriteStoreIds, lastVisible) => {
  const storeCollection = collection(firestore, "stores");
  const queryConstraints = [];

  if (!favoriteStoreIds || favoriteStoreIds.length === 0) {
    return null;
  }

  if (favoriteStoreIds.length > 10) {
    favoriteStoreIds = favoriteStoreIds.slice(0, 10);
  }

  queryConstraints.push(where("id", "in", favoriteStoreIds));
  queryConstraints.push(orderBy("id", "desc"));
  queryConstraints.push(limit(STORES_PER_PAGE));

  let baseQuery = query(storeCollection, ...queryConstraints);

  if (lastVisible) {
    baseQuery = query(baseQuery, startAfter(lastVisible));
  }

  return baseQuery;
};

export const getMerchantStoreQuery = (ownerId, lastVisible) => {
  if (!ownerId) {
    console.error("Erreur : ownerId est null ou indéfini.");
    return null;
  }

  const storeCollection = collection(firestore, "stores");
  const queryConstraints = [
    where("owner_id", "==", ownerId),
    orderBy("id", "desc"),
    limit(STORES_PER_PAGE)
  ];

  let baseQuery = query(storeCollection, ...queryConstraints);

  if (lastVisible) {
    baseQuery = query(baseQuery, startAfter(lastVisible));
  }

  return baseQuery;
};

export const matchesFilters = (store, selectedCategories, selectedCities, searchQuery) => {
  const matchCategory =
    selectedCategories.length === 0 || selectedCategories.some(cat => store.category?.includes(cat));

  const matchCity =
    selectedCities.length === 0 || selectedCities.includes(store.cityName);

  const matchSearch =
    !searchQuery || store.name?.toLowerCase().includes(searchQuery.toLowerCase());

  return matchCategory && matchCity && matchSearch;
};

export const filterStoresLocally = (
  stores,
  selectedCategories,
  selectedCities,
  searchQuery,
  userLocation
) => {
  const normalize = str => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const filteredStores = stores.filter(store => {
    const matchesCity =
      !selectedCities?.length ||
      selectedCities.some(city =>
        typeof city === "string"
          ? city === store.cityName
          : city.name === store.cityName
      );

    const matchesCategory =
      !selectedCategories?.length ||
      (Array.isArray(store.category) &&
        store.category.some(cat => selectedCategories.includes(cat)));

    const normalizedQuery = normalize(searchQuery?.trim());
    const matchesSearch =
      !normalizedQuery ||
      normalize(store.name).includes(normalizedQuery) ||
      normalize(store.description?.fr || "").includes(normalizedQuery);

    return matchesCity && matchesCategory && matchesSearch;
  });

  if (userLocation) {
    filteredStores.sort((a, b) => {
      const aGeo = a.address?.[0]?.location?.geopoint;
      const bGeo = b.address?.[0]?.location?.geopoint;

      if (!aGeo && !bGeo) return 0;
      if (!aGeo) return 1;
      if (!bGeo) return -1;

      const distA = getDistanceInKm(userLocation.latitude, userLocation.longitude, aGeo.latitude, aGeo.longitude);
      const distB = getDistanceInKm(userLocation.latitude, userLocation.longitude, bGeo.latitude, bGeo.longitude);

      return distA - distB;
    });
  }

  return filteredStores;
};
