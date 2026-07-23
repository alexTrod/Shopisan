import AsyncStorage from '@react-native-async-storage/async-storage';

const CITIES_CACHE_KEY = 'cities_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get cached cities data if it's still valid
 * @returns {Promise<Array|null>} Cached cities array or null if expired/not found
 */
export const getCachedCities = async () => {
  try {
    const cached = await AsyncStorage.getItem(CITIES_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - timestamp < CACHE_DURATION) {
        return data;
      } else {
        console.log('⏰ Cities cache expired, will refresh');
        // Remove expired cache
        await AsyncStorage.removeItem(CITIES_CACHE_KEY);
      }
    }
  } catch (error) {
    console.error('Error reading cities cache:', error);
  }
  return null;
};

/**
 * Cache cities data with timestamp
 * @param {Array} cities - Cities array to cache
 * @returns {Promise<void>}
 */
export const setCachedCities = async (cities) => {
  try {
    const cacheData = {
      data: cities,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(CITIES_CACHE_KEY, JSON.stringify(cacheData));
    console.log('💾 Cities data cached successfully');
  } catch (error) {
    console.error('Error caching cities:', error);
  }
};

/**
 * Clear the cities cache
 * @returns {Promise<void>}
 */
export const clearCitiesCache = async () => {
  try {
    await AsyncStorage.removeItem(CITIES_CACHE_KEY);
    console.log('🗑️ Cities cache cleared');
  } catch (error) {
    console.error('Error clearing cities cache:', error);
  }
};

/**
 * Check if cities cache exists and is valid
 * @returns {Promise<boolean>} True if cache is valid, false otherwise
 */
export const isCitiesCacheValid = async () => {
  try {
    const cached = await AsyncStorage.getItem(CITIES_CACHE_KEY);
    if (cached) {
      const { timestamp } = JSON.parse(cached);
      return Date.now() - timestamp < CACHE_DURATION;
    }
  } catch (error) {
    console.error('Error checking cache validity:', error);
  }
  return false;
};

/**
 * Get cache info (timestamp and data length)
 * @returns {Promise<Object|null>} Cache info or null if no cache
 */
export const getCacheInfo = async () => {
  try {
    const cached = await AsyncStorage.getItem(CITIES_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      return {
        timestamp,
        dataLength: data.length,
        age: Date.now() - timestamp,
        isValid: Date.now() - timestamp < CACHE_DURATION
      };
    }
  } catch (error) {
    console.error('Error getting cache info:', error);
  }
  return null;
};
