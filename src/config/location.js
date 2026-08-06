/**
 * Location and Search Configuration
 * Centralized configuration for all location-related features
 */

export const LOCATION_CONFIG = {
  // GPS and Location Timeouts
  GPS_TIMEOUT: 8000, // 8 seconds for GPS acquisition
  GEOCODE_TIMEOUT: 5000, // 5 seconds for geocoding
  PERMISSION_TIMEOUT: 10000, // 10 seconds for permission request

  // Cache Configuration
  CACHE_TTL: 2 * 60 * 60 * 1000, // 2 hours for location cache (shorter to avoid stale location from different city)
  STORE_CACHE_TTL: 30 * 60 * 1000, // 30 minutes for store cache
  GEOCODE_CACHE_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days for geocoding cache

  // Search Configuration
  SEARCH_DEBOUNCE_MS: 300, // 300ms debounce for search
  MIN_SEARCH_LENGTH: 2, // Minimum characters to trigger search
  MAX_SUGGESTIONS: 15, // Maximum number of suggestions to show

  // Radius Configuration (in kilometers)
  SEARCH_RADIUS_KM: 20, // Standard search radius - consistent everywhere

  // Expanding radius steps for finding stores
  RADIUS_STEPS: [5, 10, 20, 30, 50, 75, 100, 150, 200],

  // Maximum radius for expanding search
  MAX_RADIUS_KM: 500,

  // Default location (Brussels) - used as absolute last resort
  DEFAULT_LOCATION: {
    latitude: 50.8503,
    longitude: 4.3517,
    city: "Brussels",
  },

  // Map refresh threshold - how far user must pan before refreshing stores
  REFRESH_DISTANCE_KM: 0.5,
};

// Location state machine states
export const LocationState = {
  IDLE: "idle",
  REQUESTING_PERMISSION: "requesting_permission",
  PERMISSION_DENIED: "permission_denied",
  REQUESTING_GPS: "requesting_gps",
  ACQUIRED: "acquired",
  SEARCH_LOCATION: "search_location",
  EXPLORING: "exploring",
  USE_CACHE: "use_cache",
  ERROR: "error",
};

// Cache keys for AsyncStorage
export const CACHE_KEYS = {
  LAST_LOCATION: "@location_last",
  LOCATION_TIMESTAMP: "@location_timestamp",
  // Bumped to _v2 when the approval gate was removed. The cache-first path in
  // StoreService returns a cache younger than STORE_CACHE_TTL without a
  // background refresh, so upgrading users would have kept seeing the old
  // approved-only list for up to 30 minutes on a fresh key.
  STORES_CACHE: "@stores_cache_v2",
  GEOCODE_PREFIX: "@geocode_",
};

// Feature flag for gradual migration
export const USE_NEW_LOCATION_SYSTEM = true;

export default LOCATION_CONFIG;
