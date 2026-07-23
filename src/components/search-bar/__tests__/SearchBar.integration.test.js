/**
 * SearchBar + SearchService Integration Tests
 *
 * Tests the critical interaction: dropdown stays closed after city selection
 * even if pending search completes.
 *
 * Run with: npx jest src/components/search-bar/__tests__/SearchBar.integration.test.js
 */

// Mock config
jest.mock("../../../config/location", () => ({
  LOCATION_CONFIG: {
    SEARCH_DEBOUNCE_MS: 300,
    MIN_SEARCH_LENGTH: 2,
    MAX_SUGGESTIONS: 15,
    GEOCODE_TIMEOUT: 5000,
  },
}));

// Track listeners for notifying (must prefix with 'mock' for jest.mock factory access)
const mockListeners = new Set();

// Mock searchService - everything inside factory
jest.mock("../../../services/SearchService", () => {
  const mockFn = jest.fn;
  return {
    __esModule: true,
    default: {
      subscribe: mockFn((cb) => {
        mockListeners.add(cb);
        return () => mockListeners.delete(cb);
      }),
      cancelPendingSearch: mockFn(),
      search: mockFn(() => Promise.resolve([])),
      geocodeCity: mockFn(() =>
        Promise.resolve({ latitude: 48.8566, longitude: 2.3522 }),
      ),
      clear: mockFn(),
    },
  };
});

// Mock StoreContext
jest.mock("../../../context/StoreContext", () => {
  const React = require("react");
  return {
    StoreContext: React.createContext({
      searchQuery: "",
      setSearchQuery: () => {},
      performSearch: () => {},
      searchCompleted: false,
      setSearchCompleted: () => {},
    }),
  };
});

jest.mock("../../../utils/useTranslation", () => ({
  useTranslation: () => ({
    t: (key) => key,
    locale: "en",
  }),
}));

jest.mock("../../../utils", () => ({
  AppColors: {
    white: "#fff",
    black: "#000",
    primary: "#007AFF",
    primary_faded: "#E3F2FD",
    grey_200: "#999",
    grey_300: "#ccc",
  },
}));

