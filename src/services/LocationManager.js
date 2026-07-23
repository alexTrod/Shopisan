/**
 * LocationManager - Singleton service for location management
 *
 * Implements a state machine for reliable location handling:
 * IDLE → REQUESTING_PERMISSION → REQUESTING_GPS → ACQUIRED
 *             ↓ denied              ↓ timeout
 *        PERMISSION_DENIED      USE_CACHE
 *
 * Key features:
 * - AbortController for all async operations
 * - Consistent timeouts
 * - Safe cache parsing
 * - Request deduplication
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCATION_CONFIG, LocationState, CACHE_KEYS } from '../config/location';

class LocationManager {
  constructor() {
    this.state = LocationState.IDLE;
    this.currentLocation = null;
    this.cachedLocation = null;
    this.abortController = null;
    this.pendingRequest = null;
    this.listeners = new Set();
    this.isInitialized = false;
    this.permissionStatus = null;
  }

  /**
   * Initialize the location manager
   * Loads cached location and checks permission status
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load cached location first
      await this.loadFromCache();

      // Check current permission status without prompting
      const { status } = await Location.getForegroundPermissionsAsync();
      this.permissionStatus = status;

      this.isInitialized = true;
    } catch (error) {
      console.error('[LocationManager] Initialize error:', error);
      this.isInitialized = true; // Still mark as initialized to prevent infinite retries
    }
  }

  /**
   * Subscribe to location state changes
   * @param {Function} listener - Callback function (state, location) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state, this.currentLocation || this.cachedLocation);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    const location = this.currentLocation || this.cachedLocation;
    this.listeners.forEach(listener => {
      try {
        listener(this.state, location);
      } catch (e) {
        console.error('[LocationManager] Listener error:', e);
      }
    });
  }

  /**
   * Set state and notify listeners
   */
  setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      this.notifyListeners();
    }
  }

  /**
   * Get user location with proper timeout and cancellation
   * @param {Object} options - Options for location request
   * @returns {Promise<Object|null>} Location object or null
   */
  async getUserLocation(options = {}) {
    const {
      useCache = true,
      forceRefresh = false,
      showToast = true,
      timeout = LOCATION_CONFIG.GPS_TIMEOUT,
    } = options;

    // Return cached location if valid and not forcing refresh
    if (useCache && !forceRefresh && this.cachedLocation) {
      const cacheAge = Date.now() - (this.cachedLocation.timestamp || 0);
      if (cacheAge < LOCATION_CONFIG.CACHE_TTL) {
        this.currentLocation = this.cachedLocation;
        this.setState(LocationState.USE_CACHE);
        return this.cachedLocation;
      }
    }

    // If there's already a request in flight, wait for it
    if (this.pendingRequest) {
      return this.pendingRequest;
    }

    // Start new request with deduplication
    this.pendingRequest = this._fetchLocation({ timeout, showToast });

    try {
      const result = await this.pendingRequest;
      return result;
    } finally {
      this.pendingRequest = null;
    }
  }

  /**
   * Internal method to fetch location with AbortController
   */
  async _fetchLocation({ timeout, showToast }) {
    // Cancel any previous request
    this.abort();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // Request permission
      this.setState(LocationState.REQUESTING_PERMISSION);

      const permissionResult = await this.withTimeout(
        Location.requestForegroundPermissionsAsync(),
        LOCATION_CONFIG.PERMISSION_TIMEOUT,
        signal
      );

      if (signal.aborted) {
        return this.cachedLocation;
      }

      this.permissionStatus = permissionResult.status;

      if (permissionResult.status !== 'granted') {
        this.setState(LocationState.PERMISSION_DENIED);
        // Return cached location if available
        if (this.cachedLocation) {
          return this.cachedLocation;
        }
        return null;
      }

      // Request GPS location
      this.setState(LocationState.REQUESTING_GPS);

      const gpsLocation = await this.withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        timeout,
        signal
      );

      if (signal.aborted) {
        return this.cachedLocation;
      }

      const location = {
        latitude: gpsLocation.coords.latitude,
        longitude: gpsLocation.coords.longitude,
        timestamp: Date.now(),
        source: 'gps',
        accuracy: gpsLocation.coords.accuracy,
      };

      // Update state and cache
      this.currentLocation = location;
      this.cachedLocation = location;
      this.setState(LocationState.ACQUIRED);

      // Cache for future use (fire and forget)
      this.saveToCache(location).catch(() => {});

      return location;

    } catch (error) {
      if (signal.aborted) {
        console.log('[LocationManager] Request aborted, returning cached location');
        return this.cachedLocation;
      }

      // Handle timeout specifically
      if (error.message === 'Operation timed out' || error.message === 'Location timeout') {
        console.log('[LocationManager] GPS timeout - this is normal on emulators or indoors');
        this.setState(LocationState.USE_CACHE);
      } else {
        console.warn('[LocationManager] Location error:', error.message);
        this.setState(LocationState.ERROR);
      }

      // Return cached location as fallback
      if (this.cachedLocation) {
        console.log('[LocationManager] Using cached location as fallback');
        return this.cachedLocation;
      }

      console.log('[LocationManager] No cached location available');
      return null;
    }
  }

  /**
   * Set custom location (from search or manual input)
   * @param {Object} location - Location with latitude, longitude
   */
  setCustomLocation(location) {
    if (!location?.latitude || !location?.longitude) {
      console.warn('[LocationManager] Invalid custom location:', location);
      return;
    }

    this.currentLocation = {
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      timestamp: Date.now(),
      source: 'custom',
      city: location.city || null,
    };

    this.setState(LocationState.SEARCH_LOCATION);
  }

  /**
   * Enter exploring mode (user is panning the map)
   */
  setExploringMode() {
    this.setState(LocationState.EXPLORING);
  }

  /**
   * Abort any pending location request
   */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Wrap a promise with timeout and abort signal
   */
  async withTimeout(promise, ms, signal) {
    return new Promise((resolve, reject) => {
      // Handle abort
      if (signal?.aborted) {
        reject(new Error('Operation aborted'));
        return;
      }

      const abortHandler = () => {
        reject(new Error('Operation aborted'));
      };
      signal?.addEventListener('abort', abortHandler);

      // Setup timeout
      const timeoutId = setTimeout(() => {
        signal?.removeEventListener('abort', abortHandler);
        reject(new Error('Operation timed out'));
      }, ms);

      // Execute promise
      promise
        .then(result => {
          clearTimeout(timeoutId);
          signal?.removeEventListener('abort', abortHandler);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          signal?.removeEventListener('abort', abortHandler);
          reject(error);
        });
    });
  }

  /**
   * Load location from cache with safe parsing
   */
  async loadFromCache() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.LAST_LOCATION);
      if (cached) {
        try {
          const location = JSON.parse(cached);
          // Validate the cached data
          if (location?.latitude && location?.longitude) {
            this.cachedLocation = {
              ...location,
              source: 'cache',
            };
          }
        } catch (parseError) {
          // Clear corrupt cache
          console.warn('[LocationManager] Corrupt cache, clearing:', parseError);
          await AsyncStorage.removeItem(CACHE_KEYS.LAST_LOCATION);
        }
      }
    } catch (error) {
      console.error('[LocationManager] Load from cache error:', error);
    }
  }

  /**
   * Save location to cache
   */
  async saveToCache(location) {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.LAST_LOCATION,
        JSON.stringify(location)
      );
    } catch (error) {
      console.error('[LocationManager] Save to cache error:', error);
    }
  }

  /**
   * Clear all cached location data
   */
  async clearCache() {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.LAST_LOCATION);
      this.cachedLocation = null;
    } catch (error) {
      console.error('[LocationManager] Clear cache error:', error);
    }
  }

  /**
   * Get current location synchronously (for immediate UI rendering)
   */
  getCurrentLocation() {
    return this.currentLocation || this.cachedLocation;
  }

  /**
   * Check if location is available
   */
  hasLocation() {
    return !!(this.currentLocation || this.cachedLocation);
  }

  /**
   * Check if permission is granted
   */
  hasPermission() {
    return this.permissionStatus === 'granted';
  }

  /**
   * Check if permission was denied
   */
  isPermissionDenied() {
    return this.permissionStatus === 'denied' ||
           this.state === LocationState.PERMISSION_DENIED;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @returns {number} Distance in kilometers
   */
  getDistanceInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  /**
   * Geocode a city name to coordinates
   * @param {string} cityName - Name of the city
   * @returns {Promise<Object|null>} Coordinates or null
   */
  async geocodeCity(cityName) {
    if (!cityName?.trim()) return null;

    // Cancel previous geocoding request
    this.abort();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const cacheKey = `${CACHE_KEYS.GEOCODE_PREFIX}${cityName.toLowerCase().trim()}`;

    try {
      // Check cache first
      const cached = await this.safeGetFromStorage(cacheKey);
      if (cached) {
        return cached;
      }

      // Geocode with timeout
      const locations = await this.withTimeout(
        Location.geocodeAsync(cityName),
        LOCATION_CONFIG.GEOCODE_TIMEOUT,
        signal
      );

      if (signal.aborted) {
        return null;
      }

      if (locations.length > 0) {
        const coords = {
          latitude: locations[0].latitude,
          longitude: locations[0].longitude,
          city: cityName,
          timestamp: Date.now(),
          source: 'geocoding',
        };

        // Cache result (fire and forget)
        AsyncStorage.setItem(cacheKey, JSON.stringify(coords)).catch(() => {});

        return coords;
      }
    } catch (error) {
      if (!signal.aborted) {
        console.error('[LocationManager] Geocode error:', error);
      }
    }

    return null;
  }

  /**
   * Safe async storage get with try-catch
   */
  async safeGetFromStorage(key) {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (parseError) {
          // Clear corrupt cache
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
    return null;
  }
}

// Export singleton instance
const locationManager = new LocationManager();
export default locationManager;
