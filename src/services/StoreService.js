/**
 * StoreService - Singleton service for store data management
 *
 * Key features:
 * - Cache-first with background refresh
 * - Request deduplication via pending promise
 * - Consistent radius everywhere
 * - Smart expanding radius for finding stores
 */

import { collection, getDocs } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { firestore } from "../../firebaseconfig";
import { LOCATION_CONFIG, CACHE_KEYS } from "../config/location";
import locationManager from "./LocationManager";

class StoreService {
  constructor() {
    this.allStores = [];
    this.isInitialized = false;
    this.pendingFetch = null;
    this.pendingFirebaseFetch = null;
    this.lastFetchTime = 0;
    this.listeners = new Set();
  }

  /**
   * Subscribe to store updates
   * @param {Function} listener - Callback function (stores) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    // Immediately notify with current stores
    if (this.allStores.length > 0) {
      listener(this.allStores);
    }
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of store updates
   */
  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.allStores);
      } catch (e) {
        console.error("[StoreService] Listener error:", e);
      }
    });
  }

  /**
   * Fetch all stores with cache-first strategy and deduplication
   * @returns {Promise<Array>} Array of stores
   */
  async fetchAllStores() {
    // Deduplicate concurrent requests
    if (this.pendingFetch) {
      return this.pendingFetch;
    }

    this.pendingFetch = this._doFetchAllStores();

    try {
      return await this.pendingFetch;
    } finally {
      this.pendingFetch = null;
    }
  }

  /**
   * Internal fetch implementation
   */
  async _doFetchAllStores() {
    try {
      // Try to load from cache first
      const cached = await this.loadFromCache();

      if (cached && cached.stores && cached.stores.length > 0) {
        this.allStores = cached.stores;
        this.notifyListeners();

        // Check if cache is still valid
        const cacheAge = Date.now() - (cached.timestamp || 0);
        if (cacheAge < LOCATION_CONFIG.STORE_CACHE_TTL) {
          // Cache is valid, return immediately
          this.isInitialized = true;
          return this.allStores;
        }

        // Cache expired, refresh in background
        this.fetchFromFirebase().catch(() => {});
        this.isInitialized = true;
        return this.allStores;
      }

      // No cache, fetch from Firebase (blocking)
      return await this.fetchFromFirebase();
    } catch (error) {
      console.error("[StoreService] Fetch all stores error:", error);
      // Return whatever we have (could be empty)
      return this.allStores;
    }
  }

  /**
   * Fetch stores from Firebase with deduplication
   */
  async fetchFromFirebase() {
    // Deduplicate Firebase requests
    if (this.pendingFirebaseFetch) {
      return this.pendingFirebaseFetch;
    }

    this.pendingFirebaseFetch = this._doFetchFromFirebase();

    try {
      return await this.pendingFirebaseFetch;
    } finally {
      this.pendingFirebaseFetch = null;
    }
  }

  /**
   * Internal Firebase fetch implementation
   */
  async _doFetchFromFirebase() {
    try {
      // Stores are live from the moment they are created -- there is no
      // approval gate to filter on. The only stores hidden from the app are
      // suspended ones.
      const storesRef = collection(firestore, "stores");

      const snapshot = await getDocs(storesRef);
      // Suspension is filtered here rather than with a Firestore where():
      // where('is_suspended','==',false) and where('is_suspended','!=',true)
      // both drop documents that lack the field, so a server-side filter would
      // hide every store written before suspension existed unless the whole
      // collection were backfilled first, and would need a new composite index
      // on top. A truthiness check treats undefined as not-suspended for free.
      // Nothing leaks by reading them: firestore.rules allows public reads on
      // /stores already.
      const stores = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((store) => !store.is_suspended);

      this.allStores = stores;
      this.lastFetchTime = Date.now();
      this.isInitialized = true;
      this.notifyListeners();

      // Cache for next time (fire and forget)
      this.saveToCache(stores).catch(() => {});

      return stores;
    } catch (error) {
      console.error("[StoreService] Firebase fetch error:", error);
      throw error;
    }
  }

  /**
   * Filter stores by radius
   *
   * Ordering here is strictly by distance and must stay that way. Callers read
   * the result positionally: findStoresWithExpandingRadius passes it straight
   * through, and the home screen takes [0] as "the nearest shop" and recentres
   * the map on it. Letting the verification badge reorder this would move the
   * user's map to a verified store kilometres away and label it the closest.
   * Verified-first ordering belongs at the display sites -- see
   * sortByProximityThenVerified in utils/storeUtils.
   *
   * @param {Object} location - Center location
   * @param {number} radiusKm - Radius in kilometers
   * @param {Array} selectedCategories - Optional category filter
   * @returns {Array} Filtered stores, nearest first
   */
  filterStoresByRadius(
    location,
    radiusKm = LOCATION_CONFIG.SEARCH_RADIUS_KM,
    selectedCategories = null,
  ) {
    if (!location?.latitude || !location?.longitude) {
      return [];
    }

    let stores = [...this.allStores];

    // Apply category filter if specified
    if (selectedCategories && selectedCategories.length > 0) {
      const categoryStrings = selectedCategories.map((c) => String(c));
      stores = stores.filter(
        (store) =>
          Array.isArray(store.category) &&
          store.category.some((catId) =>
            categoryStrings.includes(String(catId)),
          ),
      );
    }

    // Filter by radius and add distance
    const nearbyStores = stores
      .map((store) => {
        const geopoint = store?.address?.[0]?.location?.geopoint;
        if (!geopoint) return null;

        const storeLat = Number(geopoint.latitude);
        const storeLng = Number(geopoint.longitude);

        if (isNaN(storeLat) || isNaN(storeLng)) return null;

        const distance = locationManager.getDistanceInKm(
          location.latitude,
          location.longitude,
          storeLat,
          storeLng,
        );

        if (distance > radiusKm) return null;

        return {
          ...store,
          latitude: storeLat,
          longitude: storeLng,
          distance: Math.round(distance * 100) / 100,
        };
      })
      .filter((store) => store !== null)
      .sort((a, b) => a.distance - b.distance);

    return nearbyStores;
  }

  /**
   * Find stores with expanding radius until at least minStores are found
   * @param {Object} location - Center location
   * @param {number} minStores - Minimum stores to find
   * @param {Array} selectedCategories - Optional category filter
   * @returns {Object} { stores, radius }
   */
  findStoresWithExpandingRadius(
    location,
    minStores = 1,
    selectedCategories = null,
  ) {
    if (!location?.latitude || !location?.longitude) {
      return { stores: [], radius: 0 };
    }

    const radiusSteps = LOCATION_CONFIG.RADIUS_STEPS;

    for (const radius of radiusSteps) {
      const nearbyStores = this.filterStoresByRadius(
        location,
        radius,
        selectedCategories,
      );

      if (nearbyStores.length >= minStores) {
        return { stores: nearbyStores, radius };
      }
    }

    // If no stores found within max radius, return all stores
    const allWithDistance = this.allStores
      .map((store) => {
        const geopoint = store?.address?.[0]?.location?.geopoint;
        if (!geopoint) return null;

        const storeLat = Number(geopoint.latitude);
        const storeLng = Number(geopoint.longitude);

        if (isNaN(storeLat) || isNaN(storeLng)) return null;

        const distance = locationManager.getDistanceInKm(
          location.latitude,
          location.longitude,
          storeLat,
          storeLng,
        );

        return {
          ...store,
          latitude: storeLat,
          longitude: storeLng,
          distance: Math.round(distance * 100) / 100,
        };
      })
      .filter((store) => store !== null)
      .sort((a, b) => a.distance - b.distance);

    // Apply category filter if specified
    let result = allWithDistance;
    if (selectedCategories && selectedCategories.length > 0) {
      const categoryStrings = selectedCategories.map((c) => String(c));
      result = result.filter(
        (store) =>
          Array.isArray(store.category) &&
          store.category.some((catId) =>
            categoryStrings.includes(String(catId)),
          ),
      );
    }

    return { stores: result, radius: "all" };
  }

  /**
   * Calculate appropriate zoom level based on store distances
   * @param {Array} stores - Stores with distance property
   * @returns {number} Zoom level
   */
  calculateAutoZoom(stores) {
    if (!stores || stores.length === 0) return 12;

    const distances = stores.map((s) => s.distance || 0).sort((a, b) => a - b);

    // For few stores, use max distance; for many, use 80th percentile
    let representativeDistance;
    if (stores.length <= 5) {
      representativeDistance = Math.max(...distances);
    } else {
      const percentileIndex = Math.floor(distances.length * 0.8);
      representativeDistance = distances[percentileIndex];
    }

    // Map distance to zoom level
    if (representativeDistance <= 0.5) return 15;
    if (representativeDistance <= 1) return 14;
    if (representativeDistance <= 2) return 13;
    if (representativeDistance <= 3) return 12;
    if (representativeDistance <= 5) return 11;
    if (representativeDistance <= 10) return 10;
    if (representativeDistance <= 20) return 9;
    return 8;
  }

  /**
   * Load stores from cache with safe parsing
   */
  async loadFromCache() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.STORES_CACHE);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          return data;
        } catch (parseError) {
          // Clear corrupt cache
          console.warn("[StoreService] Corrupt cache, clearing");
          await AsyncStorage.removeItem(CACHE_KEYS.STORES_CACHE);
        }
      }
    } catch (error) {
      console.error("[StoreService] Load from cache error:", error);
    }
    return null;
  }

  /**
   * Save stores to cache
   */
  async saveToCache(stores) {
    try {
      const cacheData = {
        stores,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        CACHE_KEYS.STORES_CACHE,
        JSON.stringify(cacheData),
      );
    } catch (error) {
      console.error("[StoreService] Save to cache error:", error);
    }
  }

  /**
   * Get all stores synchronously (for immediate UI rendering)
   */
  getAllStores() {
    return this.allStores;
  }

  /**
   * Get store by ID
   */
  getStoreById(storeId) {
    return this.allStores.find((store) => store.id === storeId);
  }

  /**
   * Search stores by name
   *
   * Unlike the nearby list, suggestions carry no distance, so verification is
   * the primary sort key here.
   *
   * @param {string} query - Search query
   * @param {number} limit - Maximum results
   * @returns {Array} Matching stores, verified first
   */
  searchStoresByName(query, limit = 15) {
    if (!query || query.trim().length < 2) return [];

    const lowerQuery = query.toLowerCase().trim();
    return this.allStores
      .filter((store) => store?.name?.toLowerCase().includes(lowerQuery))
      .sort((a, b) => {
        // Verified stores outrank everything else
        if (!a.is_verified !== !b.is_verified) return a.is_verified ? -1 : 1;
        // Then prioritize names that start with the query
        const aStarts = a.name.toLowerCase().startsWith(lowerQuery);
        const bStarts = b.name.toLowerCase().startsWith(lowerQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit)
      .map((store) => ({
        id: store.id,
        name: store.name,
        // Carried through so the suggestion row can render the badge; without
        // it the sort above would be invisible downstream.
        is_verified: !!store.is_verified,
        location: store.address?.[0]?.location?.geopoint || null,
      }));
  }

  /**
   * Force refresh from Firebase
   */
  async refresh() {
    return await this.fetchFromFirebase();
  }

  /**
   * Clear all cached data
   */
  async clearCache() {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.STORES_CACHE);
    } catch (error) {
      console.error("[StoreService] Clear cache error:", error);
    }
  }
}

// Export singleton instance
const storeService = new StoreService();
export default storeService;
