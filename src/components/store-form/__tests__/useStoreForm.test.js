/**
 * Tests for useStoreForm hook - Address Search Robustness
 *
 * Tests: fetchWithRetry helper, fetchAddressSuggestions,
 * manual entry mode, error state management.
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
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" }),
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: 48.8566, longitude: 2.3522 },
    }),
  ),
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
import { useStoreForm } from "../useStoreForm";

// Test utilities
const mockT = (key) => key;

const mockMapboxResponse = {
  features: [
    {
      id: "1",
      place_name: "123 Main St, Paris, France",
      text: "Main St",
      address: "123",
      center: [2.35, 48.85],
      context: [
        { id: "place.123", text: "Paris" },
        { id: "postcode.456", text: "75001" },
      ],
    },
  ],
};

const createFetchResponse = (ok, data, status = ok ? 200 : 500) => ({
  ok,
  status,
  json: () => Promise.resolve(data),
});

// Store original fetch and console.error
const originalFetch = global.fetch;
const originalConsoleError = console.error;

describe("useStoreForm - Address Search Robustness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use modern fake timers with auto-advance for promises
    jest.useFakeTimers({ advanceTimers: true });
    global.fetch = jest.fn();
    // Silence expected console.error from Mapbox search errors
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    console.error = originalConsoleError;
  });

  describe("fetchWithRetry Helper", () => {
    // We test fetchWithRetry indirectly through fetchAddressSuggestions
    // since it's not exported. These tests verify retry behavior.

    it("should succeed on first try and return response immediately", async () => {
      global.fetch.mockResolvedValueOnce(
        createFetchResponse(true, mockMapboxResponse),
      );

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      // Let mount effects complete
      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      await waitFor(() => {
        expect(result.current.suggestions).toEqual(mockMapboxResponse.features);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.searchError).toBeNull();
    });

    it("should retry with backoff when fetch fails then succeeds", async () => {
      // Fail first 2 times, succeed on 3rd
      global.fetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(createFetchResponse(true, mockMapboxResponse));

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      // First call immediate
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Advance 500ms for first retry
      await act(async () => {
        jest.advanceTimersByTime(600);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Advance 1000ms for second retry
      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });

      await waitFor(() => {
        expect(result.current.suggestions).toEqual(mockMapboxResponse.features);
      });
    });

    it("should throw last error after all retries fail", async () => {
      // Fail all 3 attempts
      global.fetch
        .mockRejectedValueOnce(new Error("Network error 1"))
        .mockRejectedValueOnce(new Error("Network error 2"))
        .mockRejectedValueOnce(new Error("Network error 3"));

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      // First call immediate
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Advance 500ms for first retry
      await act(async () => {
        jest.advanceTimersByTime(600);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Advance 1000ms for second retry
      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });

      await waitFor(() => {
        expect(result.current.searchError).toBeTruthy();
      });

      expect(result.current.suggestions).toEqual([]);
    });

    it("should throw AbortError immediately without retry", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      global.fetch.mockRejectedValueOnce(abortError);

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // AbortError should not trigger retry
      expect(global.fetch).toHaveBeenCalledTimes(1);
      // AbortError should be ignored (no error shown)
      expect(result.current.searchError).toBeNull();
    });

    it("should retry on non-ok response then throw", async () => {
      // Return 500 errors
      global.fetch
        .mockResolvedValueOnce(createFetchResponse(false, {}, 500))
        .mockResolvedValueOnce(createFetchResponse(false, {}, 500))
        .mockResolvedValueOnce(createFetchResponse(false, {}, 500));

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      // First call immediate
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Advance 500ms for first retry
      await act(async () => {
        jest.advanceTimersByTime(600);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Advance 1000ms for second retry
      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });

      await waitFor(() => {
        expect(result.current.searchError).toBeTruthy();
      });
    });
  });

  describe("fetchAddressSuggestions", () => {
    it("should clear suggestions when text < 3 chars", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      // First set some suggestions
      global.fetch.mockResolvedValueOnce(
        createFetchResponse(true, mockMapboxResponse),
      );

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0);
      });

      // Now search with < 3 chars
      await act(async () => {
        result.current.fetchAddressSuggestions("Pa");
      });

      expect(result.current.suggestions).toEqual([]);
      // fetch should not be called for short text (only 1 call from Paris)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should set suggestions on successful search", async () => {
      global.fetch.mockResolvedValueOnce(
        createFetchResponse(true, mockMapboxResponse),
      );

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      await waitFor(() => {
        expect(result.current.suggestions).toEqual(mockMapboxResponse.features);
      });

      expect(result.current.searchError).toBeNull();
    });

    it("should set searchError on network error", async () => {
      global.fetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      // First call immediate, then advance through retries
      await act(async () => {
        jest.advanceTimersByTime(600);
        await Promise.resolve();
      });

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.searchError).toBeTruthy();
      });

      expect(result.current.suggestions).toEqual([]);
    });

    it("should ignore AbortError (no error shown)", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      global.fetch.mockRejectedValueOnce(abortError);

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // AbortError should not set error
      expect(result.current.searchError).toBeNull();
    });

    it("should abort previous request when new search starts", async () => {
      // First request will be aborted, second will succeed
      global.fetch
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              // Slow request - will be aborted
              setTimeout(
                () => resolve(createFetchResponse(true, { features: [] })),
                5000,
              );
            }),
        )
        .mockResolvedValueOnce(createFetchResponse(true, mockMapboxResponse));

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      // Start first search
      await act(async () => {
        result.current.fetchAddressSuggestions("First");
      });

      // Start second search immediately (should abort first)
      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      await waitFor(() => {
        expect(result.current.suggestions).toEqual(mockMapboxResponse.features);
      });
    });
  });

  describe("Manual Entry Mode", () => {
    it("should have manualEntryMode = false by default", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.manualEntryMode).toBe(false);
    });

    it("should toggle manualEntryMode on", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.setManualEntryMode(true);
      });

      expect(result.current.manualEntryMode).toBe(true);
    });

    it("should toggle manualEntryMode off", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.setManualEntryMode(true);
      });

      await act(async () => {
        result.current.setManualEntryMode(false);
      });

      expect(result.current.manualEntryMode).toBe(false);
    });

    it("should update street directly via setStreet (no fetch triggered)", async () => {
      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      // Enable manual mode
      await act(async () => {
        result.current.setManualEntryMode(true);
      });

      // Use setStreet directly
      await act(async () => {
        result.current.setStreet("123 Manual Street");
      });

      expect(result.current.street).toBe("123 Manual Street");
      // fetch should not be called when using setStreet directly
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("Error State Management", () => {
    it("should clear searchError on new successful search", async () => {
      // First search fails
      global.fetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        // Second search succeeds
        .mockResolvedValueOnce(createFetchResponse(true, mockMapboxResponse));

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("First");
      });

      // Advance through retries
      await act(async () => {
        jest.advanceTimersByTime(600);
        await Promise.resolve();
      });

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.searchError).toBeTruthy();
      });

      // Second search succeeds
      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      await waitFor(() => {
        expect(result.current.searchError).toBeNull();
      });

      expect(result.current.suggestions).toEqual(mockMapboxResponse.features);
    });

    it("should clear searchError when text < 3 chars", async () => {
      // First search fails
      global.fetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      // Advance through retries
      await act(async () => {
        jest.advanceTimersByTime(600);
        await Promise.resolve();
      });

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.searchError).toBeTruthy();
      });

      // Clear with short text
      await act(async () => {
        result.current.fetchAddressSuggestions("Pa");
      });

      // Error should be cleared (fetchAddressSuggestions sets searchError to null at start)
      expect(result.current.searchError).toBeNull();
    });

    it("should persist searchError until next search attempt", async () => {
      global.fetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      // Advance through retries
      await act(async () => {
        jest.advanceTimersByTime(600);
        await Promise.resolve();
      });

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.searchError).toBeTruthy();
      });

      const initialError = result.current.searchError;

      // Do other operations that shouldn't clear error
      await act(async () => {
        result.current.setName("Test Store");
        result.current.setCity("Test City");
      });

      // Error should still be there
      expect(result.current.searchError).toBe(initialError);
    });
  });

  describe("Race Condition Handling", () => {
    it("should only use results from latest search request", async () => {
      const slowResponse = {
        features: [{ id: "slow", place_name: "Slow Result" }],
      };
      const fastResponse = {
        features: [{ id: "fast", place_name: "Fast Result" }],
      };

      global.fetch
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(
                () => resolve(createFetchResponse(true, slowResponse)),
                5000,
              );
            }),
        )
        .mockResolvedValueOnce(createFetchResponse(true, fastResponse));

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      // Start slow search
      await act(async () => {
        result.current.fetchAddressSuggestions("slow query");
      });

      // Start fast search (should abort slow one)
      await act(async () => {
        result.current.fetchAddressSuggestions("fast query");
      });

      await waitFor(() => {
        expect(result.current.suggestions).toEqual(fastResponse.features);
      });
    });
  });

  describe("Retry Timing", () => {
    it("should use exponential backoff: ~500ms, ~1000ms", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useStoreForm({ t: mockT, onSuccess: jest.fn() }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        result.current.fetchAddressSuggestions("Paris");
      });

      // First call immediate
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Advance 500ms for first retry
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Advance 1000ms for second retry
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });
    });
  });
});
