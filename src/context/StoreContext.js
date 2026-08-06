/**
 * StoreContext - Provides store and location data to the application
 *
 * This context now uses the new service layer for all operations:
 * - LocationManager for location handling
 * - StoreService for store data
 * - SearchService for search functionality
 *
 * The context maintains backward compatibility with the existing API
 * while leveraging the improved architecture.
 */

import React, {
  createContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { DeviceEventEmitter } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import Toast from "react-native-toast-message";

// New services
import locationManager from "../services/LocationManager";
import storeService from "../services/StoreService";
import { LOCATION_CONFIG } from "../config/location";
import {
  sortVerifiedFirst,
  sortByProximityThenVerified,
} from "../utils/storeSorting";
import { setCustomLocation } from "../Redux/Actions/LocationActions";
import { store } from "../Redux";

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  // State
  const [allStores, setAllStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [hasRequestedStores, setHasRequestedStores] = useState(false);

  // Redux state
  const customLocation = useSelector((state) => state.location.customLocation);
  const selectedCategories = useSelector(
    (state) => state.categories.selectedCategories,
  );
  const dispatch = useDispatch();

  // Listen for store refresh events
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "stores:refresh",
      () => {
        fetchAllStores();
      },
    );
    return () => subscription.remove();
  }, [fetchAllStores]);

  /**
   * Fetch all stores using the new StoreService
   */
  const fetchAllStores = useCallback(async () => {
    setLoadingStores(true);

    try {
      const stores = await storeService.fetchAllStores();
      setAllStores(stores);
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      setLoadingStores(false);
    }
  }, []);

  /**
   * Fetch user location using the new LocationManager
   * Falls back to default location if GPS fails
   */
  const fetchUserLocation = useCallback(async () => {
    // Prefer custom location if set (this is from user's city search)
    if (customLocation?.latitude && customLocation?.longitude) {
      console.log(
        "[StoreContext] Using customLocation from Redux:",
        customLocation.latitude,
        customLocation.longitude,
      );
      setUserLocation(customLocation);
      return customLocation;
    }

    try {
      // Initialize if needed
      await locationManager.initialize();

      // Get location - but we'll verify the source
      const location = await locationManager.getUserLocation({
        useCache: true,
      });

      console.log(
        "[StoreContext] LocationManager returned:",
        location?.latitude,
        location?.longitude,
        location?.source,
      );

      // Accept any valid location from LocationManager (GPS, custom, geocoding, or cache)
      // LocationManager already validates cache TTL, so cached locations are trustworthy
      // Using cache is better than falling back to Brussels which could be in a different country
      if (location && location.latitude && location.longitude) {
        console.log(
          "[StoreContext] Using location from source:",
          location.source,
        );
        setUserLocation(location);

        // RACE CONDITION FIX: Re-check Redux state before dispatch
        // If user searched for a city while GPS was pending, don't overwrite it
        const currentState = store.getState().location.customLocation;
        if (
          !currentState?.latitude ||
          currentState.source === "gps" ||
          currentState.source === "default"
        ) {
          // Only dispatch GPS result if no search location exists
          dispatch(
            setCustomLocation(
              {
                latitude: location.latitude,
                longitude: location.longitude,
              },
              "gps",
            ),
          );
        } else {
          console.log(
            "[StoreContext] Skipping GPS dispatch - user search location exists:",
            currentState.source,
          );
        }

        return location;
      }

      // No location available at all - use default as last resort
      console.log(
        "[StoreContext] No location available, using default Brussels",
      );
      const defaultLocation = {
        ...LOCATION_CONFIG.DEFAULT_LOCATION,
        source: "default",
        timestamp: Date.now(),
      };
      setUserLocation(defaultLocation);
      dispatch(
        setCustomLocation(
          {
            latitude: defaultLocation.latitude,
            longitude: defaultLocation.longitude,
          },
          "default",
        ),
      );

      // Set as current location but don't cache it - we don't want to pollute the cache
      // with a default location that could override a real GPS location later
      locationManager.setCustomLocation(defaultLocation);

      // Inform user they can search for their city
      Toast.show({
        type: "info",
        text1: "Location not available",
        text2: "Search for your city to find nearby stores",
        position: "bottom",
        visibilityTime: 4000,
      });

      return defaultLocation;
    } catch (error) {
      console.error("[StoreContext] Error fetching user location:", error);

      // Even on error, use default location so app is usable
      const defaultLocation = {
        ...LOCATION_CONFIG.DEFAULT_LOCATION,
        source: "default",
        timestamp: Date.now(),
      };
      setUserLocation(defaultLocation);

      // Also update LocationManager's cache so Map uses same location
      locationManager.setCustomLocation(defaultLocation);
      locationManager.saveToCache(defaultLocation).catch(() => {});

      return defaultLocation;
    }
  }, [customLocation, dispatch]);

  // Sync customLocation to userLocation when it changes
  useEffect(() => {
    if (customLocation?.latitude && customLocation?.longitude) {
      setUserLocation(customLocation);
    }
  }, [customLocation]);

  /**
   * Filter stores based on location and categories
   */
  const filterStores = useCallback(() => {
    if (!userLocation || !allStores.length) {
      setFilteredStores([]);
      return;
    }

    // Use StoreService for consistent filtering with fixed radius
    const nearbyStores = storeService.filterStoresByRadius(
      userLocation,
      LOCATION_CONFIG.SEARCH_RADIUS_KM,
      selectedCategories,
    );

    // Verification reorders the list only here, at the display edge. The
    // service keeps returning nearest-first because other callers read its
    // first element as the closest store.
    setFilteredStores(sortByProximityThenVerified(nearbyStores));
  }, [allStores, selectedCategories, userLocation]);

  /**
   * Perform search with query
   */
  const performSearch = useCallback(
    async (searchTerm) => {
      if (!userLocation || !allStores.length) {
        setFilteredStores([]);
        return;
      }

      let filtered = [...allStores];

      // Apply category filter
      if (selectedCategories?.length > 0) {
        const selectedCatStrings = selectedCategories.map((c) => String(c));
        filtered = filtered.filter(
          (store) =>
            Array.isArray(store.category) &&
            store.category.some((catId) =>
              selectedCatStrings.includes(String(catId)),
            ),
        );
      }

      // Apply search query filter
      if (searchTerm && searchTerm.trim().length > 0) {
        const trimmedQuery = searchTerm.trim().toLowerCase();

        // Filter by store name
        filtered = filtered.filter((store) =>
          store.name?.toLowerCase().includes(trimmedQuery),
        );
      }

      // Filter stores with valid geolocation
      filtered = filtered.filter((store) => {
        const valid = store?.address?.[0]?.location?.geopoint;
        return valid;
      });

      // Apply radius filter using StoreService
      const nearbyStores = storeService
        .filterStoresByRadius(
          userLocation,
          LOCATION_CONFIG.SEARCH_RADIUS_KM,
          null, // Categories already applied above
        )
        .filter((store) => filtered.some((f) => f.id === store.id));

      setFilteredStores(sortByProximityThenVerified(nearbyStores));
    },
    [allStores, selectedCategories, userLocation],
  );

  // Filter stores when userLocation or categories change
  useEffect(() => {
    if (userLocation) {
      filterStores();
    } else {
      // If no location, still apply category filters but skip distance filtering
      let filtered = [...allStores];

      if (selectedCategories?.length > 0) {
        const selectedCatStrings = selectedCategories.map((c) => String(c));
        filtered = filtered.filter(
          (store) =>
            Array.isArray(store.category) &&
            store.category.some((catId) =>
              selectedCatStrings.includes(String(catId)),
            ),
        );
      }

      // Filter stores with valid geolocation
      filtered = filtered.filter((store) => {
        const valid = store?.address?.[0]?.location?.geopoint;
        return valid;
      });

      // No location means no distance to bucket by, so verification is the
      // only ordering signal available here.
      setFilteredStores(sortVerifiedFirst(filtered));
    }
  }, [filterStores, userLocation, allStores, selectedCategories]);

  // Initialize on mount
  useEffect(() => {
    const initializeApp = async () => {
      // Initialize location manager
      await locationManager.initialize();

      // Subscribe to store updates
      const unsubscribeStores = storeService.subscribe((stores) => {
        setAllStores(stores);
        setLoadingStores(false);
      });

      // Fetch stores and user location
      fetchAllStores();
      fetchUserLocation();

      return () => {
        unsubscribeStores();
      };
    };

    initializeApp();
  }, [fetchAllStores, fetchUserLocation]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      // Store data
      allStores,
      filteredStores,
      loadingStores,

      // Location data
      userLocation,
      customLocation,

      // Methods
      refreshStores: fetchAllStores,
      refreshLocation: fetchUserLocation,

      // Search state
      searchQuery,
      setSearchQuery,
      performSearch,
      searchCompleted,
      setSearchCompleted,

      // Request tracking
      hasRequestedStores,
      setHasRequestedStores,

      // New service access (for migration)
      locationManager,
      storeService,
    }),
    [
      allStores,
      filteredStores,
      loadingStores,
      userLocation,
      customLocation,
      fetchAllStores,
      fetchUserLocation,
      searchQuery,
      performSearch,
      searchCompleted,
      hasRequestedStores,
    ],
  );

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
};
