import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { setCustomLocation } from '../Redux/Actions/LocationActions';

// Cache keys
const CACHE_KEYS = {
  LAST_LOCATION: '@last_location',
  CACHE_TIMESTAMP: '@location_cache_timestamp'
};

// Cache duration (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

class LocationService {
  constructor() {
    this.cachedLocation = null;
    this.isInitialized = false;
  }

  /**
   * Initialize location service and load cached location
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await this.loadCachedLocation();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize location service:', error);
    }
  }

  /**
   * Get user location with fallback strategy
   * @param {Object} options - Location options
   * @returns {Promise<Object>} Location object with coordinates
   */
  async getUserLocation(options = {}) {
    const {
      useCache = true,
      showToast = true,
      accuracy = Location.Accuracy.High,
      timeout = 15000
    } = options;

    try {
      // Check cache first if enabled
      if (useCache && this.cachedLocation) {
        const cacheAge = Date.now() - this.cachedLocation.timestamp;
        if (cacheAge < CACHE_DURATION) {
          console.log('Using cached location');
          return this.cachedLocation;
        }
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        if (showToast) {
          Toast.show({
            type: 'info',
            text1: 'Location Permission Required',
            text2: 'Please enable location services to find nearby stores.',
            position: 'bottom',
            visibilityTime: 4000,
          });
        }
        
        // Return null instead of default location
        console.log('Location permission not granted');
        return null;
      }

      // Get current location with timeout
      const location = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Location timeout')), timeout)
        )
      ]);

      const userLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
        source: 'gps'
      };

      // Cache the location
      await this.cacheLocation(userLocation);
      
      return userLocation;

    } catch (error) {
      console.error('Error getting user location:', error);
      
      if (showToast) {
        Toast.show({
          type: 'error',
          text1: 'Location Error',
          text2: 'Unable to get your location. Use "Nearby" button to find stores.',
          position: 'bottom',
          visibilityTime: 3000,
        });
      }

      // Return cached location if available, otherwise null
      if (this.cachedLocation) {
        console.log('Using cached location as fallback');
        return this.cachedLocation;
      }

      // Return null instead of default location
      console.log('No location available');
      return null;
    }
  }

  /**
   * Get stores with expanding radius until stores are found
   * @param {Array} stores - All available stores
   * @param {Object} userLocation - User's location
   * @param {number} maxRadius - Maximum search radius in km
   * @returns {Array} Filtered stores
   */
  getStoresWithExpandingRadius(stores, userLocation, maxRadius = 500) {
    if (!userLocation || !stores.length) return stores;

    // Progressive radius steps up to 500km
    const radiusSteps = [6, 15, 30, 50, 75, 100, 150, 200, 300, 400, 500];
    const validSteps = radiusSteps.filter(step => step <= maxRadius);

    for (const radius of validSteps) {
      const nearbyStores = this.filterStoresByRadius(stores, userLocation, radius);
      
      if (nearbyStores.length > 0) {
        return nearbyStores;
      }
    }

    // If no stores found within maxRadius, return all stores
    console.log('No stores found within radius, returning all stores');
    return stores;
  }

  /**
   * Filter stores by radius
   * @param {Array} stores - All stores
   * @param {Object} userLocation - User's location
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Array} Filtered stores within radius
   */
  filterStoresByRadius(stores, userLocation, radiusKm) {
    return stores
      .map((store) => {
        const geopoint = store?.address?.[0]?.location?.geopoint;
        if (!geopoint) return null;

        const storeLat = Number(geopoint.latitude);
        const storeLng = Number(geopoint.longitude);

        if (isNaN(storeLat) || isNaN(storeLng)) return null;

        const distance = this.getDistanceInKm(
          userLocation.latitude,
          userLocation.longitude,
          storeLat,
          storeLng
        );

        if (distance > radiusKm) return null;

        return {
          ...store,
          latitude: storeLat,
          longitude: storeLng,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        };
      })
      .filter((store) => store !== null)
      .sort((a, b) => a.distance - b.distance); // Sort by distance
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Distance in kilometers
   */
  getDistanceInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
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
   * Cache location to AsyncStorage
   * @param {Object} location - Location to cache
   */
  async cacheLocation(location) {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.LAST_LOCATION, JSON.stringify(location));
      await AsyncStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
      this.cachedLocation = location;
    } catch (error) {
      console.error('Failed to cache location:', error);
    }
  }

  /**
   * Load cached location from AsyncStorage
   */
  async loadCachedLocation() {
    try {
      const [cachedLocationStr, timestampStr] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.LAST_LOCATION),
        AsyncStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP)
      ]);

      if (cachedLocationStr && timestampStr) {
        const location = JSON.parse(cachedLocationStr);
        const timestamp = parseInt(timestampStr);
        
        // Check if cache is still valid
        const cacheAge = Date.now() - timestamp;
        if (cacheAge < CACHE_DURATION) {
          this.cachedLocation = { ...location, timestamp };
          console.log('Loaded cached location:', location);
        } else {
          console.log('Cached location expired, clearing cache');
          await this.clearCache();
        }
      }
    } catch (error) {
      console.error('Failed to load cached location:', error);
    }
  }

  /**
   * Clear location cache
   */
  async clearCache() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.LAST_LOCATION),
        AsyncStorage.removeItem(CACHE_KEYS.CACHE_TIMESTAMP)
      ]);
      this.cachedLocation = null;
    } catch (error) {
      console.error('Failed to clear location cache:', error);
    }
  }

  /**
   * Update Redux store with location
   * @param {Object} dispatch - Redux dispatch function
   * @param {Object} location - Location to set
   */
  updateReduxLocation(dispatch, location) {
    dispatch(setCustomLocation({
      latitude: location.latitude,
      longitude: location.longitude
    }));
  }

  /**
   * Get stores in Brussels area as fallback
   * @param {Array} stores - All available stores
   * @returns {Array} Stores in Brussels area
   */
  // Removed getBrusselsStores - no longer using Brussels as default

  /**
   * Get location for geocoding (city search)
   * @param {string} cityName - Name of the city
   * @returns {Promise<Object|null>} Location coordinates or null
   */
  async geocodeCity(cityName) {
    try {
      const locations = await Location.geocodeAsync(cityName);
      if (locations.length > 0) {
        return {
          latitude: locations[0].latitude,
          longitude: locations[0].longitude,
          city: cityName,
          timestamp: Date.now(),
          source: 'geocoding'
        };
      }
    } catch (error) {
      console.error('Error geocoding city:', error);
    }
    return null;
  }
}

// Export singleton instance
export default new LocationService();
