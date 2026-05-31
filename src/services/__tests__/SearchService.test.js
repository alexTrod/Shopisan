/**
 * SearchService Tests
 *
 * Run with: npx jest src/services/__tests__/SearchService.test.js
 */

// Mock config before importing SearchService
jest.mock("../../config/location", () => ({
  LOCATION_CONFIG: {
    SEARCH_DEBOUNCE_MS: 300,
    MIN_SEARCH_LENGTH: 2,
    MAX_SUGGESTIONS: 15,
    GEOCODE_TIMEOUT: 5000,
  },
  CACHE_KEYS: {
    GEOCODE_PREFIX: "@geocode_",
  },
}));

// Mock expo-location
jest.mock("expo-location", () => ({
  geocodeAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock citiesService
jest.mock("../../utils/citiesService", () => ({
  getCitiesForSearch: jest.fn(),
  getAllCities: jest.fn(),
}));

// Mock StoreService
jest.mock("../StoreService", () => ({
  __esModule: true,
  default: {
    searchStoresByName: jest.fn(),
  },
}));

import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCitiesForSearch, getAllCities } from "../../utils/citiesService";
import storeService from "../StoreService";
import searchService from "../SearchService";

describe("SearchService", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    console.error = jest.fn();
    // Reset service internal state
    searchService.geocodeCache.clear();
    searchService.lastQuery = "";
    searchService.lastSuggestions = [];
    searchService.listeners.clear();
    if (searchService.debounceTimer) {
      clearTimeout(searchService.debounceTimer);
      searchService.debounceTimer = null;
    }
    if (searchService.abortController) {
      searchService.abortController.abort();
      searchService.abortController = null;
    }
  });

  afterEach(() => {
    jest.useRealTimers();
    console.error = originalConsoleError;
  });

  describe("Subscription", () => {
    it("should subscribe and receive notifications", () => {
      const listener = jest.fn();

      searchService.subscribe(listener);
      searchService.notifyListeners([], false);

      expect(listener).toHaveBeenCalledWith([], false);
    });

    it("should return unsubscribe function", () => {
      const listener = jest.fn();

      const unsubscribe = searchService.subscribe(listener);
      unsubscribe();
      searchService.notifyListeners([], false);

      expect(listener).not.toHaveBeenCalled();
    });

    it("should handle listener errors without breaking other listeners", () => {
      const errorListener = jest.fn(() => {
        throw new Error("Listener error");
      });
      const goodListener = jest.fn();

      searchService.subscribe(errorListener);
      searchService.subscribe(goodListener);
      searchService.notifyListeners(["test"], true);

      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalledWith(["test"], true);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("Search - Debouncing", () => {
    it("should debounce search calls with 300ms delay", async () => {
      getCitiesForSearch.mockResolvedValue([]);
      storeService.searchStoresByName.mockResolvedValue([]);

      const searchPromise = searchService.search("Paris");

      // Should not have fetched yet (debounce pending)
      expect(getCitiesForSearch).not.toHaveBeenCalled();

      // Advance past debounce time
      jest.advanceTimersByTime(300);
      await Promise.resolve();

      const result = await searchPromise;

      expect(getCitiesForSearch).toHaveBeenCalledWith("Paris", 10);
    });

    it("should cancel previous request on new search", async () => {
      getCitiesForSearch.mockResolvedValue([]);
      storeService.searchStoresByName.mockResolvedValue([]);

      // Start first search
      searchService.search("Par");

      // Advance 100ms (before debounce fires)
      jest.advanceTimersByTime(100);

      // Start new search (should cancel first)
      searchService.search("Paris");

      // Advance past debounce
      jest.advanceTimersByTime(300);
      await Promise.resolve();

      // Only second search should have been executed
      expect(getCitiesForSearch).toHaveBeenCalledTimes(1);
      expect(getCitiesForSearch).toHaveBeenCalledWith("Paris", 10);
    });
  });

  describe("Search - Caching", () => {
    it("should return cached results for same query", async () => {
      const mockCities = [
        { fr: "Paris", latitude: 48.8566, longitude: 2.3522 },
      ];
      getCitiesForSearch.mockResolvedValue(mockCities);
      storeService.searchStoresByName.mockResolvedValue([]);

      // First search
      const promise1 = searchService.search("Paris");
      jest.advanceTimersByTime(300);
      await promise1;

      // Reset mocks
      getCitiesForSearch.mockClear();

      // Same query - should use cache
      const result = await searchService.search("Paris");

      expect(getCitiesForSearch).not.toHaveBeenCalled();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Search - Query Validation", () => {
    it("should clear suggestions when query < MIN_SEARCH_LENGTH chars", async () => {
      const listener = jest.fn();
      searchService.subscribe(listener);

      const result = await searchService.search("P");

      expect(result).toEqual([]);
      expect(listener).toHaveBeenCalledWith([], false);
    });

    it("should clear suggestions when query is empty", async () => {
      const result = await searchService.search("");

      expect(result).toEqual([]);
    });

    it("should trim query whitespace", async () => {
      const result = await searchService.search("  ");

      expect(result).toEqual([]);
    });
  });

  describe("Search - Parallel Fetching", () => {
    it("should fetch city and store suggestions in parallel", async () => {
      const mockCities = [
        { fr: "Paris", latitude: 48.8566, longitude: 2.3522 },
      ];
      const mockStores = [
        { id: "1", name: "Paris Store", location: { lat: 48.85, lng: 2.35 } },
      ];

      getCitiesForSearch.mockResolvedValue(mockCities);
      storeService.searchStoresByName.mockResolvedValue(mockStores);

      const promise = searchService.search("Paris");
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(getCitiesForSearch).toHaveBeenCalled();
      expect(storeService.searchStoresByName).toHaveBeenCalled();
      expect(result.length).toBe(2); // 1 city + 1 store
    });

    it("should limit results to MAX_SUGGESTIONS (15)", async () => {
      const mockCities = Array.from({ length: 10 }, (_, i) => ({
        fr: `City ${i}`,
        latitude: 48 + i,
        longitude: 2 + i,
      }));
      const mockStores = Array.from({ length: 10 }, (_, i) => ({
        id: `store-${i}`,
        name: `Store ${i}`,
        location: { lat: 48 + i, lng: 2 + i },
      }));

      getCitiesForSearch.mockResolvedValue(mockCities);
      storeService.searchStoresByName.mockResolvedValue(mockStores);

      const promise = searchService.search("test");
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.length).toBe(15); // MAX_SUGGESTIONS
    });
  });

  describe("City Suggestions", () => {
    it("should fetch from Firestore and format with type: city", async () => {
      const mockCities = [
        {
          fr: "Paris",
          en: "Paris",
          latitude: 48.8566,
          longitude: 2.3522,
          country_id: "FR",
        },
      ];

      getCitiesForSearch.mockResolvedValue(mockCities);
      storeService.searchStoresByName.mockResolvedValue([]);

      const promise = searchService.search("Paris");
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result[0]).toEqual({
        label: "Paris",
        type: "city",
        source: "firestore",
        coordinates: {
          latitude: 48.8566,
          longitude: 2.3522,
        },
      });
    });

    it("should fallback to aggressive search when getCitiesForSearch returns empty", async () => {
      getCitiesForSearch.mockResolvedValue([]);
      getAllCities.mockResolvedValue([
        { fr: "Paris", en: "Paris", latitude: 48.8566, longitude: 2.3522 },
        { fr: "Lyon", en: "Lyon", latitude: 45.764, longitude: 4.8357 },
      ]);
      storeService.searchStoresByName.mockResolvedValue([]);

      const promise = searchService.search("Par");
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(getAllCities).toHaveBeenCalled();
      expect(result[0]).toMatchObject({
        label: "Paris",
        type: "city",
        source: "firestore_aggressive",
      });
    });

    it("should use fallback cities when all Firestore methods fail", async () => {
      getCitiesForSearch.mockResolvedValue([]);
      getAllCities.mockResolvedValue([]);
      storeService.searchStoresByName.mockResolvedValue([]);

      const promise = searchService.search("Paris");
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result[0]).toMatchObject({
        label: "Paris",
        type: "city",
        source: "fallback",
        coordinates: null,
      });
    });

    it("should use fallback cities on Firestore error", async () => {
      getCitiesForSearch.mockRejectedValue(new Error("Firestore error"));
      storeService.searchStoresByName.mockResolvedValue([]);

      const promise = searchService.search("Lyon");
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result[0]).toMatchObject({
        label: "Lyon",
        type: "city",
        source: "fallback",
      });
    });
  });

  describe("Store Suggestions", () => {
    it("should format store results with type: store", async () => {
      getCitiesForSearch.mockResolvedValue([]);
      getAllCities.mockResolvedValue([]); // No city matches, only stores
      storeService.searchStoresByName.mockResolvedValue([
        {
          id: "store-1",
          name: "Paris Boutique",
          location: { latitude: 48.85, longitude: 2.35 },
        },
      ]);

      const promise = searchService.search("xyz"); // Use non-matching query for fallback cities
      jest.advanceTimersByTime(300);
      const result = await promise;

      // Find store result (after any city fallbacks)
      const storeResult = result.find((r) => r.type === "store");
      expect(storeResult).toEqual({
        label: "Paris Boutique",
        type: "store",
        id: "store-1",
        source: "local_stores",
        location: { latitude: 48.85, longitude: 2.35 },
      });
    });
  });

  describe("Geocoding", () => {
    it("should check in-memory cache first", async () => {
      // Manually set in-memory cache
      searchService.geocodeCache.set("paris", {
        latitude: 48.8566,
        longitude: 2.3522,
        city: "Paris",
      });

      const result = await searchService.geocodeCity("Paris");

      expect(result.latitude).toBe(48.8566);
      expect(Location.geocodeAsync).not.toHaveBeenCalled();
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it("should check AsyncStorage cache when not in memory", async () => {
      const cached = JSON.stringify({
        latitude: 48.8566,
        longitude: 2.3522,
        city: "Paris",
      });
      AsyncStorage.getItem.mockResolvedValue(cached);

      const result = await searchService.geocodeCity("Paris");

      expect(result.latitude).toBe(48.8566);
      expect(Location.geocodeAsync).not.toHaveBeenCalled();
    });

    it("should call expo-location geocodeAsync when not cached", async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      Location.geocodeAsync.mockResolvedValue([
        { latitude: 48.8566, longitude: 2.3522 },
      ]);

      const result = await searchService.geocodeCity("Paris");

      expect(result.latitude).toBe(48.8566);
      expect(result.longitude).toBe(2.3522);
      expect(Location.geocodeAsync).toHaveBeenCalledWith("Paris");
    });

    it("should cache successful geocode results", async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      Location.geocodeAsync.mockResolvedValue([
        { latitude: 48.8566, longitude: 2.3522 },
      ]);

      await searchService.geocodeCity("Paris");

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(searchService.geocodeCache.has("paris")).toBe(true);
    });

    it("should timeout after GEOCODE_TIMEOUT (5s)", async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      Location.geocodeAsync.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)),
      );

      const resultPromise = searchService.geocodeCity("SlowCity");

      // Advance past timeout
      jest.advanceTimersByTime(5100);
      await jest.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBeNull();
    });

    it("should return null on geocoding error", async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      Location.geocodeAsync.mockRejectedValue(new Error("Geocode failed"));

      const result = await searchService.geocodeCity("BadCity");

      expect(result).toBeNull();
    });

    it("should return null for empty city name", async () => {
      const result = await searchService.geocodeCity("");

      expect(result).toBeNull();
      expect(Location.geocodeAsync).not.toHaveBeenCalled();
    });

    it("should handle corrupt AsyncStorage cache", async () => {
      AsyncStorage.getItem.mockResolvedValue("invalid json {{{");
      Location.geocodeAsync.mockResolvedValue([
        { latitude: 48.8566, longitude: 2.3522 },
      ]);

      const result = await searchService.geocodeCity("Paris");

      expect(AsyncStorage.removeItem).toHaveBeenCalled();
      expect(result.latitude).toBe(48.8566);
    });
  });

  describe("cancelPendingSearch", () => {
    it("should clear debounce timer", async () => {
      getCitiesForSearch.mockResolvedValue([]);
      storeService.searchStoresByName.mockResolvedValue([]);

      searchService.search("Paris");
      searchService.cancelPendingSearch();

      jest.advanceTimersByTime(300);
      await Promise.resolve();

      expect(getCitiesForSearch).not.toHaveBeenCalled();
    });

    it("should abort pending request", () => {
      searchService.abortController = new AbortController();
      const abortSpy = jest.spyOn(searchService.abortController, "abort");

      searchService.cancelPendingSearch();

      expect(abortSpy).toHaveBeenCalled();
      expect(searchService.abortController).toBeNull();
    });
  });

  describe("clear", () => {
    it("should reset all state and notify listeners", async () => {
      const listener = jest.fn();
      searchService.subscribe(listener);
      searchService.lastQuery = "test";
      searchService.lastSuggestions = [{ label: "test" }];

      searchService.clear();

      expect(searchService.lastQuery).toBe("");
      expect(searchService.lastSuggestions).toEqual([]);
      expect(listener).toHaveBeenCalledWith([], false);
    });
  });

  describe("getLastSuggestions", () => {
    it("should return last suggestions", () => {
      searchService.lastSuggestions = [{ label: "Paris" }];

      const result = searchService.getLastSuggestions();

      expect(result).toEqual([{ label: "Paris" }]);
    });
  });
});