jest.mock("../../../utils/dimension", () => ({
  height: (val) => val * 10,
  width: (val) => val * 10,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("react-redux", () => ({
  useSelector: jest.fn(() => ({})),
  useDispatch: jest.fn(() => jest.fn()),
}));

// NOW IMPORTS
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import SearchBar from "../index";
import { StoreContext } from "../../../context/StoreContext";
import searchService from "../../../services/SearchService";

// Helper to notify listeners
const notifyListeners = (suggestions, loading) => {
  mockListeners.forEach((cb) => cb(suggestions, loading));
};

// Mock state variables
let mockSearchQuery = "";
let mockSearchCompleted = false;
const mockSetSearchQuery = jest.fn((val) => {
  mockSearchQuery = val;
});
const mockPerformSearch = jest.fn();
const mockSetSearchCompleted = jest.fn((val) => {
  mockSearchCompleted = val;
});

// Get context value
const getContextValue = () => ({
  searchQuery: mockSearchQuery,
  setSearchQuery: mockSetSearchQuery,
  performSearch: mockPerformSearch,
  searchCompleted: mockSearchCompleted,
  setSearchCompleted: mockSetSearchCompleted,
});

// Wrapper
const TestWrapper = ({ children }) => (
  <StoreContext.Provider value={getContextValue()}>
    {children}
  </StoreContext.Provider>
);

const renderWithContext = (component) => {
  return render(component, { wrapper: TestWrapper });
};

describe("SearchBar + SearchService Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockListeners.clear();
    mockSearchQuery = "";
    mockSearchCompleted = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Race condition prevention", () => {
    it("should keep dropdown closed after city selection even if pending search completes", async () => {
      const mockOnCitySelect = jest.fn();

      const { queryByText, queryByTestId, rerender } = renderWithContext(
        <SearchBar onCitySelect={mockOnCitySelect} />,
      );

      // Step 1: User types query
      mockSearchQuery = "Par";
      rerender(
        <TestWrapper>
          <SearchBar onCitySelect={mockOnCitySelect} />
        </TestWrapper>,
      );

      // Step 2: Suggestions arrive
      await act(async () => {
        notifyListeners(
          [
            {
              label: "Paris",
              type: "city",
              coordinates: { latitude: 48.8566, longitude: 2.3522 },
            },
            {
              label: "Marseille",
              type: "city",
              coordinates: { latitude: 43.2965, longitude: 5.3698 },
            },
          ],
          false,
        );
      });

      rerender(
        <TestWrapper>
          <SearchBar onCitySelect={mockOnCitySelect} />
        </TestWrapper>,
      );

      // Verify suggestions visible
      expect(queryByText("Paris")).toBeTruthy();

      // Step 3: User presses suggestion
      const parisSuggestion = queryByText("Paris");
      if (parisSuggestion) {
        await act(async () => {
          fireEvent.press(parisSuggestion);
        });
      }

      // Verify cancelPendingSearch was called (the fix)
      expect(searchService.cancelPendingSearch).toHaveBeenCalled();

      // Update state to reflect selection
      mockSearchQuery = "Paris";
      mockSearchCompleted = true;
      rerender(
        <TestWrapper>
          <SearchBar onCitySelect={mockOnCitySelect} />
        </TestWrapper>,
      );

      // Step 4: Simulate late pending search completing
      await act(async () => {
        notifyListeners([], false);
      });

      rerender(
        <TestWrapper>
          <SearchBar onCitySelect={mockOnCitySelect} />
        </TestWrapper>,
      );

      // CRITICAL: "No suggestions found" should NOT appear
      const noSuggestions = queryByText(/No suggestions found/);
      expect(noSuggestions).toBeNull();

      const noSuggestionsContainer = queryByTestId("no-suggestions-container");
      expect(noSuggestionsContainer).toBeNull();
    });

    it("should prevent magnifying glass from reopening dropdown after selection", async () => {
      const mockOnCitySelect = jest.fn();

      mockSearchQuery = "Paris";
      mockSearchCompleted = true;

      const { getByTestId, queryByTestId } = renderWithContext(
        <SearchBar onCitySelect={mockOnCitySelect} />,
      );

      searchService.search.mockClear();

      // Press magnifying glass button
      const searchButton = getByTestId("search-button");
      await act(async () => {
        fireEvent.press(searchButton);
      });

      // handleShowSuggestions should not call search due to guard
      expect(searchService.search).not.toHaveBeenCalled();

      // No suggestions container should not appear
      const noSuggestionsContainer = queryByTestId("no-suggestions-container");
      expect(noSuggestionsContainer).toBeNull();
    });
  });

  describe("Debounce cancellation", () => {
    it("should cancel debounced search when suggestion is pressed", async () => {
      const mockOnCitySelect = jest.fn();

      const { queryByText, rerender } = renderWithContext(
        <SearchBar onCitySelect={mockOnCitySelect} />,
      );

      // User types
      mockSearchQuery = "Par";
      rerender(
        <TestWrapper>
          <SearchBar onCitySelect={mockOnCitySelect} />
        </TestWrapper>,
      );

      // Initial suggestions arrive
      await act(async () => {
        notifyListeners(
          [
            {
              label: "Paris",
              type: "city",
              coordinates: { latitude: 48.8566, longitude: 2.3522 },
            },
          ],
          false,
        );
      });

      rerender(
        <TestWrapper>
          <SearchBar onCitySelect={mockOnCitySelect} />
        </TestWrapper>,
      );

      // User continues typing
      mockSearchQuery = "Pari";
      rerender(
        <TestWrapper>
          <SearchBar onCitySelect={mockOnCitySelect} />
        </TestWrapper>,
      );

      // Before debounce fires, user selects suggestion
      const suggestion = queryByText("Paris");
      if (suggestion) {
        await act(async () => {
          fireEvent.press(suggestion);
        });
      }

      // cancelPendingSearch should be called
      expect(searchService.cancelPendingSearch).toHaveBeenCalled();

      // Advance timers past debounce
      jest.advanceTimersByTime(500);

      mockSearchCompleted = true;
      rerender(
        <TestWrapper>
          <SearchBar onCitySelect={mockOnCitySelect} />
        </TestWrapper>,
      );

      // Dropdown should be closed
      const noSuggestions = queryByText(/No suggestions found/);
      expect(noSuggestions).toBeNull();
    });
  });
});
