import React, { createContext, useEffect, useState, useCallback, useMemo } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebaseconfig';
import * as Location from 'expo-location';
import { useSelector } from 'react-redux';
import cities from "../components/cities/cities.json";

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [allStores, setAllStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const customLocation = useSelector(state => state.location.customLocation);
  const selectedCategories = useSelector(state => state.categories.selectedCategories);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('stores:refresh', () => {
      fetchAllStores();
    });
    return () => sub.remove();
  }, [fetchAllStores]);

  const fetchAllStores = useCallback(async () => {
    setLoadingStores(true);
    try {
      const snapshot = await getDocs(collection(firestore, 'stores'));
      const stores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllStores(stores);
    } catch (error) {
      console.error('Erreur lors de la récupération des magasins :', error);
    } finally {
      setLoadingStores(false);
    }
  }, []);

  const fetchUserLocation = useCallback(async () => {
    if (customLocation) {
      setUserLocation(customLocation);
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission de localisation refusée');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (err) {
      console.error('Erreur lors de la récupération de la position utilisateur :', err);
    }
  }, [customLocation]);

  useEffect(() => {
    if (!userLocation) {
      return;
    }

    let filtered = [...allStores];

    if (selectedCategories?.length > 0) {
      filtered = filtered.filter(store =>
        Array.isArray(store.category) &&
        store.category.some(catId => selectedCategories.includes(catId))
      );
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const trimmedQuery = searchQuery.trim().toLowerCase();
      const matchedCity = cities.find(
        city => city.toLowerCase() === trimmedQuery
      );

      if (matchedCity) {
        /*filtered = filtered.filter(
          store => store.cityName?.toLowerCase() === trimmedQuery
        );*/
      } else {
        filtered = filtered.filter(
          store => store.name?.toLowerCase().includes(trimmedQuery)
        );
      }
    }

    filtered = filtered
      .filter(store => {
        const valid = store?.address?.[0]?.location?.geopoint;
        return valid;
      })
      .map(store => {
        const geopoint = store.address[0].location.geopoint;
        const distance = getDistanceInKm(
          userLocation.latitude,
          userLocation.longitude,
          geopoint.latitude,
          geopoint.longitude
        );
        return { ...store, distance };
      });

    filtered.sort((a, b) => a.distance - b.distance);

    setFilteredStores(filtered);
  }, [allStores, selectedCategories, userLocation, searchQuery]);

  useEffect(() => {
    fetchAllStores();
    fetchUserLocation();
  }, [fetchAllStores, fetchUserLocation]);

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

  return (
    <StoreContext.Provider
      value={{
        allStores,
        filteredStores,
        loadingStores,
        userLocation,
        customLocation,
        refreshStores: fetchAllStores,
        refreshLocation: fetchUserLocation,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
