/**
 * useSearch Hook Tests
 *
 * Run with: npx jest src/hooks/__tests__/useSearch.test.js
 */

// Mock factory that returns a fresh mock each time
jest.mock("../../services/SearchService", () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(() => jest.fn()),
    search: jest.fn().mockResolvedValue([]),
    clear: jest.fn(),
    cancelPendingSearch: jest.fn(),
    geocodeCity: jest.fn().mockResolvedValue(null),
    getLastSuggestions: jest.fn(() => []),
  },
}));

import { renderHook, act } from "@testing-library/react-native";
import { useSearch } from "../useSearch";
// Import the mocked service to access jest functions
import searchService from "../../services/SearchService";

describe("useSearch", () => {
  let unsubscribeMock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    unsubscribeMock = jest.fn();
    searchService.subscribe.mockReturnValue(unsubscribeMock);
    searchService.search.mockResolvedValue([]);
    searchService.geocodeCity.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("State Management", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.query).toBe("");
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.showSuggestions).toBe(false);
      expect(result.current.searchCompleted).toBe(false);
    });

    it("should use initialQuery if provided", () => {
      const { result } = renderHook(() => useSearch({ initialQuery: "Paris" }));

      expect(result.current.query).toBe("Paris");
    });

    it("should subscribe to SearchService on mount", () => {
      renderHook(() => useSearch());

      expect(searchService.subscribe).toHaveBeenCalled();
    });

    it("should unsubscribe and cancel on unmount", () => {
      const { unmount } = renderHook(() => useSearch());

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
      expect(searchService.cancelPendingSearch).toHaveBeenCalled();
    });
  });

  describe("updateQuery", () => {
    it("should update query and trigger search for >= 2 chars", async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.updateQuery("Paris");
      });

      expect(result.current.query).toBe("Paris");
      expect(searchService.search).toHaveBeenCalledWith("Paris");
    });

    it("should clear suggestions for < 2 chars", async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.updateQuery("P");
      });

      expect(result.current.query).toBe("P");
      expect(searchService.clear).toHaveBeenCalled();
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.showSuggestions).toBe(false);
    });

    it("should reset searchCompleted when typing after selection", async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setSearchCompleted(true);
      });

      expect(result.current.searchCompleted).toBe(true);

      await act(async () => {
        result.current.updateQuery("New");
      });

      expect(result.current.searchCompleted).toBe(false);
    });
  });

  describe("handleCitySelect", () => {
    it("should set query to label and clear suggestions", async () => {
      const onCitySelect = jest.fn();
      const { result } = renderHook(() => useSearch({ onCitySelect }));

      const citySuggestion = {
        label: "Paris",
        type: "city",
        coordinates: { latitude: 48.8566, longitude: 2.3522 },
      };

      await act(async () => {
        await result.current.handleCitySelect(citySuggestion);
      });

      expect(result.current.query).toBe("Paris");
      expect(result.current.showSuggestions).toBe(false);
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.searchCompleted).toBe(true);
    });

    it("should use provided coordinates without geocoding", async () => {
      const onCitySelect = jest.fn();
      const { result } = renderHook(() => useSearch({ onCitySelect }));

      const citySuggestion = {
        label: "Paris",
        type: "city",
        coordinates: { latitude: 48.8566, longitude: 2.3522 },
      };

      await act(async () => {
        const coords = await result.current.handleCitySelect(citySuggestion);
        expect(coords).toEqual({ latitude: 48.8566, longitude: 2.3522 });
      });

      expect(searchService.geocodeCity).not.toHaveBeenCalled();
      expect(onCitySelect).toHaveBeenCalledWith("Paris", {
        latitude: 48.8566,
        longitude: 2.3522,
      });
    });

    it("should geocode city if no coordinates provided", async () => {
      const onCitySelect = jest.fn();
      const mockCoords = {
        latitude: 48.8566,
        longitude: 2.3522,
        city: "Paris",
      };
      searchService.geocodeCity.mockResolvedValue(mockCoords);

      const { result } = renderHook(() => useSearch({ onCitySelect }));

      const citySuggestion = {
        label: "Paris",
        type: "city",
        coordinates: null,
      };

      await act(async () => {
        const coords = await result.current.handleCitySelect(citySuggestion);
        expect(coords).toEqual(mockCoords);
      });

      expect(searchService.geocodeCity).toHaveBeenCalledWith("Paris");
      expect(onCitySelect).toHaveBeenCalledWith("Paris", mockCoords);
    });

    it("should return null if geocoding fails", async () => {
      const onCitySelect = jest.fn();
      searchService.geocodeCity.mockResolvedValue(null);

      const { result } = renderHook(() => useSearch({ onCitySelect }));

      const citySuggestion = {
        label: "UnknownCity",
        type: "city",
        coordinates: null,
      };

      await act(async () => {
        const coords = await result.current.handleCitySelect(citySuggestion);
        expect(coords).toBeNull();
      });

      expect(onCitySelect).not.toHaveBeenCalled();
    });
  });

  describe("handleStoreSelect", () => {
    it("should set query and call onStoreSelect callback", async () => {
      const onStoreSelect = jest.fn();
      const { result } = renderHook(() => useSearch({ onStoreSelect }));

      const storeSuggestion = {
        label: "Paris Boutique",
        type: "store",
        id: "store-1",
        location: { latitude: 48.85, longitude: 2.35 },
      };

      await act(async () => {
        result.current.handleStoreSelect(storeSuggestion);
      });

      expect(result.current.query).toBe("Paris Boutique");
      expect(result.current.showSuggestions).toBe(false);
      expect(result.current.searchCompleted).toBe(true);
      expect(onStoreSelect).toHaveBeenCalledWith(storeSuggestion);
    });

    it("should not call onStoreSelect if no location", async () => {
      const onStoreSelect = jest.fn();
      const { result } = renderHook(() => useSearch({ onStoreSelect }));

      const storeSuggestion = {
        label: "Store Without Location",
        type: "store",
        id: "store-2",
        location: null,
      };

      await act(async () => {
        result.current.handleStoreSelect(storeSuggestion);
      });

      expect(onStoreSelect).not.toHaveBeenCalled();
    });
  });

  describe("handleSuggestionPress", () => {
    it("should auto-detect city type and call handleCitySelect", async () => {
      const onCitySelect = jest.fn();
      const { result } = renderHook(() => useSearch({ onCitySelect }));

      const citySuggestion = {
        label: "Lyon",
        type: "city",
        coordinates: { latitude: 45.764, longitude: 4.8357 },
      };

      await act(async () => {
        const coords =
          await result.current.handleSuggestionPress(citySuggestion);
        expect(coords).toEqual({ latitude: 45.764, longitude: 4.8357 });
      });

      expect(onCitySelect).toHaveBeenCalled();
    });

    it("should auto-detect store type and call handleStoreSelect", async () => {
      const onStoreSelect = jest.fn();
      const { result } = renderHook(() => useSearch({ onStoreSelect }));

      const storeSuggestion = {
        label: "Lyon Store",
        type: "store",
        id: "store-3",
        location: { latitude: 45.76, longitude: 4.83 },
      };

      await act(async () => {
        const location =
          await result.current.handleSuggestionPress(storeSuggestion);
        expect(location).toEqual({ latitude: 45.76, longitude: 4.83 });
      });

      expect(onStoreSelect).toHaveBeenCalled();
    });

    it("should return null for unknown type", async () => {
      const { result } = renderHook(() => useSearch());

      const unknownSuggestion = {
        label: "Unknown",
        type: "unknown",
      };

      await act(async () => {
        const returnVal =
          await result.current.handleSuggestionPress(unknownSuggestion);
        expect(returnVal).toBeNull();
      });
    });
  });

  describe("clearSearch", () => {
    it("should reset all state", async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setQuery("Paris");
        result.current.setSearchCompleted(true);
      });

      await act(async () => {
        result.current.clearSearch();
      });

      expect(result.current.query).toBe("");
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.showSuggestions).toBe(false);
      expect(result.current.searchCompleted).toBe(false);
      expect(searchService.clear).toHaveBeenCalled();
    });
  });

  describe("submitSearch", () => {
    it("should cancel pending search and set completed", async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setQuery("Paris");
      });

      await act(async () => {
        await result.current.submitSearch();
      });

      expect(result.current.showSuggestions).toBe(false);
      expect(result.current.searchCompleted).toBe(true);
      expect(searchService.cancelPendingSearch).toHaveBeenCalled();
    });

    it("should do nothing if query is empty", async () => {
      const { result } = renderHook(() => useSearch());

      searchService.cancelPendingSearch.mockClear();

      await act(async () => {
        await result.current.submitSearch();
      });

      expect(searchService.cancelPendingSearch).not.toHaveBeenCalled();
    });
  });

  describe("handleFocus", () => {
    it("should show suggestions if available and not completed", async () => {
      const { result } = renderHook(() => useSearch());

      const subscribeCallback = searchService.subscribe.mock.calls[0][0];
      await act(async () => {
        subscribeCallback([{ label: "Paris" }], false);
      });

      await act(async () => {
        result.current.handleFocus();
      });

      expect(result.current.showSuggestions).toBe(true);
    });

    it("should not show suggestions if search completed", async () => {
      const { result } = renderHook(() => useSearch());

      // Set searchCompleted FIRST to prevent suggestions from showing
      await act(async () => {
        result.current.setSearchCompleted(true);
      });

      // Get the NEW callback after searchCompleted change (effect re-runs)
      const callCount = searchService.subscribe.mock.calls.length;
      const subscribeCallback =
        searchService.subscribe.mock.calls[callCount - 1][0];

      // Now trigger subscription with suggestions
      await act(async () => {
        subscribeCallback([{ label: "Paris" }], false);
      });

      // Suggestions arrive but showSuggestions stays false due to searchCompleted
      expect(result.current.suggestions).toHaveLength(1);

      // Focus should not show suggestions when searchCompleted
      await act(async () => {
        result.current.handleFocus();
      });

      expect(result.current.showSuggestions).toBe(false);
    });
  });

  describe("handleBlur", () => {
    it("should hide suggestions after delay", async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setShowSuggestions(true);
      });

      expect(result.current.showSuggestions).toBe(true);

      await act(async () => {
        result.current.handleBlur();
      });

      expect(result.current.showSuggestions).toBe(true);

      await act(async () => {
        jest.advanceTimersByTime(250);
      });

      expect(result.current.showSuggestions).toBe(false);
    });
  });

  describe("geocodeCity", () => {
    it("should delegate to searchService.geocodeCity", async () => {
      const mockCoords = { latitude: 48.8566, longitude: 2.3522 };
      searchService.geocodeCity.mockResolvedValue(mockCoords);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        const coords = await result.current.geocodeCity("Paris");
        expect(coords).toEqual(mockCoords);
      });

      expect(searchService.geocodeCity).toHaveBeenCalledWith("Paris");
    });
  });

  describe("Derived State", () => {
    it("should compute hasSuggestions correctly", async () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.hasSuggestions).toBe(false);

      const subscribeCallback = searchService.subscribe.mock.calls[0][0];
      await act(async () => {
        subscribeCallback([{ label: "Paris" }], false);
      });

      expect(result.current.hasSuggestions).toBe(true);
    });

    it("should compute hasQuery correctly", async () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.hasQuery).toBe(false);

      await act(async () => {
        result.current.setQuery("Paris");
      });

      expect(result.current.hasQuery).toBe(true);
    });

    it("should handle whitespace-only query", async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        result.current.setQuery("   ");
      });

      expect(result.current.hasQuery).toBe(false);
    });
  });

  describe("Subscription Updates", () => {
    it("should update suggestions when service notifies", async () => {
      const { result } = renderHook(() => useSearch());

      const subscribeCallback = searchService.subscribe.mock.calls[0][0];

      await act(async () => {
        subscribeCallback(
          [
            { label: "Paris", type: "city" },
            { label: "Lyon", type: "city" },
          ],
          false,
        );
      });

      expect(result.current.suggestions).toHaveLength(2);
      expect(result.current.loading).toBe(false);
    });

    it("should update loading state when service notifies", async () => {
      const { result } = renderHook(() => useSearch());

      const subscribeCallback = searchService.subscribe.mock.calls[0][0];

      await act(async () => {
        subscribeCallback([], true);
      });

      expect(result.current.loading).toBe(true);
    });

    it("should show suggestions when results arrive and not completed", async () => {
      const { result } = renderHook(() => useSearch());

      const subscribeCallback = searchService.subscribe.mock.calls[0][0];

      await act(async () => {
        subscribeCallback([{ label: "Paris" }], false);
      });

      expect(result.current.showSuggestions).toBe(true);
    });

    it("should not show suggestions if searchCompleted", async () => {
      const { result } = renderHook(() => useSearch());

      // Set searchCompleted first
      await act(async () => {
        result.current.setSearchCompleted(true);
      });

      // Re-render creates new subscription due to searchCompleted dependency
      // Get the NEW callback after searchCompleted change
      const callCount = searchService.subscribe.mock.calls.length;
      const subscribeCallback =
        searchService.subscribe.mock.calls[callCount - 1][0];

      await act(async () => {
        subscribeCallback([{ label: "Paris" }], false);
      });

      // Suggestions received but showSuggestions stays false
      expect(result.current.suggestions).toHaveLength(1);
      expect(result.current.showSuggestions).toBe(false);
    });
  });
});
