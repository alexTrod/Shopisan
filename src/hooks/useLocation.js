/**
 * useLocation - React hook for location management
 *
 * Provides a clean React interface to the LocationManager service.
 * Handles subscription lifecycle and state updates automatically.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import locationManager from "../services/LocationManager";
import { LocationState } from "../config/location";
import { setCustomLocation } from "../Redux/Actions/LocationActions";

/**
 * Hook for accessing and managing location state
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoFetch - Whether to automatically fetch location on mount
 * @param {boolean} options.useCache - Whether to use cached location
 * @returns {Object} Location state and methods
 */
export function useLocation(options = {}) {
  const { autoFetch = false, useCache = true } = options;

  const dispatch = useDispatch();
  const customLocation = useSelector((state) => state.location.customLocation);

  const [state, setState] = useState(locationManager.state);
  const [location, setLocation] = useState(
    locationManager.getCurrentLocation(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMounted = useRef(true);

  // Subscribe to location manager updates
  useEffect(() => {
    isMounted.current = true;

    const unsubscribe = locationManager.subscribe((newState, newLocation) => {
      if (isMounted.current) {
        setState(newState);
        setLocation(newLocation);
        setLoading(
          newState === LocationState.REQUESTING_PERMISSION ||
            newState === LocationState.REQUESTING_GPS,
        );
        setError(newState === LocationState.ERROR ? "Location error" : null);
      }
    });

    // Initialize location manager if not already done
    locationManager.initialize();

    // Auto-fetch if requested
    if (autoFetch && !locationManager.hasLocation()) {
      getUserLocation();
    }

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, [autoFetch]);

  // Sync with Redux customLocation
  useEffect(() => {
    if (customLocation?.latitude && customLocation?.longitude) {
      setLocation(customLocation);
    }
  }, [customLocation]);

  /**
   * Get user's current location
   */
  const getUserLocation = useCallback(
    async (forceRefresh = false) => {
      if (!isMounted.current) return null;

      setLoading(true);
      setError(null);

      try {
        const loc = await locationManager.getUserLocation({
          useCache: !forceRefresh,
          forceRefresh,
        });

        if (loc && isMounted.current) {
          // Update Redux store
          dispatch(
            setCustomLocation(
              {
                latitude: loc.latitude,
                longitude: loc.longitude,
              },
              "gps",
            ),
          );
        }

        return loc;
      } catch (err) {
        if (isMounted.current) {
          setError(err.message || "Failed to get location");
        }
        return null;
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [dispatch],
  );

  /**
   * Set a custom/searched location
   */
  const setLocation2 = useCallback(
    (newLocation) => {
      if (!newLocation?.latitude || !newLocation?.longitude) return;

      locationManager.setCustomLocation(newLocation);
      dispatch(
        setCustomLocation(
          {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
          },
          "search",
        ),
      );
    },
    [dispatch],
  );

  /**
   * Geocode a city name
   */
  const geocodeCity = useCallback(
    async (cityName) => {
      if (!cityName?.trim()) return null;

      setLoading(true);
      try {
        const coords = await locationManager.geocodeCity(cityName);
        if (coords) {
          setLocation2(coords);
        }
        return coords;
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [setLocation2],
  );

  /**
   * Enter exploring mode (user is panning map)
   */
  const setExploringMode = useCallback(() => {
    locationManager.setExploringMode();
  }, []);

  /**
   * Calculate distance between current location and a point
   */
  const getDistanceTo = useCallback(
    (targetLat, targetLng) => {
      const currentLoc = location || customLocation;
      if (!currentLoc?.latitude || !currentLoc?.longitude) return null;

      return locationManager.getDistanceInKm(
        currentLoc.latitude,
        currentLoc.longitude,
        targetLat,
        targetLng,
      );
    },
    [location, customLocation],
  );

  /**
   * Cancel any pending location request
   */
  const cancel = useCallback(() => {
    locationManager.abort();
    setLoading(false);
  }, []);

  return {
    // State
    state,
    location: location || customLocation,
    loading,
    error,

    // Derived state
    hasLocation: !!(location || customLocation),
    hasPermission: locationManager.hasPermission(),
    isPermissionDenied: locationManager.isPermissionDenied(),
    isAcquired: state === LocationState.ACQUIRED,
    isExploring: state === LocationState.EXPLORING,

    // Methods
    getUserLocation,
    setLocation: setLocation2,
    geocodeCity,
    setExploringMode,
    getDistanceTo,
    cancel,

    // Direct access to manager for advanced use cases
    manager: locationManager,
  };
}

export default useLocation;
