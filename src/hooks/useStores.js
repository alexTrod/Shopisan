/**
 * useStores - React hook for store management
 *
 * Provides a clean React interface to the StoreService.
 * Handles subscription lifecycle and state updates automatically.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import storeService from '../services/StoreService';
import { LOCATION_CONFIG } from '../config/location';

/**
 * Hook for accessing and managing stores
 * @param {Object} options - Configuration options
 * @param {Object} options.location - Location to filter by
 * @param {number} options.radius - Search radius in km
 * @param {boolean} options.autoFetch - Whether to auto-fetch on mount
 * @param {boolean} options.useExpandingRadius - Whether to use expanding radius
 * @returns {Object} Store state and methods
 */
export function useStores(options = {}) {
  const {
    location: locationProp,
    radius = LOCATION_CONFIG.SEARCH_RADIUS_KM,
    autoFetch = true,
    useExpandingRadius = false,
  } = options;

  const selectedCategories = useSelector(
    state => state.categories.selectedCategories
  );
  const customLocation = useSelector(state => state.location.customLocation);

  // Use provided location or fall back to Redux location
  const location = locationProp || customLocation;

  const [allStores, setAllStores] = useState(storeService.getAllStores());
  const [loading, setLoading] = useState(!storeService.isInitialized);
  const [error, setError] = useState(null);

  const isMounted = useRef(true);

  // Subscribe to store updates
  useEffect(() => {
    isMounted.current = true;

    const unsubscribe = storeService.subscribe(stores => {
      if (isMounted.current) {
        setAllStores(stores);
        setLoading(false);
      }
    });

    // Auto-fetch if requested
    if (autoFetch && !storeService.isInitialized) {
      fetchStores();
    }

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, [autoFetch]);

  /**
   * Fetch all stores
   */
  const fetchStores = useCallback(async () => {
    if (!isMounted.current) return [];

    setLoading(true);
    setError(null);

    try {
      const stores = await storeService.fetchAllStores();
      return stores;
    } catch (err) {
      if (isMounted.current) {
        setError(err.message || 'Failed to fetch stores');
      }
      return [];
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Refresh stores from Firebase
   */
  const refreshStores = useCallback(async () => {
    if (!isMounted.current) return [];

    setLoading(true);
    setError(null);

    try {
      const stores = await storeService.refresh();
      return stores;
    } catch (err) {
      if (isMounted.current) {
        setError(err.message || 'Failed to refresh stores');
      }
      return [];
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Get filtered stores based on location and categories
   */
  const filteredStores = useMemo(() => {
    if (!location?.latitude || !location?.longitude) {
      return [];
    }

    if (useExpandingRadius) {
      const { stores } = storeService.findStoresWithExpandingRadius(
        location,
        1, // Find at least 1 store
        selectedCategories
      );
      return stores;
    }

    return storeService.filterStoresByRadius(
      location,
      radius,
      selectedCategories
    );
  }, [location, radius, selectedCategories, allStores, useExpandingRadius]);

  /**
   * Get stores with expanding radius
   */
  const getStoresWithExpandingRadius = useCallback((loc, minStores = 1, categories = null) => {
    const targetLocation = loc || location;
    if (!targetLocation?.latitude || !targetLocation?.longitude) {
      return { stores: [], radius: 0 };
    }

    return storeService.findStoresWithExpandingRadius(
      targetLocation,
      minStores,
      categories || selectedCategories
    );
  }, [location, selectedCategories]);

  /**
   * Get stores by radius
   */
  const getStoresByRadius = useCallback((loc, rad = radius, categories = null) => {
    const targetLocation = loc || location;
    if (!targetLocation?.latitude || !targetLocation?.longitude) {
      return [];
    }

    return storeService.filterStoresByRadius(
      targetLocation,
      rad,
      categories || selectedCategories
    );
  }, [location, radius, selectedCategories]);

  /**
   * Calculate auto-zoom based on stores
   */
  const calculateAutoZoom = useCallback((stores = filteredStores) => {
    return storeService.calculateAutoZoom(stores);
  }, [filteredStores]);

  /**
   * Get store by ID
   */
  const getStoreById = useCallback((storeId) => {
    return storeService.getStoreById(storeId);
  }, [allStores]);

  /**
   * Search stores by name
   */
  const searchStores = useCallback((query, limit = 15) => {
    return storeService.searchStoresByName(query, limit);
  }, [allStores]);

  return {
    // State
    allStores,
    filteredStores,
    loading,
    error,

    // Derived state
    hasStores: allStores.length > 0,
    storeCount: filteredStores.length,
    totalStoreCount: allStores.length,

    // Methods
    fetchStores,
    refreshStores,
    getStoresWithExpandingRadius,
    getStoresByRadius,
    calculateAutoZoom,
    getStoreById,
    searchStores,

    // Direct access to service for advanced use cases
    service: storeService,
  };
}

export default useStores;
