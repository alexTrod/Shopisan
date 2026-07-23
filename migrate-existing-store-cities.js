#!/usr/bin/env node

/**
 * One-Time Migration Script
 * Ensures all cities from existing stores are in the cities collection
 * 
 * Usage:
 * node migrate-existing-store-cities.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyByXMG_whb-DXs1OuF1lyr6Ae6ISOKX2lg",
  authDomain: "shopisan-bad76.firebaseapp.com",
  projectId: "shopisan-bad76",
  storageBucket: "shopisan-bad76.firebasestorage.app",
  messagingSenderId: "1029832363092",
  appId: "1:1029832363092:web:2ec1c50117888b1901b1c1",
  measurementId: "G-F2R69DSTEP"
};

// Import the city management utility
// Note: This is a simple implementation since we're in Node.js
async function ensureCityExistsNode(db, cityName, postalCode, latitude, longitude, countryId = 'FR') {
  const { addDoc, getDocs, query, where, updateDoc, arrayUnion } = require('firebase/firestore');
  
  try {
    const citiesRef = collection(db, 'cities');
    
    // Check if city exists
    const qFr = query(citiesRef, where('name.fr', '==', cityName));
    const snapshot = await getDocs(qFr);
    
    if (!snapshot.empty) {
      // City exists, update postal codes if needed
      const cityDoc = snapshot.docs[0];
      const cityData = cityDoc.data();
      
      if (postalCode && !cityData.postal_codes?.includes(postalCode)) {
        await updateDoc(cityDoc.ref, {
          postal_codes: arrayUnion(postalCode),
          updated_at: new Date().toISOString()
        });
        console.log(`  ✅ Updated postal codes for: ${cityName}`);
      } else {
        console.log(`  ℹ️  City already exists: ${cityName}`);
      }
      return true;
    }
    
    // Generate simple geohash
    function generateGeohash(lat, lon, precision = 7) {
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
          if (lon > mid) {
            ch |= (1 << (4 - bit));
            lonRange[0] = mid;
          } else {
            lonRange[1] = mid;
          }
        } else {
          mid = (latRange[0] + latRange[1]) / 2;
          if (lat > mid) {
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
    
    // Create new city
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
      from_migration: true,
      store_count: 1
    };
    
    await addDoc(citiesRef, newCityData);
    console.log(`  ✅ Created new city: ${cityName}`);
    return true;
    
  } catch (error) {
    console.error(`  ❌ Error processing city ${cityName}:`, error.message);
    return false;
  }
}

async function migrateStoreCities() {
  try {
    console.log('🚀 Starting migration of existing store cities...\n');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Get all stores
    const storesRef = collection(db, 'stores');
    const storesSnapshot = await getDocs(storesRef);
    
    console.log(`📊 Found ${storesSnapshot.docs.length} stores\n`);
    
    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    const citiesMap = new Map(); // To avoid processing same city multiple times
    
    for (const storeDoc of storesSnapshot.docs) {
      const store = storeDoc.data();
      processed++;
      
      // Get city information from store
      const cityName = store.cityName || store.address?.[0]?.location?.city?.name;
      const postalCode = store.address?.[0]?.location?.city?.postal_code;
      const latitude = store.latitude || store.address?.[0]?.location?.geopoint?.latitude;
      const longitude = store.longitude || store.address?.[0]?.location?.geopoint?.longitude;
      
      if (!cityName || !latitude || !longitude) {
        console.log(`⚠️  Store ${store.id} (${store.name}) - Missing city or coordinates`);
        errors++;
        continue;
      }
      
      // Skip if we already processed this city
      if (citiesMap.has(cityName)) {
        continue;
      }
      
      console.log(`\n[${processed}/${storesSnapshot.docs.length}] Processing: ${store.name} in ${cityName}`);
      
      const result = await ensureCityExistsNode(db, cityName, postalCode, latitude, longitude, "FR");
      
      if (result) {
        citiesMap.set(cityName, true);
        created++;
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Migration completed!\n');
    console.log(`📊 Statistics:`);
    console.log(`   - Stores processed: ${processed}`);
    console.log(`   - Unique cities found: ${citiesMap.size}`);
    console.log(`   - Cities created/updated: ${created}`);
    console.log(`   - Errors: ${errors}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateStoreCities();
}

module.exports = { migrateStoreCities };

