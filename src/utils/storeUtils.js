import { collection, query, doc, getDocs, getDoc, orderBy, limit, startAfter, where } from "firebase/firestore";
import { firestore } from "../../firebaseconfig";
import logging from "./logging";

const STORES_PER_PAGE = 10;

export const getStoreQuery = (selectedCategories, lastVisible, categories, selectedCities) => {

  const storeCollection = collection(firestore, 'stores');
  const queryConstraints = [];

  if (selectedCategories && selectedCategories.length > 0) {
    queryConstraints.push(where('category', 'array-contains-any', selectedCategories));
    console.log("-> Filtre catégorie ajouté:", selectedCategories);
  }

  if (selectedCities && selectedCities.length > 0) {
    queryConstraints.push(where('cityName', 'in', selectedCities));
    console.log("-> Filtre ville ajouté:", selectedCities);
  }

  queryConstraints.push(orderBy('id', 'desc'));
  queryConstraints.push(limit(STORES_PER_PAGE));
  console.log("-> Contraintes de requête:", queryConstraints);

  let baseQuery = query(storeCollection, ...queryConstraints);
  console.log("-> BaseQuery construite:", baseQuery);

  if (lastVisible) {
    baseQuery = query(baseQuery, startAfter(lastVisible));
    console.log("-> startAfter ajouté:", lastVisible);
  }

  console.log("==> Requête finale:", baseQuery);
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
    console.log("==> fetchStores appelé avec la query:", storeQuery);
    const snapshot = await getDocs(storeQuery);
    console.log("Nombre de documents récupérés:", snapshot.docs.length);
    const newStores = snapshot.docs.map(doc => {
      console.log("Document récupéré:", doc.id, doc.data());
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

  console.log("Requête générée pour les magasins du marchand :", baseQuery);
  return baseQuery;
};

