/**
 * City Management Utilities
 * Handles automatic city creation and updates when stores are added/modified
 */

import { firestore } from '../../firebaseconfig';
import { collection, addDoc, getDocs, query, where, updateDoc, arrayUnion } from 'firebase/firestore';
import { refreshCitiesCache } from './citiesService';

/**
 * Generate a simple geohash (for basic geolocation)
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} precision - Number of characters in geohash
 * @returns {string} Geohash string
 */
function generateGeohash(latitude, longitude, precision = 7) {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  const latRange = [-90, 90];
  const lonRange = [-180, 180];
  let hash = '';
  let even = true;
  let bit = 0;
  let ch = 0;

  while (hash.length < precision) {
    let mid;
    
    if (even) {
      mid = (lonRange[0] + lonRange[1]) / 2;
      if (longitude > mid) {
        ch |= (1 << (4 - bit));
        lonRange[0] = mid;
      } else {
        lonRange[1] = mid;
      }
    } else {
      mid = (latRange[0] + latRange[1]) / 2;
      if (latitude > mid) {
        ch |= (1 << (4 - bit));
        latRange[0] = mid;
      } else {
        latRange[1] = mid;
      }
    }

    even = !even;

    if (bit < 4) {
      bit++;
    } else {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

/**
 * Ensure a city exists in the database, create if not
 * @param {string} cityName - Name of the city
 * @param {string} postalCode - Postal code
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {string} countryId - Country ID (e.g., 'FR', 'BE', 'UK')
 * @returns {Promise<Object>} Result object with success status and city info
 */
export async function ensureCityExists(cityName, postalCode, latitude, longitude, countryId = 'FR') {
  try {
    if (!cityName || !latitude || !longitude) {
      console.warn('Missing required parameters for ensureCityExists');
      return { success: false, error: 'Missing required parameters' };
    }

    const citiesRef = collection(firestore, 'cities');
    
    // Check if city already exists (check both French and English names)
    const qFr = query(citiesRef, where('name.fr', '==', cityName));
    const qEn = query(citiesRef, where('name.en', '==', cityName));
    
    const [snapshotFr, snapshotEn] = await Promise.all([
      getDocs(qFr),
      getDocs(qEn)
    ]);
    
    const snapshot = !snapshotFr.empty ? snapshotFr : (!snapshotEn.empty ? snapshotEn : null);
    
    if (snapshot && !snapshot.empty) {
      // City exists, update postal codes if needed
      const cityDoc = snapshot.docs[0];
      const cityData = cityDoc.data();
      
      // Update postal codes array if this postal code is new
      if (postalCode && !cityData.postal_codes?.includes(postalCode)) {
        try {
          await updateDoc(cityDoc.ref, {
            postal_codes: arrayUnion(postalCode),
            updated_at: new Date().toISOString()
          });
          console.log(`✅ Updated postal codes for city: ${cityName}`);
        } catch (updateError) {
          console.warn('Could not update postal codes:', updateError);
        }
      }
      
      return { 
        success: true, 
        cityId: cityDoc.id, 
        existed: true,
        message: `City ${cityName} already exists`
      };
    }
    
    // City doesn't exist, create it
    const geohash = generateGeohash(latitude, longitude);
    
    const newCityData = {
      name: {
        fr: cityName,
        en: cityName,
        es: cityName,
        it: cityName
      },
      country_id: countryId,
      coordinates: {
        latitude: Number(latitude),
        longitude: Number(longitude)
      },
      geohash: geohash,
      postal_codes: postalCode ? [postalCode] : [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      migrated: false,
      added_automatically: true,
      store_count: 1
    };
    
    const docRef = await addDoc(citiesRef, newCityData);
    console.log(`✅ New city added to database: ${cityName} (ID: ${docRef.id})`);
    
    // Refresh the cities cache so the new city is immediately available
    try {
      await refreshCitiesCache();
      console.log('✅ Cities cache refreshed');
    } catch (cacheError) {
      console.warn('Could not refresh cache immediately:', cacheError);
      // Cache will be refreshed on next app load or after 24 hours
    }
    
    return { 
      success: true, 
      cityId: docRef.id, 
      existed: false,
      message: `New city ${cityName} created successfully`
    };
    
  } catch (error) {
    console.error('Error in ensureCityExists:', error);
    return { 
      success: false, 
      error: error.message,
      message: `Failed to ensure city exists: ${error.message}`
    };
  }
}

/**
 * Update store count for a city
 * @param {string} cityName - Name of the city
 * @param {number} increment - Number to increment (can be negative)
 * @returns {Promise<boolean>} Success status
 */
export async function updateCityStoreCount(cityName, increment = 1) {
  try {
    const citiesRef = collection(firestore, 'cities');
    const q = query(citiesRef, where('name.fr', '==', cityName));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const cityDoc = snapshot.docs[0];
      const currentCount = cityDoc.data().store_count || 0;
      const newCount = Math.max(0, currentCount + increment);
      
      await updateDoc(cityDoc.ref, {
        store_count: newCount,
        updated_at: new Date().toISOString()
      });
      
      console.log(`✅ Updated store count for ${cityName}: ${newCount}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating city store count:', error);
    return false;
  }
}

/**
 * Get city information by name
 * @param {string} cityName - Name of the city
 * @returns {Promise<Object|null>} City data or null
 */
export async function getCityByName(cityName) {
  try {
    const citiesRef = collection(firestore, 'cities');
    const q = query(citiesRef, where('name.fr', '==', cityName));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting city by name:', error);
    return null;
  }
}

