import React, { createContext, useEffect, useState, useCallback, useMemo } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore } from '../../firebaseconfig';
import { useSelector, useDispatch } from 'react-redux';
import locationService from '../utils/locationService';
import perfLogger from '../utils/perfLogger';

// Store cache configuration
const STORE_CACHE_KEY = '@stores_cache';
const STORE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes (increased from 5 minutes for better performance)

// Flags to prevent duplicate fetches
let isFetchingStores = false;
let isFetchingFromFirebase = false;

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [allStores, setAllStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCompleted, setSearchCompleted] = useState(false); // True when user selected a city/store
  const [hasRequestedStores, setHasRequestedStores] = useState(false);

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
    // Prevent duplicate fetches
    if (isFetchingStores) {
      perfLogger.checkpoint('StoreContext.fetchAllStores', 'Skipping - already fetching');
      return;
    }
    isFetchingStores = true;

    perfLogger.start('StoreContext.fetchAllStores.TOTAL');
    setLoadingStores(true);
    try {
      // Try to load from cache first for instant startup
      perfLogger.start('StoreContext.fetchAllStores.readCache');
      const cached = await AsyncStorage.getItem(STORE_CACHE_KEY);
      perfLogger.end('StoreContext.fetchAllStores.readCache');

      if (cached) {
        perfLogger.start('StoreContext.fetchAllStores.parseCache');
        const { stores, timestamp } = JSON.parse(cached);
        perfLogger.end('StoreContext.fetchAllStores.parseCache');

        // Always use cache immediately if we have it (even if expired)
        // This gives instant UI while we refresh in background
        if (stores && stores.length > 0) {
          perfLogger.checkpoint('StoreContext.fetchAllStores.TOTAL', `Using cached ${stores.length} stores`);
          setAllStores(stores);
          setLoadingStores(false);
        }

        if (Date.now() - timestamp < STORE_CACHE_TTL) {
          // Cache is still valid - no need to refresh
          perfLogger.checkpoint('StoreContext.fetchAllStores.TOTAL', 'Cache still valid, skipping Firebase refresh');
          perfLogger.end('StoreContext.fetchAllStores.TOTAL');
          isFetchingStores = false;
          return;
        }

        // Cache expired - refresh in background (don't await, don't block UI)
        perfLogger.checkpoint('StoreContext.fetchAllStores.TOTAL', 'Cache expired, refreshing in background');
        perfLogger.end('StoreContext.fetchAllStores.TOTAL');
        isFetchingStores = false;
        fetchFromFirebaseAndCache(); // Fire and forget
        return;
      }

      perfLogger.checkpoint('StoreContext.fetchAllStores.TOTAL', 'No cache found');

      // No cache at all - must fetch from Firebase (blocking)
      await fetchFromFirebaseAndCache();
    } catch (error) {
      console.error('Erreur lors de la récupération des magasins :', error);
    } finally {
      setLoadingStores(false);
      perfLogger.end('StoreContext.fetchAllStores.TOTAL');
      isFetchingStores = false;
    }
  }, []);

  const fetchFromFirebaseAndCache = async () => {
    // Prevent duplicate Firebase fetches
    if (isFetchingFromFirebase) {
      perfLogger.checkpoint('StoreContext.fetchFromFirebase', 'Skipping - already fetching from Firebase');
      return;
    }
    isFetchingFromFirebase = true;

    perfLogger.start('StoreContext.fetchFromFirebase.TOTAL');
    try {
      perfLogger.start('StoreContext.fetchFromFirebase.query');
      const storesRef = collection(firestore, 'stores');
      const validatedStoresQuery = query(storesRef, where('is_validated', '==', true));
      perfLogger.end('StoreContext.fetchFromFirebase.query');

      perfLogger.start('StoreContext.fetchFromFirebase.getDocs');
      const snapshot = await getDocs(validatedStoresQuery);
      perfLogger.end('StoreContext.fetchFromFirebase.getDocs');

      perfLogger.start('StoreContext.fetchFromFirebase.mapDocs');
      const stores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      perfLogger.end('StoreContext.fetchFromFirebase.mapDocs');

      perfLogger.checkpoint('StoreContext.fetchFromFirebase.TOTAL', `Fetched ${stores.length} stores from Firebase`);
      setAllStores(stores);

      // Cache for next time (don't await)
      AsyncStorage.setItem(STORE_CACHE_KEY, JSON.stringify({
        stores,
        timestamp: Date.now()
      })).catch(() => {});

      perfLogger.end('StoreContext.fetchFromFirebase.TOTAL');
    } catch (error) {
      console.error('Firebase fetch error:', error);
      perfLogger.end('StoreContext.fetchFromFirebase.TOTAL');
    } finally {
      isFetchingFromFirebase = false;
    }
  };

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

  // Sync customLocation to userLocation when it changes (for cross-screen sync)
  useEffect(() => {
    if (customLocation?.latitude && customLocation?.longitude) {
      setUserLocation(customLocation);
    }
  }, [customLocation]);

  const filterStores = useCallback(async () => {
    if (!userLocation || !allStores.length) {
      setFilteredStores([]);
      return;
    }

    let filtered = [...allStores];

    // Apply category filter - OR logic: store must have ANY of the selected categories
    if (selectedCategories?.length > 0) {
      const selectedCatStrings = selectedCategories.map(c => String(c));
      filtered = filtered.filter(store =>
        Array.isArray(store.category) &&
        store.category.some(catId => selectedCatStrings.includes(String(catId)))
      );
    }

    // Filter stores with valid geolocation
    filtered = filtered.filter(store => {
      const valid = store?.address?.[0]?.location?.geopoint;
      return valid;
    });

    // Use strict 10km radius (synchronized with Home and Map screens)
    const nearbyStores = locationService.filterStoresByRadius(
      filtered,
      userLocation,
      10 // Strict 10km radius
    );

    setFilteredStores(nearbyStores);
  }, [allStores, selectedCategories, userLocation]);

  const performSearch = useCallback(async (searchTerm) => {
    if (!userLocation || !allStores.length) {
      setFilteredStores([]);
      return;
    }

    let filtered = [...allStores];

    // Apply category filter - OR logic: store must have ANY of the selected categories
    if (selectedCategories?.length > 0) {
      const selectedCatStrings = selectedCategories.map(c => String(c));
      filtered = filtered.filter(store =>
        Array.isArray(store.category) &&
        store.category.some(catId => selectedCatStrings.includes(String(catId)))
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

    // Use strict 10km radius (synchronized with Home and Map screens)
    const nearbyStores = locationService.filterStoresByRadius(
      filtered,
      userLocation,
      10 // Strict 10km radius
    );

    setFilteredStores(nearbyStores);
  }, [allStores, selectedCategories, userLocation]);

  // Filter stores when userLocation or categories change
  useEffect(() => {
    if (userLocation) {
      filterStores();
    } else {
      // If no location, still apply category filters but skip distance filtering
      let filtered = [...allStores];

      // Apply category filter - OR logic: store must have ANY of the selected categories
      if (selectedCategories?.length > 0) {
        const selectedCatStrings = selectedCategories.map(c => String(c));
        filtered = filtered.filter(store =>
          Array.isArray(store.category) &&
          store.category.some(catId => selectedCatStrings.includes(String(catId)))
        );
      }

      // Filter stores with valid geolocation
      filtered = filtered.filter(store => {
        const valid = store?.address?.[0]?.location?.geopoint;
        return valid;
      });

      setFilteredStores(filtered);
    }
  }, [filterStores, userLocation, allStores, selectedCategories]);

  useEffect(() => {
    const initializeApp = async () => {
      // Initialize location service first
      await locationService.initialize();

      // Fetch stores and user location automatically
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
        hasRequestedStores,
        setHasRequestedStores,
        searchCompleted,
        setSearchCompleted,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
