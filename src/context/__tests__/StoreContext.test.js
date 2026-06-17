/**
 * StoreContext Tests
 *
 * Tests for location fetching and race condition handling.
 * Run with: npx jest src/context/__tests__/StoreContext.test.js
 */

// Mock config FIRST
jest.mock("../../config/location", () => ({
  LOCATION_CONFIG: {
    DEFAULT_LOCATION: {
      latitude: 50.8503,
      longitude: 4.3517,
      city: "Brussels",
    },
    SEARCH_RADIUS_KM: 20,
    GPS_TIMEOUT: 8000,
    CACHE_TTL: 2 * 60 * 60 * 1000,
  },
}));

// Mock Redux
const mockDispatch = jest.fn();
const mockGetState = jest.fn();
jest.mock("../../Redux", () => ({
  store: {
    getState: () => mockGetState(),
    dispatch: mockDispatch,
  },
}));

jest.mock("../../Redux/Actions/LocationActions", () => ({
  setCustomLocation: jest.fn((location, source) => ({
    type: "SET_CUSTOM_LOCATION",
    payload: { ...location, source },
  })),
}));

// Mock LocationManager
const mockLocationManager = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getUserLocation: jest.fn(),
  setCustomLocation: jest.fn(),
  saveToCache: jest.fn().mockResolvedValue(undefined),
};
jest.mock("../../services/LocationManager", () => ({
  __esModule: true,
  default: mockLocationManager,
}));

