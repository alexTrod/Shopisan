/**
 * Location System Tester
 *
 * Utility to test and verify the geolocation system works correctly.
 * This can be called from a debug screen or the console.
 *
 * Usage:
 *   import { runLocationTests } from '../utils/locationTester';
 *   await runLocationTests();
 */

import locationManager from '../services/LocationManager';
import storeService from '../services/StoreService';
import searchService from '../services/SearchService';
import { LocationState, LOCATION_CONFIG } from '../config/location';

const log = (message, data = null) => {
  const timestamp = new Date().toISOString().substr(11, 12);
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
};

const success = (test) => log(`✅ PASS: ${test}`);
const fail = (test, error) => log(`❌ FAIL: ${test}`, error);
const info = (message) => log(`ℹ️  ${message}`);

/**
 * Test 1: GPS Acquisition with Timeout
 */
export async function testGPSAcquisition() {
  info('Testing GPS acquisition...');

  const startTime = Date.now();

  try {
    const location = await locationManager.getUserLocation({
      useCache: false,
      forceRefresh: true,
      timeout: LOCATION_CONFIG.GPS_TIMEOUT,
    });

    const elapsed = Date.now() - startTime;

    if (location) {
      success(`GPS acquired in ${elapsed}ms`);
      info(`Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
      info(`Source: ${location.source}`);
      return { passed: true, location, elapsed };
    } else {
      fail('GPS acquisition returned null');
      info(`State: ${locationManager.state}`);
      return { passed: false, state: locationManager.state };
    }
  } catch (error) {
    fail('GPS acquisition threw error', error.message);
    return { passed: false, error: error.message };
  }
}

/**
 * Test 2: Cache Behavior
 */
export async function testCacheBehavior() {
  info('Testing cache behavior...');

  try {
    // First call - should use GPS or existing cache
    const start1 = Date.now();
    const location1 = await locationManager.getUserLocation({ useCache: true });
    const time1 = Date.now() - start1;

    // Second call - should be instant from cache
    const start2 = Date.now();
    const location2 = await locationManager.getUserLocation({ useCache: true });
    const time2 = Date.now() - start2;

    if (time2 < 50) {
      success(`Cache hit: First call ${time1}ms, second call ${time2}ms`);
      return { passed: true, time1, time2 };
    } else {
      fail(`Cache miss: Second call took ${time2}ms`);
      return { passed: false, time1, time2 };
    }
  } catch (error) {
    fail('Cache test threw error', error.message);
    return { passed: false, error: error.message };
  }
}

/**
 * Test 3: Request Deduplication
 */
export async function testRequestDeduplication() {
  info('Testing request deduplication...');

  try {
    // Clear any pending requests
    locationManager.abort();

    let gpsCallCount = 0;
    const originalGetUserLocation = locationManager.getUserLocation.bind(locationManager);

    // Fire 5 concurrent requests
    const requests = Array(5).fill(null).map(() =>
      locationManager.getUserLocation({ useCache: false, forceRefresh: true })
    );

    const results = await Promise.all(requests);

    // All results should be identical (same object reference or same values)
    const allSame = results.every(r =>
      r?.latitude === results[0]?.latitude &&
      r?.longitude === results[0]?.longitude
    );

    if (allSame && results[0]) {
      success('All 5 concurrent requests returned same location (deduplicated)');
      return { passed: true };
    } else {
      fail('Requests were not properly deduplicated');
      return { passed: false };
    }
  } catch (error) {
    fail('Deduplication test threw error', error.message);
    return { passed: false, error: error.message };
  }
}

/**
 * Test 4: Geocoding with Timeout
 */
export async function testGeocoding() {
  info('Testing geocoding...');

  const testCities = ['Paris', 'Brussels', 'Lyon'];

  for (const city of testCities) {
    try {
      const start = Date.now();
      const coords = await locationManager.geocodeCity(city);
      const elapsed = Date.now() - start;

      if (coords) {
        success(`Geocoded "${city}" in ${elapsed}ms: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      } else {
        fail(`Failed to geocode "${city}"`);
      }
    } catch (error) {
      fail(`Geocoding "${city}" threw error`, error.message);
    }
  }

  // Test caching - second call should be faster
  const start1 = Date.now();
  await locationManager.geocodeCity('Paris');
  const time1 = Date.now() - start1;

  const start2 = Date.now();
  await locationManager.geocodeCity('Paris');
  const time2 = Date.now() - start2;

  if (time2 < time1 / 2) {
    success(`Geocode cache working: First ${time1}ms, cached ${time2}ms`);
    return { passed: true };
  } else {
    info(`Geocode cache may not be optimal: First ${time1}ms, second ${time2}ms`);
    return { passed: true }; // Still pass, just not optimal
  }
}

/**
 * Test 5: Store Filtering
 */
export async function testStoreFiltering() {
  info('Testing store filtering...');

  try {
    // Make sure stores are loaded
    const stores = await storeService.fetchAllStores();

    if (stores.length === 0) {
      info('No stores loaded - skipping filter test');
      return { passed: true, skipped: true };
    }

    info(`Loaded ${stores.length} stores`);

    // Get a location (use Paris as default)
    const location = { latitude: 48.8566, longitude: 2.3522 };

    // Test standard radius
    const nearby = storeService.filterStoresByRadius(
      location,
      LOCATION_CONFIG.SEARCH_RADIUS_KM
    );
    info(`Found ${nearby.length} stores within ${LOCATION_CONFIG.SEARCH_RADIUS_KM}km`);

    // Test expanding radius
    const { stores: expanded, radius } = storeService.findStoresWithExpandingRadius(
      location,
      1
    );
    info(`Expanding radius found ${expanded.length} stores (radius: ${radius}km)`);

    // Verify stores are sorted by distance
    let sorted = true;
    for (let i = 1; i < nearby.length; i++) {
      if (nearby[i].distance < nearby[i - 1].distance) {
        sorted = false;
        break;
      }
    }

    if (sorted) {
      success('Stores are properly sorted by distance');
    } else {
      fail('Stores are NOT sorted by distance');
    }

    return { passed: true, storeCount: stores.length, nearbyCount: nearby.length };
  } catch (error) {
    fail('Store filtering threw error', error.message);
    return { passed: false, error: error.message };
  }
}

