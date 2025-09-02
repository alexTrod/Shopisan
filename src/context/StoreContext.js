import React, { createContext, useEffect, useState, useCallback, useMemo } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebaseconfig';
import * as Location from 'expo-location';
import { useSelector } from 'react-redux';
import cities from "../components/cities/cities.json";
import { store, error, warn, info, debug } from '../utils/logger';

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
      store('Fetched stores', { count: stores.length });
      if (stores.length > 0) {
        store('Sample store structure', {
          id: stores[0].id,
          name: stores[0].name,
          address: stores[0].address,
          hasGeopoint: !!stores[0].address?.[0]?.location?.geopoint,
          geopoint: stores[0].address?.[0]?.location?.geopoint
        });
      }
      setAllStores(stores);
    } catch (error) {
      error('Erreur lors de la récupération des magasins', error);
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
        warn('Permission de localisation refusée');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (err) {
      error('Erreur lors de la récupération de la position utilisateur', err);
    }
  }, [customLocation]);

  useEffect(() => {
    // Use customLocation if available, otherwise use userLocation
    const currentLocation = customLocation || userLocation;
    
    if (!currentLocation) {
      debug('No current location available');
      return;
    }

    debug('Filtering stores with', {
      currentLocation,
      searchQuery,
      allStoresCount: allStores.length,
      selectedCategoriesCount: selectedCategories?.length || 0
    });

    let filtered = [...allStores];

    if (selectedCategories?.length > 0) {
      filtered = filtered.filter(store =>
        Array.isArray(store.category) &&
        store.category.some(catId => selectedCategories.includes(catId))
      );
      debug('After category filtering', { count: filtered.length });
    }

    // Apply search query filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(store =>
        store.name?.toLowerCase().includes(query) ||
        store.category?.some(cat => 
          typeof cat === 'string' && cat.toLowerCase().includes(query)
        )
      );
      console.log('🔍 After search query filtering:', filtered.length, 'stores');
    }

    filtered = filtered
      .filter(store => {
        const geopoint = store?.address?.[0]?.location?.geopoint;
        if (!geopoint) return false;
        const latNum = Number(geopoint.latitude);
        const lonNum = Number(geopoint.longitude);
        return Number.isFinite(latNum) && Number.isFinite(lonNum);
      })
      .map(store => {
        const geopoint = store.address[0].location.geopoint;
        const latNum = Number(geopoint.latitude);
        const lonNum = Number(geopoint.longitude);
        const distance = getDistanceInKm(
          currentLocation.latitude,
          currentLocation.longitude,
          latNum,
          lonNum
        );
        return { 
          ...store, 
          latitude: latNum,
          longitude: lonNum,
          distance 
        };
      });

    // Temporarily remove distance sorting to see all stores
    // filtered.sort((a, b) => a.distance - b.distance);

    console.log('🔍 Final filtered stores:', filtered.length, 'stores');
    if (filtered.length > 0) {
      console.log('🔍 First few stores:', filtered.slice(0, 3).map(s => ({ name: s.name, distance: s.distance })));
    }

    setFilteredStores(filtered);
  }, [allStores, selectedCategories, userLocation, customLocation, searchQuery]);

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
        searchQuery,
        setSearchQuery,
        refreshStores: fetchAllStores,
        refreshLocation: fetchUserLocation,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
