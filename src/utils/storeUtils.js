import { collection, query, getDocs, orderBy, limit, startAfter, where } from "firebase/firestore";
import { firestore } from "../../firebaseconfig";
import logging from "./logging";

const STORES_PER_PAGE = 10;

export const getStoreQuery = (selectedCategories, lastVisible, categories, selectedCities) => {
  console.log("==> getStoreQuery appelé avec :");
  console.log("selectedCategories:", selectedCategories);
  console.log("selectedCities:", selectedCities);
  console.log("lastVisible:", lastVisible);
  console.log("categories:", categories);

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
