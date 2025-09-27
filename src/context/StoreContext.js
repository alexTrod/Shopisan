import React, { createContext, useEffect, useState, useCallback, useMemo } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../firebaseconfig';
import { useSelector, useDispatch } from 'react-redux';
import locationService from '../utils/locationService';

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [allStores, setAllStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const customLocation = useSelector(state => state.location.customLocation);
  const selectedCategories = useSelector(state => state.categories.selectedCategories);
  const dispatch = useDispatch();

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('stores:refresh', () => {
      fetchAllStores();
    });
    return () => sub.remove();
  }, [fetchAllStores]);

  const fetchAllStores = useCallback(async () => {
    setLoadingStores(true);
    try {
      const storesRef = collection(firestore, 'stores');
      const validatedStoresQuery = query(storesRef, where('is_validated', '==', true));
      const snapshot = await getDocs(validatedStoresQuery);
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
      // Initialize location service if not already done
      await locationService.initialize();
      
      // Get location with fallback to Brussels
      const location = await locationService.getUserLocation({
        useCache: true,
        showToast: true
      });
      
      setUserLocation(location);
      
      // Update Redux store with the location
      locationService.updateReduxLocation(dispatch, location);
      
    } catch (err) {
      console.error('Erreur lors de la récupération de la position utilisateur :', err);
    }
  }, [customLocation, dispatch]);

  const filterStores = useCallback(async () => {
    if (!userLocation || !allStores.length) {
      setFilteredStores([]);
      return;
    }

    let filtered = [...allStores];

    // Apply category filter
    if (selectedCategories?.length > 0) {
      filtered = filtered.filter(store =>
        Array.isArray(store.category) &&
        store.category.some(catId => selectedCategories.includes(catId))
      );
    }

    // Filter stores with valid geolocation
    filtered = filtered.filter(store => {
      const valid = store?.address?.[0]?.location?.geopoint;
      return valid;
    });

    // Use expanding radius to find stores
    const nearbyStores = locationService.getStoresWithExpandingRadius(
      filtered, 
      userLocation, 
      500 // Max 500km radius
    );

    setFilteredStores(nearbyStores);
  }, [allStores, selectedCategories, userLocation]);

  const performSearch = useCallback(async (searchTerm) => {
    if (!userLocation || !allStores.length) {
      setFilteredStores([]);
      return;
    }

    let filtered = [...allStores];

    // Apply category filter
    if (selectedCategories?.length > 0) {
      filtered = filtered.filter(store =>
        Array.isArray(store.category) &&
        store.category.some(catId => selectedCategories.includes(catId))
      );
    }

    // Apply search query filter
    if (searchTerm && searchTerm.trim().length > 0) {
      const trimmedQuery = searchTerm.trim().toLowerCase();
      
      // Check if the search query matches a city from Firestore
      try {
        // Removed citiesService usage
        const cities = [];
        const matchedCity = cities.find(
          city => city.name.toLowerCase() === trimmedQuery
        );

        if (matchedCity) {
          // Filter stores by city name
          filtered = filtered.filter(
            store => store.cityName?.toLowerCase() === trimmedQuery
          );
        } else {
          // Filter stores by name if no city match
          filtered = filtered.filter(
            store => store.name?.toLowerCase().includes(trimmedQuery)
          );
        }
      } catch (error) {
        console.error('Error checking city match:', error);
        // Fallback to store name filtering
        filtered = filtered.filter(
          store => store.name?.toLowerCase().includes(trimmedQuery)
        );
      }
    }

    // Filter stores with valid geolocation
    filtered = filtered.filter(store => {
      const valid = store?.address?.[0]?.location?.geopoint;
      return valid;
    });

    // Use expanding radius to find stores
    const nearbyStores = locationService.getStoresWithExpandingRadius(
      filtered, 
      userLocation, 
      500 // Max 500km radius
    );

    setFilteredStores(nearbyStores);
  }, [allStores, selectedCategories, userLocation]);

  useEffect(() => {
    filterStores();
  }, [filterStores]);

  useEffect(() => {
    const initializeApp = async () => {
      // Initialize location service first
      await locationService.initialize();
      
      // Then fetch stores and location
      fetchAllStores();
      fetchUserLocation();
    };
    
    initializeApp();
  }, [fetchAllStores, fetchUserLocation]);


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
        performSearch,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
