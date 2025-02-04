import { collection, query, getDocs, orderBy, limit, startAfter, where } from "firebase/firestore";
import { firestore } from "../../firebaseconfig";
import logging from "./logging";
import { useCallback } from "react";
import { useSelector } from "react-redux";

const STORES_PER_PAGE = 10;

export const getStoreQuery = (selectedCategories, lastVisible, categories) => {
  const storeCollection = collection(firestore, 'stores');
  let baseQuery;

  if (selectedCategories && selectedCategories !== 'All' && selectedCategories.length > 0) {
    baseQuery = query(
      storeCollection,
      where('category', 'array-contains-any', selectedCategories),
      orderBy('id', 'desc'),
      limit(STORES_PER_PAGE)
    );
  } else {
    baseQuery = query(
      storeCollection,
      orderBy('id', 'desc'),
      limit(STORES_PER_PAGE)
    );
  }

  if (lastVisible) {
    return query(baseQuery, startAfter(lastVisible));
  }

  return baseQuery;
};



export const fetchStoreRatings = async (storeId) => {
    try {

      let _totalRating = 0;
      let _ratingCount = 0;

      const ratingsCollection = collection(firestore, 'ratings');
      logging('fetching store id', storeId);
      const ratingsQuery = query(ratingsCollection, where('store_id', '==', storeId));

      if (ratingsQuery.empty) {
        return { averageRating: 0, ratingCount: 0 };
      }

      const ratingsSnapshot = await getDocs(ratingsQuery);


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
    const newStores = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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
