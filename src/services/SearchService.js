/**
 * SearchService - Singleton service for search functionality
 *
 * Key features:
 * - Debounced search with AbortController
 * - Parallel city/store suggestions
 * - Auto-cancels stale requests
 * - Geocoding with timeout and caching
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCATION_CONFIG, CACHE_KEYS } from '../config/location';
import { getCitiesForSearch, getAllCities } from '../utils/citiesService';
import storeService from './StoreService';

class SearchService {
  constructor() {
    this.abortController = null;
    this.debounceTimer = null;
    this.geocodeCache = new Map(); // In-memory geocoding cache
    this.listeners = new Set();
    this.lastQuery = '';
    this.lastSuggestions = [];
  }

  /**
   * Subscribe to search results
   * @param {Function} listener - Callback function (suggestions, loading) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(suggestions, loading) {
    this.listeners.forEach(listener => {
      try {
        listener(suggestions, loading);
      } catch (e) {
        console.error('[SearchService] Listener error:', e);
      }
    });
  }

  /**
   * Search for suggestions (debounced with cancellation)
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of suggestions
   */
  async search(query) {
    const trimmedQuery = query?.trim() || '';

    // Clear if empty
    if (trimmedQuery.length < LOCATION_CONFIG.MIN_SEARCH_LENGTH) {
      this.cancelPendingSearch();
      this.lastSuggestions = [];
      this.notifyListeners([], false);
      return [];
    }

    // Return cached results if same query
    if (trimmedQuery === this.lastQuery && this.lastSuggestions.length > 0) {
      return this.lastSuggestions;
    }

    // Cancel any pending search
    this.cancelPendingSearch();

    // Create new abort controller
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Notify loading state
    this.notifyListeners([], true);

    return new Promise((resolve) => {
      // Debounce
      this.debounceTimer = setTimeout(async () => {
        if (signal.aborted) {
          resolve([]);
          return;
        }

        try {
          const suggestions = await this._fetchSuggestions(trimmedQuery, signal);

          if (signal.aborted) {
            resolve([]);
            return;
          }

          this.lastQuery = trimmedQuery;
          this.lastSuggestions = suggestions;
          this.notifyListeners(suggestions, false);
          resolve(suggestions);

        } catch (error) {
          if (!signal.aborted) {
            console.error('[SearchService] Search error:', error);
          }
          this.notifyListeners([], false);
          resolve([]);
        }
      }, LOCATION_CONFIG.SEARCH_DEBOUNCE_MS);
    });
  }

  /**
   * Internal method to fetch suggestions in parallel
   */
  async _fetchSuggestions(query, signal) {
    // Fetch cities and stores in parallel
    const [citySuggestions, storeSuggestions] = await Promise.all([
      this._fetchCitySuggestions(query, signal),
      this._fetchStoreSuggestions(query),
    ]);

    if (signal.aborted) {
      return [];
    }

    // Format and combine suggestions
    const formattedCities = citySuggestions.map(city => ({
      label: city.name || city,
      type: 'city',
      source: city.source || 'firestore',
      coordinates: city.latitude && city.longitude ? {
        latitude: city.latitude,
        longitude: city.longitude,
      } : null,
    }));

    const formattedStores = storeSuggestions.map(store => ({
      label: store.name,
      type: 'store',
      id: store.id,
      source: 'local_stores',
      location: store.location,
    }));

    // Cities first, then stores
    return [...formattedCities, ...formattedStores]
      .slice(0, LOCATION_CONFIG.MAX_SUGGESTIONS);
  }

  /**
   * Fetch city suggestions from Firestore
   */
  async _fetchCitySuggestions(query, signal) {
    if (!query || query.length < 2) return [];

    try {
      // First try Firestore cities
      const cities = await getCitiesForSearch(query, 10);

      if (signal.aborted) return [];

      if (cities.length > 0) {
        return cities.map(city => ({
          name: city.fr || city.en || 'Unknown City',
          source: 'firestore',
          latitude: city.latitude,
          longitude: city.longitude,
          country_id: city.country_id,
        }));
      }

      // Fallback: aggressive search on all cities
      const allCities = await getAllCities();

      if (signal.aborted) return [];

      if (allCities.length > 0) {
        const searchLower = query.toLowerCase();
        const matches = allCities
          .filter(city => {
            const frName = city.fr;
            const enName = city.en;
            return (frName && frName.toLowerCase().startsWith(searchLower)) ||
                   (enName && enName.toLowerCase().startsWith(searchLower));
          })
          .slice(0, 10)
          .map(city => ({
            name: city.fr || city.en || 'Unknown City',
            source: 'firestore_aggressive',
            latitude: city.latitude,
            longitude: city.longitude,
            country_id: city.country_id,
          }));

        if (matches.length > 0) {
          return matches;
        }
      }

      // Last resort: hardcoded fallback cities
      return this._getFallbackCities(query);

    } catch (error) {
      if (!signal.aborted) {
        console.error('[SearchService] City fetch error:', error);
      }
      return this._getFallbackCities(query);
    }
  }

  /**
   * Fallback cities for when Firestore is unavailable
   */
  _getFallbackCities(query) {
    const fallbackCities = [
      'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice',
      'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
      'Brussels', 'Antwerp', 'Ghent', 'Bruges', 'Liege',
    ];

    return fallbackCities
      .filter(city => city.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(city => ({
        name: city,
        source: 'fallback',
        latitude: null,
        longitude: null,
      }));
  }

  /**
   * Fetch store suggestions
   */
  _fetchStoreSuggestions(query) {
    return storeService.searchStoresByName(query, 10);
  }

  /**
   * Geocode a city name to coordinates with timeout and caching
   * @param {string} cityName - Name of the city
   * @returns {Promise<Object|null>} Coordinates or null
   */
  async geocodeCity(cityName) {
    if (!cityName?.trim()) return null;

    const normalizedName = cityName.toLowerCase().trim();
    const cacheKey = `${CACHE_KEYS.GEOCODE_PREFIX}${normalizedName}`;

    // Check in-memory cache first
    if (this.geocodeCache.has(normalizedName)) {
      return this.geocodeCache.get(normalizedName);
    }

    // Check AsyncStorage cache
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        try {
          const coords = JSON.parse(cached);
          this.geocodeCache.set(normalizedName, coords);
          return coords;
        } catch (e) {
          await AsyncStorage.removeItem(cacheKey);
        }
      }
    } catch (e) {
      // Continue to geocode
    }

    // Cancel any previous geocoding request
    this.cancelPendingSearch();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // Geocode with timeout
      const locations = await this._withTimeout(
        Location.geocodeAsync(cityName),
        LOCATION_CONFIG.GEOCODE_TIMEOUT,
        signal
      );

      if (signal.aborted || !locations || locations.length === 0) {
        return null;
      }

      const coords = {
        latitude: locations[0].latitude,
        longitude: locations[0].longitude,
        city: cityName,
        timestamp: Date.now(),
      };

      // Cache result
      this.geocodeCache.set(normalizedName, coords);
      AsyncStorage.setItem(cacheKey, JSON.stringify(coords)).catch(() => {});

      return coords;

    } catch (error) {
      if (!signal.aborted) {
        console.error('[SearchService] Geocode error:', error);
      }
      return null;
    }
  }

  /**
   * Wrap promise with timeout
   */
  async _withTimeout(promise, ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Operation aborted'));
        return;
      }

      const abortHandler = () => {
        reject(new Error('Operation aborted'));
      };
      signal?.addEventListener('abort', abortHandler);

      const timeoutId = setTimeout(() => {
        signal?.removeEventListener('abort', abortHandler);
        reject(new Error('Operation timed out'));
      }, ms);

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
   * Cancel any pending search
   */
  cancelPendingSearch() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Clear search state
   */
  clear() {
    this.cancelPendingSearch();
    this.lastQuery = '';
    this.lastSuggestions = [];
    this.notifyListeners([], false);
  }

  /**
   * Get last suggestions (for immediate UI rendering)
   */
  getLastSuggestions() {
    return this.lastSuggestions;
  }
}

// Export singleton instance
const searchService = new SearchService();
export default searchService;
