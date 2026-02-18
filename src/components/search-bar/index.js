/**
 * SearchBar - Search component with city and store suggestions
 *
 * Uses the new SearchService for:
 * - Debounced search with cancellation
 * - Parallel city/store suggestions
 * - Geocoding with timeout
 */

import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../utils';
import { height, width } from '../../utils/dimension';
import { useTranslation } from '../../utils/useTranslation';
import { StoreContext } from '../../context/StoreContext';

// New services
import searchService from '../../services/SearchService';
import { LOCATION_CONFIG } from '../../config/location';

const SearchBar = ({
  placeholder,
  onSearch,
  onCitySelect,
  onStoreSelect,
  allStores = [],
  style = {},
  containerStyle = {},
  showClearButton = true,
  autoFocus = false,
  returnKeyType = "search",
}) => {
  const { t } = useTranslation();
  const { searchQuery, setSearchQuery, performSearch, searchCompleted, setSearchCompleted } = useContext(StoreContext);

  const defaultPlaceholder = placeholder || t('search_placeholder') || 'Search stores or cities (press Enter to search)';

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const lastActionRef = useRef(null);
  const isMounted = useRef(true);

  // Subscribe to search service updates
  useEffect(() => {
    isMounted.current = true;

    const unsubscribe = searchService.subscribe((newSuggestions, isLoading) => {
      if (isMounted.current) {
        setSuggestions(newSuggestions);
        setLoading(isLoading);

        // Show suggestions only if we have results and not in selection mode
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

  // Handle query changes with debounced search
  useEffect(() => {
    // Don't fetch suggestions if search was completed
    if (searchCompleted || isSelecting || lastActionRef.current === 'select' || lastActionRef.current === 'search') {
      return;
    }

    const trimmedQuery = searchQuery?.trim() || '';

    if (trimmedQuery.length < LOCATION_CONFIG.MIN_SEARCH_LENGTH) {
      setSuggestions([]);
      setShowSuggestions(false);
      searchService.clear();
      return;
    }

    // Trigger debounced search
    searchService.search(trimmedQuery);

  }, [searchQuery, searchCompleted, isSelecting]);

  /**
   * Handle text input change
   */
  const handleTextChange = useCallback((text) => {
    // Reset flags when user starts typing again
    if (lastActionRef.current === 'select' || lastActionRef.current === 'search' || isSelecting || searchCompleted) {
      lastActionRef.current = null;
      setIsSelecting(false);
      setSearchCompleted(false);
    }
    setSearchQuery(text);
  }, [isSelecting, searchCompleted, setSearchQuery, setSearchCompleted]);

  /**
   * Handle suggestion press
   */
  const handleSuggestionPress = useCallback(async (suggestion) => {
    // Immediately close dropdown
    setShowSuggestions(false);
    setSuggestions([]);
    setIsSelecting(true);
    lastActionRef.current = 'select';
    setSearchQuery(suggestion.label);

    try {
      if (suggestion.type === 'city') {
        await handleCitySelect(suggestion);
      } else if (suggestion.type === 'store') {
        handleStoreSelect(suggestion);
      }
    } catch (error) {
      console.error('Error in handleSuggestionPress:', error);
      setIsSelecting(false);
      lastActionRef.current = null;
    }
  }, [handleCitySelect, handleStoreSelect, setSearchQuery]);

  /**
   * Handle city selection with geocoding
   */
  const handleCitySelect = useCallback(async (citySuggestion) => {
    try {
      setLoading(true);

      // Use coordinates if already available
      let coords = citySuggestion.coordinates;

      if (!coords?.latitude || !coords?.longitude) {
        // Geocode the city with timeout
        coords = await searchService.geocodeCity(citySuggestion.label);
      }

      if (coords) {
        lastActionRef.current = 'select';
        setSearchCompleted(true);
        setSuggestions([]);
        setShowSuggestions(false);
        onCitySelect?.(citySuggestion.label, coords);
      } else {
        Alert.alert("Error", "Could not find coordinates for this city.");
        setIsSelecting(false);
        lastActionRef.current = null;
      }
    } catch (error) {
      console.error('Error handling city selection:', error);
      Alert.alert("Error", "Failed to process city selection.");
      setIsSelecting(false);
      lastActionRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [onCitySelect, setSearchCompleted]);

  /**
   * Handle store selection
   */
  const handleStoreSelect = useCallback((storeSuggestion) => {
    if (storeSuggestion.location) {
      lastActionRef.current = 'select';
      setSearchCompleted(true);
      setSuggestions([]);
      setShowSuggestions(false);
      onStoreSelect?.(storeSuggestion);
    } else {
      Alert.alert("Error", "Store location not available.");
      setIsSelecting(false);
      lastActionRef.current = null;
    }
  }, [onStoreSelect, setSearchCompleted]);

  /**
   * Handle search submission
   */
  const handleSearchSubmit = useCallback(async () => {
    if (!searchQuery.trim()) return;

    lastActionRef.current = 'search';
    setSearchCompleted(true);
    setShowSuggestions(false);
    setSuggestions([]);
    searchService.cancelPendingSearch();

    // Perform search via context
    await performSearch(searchQuery.trim());

    // Callback
    onSearch?.(searchQuery.trim());
  }, [searchQuery, performSearch, onSearch, setSearchCompleted]);

  /**
   * Show suggestions manually
   */
  const handleShowSuggestions = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < LOCATION_CONFIG.MIN_SEARCH_LENGTH) return;

    setLoading(true);
    try {
      const fetchedSuggestions = await searchService.search(searchQuery.trim());
      if (fetchedSuggestions.length > 0) {
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  /**
   * Clear search
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    lastActionRef.current = null;
    setIsSelecting(false);
    setSearchCompleted(false);
    searchService.clear();
    onSearch?.('');
  }, [setSearchQuery, setSearchCompleted, onSearch]);

  /**
   * Handle focus
   */
  const handleFocus = useCallback(() => {
    if (suggestions.length > 0 && !searchCompleted) {
      setShowSuggestions(true);
    }
  }, [suggestions.length, searchCompleted]);

  /**
   * Handle blur
   */
  const handleBlur = useCallback(() => {
    // Delay to allow suggestion press to register
    setTimeout(() => {
      if (isMounted.current) {
        setShowSuggestions(false);
      }
    }, 200);
  }, []);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.searchContainer, style]}>
        <View style={styles.inputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={AppColors.grey_200}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={defaultPlaceholder}
            placeholderTextColor={AppColors.grey_200}
            value={searchQuery}
            onChangeText={handleTextChange}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType={returnKeyType}
            autoFocus={autoFocus}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {loading && (
            <ActivityIndicator
              size="small"
              color={AppColors.primary}
              style={styles.loadingIcon}
            />
          )}
          {searchQuery.length > 0 && (
            <>
              <TouchableOpacity
                onPress={suggestions.length > 0 ? handleSearchSubmit : handleShowSuggestions}
                style={styles.searchButton}
              >
                <Ionicons
                  name={suggestions.length > 0 ? "arrow-forward" : "search"}
                  size={20}
                  color={AppColors.primary}
                />
              </TouchableOpacity>
              {showClearButton && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={AppColors.grey_200} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {showSuggestions && (
        <View style={styles.suggestionsWrapper}>
          <View style={styles.suggestionsContainer}>
            {suggestions.length > 0 ? (
              <ScrollView
                style={{ maxHeight: 200 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
              >
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`${suggestion.type}-${suggestion.id || index}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionPress(suggestion)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.suggestionContent}>
                      <Ionicons
                        name={suggestion.type === "city" ? "location" : "business"}
                        size={16}
                        color={AppColors.grey_200}
                        style={styles.suggestionIcon}
                      />
                      <Text
                        style={styles.suggestionText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {suggestion.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noSuggestionsContainer}>
                <Text style={styles.noSuggestionsText}>
                  No suggestions found for "{searchQuery}"
                </Text>
                <TouchableOpacity
                  style={styles.searchAnywayButton}
                  onPress={() => onSearch?.(searchQuery.trim())}
                >
                  <Text style={styles.searchAnywayText}>Search anyway</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 9999,
  },
  searchContainer: {
    backgroundColor: AppColors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: height(2),
    color: AppColors.black,
    paddingVertical: 8,
    lineHeight: height(2.5),
  },
  loadingIcon: {
    marginLeft: 8,
  },
  searchButton: {
    marginLeft: 8,
    padding: 4,
    backgroundColor: AppColors.primary_faded || '#f0f8ff',
    borderRadius: 16,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  suggestionsWrapper: {
    marginTop: 4,
    zIndex: 9999,
  },
  suggestionsContainer: {
    backgroundColor: AppColors.white,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_300,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: height(2),
    color: AppColors.black,
    flexShrink: 1,
  },
  noSuggestionsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noSuggestionsText: {
    fontSize: height(2),
    color: AppColors.grey_200,
    textAlign: 'center',
    marginBottom: 15,
  },
  searchAnywayButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  searchAnywayText: {
    color: AppColors.white,
    fontSize: height(1.8),
    fontWeight: '600',
  },
});

export default SearchBar;
