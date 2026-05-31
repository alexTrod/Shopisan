/**
 * Tests for useStoreForm hook - Address Selection & Map Picker
 *
 * Tests: handleAddressSelect, handleUseCurrentLocation, handleMapPickerConfirm
 *
 * Run with: npx jest src/components/store-form/__tests__/useStoreForm.address.test.js
 */

// Mock React Native modules
jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
  Keyboard: { dismiss: jest.fn() },
  Platform: { OS: "ios" },
}));

// Mock Redux
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
  useSelector: jest.fn((selector) =>
    selector({
      user: { userData: { id: "test-user-id", email: "test@example.com" } },
      categories: { categories: [], selectedCategories: [] },
    }),
  ),
  useDispatch: jest.fn(() => mockDispatch),
}));

// Mock Firebase
jest.mock("../../../../firebaseconfig", () => ({
  firestore: {},
  functions: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock("firebase/functions", () => ({
  httpsCallable: jest.fn(),
}));

// Mock expo-location
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

// Mock expo-image-picker
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
}));

// Mock CategoriesReducer
jest.mock("../../../Redux/Reducers/CategoriesReducer", () => ({
  getCategoriesLocale: jest.fn(() => Promise.resolve([])),
}));

// Mock CategoriesActions
jest.mock("../../../Redux/Actions/CategoriesActions", () => ({
  setSelectedCategories: jest.fn((cats) => ({
    type: "SET_SELECTED_CATEGORIES",
    payload: cats,
  })),
  setCategories: jest.fn((cats) => ({
    type: "SET_CATEGORIES",
    payload: cats,
  })),
}));

// Mock cityManagement
jest.mock("../../../utils/cityManagement", () => ({
  ensureCityExists: jest.fn(() => Promise.resolve()),
}));

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as Location from "expo-location";
import { useStoreForm } from "../useStoreForm";

// Test utilities
const mockT = (key) => key;

// Store original fetch
const originalFetch = global.fetch;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

