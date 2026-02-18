/**
 * useSearch - React hook for search functionality
 *
 * Provides a clean React interface to the SearchService.
 * Handles subscription lifecycle and state updates automatically.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import searchService from '../services/SearchService';

/**
 * Hook for search functionality with debouncing and cancellation
 * @param {Object} options - Configuration options
 * @param {string} options.initialQuery - Initial search query
 * @param {Function} options.onCitySelect - Callback when city is selected
 * @param {Function} options.onStoreSelect - Callback when store is selected
 * @returns {Object} Search state and methods
 */
export function useSearch(options = {}) {
  const {
    initialQuery = '',
    onCitySelect,
    onStoreSelect,
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchCompleted, setSearchCompleted] = useState(false);

  const isMounted = useRef(true);
  const lastActionRef = useRef(null);

  // Subscribe to search service updates
  useEffect(() => {
    isMounted.current = true;

    const unsubscribe = searchService.subscribe((newSuggestions, isLoading) => {
      if (isMounted.current) {
        setSuggestions(newSuggestions);
        setLoading(isLoading);
        if (newSuggestions.length > 0 && !searchCompleted && lastActionRef.current !== 'select') {
          setShowSuggestions(true);
        }
      }
    });

    return () => {
      isMounted.current = false;
      unsubscribe();
      searchService.cancelPendingSearch();
    };
  }, [searchCompleted]);

  /**
   * Update search query and trigger search
   */
  const updateQuery = useCallback((newQuery) => {
    // Reset state when user starts typing again
    if (searchCompleted || lastActionRef.current === 'select') {
      setSearchCompleted(false);
      lastActionRef.current = null;
    }

    setQuery(newQuery);

    if (newQuery.trim().length >= 2) {
      searchService.search(newQuery);
    } else {
      searchService.clear();
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchCompleted]);

  /**
   * Handle city selection
   */
  const handleCitySelect = useCallback(async (citySuggestion) => {
    lastActionRef.current = 'select';
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchCompleted(true);
    setQuery(citySuggestion.label);

    // If coordinates are already available, use them
    if (citySuggestion.coordinates?.latitude && citySuggestion.coordinates?.longitude) {
      onCitySelect?.(citySuggestion.label, citySuggestion.coordinates);
      return citySuggestion.coordinates;
    }

    // Otherwise, geocode the city
    setLoading(true);
    try {
      const coords = await searchService.geocodeCity(citySuggestion.label);
      if (coords) {
        onCitySelect?.(citySuggestion.label, coords);
        return coords;
      }
      return null;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [onCitySelect]);

  /**
   * Handle store selection
   */
  const handleStoreSelect = useCallback((storeSuggestion) => {
    lastActionRef.current = 'select';
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchCompleted(true);
    setQuery(storeSuggestion.label);

    if (storeSuggestion.location) {
      onStoreSelect?.(storeSuggestion);
    }
  }, [onStoreSelect]);

  /**
   * Handle suggestion press (auto-detect type)
   */
  const handleSuggestionPress = useCallback(async (suggestion) => {
    if (suggestion.type === 'city') {
      return await handleCitySelect(suggestion);
    } else if (suggestion.type === 'store') {
      handleStoreSelect(suggestion);
      return suggestion.location;
    }
    return null;
  }, [handleCitySelect, handleStoreSelect]);

  /**
   * Submit search (for manual search submission)
   */
  const submitSearch = useCallback(async () => {
    if (!query.trim()) return;

    lastActionRef.current = 'search';
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchCompleted(true);
    searchService.cancelPendingSearch();
  }, [query]);

  /**
   * Clear search
   */
  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchCompleted(false);
    lastActionRef.current = null;
    searchService.clear();
  }, []);

  /**
   * Focus handler - show suggestions if available
   */
  const handleFocus = useCallback(() => {
    if (suggestions.length > 0 && !searchCompleted) {
      setShowSuggestions(true);
    }
  }, [suggestions.length, searchCompleted]);

  /**
   * Blur handler - hide suggestions
   */
  const handleBlur = useCallback(() => {
    // Delay to allow suggestion press to register
    setTimeout(() => {
      if (isMounted.current) {
        setShowSuggestions(false);
      }
    }, 200);
  }, []);

  /**
   * Geocode a city name
   */
  const geocodeCity = useCallback(async (cityName) => {
    return await searchService.geocodeCity(cityName);
  }, []);

  return {
    // State
    query,
    suggestions,
    loading,
    showSuggestions,
    searchCompleted,

    // Derived state
    hasSuggestions: suggestions.length > 0,
    hasQuery: query.trim().length > 0,

    // Methods
    updateQuery,
    handleCitySelect,
    handleStoreSelect,
    handleSuggestionPress,
    submitSearch,
    clearSearch,
    handleFocus,
    handleBlur,
    geocodeCity,

    // For direct control
    setQuery,
    setShowSuggestions,
    setSearchCompleted,

    // Direct access to service for advanced use cases
    service: searchService,
  };
}

export default useSearch;
