/**
 * Cities Configuration
 * Centralized configuration for cities-related functionality
 */

export const CITIES_CONFIG = {
  // Cache settings
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  CACHE_KEY: 'cities_cache',
  
  // Search settings
  SEARCH_LIMIT: 10,
  MIN_SEARCH_LENGTH: 2,
  
  // Language settings
  SUPPORTED_LANGUAGES: ['fr', 'en', 'es', 'it'],
  DEFAULT_LANGUAGE: 'en',
  
  // Country settings
  DEFAULT_COUNTRY: 'FR',
  SUPPORTED_COUNTRIES: ['FR', 'BE', 'UK', 'IT', 'GR', 'ES'],
  
  // Data structure settings
  DEFAULT_COORDINATES: {
    latitude: null,
    longitude: null
  },
  
  // Migration settings
  MIGRATION_BATCH_SIZE: 50,
  MIGRATION_RETRY_ATTEMPTS: 3,
  
  // API settings
  API_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  
  // Debug settings
  DEBUG_MODE: __DEV__, // Use React Native's __DEV__ flag
  LOG_LEVEL: __DEV__ ? 'debug' : 'error'
};

export default CITIES_CONFIG;