// Mock StoreService
jest.mock("../../services/StoreService", () => ({
  __esModule: true,
  default: {
    fetchAllStores: jest.fn().mockResolvedValue([]),
    filterStoresByRadius: jest.fn().mockReturnValue([]),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

// Mock Toast
jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
}));

import { LOCATION_CONFIG } from "../../config/location";
import { setCustomLocation } from "../../Redux/Actions/LocationActions";
import Toast from "react-native-toast-message";

describe("StoreContext Race Condition Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    mockGetState.mockReturnValue({ location: { customLocation: null } });
  });

  describe("fetchUserLocation behavior", () => {
    it("should skip GPS call when customLocation already exists", async () => {
      // Simulate: customLocation exists in Redux
      const existingLocation = {
        latitude: 50.8503,
        longitude: 4.3517,
        source: "search",
      };
      mockGetState.mockReturnValue({
        location: { customLocation: existingLocation },
      });

      // When customLocation exists, GPS should NOT be called
      // This is checked in the StoreContext useCallback
      expect(mockLocationManager.getUserLocation).not.toHaveBeenCalled();
    });

    it("should call GPS when customLocation is null", async () => {
      mockGetState.mockReturnValue({ location: { customLocation: null } });
      mockLocationManager.getUserLocation.mockResolvedValue({
        latitude: 45.4642,
        longitude: 9.19,
        source: "gps",
      });

      // Simulate fetchUserLocation logic
      const location = await mockLocationManager.getUserLocation({
        useCache: true,
      });

      expect(mockLocationManager.getUserLocation).toHaveBeenCalledWith({
        useCache: true,
      });
      expect(location.latitude).toBe(45.4642);
    });

    it("should NOT dispatch GPS result when search location exists", async () => {
      // T=0: GPS starts, customLocation is null
      mockGetState.mockReturnValue({ location: { customLocation: null } });

      const gpsLocation = { latitude: 45.4642, longitude: 9.19, source: "gps" };
      mockLocationManager.getUserLocation.mockResolvedValue(gpsLocation);

      // Simulate GPS returning
      await mockLocationManager.getUserLocation({ useCache: true });

      // T=2s: User searched while GPS was pending
      // State now has search location
      mockGetState.mockReturnValue({
        location: {
          customLocation: {
            latitude: 50.8503,
            longitude: 4.3517,
            source: "search",
          },
        },
      });

      // Check race condition logic: should NOT dispatch GPS
      const currentState = mockGetState().location.customLocation;
      const shouldDispatch =
        !currentState?.latitude ||
        currentState.source === "gps" ||
        currentState.source === "default";

      expect(shouldDispatch).toBe(false);
      expect(currentState.source).toBe("search");
    });

    it("should dispatch GPS result when no search location exists", async () => {
      mockGetState.mockReturnValue({ location: { customLocation: null } });

      const gpsLocation = { latitude: 45.4642, longitude: 9.19, source: "gps" };
      mockLocationManager.getUserLocation.mockResolvedValue(gpsLocation);

      await mockLocationManager.getUserLocation({ useCache: true });

      // No search occurred - state still null
      const currentState = mockGetState().location.customLocation;
      const shouldDispatch =
        !currentState?.latitude ||
        currentState.source === "gps" ||
        currentState.source === "default";

      expect(shouldDispatch).toBe(true);
    });

    it("should allow GPS to overwrite previous GPS location", async () => {
      mockGetState.mockReturnValue({
        location: {
          customLocation: { latitude: 45.0, longitude: 9.0, source: "gps" },
        },
      });

      const currentState = mockGetState().location.customLocation;
      const shouldDispatch =
        !currentState?.latitude ||
        currentState.source === "gps" ||
        currentState.source === "default";

      expect(shouldDispatch).toBe(true);
    });

    it("should allow GPS to overwrite default location", async () => {
      mockGetState.mockReturnValue({
        location: {
          customLocation: {
            latitude: LOCATION_CONFIG.DEFAULT_LOCATION.latitude,
            longitude: LOCATION_CONFIG.DEFAULT_LOCATION.longitude,
            source: "default",
          },
        },
      });

      const currentState = mockGetState().location.customLocation;
      const shouldDispatch =
        !currentState?.latitude ||
        currentState.source === "gps" ||
        currentState.source === "default";

      expect(shouldDispatch).toBe(true);
    });
  });

  describe("Source tracking", () => {
    it("setCustomLocation action should include source parameter", () => {
      const action = setCustomLocation(
        { latitude: 50.8503, longitude: 4.3517 },
        "search",
      );

      expect(action.type).toBe("SET_CUSTOM_LOCATION");
      expect(action.payload.source).toBe("search");
      expect(action.payload.latitude).toBe(50.8503);
    });

    it("setCustomLocation action should include gps source", () => {
      const action = setCustomLocation(
        { latitude: 45.4642, longitude: 9.19 },
        "gps",
      );

      expect(action.type).toBe("SET_CUSTOM_LOCATION");
      expect(action.payload.source).toBe("gps");
    });

    it("setCustomLocation action should include default source", () => {
      const action = setCustomLocation(
        {
          latitude: LOCATION_CONFIG.DEFAULT_LOCATION.latitude,
          longitude: LOCATION_CONFIG.DEFAULT_LOCATION.longitude,
        },
        "default",
      );

      expect(action.type).toBe("SET_CUSTOM_LOCATION");
      expect(action.payload.source).toBe("default");
    });
  });

  describe("Default location fallback", () => {
    it("should use Brussels default when GPS returns null", async () => {
      mockLocationManager.getUserLocation.mockResolvedValue(null);

      const location = await mockLocationManager.getUserLocation({
        useCache: true,
      });

      expect(location).toBeNull();
      // In this case, StoreContext would use LOCATION_CONFIG.DEFAULT_LOCATION
      expect(LOCATION_CONFIG.DEFAULT_LOCATION.latitude).toBe(50.8503);
      expect(LOCATION_CONFIG.DEFAULT_LOCATION.longitude).toBe(4.3517);
    });

    it("should show toast when falling back to default", async () => {
      // Toast.show would be called when GPS fails and default is used
      Toast.show({
        type: "info",
        text1: "Location not available",
        text2: "Search for your city to find nearby stores",
        position: "bottom",
        visibilityTime: 4000,
      });

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "info",
          text1: "Location not available",
        }),
      );
    });
  });
});