describe("useStoreForm - Address Selection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ advanceTimers: true });
    global.fetch = jest.fn();
    console.error = jest.fn();
    console.log = jest.fn();

    // Default permission granted
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: "granted",
    });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 48.8566, longitude: 2.3522 },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe("handleAddressSelect", () => {
    const mockMapboxFeature = {
      id: "address.123",
      place_name: "123 Rue de Paris, 75001 Paris, France",
      text: "Rue de Paris",
      address: "123",
      center: [2.35, 48.85],
      context: [
        { id: "place.1", text: "Paris" },
        { id: "postcode.2", text: "75001" },
        { id: "region.3", text: "Île-de-France" },
      ],
    };

    it("should parse Mapbox feature context array", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.handleAddressSelect(mockMapboxFeature);
      });

      expect(result.current.street).toBe("Rue de Paris");
      expect(result.current.streetNumber).toBe("123");
      expect(result.current.city).toBe("Paris");
      expect(result.current.postalCode).toBe("75001");
    });

    it("should extract street name from item.text", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const feature = {
        text: "Avenue des Champs-Élysées",
        center: [2.3, 48.87],
        context: [],
      };

      await act(async () => {
        result.current.handleAddressSelect(feature);
      });

      expect(result.current.street).toBe("Avenue des Champs-Élysées");
    });

    it("should extract street number from item.address", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const feature = {
        text: "Main Street",
        address: "456",
        center: [2.35, 48.85],
        context: [],
      };

      await act(async () => {
        result.current.handleAddressSelect(feature);
      });

      expect(result.current.streetNumber).toBe("456");
    });

    it("should extract city from place context", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const feature = {
        text: "Some Street",
        center: [4.84, 45.76],
        context: [
          { id: "place.lyon", text: "Lyon" },
          { id: "postcode.69001", text: "69001" },
        ],
      };

      await act(async () => {
        result.current.handleAddressSelect(feature);
      });

      expect(result.current.city).toBe("Lyon");
    });

    it("should extract postal code from postcode context", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const feature = {
        text: "Some Street",
        center: [1.44, 43.6],
        context: [
          { id: "place.toulouse", text: "Toulouse" },
          { id: "postcode.31000", text: "31000" },
        ],
      };

      await act(async () => {
        result.current.handleAddressSelect(feature);
      });

      expect(result.current.postalCode).toBe("31000");
    });

    it("should set selectedLocation from item.center", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.handleAddressSelect(mockMapboxFeature);
      });

      expect(result.current.selectedLocation).toEqual({
        latitude: 48.85,
        longitude: 2.35,
      });
    });

    it("should set showMap=true on valid location", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.showMap).toBe(false);

      await act(async () => {
        result.current.handleAddressSelect(mockMapboxFeature);
      });

      expect(result.current.showMap).toBe(true);
    });

    it("should clear suggestions after selection", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      // First add some suggestions
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [mockMapboxFeature],
          }),
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0);
      });

      // Now select
      await act(async () => {
        result.current.handleAddressSelect(mockMapboxFeature);
      });

      expect(result.current.suggestions).toEqual([]);
    });

    it("should handle null item gracefully", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      // Should not throw
      await act(async () => {
        result.current.handleAddressSelect(null);
      });

      expect(result.current.street).toBe("");
    });

    it("should handle missing context gracefully", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const feature = {
        text: "Some Street",
        center: [2.35, 48.85],
        // No context array
      };

      await act(async () => {
        result.current.handleAddressSelect(feature);
      });

      expect(result.current.street).toBe("Some Street");
      expect(result.current.city).toBe("");
      expect(result.current.postalCode).toBe("");
    });

    it("should update query with combined street number and name", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.handleAddressSelect(mockMapboxFeature);
      });

      expect(result.current.query).toBe("123 Rue de Paris");
    });
  });

  describe("handleUseCurrentLocation", () => {
    it("should request location permission", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      // Mock the Mapbox reverse geocode response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                text: "Current Street",
                address: "10",
                center: [2.3522, 48.8566],
                context: [
                  { id: "place.1", text: "Paris" },
                  { id: "postcode.2", text: "75001" },
                ],
              },
            ],
          }),
      });

      await act(async () => {
        await result.current.handleUseCurrentLocation();
      });

      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it("should show alert if permission denied", async () => {
      // Override the default mock for this specific test
      Location.requestForegroundPermissionsAsync
        .mockReset()
        .mockResolvedValue({ status: "denied" });

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      // Let mount effects complete (they will also call requestForegroundPermissionsAsync)
      await act(async () => {
        await Promise.resolve();
        await new Promise((r) => setTimeout(r, 10));
      });

      // Clear the alert calls from mount
      Alert.alert.mockClear();

      await act(async () => {
        await result.current.handleUseCurrentLocation();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "permission_denied",
        "location_permission_message",
      );
    });

    it("should get current position when permission granted", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                text: "GPS Street",
                center: [2.3522, 48.8566],
                context: [],
              },
            ],
          }),
      });

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.handleUseCurrentLocation();
      });

      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    });

    it("should set selectedLocation from GPS coords", async () => {
      Location.getCurrentPositionAsync.mockResolvedValueOnce({
        coords: { latitude: 45.764, longitude: 4.8357 },
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                text: "Lyon Street",
                center: [4.8357, 45.764],
                context: [{ id: "place.1", text: "Lyon" }],
              },
            ],
          }),
      });

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.handleUseCurrentLocation();
      });

      expect(result.current.selectedLocation).toEqual({
        latitude: 45.764,
        longitude: 4.8357,
      });
    });

    it("should reverse geocode with Mapbox", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                text: "Geocoded Street",
                center: [2.3522, 48.8566],
                context: [],
              },
            ],
          }),
      });

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.handleUseCurrentLocation();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("api.mapbox.com/geocoding/v5"),
      );
    });

    it("should call handleAddressSelect with geocoded result", async () => {
      const geocodedFeature = {
        text: "Reverse Geocoded Street",
        address: "99",
        center: [2.3522, 48.8566],
        context: [
          { id: "place.paris", text: "Paris" },
          { id: "postcode.75002", text: "75002" },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [geocodedFeature],
          }),
      });

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.handleUseCurrentLocation();
      });

      // Should have parsed the geocoded feature
      expect(result.current.street).toBe("Reverse Geocoded Street");
      expect(result.current.city).toBe("Paris");
      expect(result.current.postalCode).toBe("75002");
    });

    it("should handle location errors", async () => {
      Location.getCurrentPositionAsync.mockRejectedValueOnce(
        new Error("GPS unavailable"),
      );

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.handleUseCurrentLocation();
      });

      expect(Alert.alert).toHaveBeenCalledWith("error", "location_error");
    });

    it("should set showMap=true after successful location", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                text: "Some Street",
                center: [2.35, 48.85],
                context: [],
              },
            ],
          }),
      });

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.showMap).toBe(false);

      await act(async () => {
        await result.current.handleUseCurrentLocation();
      });

      expect(result.current.showMap).toBe(true);
    });
  });

  describe("handleMapPickerConfirm", () => {
    it("should close map picker (setShowMapPicker false)", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      // Open map picker
      await act(async () => {
        result.current.setShowMapPicker(true);
      });

      expect(result.current.showMapPicker).toBe(true);

      // Confirm with a feature
      const feature = {
        text: "Selected Street",
        center: [2.35, 48.85],
        context: [{ id: "place.1", text: "Paris" }],
      };

      await act(async () => {
        result.current.handleMapPickerConfirm(feature);
      });

      expect(result.current.showMapPicker).toBe(false);
    });

    it("should pass feature to handleAddressSelect", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const feature = {
        text: "Map Picked Street",
        address: "42",
        center: [3.06, 50.63],
        context: [
          { id: "place.lille", text: "Lille" },
          { id: "postcode.59000", text: "59000" },
        ],
      };

      await act(async () => {
        result.current.handleMapPickerConfirm(feature);
      });

      expect(result.current.street).toBe("Map Picked Street");
      expect(result.current.streetNumber).toBe("42");
      expect(result.current.city).toBe("Lille");
      expect(result.current.postalCode).toBe("59000");
      expect(result.current.selectedLocation).toEqual({
        latitude: 50.63,
        longitude: 3.06,
      });
    });
  });

  describe("Map Picker State", () => {
    it("should expose showMapPicker state", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.showMapPicker).toBe(false);
    });

    it("should expose setShowMapPicker function", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.setShowMapPicker(true);
      });

      expect(result.current.showMapPicker).toBe(true);
    });
  });

  describe("User Proximity", () => {
    it("should get user location on mount for search proximity", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      // Let mount effects complete
      await act(async () => {
        await Promise.resolve();
      });

      // Wait for the initial location request
      await waitFor(() => {
        expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      });
    });

    it("should set userProximity when location available", async () => {
      Location.getCurrentPositionAsync.mockResolvedValueOnce({
        coords: { latitude: 48.8566, longitude: 2.3522 },
      });

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
        // Allow microtasks to complete
        await new Promise((r) => setTimeout(r, 0));
      });

      await waitFor(() => {
        expect(result.current.userProximity).toEqual({
          latitude: 48.8566,
          longitude: 2.3522,
        });
      });
    });

    it("should include proximity in Mapbox search URL", async () => {
      // Set up hook with userProximity already set
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 48.8566, longitude: 2.3522 },
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: [] }),
      });

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      // Let mount effects and location request complete
      await act(async () => {
        await Promise.resolve();
        await new Promise((r) => setTimeout(r, 10));
      });

      await waitFor(() => {
        expect(result.current.userProximity).toBeTruthy();
      });

      // Now search
      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("proximity="),
          expect.any(Object),
        );
      });
    });
  });

  describe("Address Context Parsing Edge Cases", () => {
    it("should handle context without place", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const feature = {
        text: "Rural Road",
        center: [2.0, 48.0],
        context: [
          { id: "region.1", text: "Some Region" },
          { id: "country.fr", text: "France" },
        ],
      };

      await act(async () => {
        result.current.handleAddressSelect(feature);
      });

      expect(result.current.city).toBe("");
      expect(result.current.street).toBe("Rural Road");
    });

    it("should handle context without postcode", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const feature = {
        text: "Some Street",
        center: [2.0, 48.0],
        context: [{ id: "place.1", text: "Some City" }],
      };

      await act(async () => {
        result.current.handleAddressSelect(feature);
      });

      expect(result.current.postalCode).toBe("");
      expect(result.current.city).toBe("Some City");
    });

    it("should handle empty address field", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const feature = {
        text: "Street Name Only",
        address: "", // Empty string
        center: [2.0, 48.0],
        context: [],
      };

      await act(async () => {
        result.current.handleAddressSelect(feature);
      });

      expect(result.current.streetNumber).toBe("");
      expect(result.current.query).toBe("Street Name Only");
    });

    it("should handle undefined center gracefully", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      const feature = {
        text: "No Location Street",
        context: [],
        // No center property
      };

      await act(async () => {
        result.current.handleAddressSelect(feature);
      });

      // Should still parse address but not set location
      expect(result.current.street).toBe("No Location Street");
      expect(result.current.showMap).toBe(false);
    });
  });
});