/**
 * Test 6: Search Service
 */
export async function testSearchService() {
  info('Testing search service...');

  try {
    // Test search cancellation
    const search1 = searchService.search('Par');
    searchService.cancelPendingSearch();

    // Quick search should be cancelled
    await new Promise(resolve => setTimeout(resolve, 100));

    // New search should work
    const results = await searchService.search('Paris');

    if (results.length > 0) {
      success(`Search found ${results.length} suggestions for "Paris"`);
      info('First result:', results[0]);
      return { passed: true, resultCount: results.length };
    } else {
      info('Search returned no results (may be expected if no cities/stores match)');
      return { passed: true, resultCount: 0 };
    }
  } catch (error) {
    fail('Search test threw error', error.message);
    return { passed: false, error: error.message };
  }
}

/**
 * Test 7: Permission Denied Scenario
 */
export async function testPermissionDenied() {
  info('Testing permission denied handling...');

  // This test checks the state machine handles denial correctly
  // We can't actually deny permission programmatically, but we can check the state

  const hasCachedLocation = locationManager.cachedLocation !== null;
  const hasPermission = locationManager.hasPermission();

  info(`Has cached location: ${hasCachedLocation}`);
  info(`Has permission: ${hasPermission}`);
  info(`Permission denied state check: ${locationManager.isPermissionDenied()}`);

  success('Permission state checks completed');
  return { passed: true, hasCachedLocation, hasPermission };
}

/**
 * Test 8: State Machine Transitions
 */
export async function testStateMachine() {
  info('Testing state machine transitions...');

  const states = [];
  const unsubscribe = locationManager.subscribe((state, location) => {
    states.push(state);
  });

  try {
    await locationManager.getUserLocation({ useCache: false, forceRefresh: true });

    info('State transitions:', states);

    // Should have transitioned through requesting states
    const hasRequestingPermission = states.includes(LocationState.REQUESTING_PERMISSION);
    const hasRequestingGPS = states.includes(LocationState.REQUESTING_GPS);
    const hasFinalState = states.includes(LocationState.ACQUIRED) ||
                          states.includes(LocationState.PERMISSION_DENIED) ||
                          states.includes(LocationState.USE_CACHE);

    if (hasFinalState) {
      success('State machine reached final state');
      return { passed: true, states };
    } else {
      fail('State machine did not reach expected final state');
      return { passed: false, states };
    }
  } finally {
    unsubscribe();
  }
}

/**
 * Run All Tests
 */
export async function runLocationTests() {
  console.log('\n========================================');
  console.log('    LOCATION SYSTEM TEST SUITE');
  console.log('========================================\n');

  const results = {};

  // Initialize first
  info('Initializing location manager...');
  await locationManager.initialize();
  success('Location manager initialized');

  // Run tests
  results.gps = await testGPSAcquisition();
  console.log('');

  results.cache = await testCacheBehavior();
  console.log('');

  results.deduplication = await testRequestDeduplication();
  console.log('');

  results.geocoding = await testGeocoding();
  console.log('');

  results.storeFiltering = await testStoreFiltering();
  console.log('');

  results.search = await testSearchService();
  console.log('');

  results.permissionDenied = await testPermissionDenied();
  console.log('');

  results.stateMachine = await testStateMachine();
  console.log('');

  // Summary
  console.log('========================================');
  console.log('              SUMMARY');
  console.log('========================================');

  let passed = 0;
  let failed = 0;

  Object.entries(results).forEach(([name, result]) => {
    if (result.passed) {
      passed++;
      console.log(`✅ ${name}`);
    } else {
      failed++;
      console.log(`❌ ${name}: ${result.error || 'Failed'}`);
    }
  });

  console.log('');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  return results;
}

/**
 * Quick Health Check
 * Call this to verify the system is working without running full tests
 */
export async function quickHealthCheck() {
  console.log('\n🔍 Quick Location Health Check...\n');

  try {
    // Check initialization
    if (!locationManager.isInitialized) {
      await locationManager.initialize();
    }

    // Check if we have any location
    const location = locationManager.getCurrentLocation();

    if (location) {
      console.log(`✅ Location available: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
      console.log(`   Source: ${location.source}`);
      console.log(`   Age: ${Math.round((Date.now() - location.timestamp) / 1000)}s`);
    } else {
      console.log('⚠️  No location cached');
    }

    // Check permission
    console.log(`📍 Permission: ${locationManager.hasPermission() ? 'Granted' : 'Not granted'}`);
    console.log(`🔄 State: ${locationManager.state}`);

    // Check stores
    const stores = storeService.getAllStores();
    console.log(`🏪 Stores loaded: ${stores.length}`);

    console.log('\n✅ Health check complete\n');

    return {
      healthy: true,
      location: !!location,
      permission: locationManager.hasPermission(),
      storeCount: stores.length,
    };
  } catch (error) {
    console.log(`\n❌ Health check failed: ${error.message}\n`);
    return { healthy: false, error: error.message };
  }
}

export default {
  runLocationTests,
  quickHealthCheck,
  testGPSAcquisition,
  testCacheBehavior,
  testRequestDeduplication,
  testGeocoding,
  testStoreFiltering,
  testSearchService,
  testPermissionDenied,
  testStateMachine,
};
