/**
 * Cities Service - Main service for fetching cities from Firestore
 * This replaces the scattered functionality in CitiesReducer.js
 */

import { firestore } from '../../firebaseconfig';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getCachedCities, setCachedCities, clearCitiesCache } from './citiesCache';
import { CITIES_CONFIG } from '../config/citiesConfig';

/**
 * Get all cities with caching
 * @returns {Promise<Array>} Array of cities
 */
export const getAllCities = async () => {
  try {
    // Try to get from cache first
    const cachedCities = await getCachedCities();
    if (cachedCities) {
      return cachedCities;
    }
    
    // Fetch from Firestore
    const citiesRef = collection(firestore, 'cities');
    const snapshot = await getDocs(citiesRef);
    
    const cities = snapshot.docs.map(doc => ({
      id: doc.id,
      ref: doc.id,
      ...doc.data()
    }));
    
    // Cache the results
    await setCachedCities(cities);
    
    return cities;
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
};

/**
 * Search cities by name with caching
 * @param {string} searchTerm - Search term
 * @param {number} limitCount - Maximum number of results
 * @returns {Promise<Array>} Array of matching cities
 */
export const getCitiesForSearch = async (searchTerm, limitCount = CITIES_CONFIG.SEARCH_LIMIT) => {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }
    
    // Get all cities (with caching)
    const allCities = await getAllCities();
    
    // Filter cities by name (case-insensitive)
    const searchLower = searchTerm.toLowerCase();
    
    const filteredCities = allCities
      .filter(city => {
        // Cities have fr/en fields directly, not in a name object
        const frName = city.fr;
        const enName = city.en;
        
        // Check French name
        if (frName && typeof frName === 'string') {
          return frName.toLowerCase().includes(searchLower);
        }
        
        // Check English name
        if (enName && typeof enName === 'string') {
          return enName.toLowerCase().includes(searchLower);
        }
        
        return false;
      })
      .slice(0, limitCount);
    
    return filteredCities;
  } catch (error) {
    console.error('Error searching cities:', error);
    return [];
  }
};

/**
 * Get cities by country
 * @param {string} countryId - Country ID (FR, BE, UK, etc.)
 * @returns {Promise<Array>} Array of cities in the country
 */
export const getCitiesByCountry = async (countryId) => {
  try {
    // Get all cities (with caching)
    const allCities = await getAllCities();
    
    // Filter by country
    const countryCities = allCities.filter(city => 
      city.country_id === countryId
    );
    
    return countryCities;
  } catch (error) {
    console.error('Error fetching cities by country:', error);
    return [];
  }
};

/**
 * Get cities with geolocation data
 * @returns {Promise<Array>} Array of cities with coordinates
 */
export const getCitiesWithLocation = async () => {
  try {
    const allCities = await getAllCities();
    
    return allCities.filter(city => 
      city.coordinates && 
      city.coordinates.latitude && 
      city.coordinates.longitude
    );
  } catch (error) {
    console.error('Error fetching cities with location:', error);
    return [];
  }
};

/**
 * Get city by ID
 * @param {string} cityId - City ID
 * @returns {Promise<Object|null>} City object or null
 */
export const getCityById = async (cityId) => {
  try {
    const allCities = await getAllCities();
    return allCities.find(city => city.id === cityId) || null;
  } catch (error) {
    console.error('Error fetching city by ID:', error);
    return null;
  }
};

/**
 * Get localized city name
 * @param {Object} city - City object
 * @param {string} locale - Locale (fr, en, es, it)
 * @returns {string} Localized city name
 */
export const getLocalizedCityName = (city, locale = 'en') => {
  try {
    if (!city || !city.name) return 'Unknown';
    
    if (typeof city.name === 'object') {
      return city.name[locale] || city.name.en || city.name.fr || 'Unknown';
    } else {
      // Fallback for old structure
      return city.name;
    }
  } catch (error) {
    console.error('Error getting localized city name:', error);
    return 'Unknown';
  }
};

/**
 * Refresh cities cache
 * @returns {Promise<void>}
 */
export const refreshCitiesCache = async () => {
  try {
    await clearCitiesCache();
    await getAllCities(); // This will fetch and cache fresh data
    console.log('✅ Cities cache refreshed');
  } catch (error) {
    console.error('Error refreshing cities cache:', error);
  }
};

/**
 * Get cities statistics
 * @returns {Promise<Object>} Statistics about cities
 */
export const getCitiesStats = async () => {
  try {
    const allCities = await getAllCities();
    
    const stats = {
      total: allCities.length,
      byCountry: {},
      withLocation: 0,
      active: 0
    };
    
    allCities.forEach(city => {
      // Count by country
      const country = city.country_id || 'Unknown';
      stats.byCountry[country] = (stats.byCountry[country] || 0) + 1;
      
      // Count with location
      if (city.coordinates && city.coordinates.latitude && city.coordinates.longitude) {
        stats.withLocation++;
      }
      
      // Count active
      if (city.is_active !== false) {
        stats.active++;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting cities stats:', error);
    return { total: 0, byCountry: {}, withLocation: 0, active: 0 };
  }
};
