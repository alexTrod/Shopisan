/**
 * LocationManager Tests
 *
 * Run with: npx jest src/services/__tests__/LocationManager.test.js
 */

import locationManager from '../LocationManager';
import { LocationState, LOCATION_CONFIG } from '../../config/location';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  Accuracy: { High: 4 },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('LocationManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton state
    locationManager.state = LocationState.IDLE;
    locationManager.currentLocation = null;
    locationManager.cachedLocation = null;
    locationManager.pendingRequest = null;
    locationManager.isInitialized = false;
  });

  describe('Initialization', () => {
    it('should load cached location on initialize', async () => {
      const cachedLocation = {
        latitude: 48.8566,
        longitude: 2.3522,
        timestamp: Date.now(),
      };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedLocation));
      Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });

      await locationManager.initialize();

      expect(locationManager.cachedLocation).toBeTruthy();
      expect(locationManager.cachedLocation.latitude).toBe(48.8566);
      expect(locationManager.isInitialized).toBe(true);
    });

    it('should handle corrupt cache gracefully', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid json {{{');
      Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });

      await locationManager.initialize();

      expect(locationManager.cachedLocation).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
      expect(locationManager.isInitialized).toBe(true);
    });
  });

  describe('getUserLocation', () => {
    it('should return cached location when valid and useCache is true', async () => {
      locationManager.cachedLocation = {
        latitude: 48.8566,
        longitude: 2.3522,
        timestamp: Date.now(), // Fresh cache
      };

      const result = await locationManager.getUserLocation({ useCache: true });

      expect(result.latitude).toBe(48.8566);
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should fetch fresh location when cache is expired', async () => {
      locationManager.cachedLocation = {
        latitude: 48.8566,
        longitude: 2.3522,
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours old
      };

      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 50.8503, longitude: 4.3517, accuracy: 10 },
      });

      const result = await locationManager.getUserLocation({ useCache: true });

      expect(result.latitude).toBe(50.8503);
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    });

    it('should handle permission denied', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const result = await locationManager.getUserLocation({ useCache: false });

      expect(result).toBeNull();
      expect(locationManager.state).toBe(LocationState.PERMISSION_DENIED);
    });

    it('should deduplicate concurrent requests', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          coords: { latitude: 50.8503, longitude: 4.3517, accuracy: 10 },
        }), 100))
      );

      // Fire multiple requests concurrently
      const [result1, result2, result3] = await Promise.all([
        locationManager.getUserLocation({ useCache: false }),
        locationManager.getUserLocation({ useCache: false }),
        locationManager.getUserLocation({ useCache: false }),
      ]);

      // All should return the same result
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
      // GPS should only be called once due to deduplication
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    });

    it('should timeout after GPS_TIMEOUT', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Location.getCurrentPositionAsync.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 15000)) // Never resolves in time
      );

      // Use a short timeout for testing
      const result = await locationManager.getUserLocation({
        useCache: false,
        timeout: 100, // 100ms timeout
      });

      // Should return cached location or null on timeout
      expect(locationManager.state).toBe(LocationState.USE_CACHE);
    });
  });

  describe('AbortController', () => {
    it('should cancel previous request when new one starts', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });

      let resolveFirst;
      const firstPromise = new Promise(resolve => { resolveFirst = resolve; });
      Location.getCurrentPositionAsync
        .mockImplementationOnce(() => firstPromise)
        .mockResolvedValueOnce({
          coords: { latitude: 50.8503, longitude: 4.3517, accuracy: 10 },
        });

      // Start first request
      const request1 = locationManager.getUserLocation({ useCache: false, forceRefresh: true });

      // Abort it
      locationManager.abort();

      // First request should be aborted
      expect(locationManager.abortController).toBeNull();
    });
  });

  describe('Geocoding', () => {
    it('should geocode city with caching', async () => {
      Location.geocodeAsync.mockResolvedValue([
        { latitude: 48.8566, longitude: 2.3522 },
      ]);
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await locationManager.geocodeCity('Paris');

      expect(result.latitude).toBe(48.8566);
      expect(result.longitude).toBe(2.3522);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should return cached geocode result', async () => {
      const cached = { latitude: 48.8566, longitude: 2.3522, city: 'Paris' };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cached));

      const result = await locationManager.geocodeCity('Paris');

      expect(result.latitude).toBe(48.8566);
      expect(Location.geocodeAsync).not.toHaveBeenCalled();
    });

    it('should handle geocoding timeout', async () => {
      Location.geocodeAsync.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );
      AsyncStorage.getItem.mockResolvedValue(null);

      // The geocodeCity uses withTimeout internally (GEOCODE_TIMEOUT = 5000ms)
      const result = await locationManager.geocodeCity('NonexistentCity');

      // Should return null on timeout
      expect(result).toBeNull();
    }, 10000); // Increase Jest timeout to 10s to allow for geocode timeout
  });

  describe('Distance Calculation', () => {
    it('should calculate distance between two points', () => {
      // Paris to Brussels ~265km
      const distance = locationManager.getDistanceInKm(
        48.8566, 2.3522,  // Paris
        50.8503, 4.3517   // Brussels
      );

      expect(distance).toBeGreaterThan(250);
      expect(distance).toBeLessThan(280);
    });
  });
});
