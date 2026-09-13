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
  useRef,
} from "react";
import { AppState, DeviceEventEmitter } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import Toast from "react-native-toast-message";

// New services
import locationManager from "../services/LocationManager";
import storeService from "../services/StoreService";
import { LOCATION_CONFIG, LocationState } from "../config/location";
import {
  sortVerifiedFirst,
  sortByProximityThenVerified,
} from "../utils/storeSorting";
import { isStoreVisibleToShopper } from "../utils/storeVisibility";
import { setCustomLocation } from "../Redux/Actions/LocationActions";
import { store } from "../Redux";
import { useTranslation } from "../utils/useTranslation";

export const StoreContext = createContext();

/**
 * Source-priority guard. A city the user searched for ("search") always wins
 * over a GPS fix that lands later; only an absent, GPS or default location may
 * be overwritten. Every GPS dispatch in this file goes through here.
 */
export const canGpsOverwrite = (currentLocation) =>
  !currentLocation?.latitude ||
  currentLocation.source === "gps" ||
  currentLocation.source === "default";

const buildDefaultLocation = () => ({
  ...LOCATION_CONFIG.DEFAULT_LOCATION,
  source: "default",
  timestamp: Date.now(),
});

export const StoreProvider = ({ children }) => {
  const { t } = useTranslation();

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

  // Refs read by the mount-only init effect and by the async callbacks, so
  // none of them has to close over React state.
  const userLocationRef = useRef(null);
  const lastAppliedLocationRef = useRef(null);
  const hasShownFallbackToastRef = useRef(false);
  const retryInFlightRef = useRef(false);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

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

  // Listen for store refresh events. Screens emit this right after writing a
  // store, so it must bypass the 30-minute cache; fetchAllStores would hand
  // the stale cached list straight back.
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "stores:refresh",
      () => {
        storeService.refresh().catch((error) => {
          console.error("Error refreshing stores:", error);
        });
      },
    );
    return () => subscription.remove();
  }, []);

  /**
   * Accept a real location from LocationManager (GPS or its trusted cache)
   * and push it to Redux unless a user search already sits there. Reads Redux
   * through store.getState() so the callback stays stable and always sees the
   * latest value, even from a LocationManager listener.
   */
  const applyLocation = useCallback(
    (location) => {
      // The listener and the awaited getUserLocation() hand back the same
      // object; only apply it once.
      if (lastAppliedLocationRef.current === location) return;
      lastAppliedLocationRef.current = location;

      // A search that happened while GPS was pending keeps both the Redux
      // location and the list centred on the searched city.
      const currentState = store.getState().location.customLocation;
      if (!canGpsOverwrite(currentState)) return;

      setUserLocation(location);
      dispatch(
        setCustomLocation(
          {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          "gps",
        ),
      );
    },
    [dispatch],
  );

  /**
   * Last resort when no location is available at all. The default is never
   * cached and never overwrites a search, and it stays re-fetchable: every
   * retry path checks for source === "default".
   */
  const fallbackToDefault = useCallback(() => {
    // The user searched a city while GPS was pending: keep it.
    const currentState = store.getState().location.customLocation;
    if (!canGpsOverwrite(currentState)) return currentState;

    const defaultLocation = buildDefaultLocation();
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

    // Set as current location so the Map uses the same point, but never cache
    // it: a cached default would hide the real GPS fix on the next launch.
    locationManager.setCustomLocation(defaultLocation);

    // Retries re-enter this branch on denied devices; tell the user once.
    if (!hasShownFallbackToastRef.current) {
      hasShownFallbackToastRef.current = true;
      Toast.show({
        type: "info",
        text1: t("location_not_available"),
        text2: t("search_your_city"),
        position: "bottom",
        visibilityTime: 4000,
      });
    }

    return defaultLocation;
  }, [dispatch, t]);

  /**
   * Fetch user location using the new LocationManager
   * Falls back to default location if GPS fails
   */
  const fetchUserLocation = useCallback(async () => {
    // Prefer a location the user chose (city search). A default is not a
    // choice, so it must not short-circuit the GPS attempt.
    const current = store.getState().location.customLocation;
    if (
      current?.latitude &&
      current?.longitude &&
      current.source !== "default"
    ) {
      setUserLocation(current);
      return current;
    }

    try {
      await locationManager.initialize();

      const location = await locationManager.getUserLocation({
        useCache: true,
      });

      // Accept any valid location from LocationManager (GPS or cache). The
      // manager already validates cache TTL, and a cached fix beats Brussels,
      // which could be in a different country.
      if (location?.latitude && location?.longitude) {
        applyLocation(location);
        return location;
      }

      return fallbackToDefault();
    } catch (error) {
      console.error("[StoreContext] Error fetching user location:", error);
      // Even on error, use default location so app is usable
      return fallbackToDefault();
    }
  }, [applyLocation, fallbackToDefault]);

  /**
   * Retry GPS when the app is still on the default. Called on AppState
   * "active" and on Home focus, so a permission answered late (or granted
   * from Settings) replaces Brussels without a restart. Skipped while the
   * permission is denied: retrying would only re-show the fallback.
   */
  const retryLocationIfDefault = useCallback(async () => {
    if (userLocationRef.current?.source !== "default") return null;
    if (retryInFlightRef.current) return null;

    retryInFlightRef.current = true;
    try {
      // Re-read, not the cached value: a grant from Settings does not
      // restart the app, so the status from the last prompt is stale.
      const permission = await locationManager.refreshPermissionStatus();
      if (permission === "denied") return null;
      const location = await locationManager.getUserLocation({
        forceRefresh: true,
      });
      if (location?.latitude && location?.longitude) {
        applyLocation(location);
        return location;
      }
      return null;
    } catch (error) {
      console.error("[StoreContext] Error retrying user location:", error);
      return null;
    } finally {
      retryInFlightRef.current = false;
    }
  }, [applyLocation]);

  // Latest callbacks for the mount-only init effect below.
  const fetchUserLocationRef = useRef(fetchUserLocation);
  const retryLocationIfDefaultRef = useRef(retryLocationIfDefault);
  const applyLocationRef = useRef(applyLocation);
  useEffect(() => {
    fetchUserLocationRef.current = fetchUserLocation;
    retryLocationIfDefaultRef.current = retryLocationIfDefault;
    applyLocationRef.current = applyLocation;
  }, [fetchUserLocation, retryLocationIfDefault, applyLocation]);

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

      let filtered = allStores.filter(isStoreVisibleToShopper);

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
      let filtered = allStores.filter(isStoreVisibleToShopper);

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

  // Initialize on mount. Synchronous body with [] deps: subscriptions are
  // made once and torn down on unmount; a location change must not
  // re-subscribe or re-fetch.
  useEffect(() => {
    const unsubscribeStores = storeService.subscribe((stores) => {
      setAllStores(stores);
      setLoadingStores(false);
    });

    // A GPS fix that lands after the initial fetch gave up (permission
    // answered late, slow GPS) arrives here and goes through the same
    // source-priority guard as the initial one.
    const unsubscribeLocation = locationManager.subscribe(
      (state, location) => {
        if (state === LocationState.ACQUIRED && location?.source === "gps") {
          applyLocationRef.current(location);
        }
      },
    );

    // Coming back from the OS permission dialog or from Settings.
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          retryLocationIfDefaultRef.current();
        }
      },
    );

    locationManager.initialize().then(() => {
      fetchAllStores();
      fetchUserLocationRef.current();
    });

    return () => {
      unsubscribeStores();
      unsubscribeLocation();
      appStateSubscription?.remove?.();
    };
  }, [fetchAllStores]);

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
      retryLocationIfDefault,

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
      retryLocationIfDefault,
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
