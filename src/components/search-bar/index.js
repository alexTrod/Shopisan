import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView, // Add this import
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { AppColors } from '../../utils';
import { height, width } from '../../utils/dimension';
// Remove complex cities service import
import { useTranslation } from '../../utils/useTranslation';
import { StoreContext } from '../../context/StoreContext';
import { getCitiesForSearch } from '../../utils/citiesService';

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
  const { searchQuery, setSearchQuery, performSearch } = useContext(StoreContext);
  const defaultPlaceholder = placeholder || t('search_placeholder') || 'Search stores or cities (press Enter to search)';
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false); // Flag to prevent suggestions during selection
  const debounceRef = useRef(null);
  const lastActionRef = useRef(null); // Track last action: 'select', 'search', or 'type'


  // Auto-fetch suggestions when typing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      // Only reset flags if we're not in the middle of a selection
      if (lastActionRef.current !== 'select' && lastActionRef.current !== 'search') {
        lastActionRef.current = null;
        setIsSelecting(false);
      }
      return;
    }

    // Don't fetch suggestions if we're in the middle of selecting or if the last action was a selection or search
    if (isSelecting || lastActionRef.current === 'select' || lastActionRef.current === 'search') {
      return;
    }

    // Clear any existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Only fetch suggestions if query is at least 2 characters
    if (searchQuery.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(searchQuery.trim());
        lastActionRef.current = 'type'; // Mark this as a typing action
      }, 300); // 300ms debounce
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    // Cleanup timeout on unmount
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, isSelecting]);

  const fetchSuggestions = async (query) => {
    if (!query.trim() || query.trim().length < 2) return [];

    setLoading(true);
    try {
      const citySuggestions = await fetchCitySuggestions(query);
      const storeSuggestions = fetchStoreSuggestions(query);

      const formattedCities = citySuggestions.map(city => ({ 
        label: city.name || city, 
        type: "city",
        source: city.source || 'unknown'
      }));
      
      const formattedStores = storeSuggestions.map(store => ({ 
        label: store.name, 
        id: store.id, 
        location: store.location, 
        type: "store",
        source: 'local_stores'
      }));

      const allSuggestions = [...formattedCities, ...formattedStores];
      
      setSuggestions(allSuggestions);
      setShowSuggestions(allSuggestions.length > 0);
      return allSuggestions;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchCitySuggestions = async (query) => {
    if (query.trim().length < 2) return [];
    
    try {
      // First, let's try to get all cities to see if the service is working at all
      const { getAllCities } = await import('../../utils/citiesService');
      const allCities = await getAllCities();
      
      if (allCities.length === 0) {
        // Fallback to some hardcoded French cities for testing
        const fallbackCities = [
          'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'
        ].filter(city => city.toLowerCase().includes(query.toLowerCase()));
        
        return fallbackCities.map(city => ({
          name: city,
          source: 'fallback',
          latitude: null,
          longitude: null,
          country_id: 'FR'
        }));
      }
      
      // Use the proper cities service from Firestore
      const cities = await getCitiesForSearch(query, 10);
      
      // If no cities found, try a more aggressive search
      if (cities.length === 0 && allCities.length > 0) {
        const searchLower = query.toLowerCase();
        const aggressiveSearch = allCities.filter(city => {
          // Cities have fr/en fields directly
          const frName = city.fr;
          const enName = city.en;
          
          // Check French name
          if (frName && typeof frName === 'string') {
            return frName.toLowerCase().startsWith(searchLower);
          }
          
          // Check English name
          if (enName && typeof enName === 'string') {
            return enName.toLowerCase().startsWith(searchLower);
          }
          
          return false;
        }).slice(0, 10);
        
        if (aggressiveSearch.length > 0) {
          const formattedAggressive = aggressiveSearch.map(city => {
            // Use French name first, then English as fallback
            const name = city.fr || city.en || 'Unknown City';
            
            return {
              name: name,
              source: 'firestore_aggressive',
              latitude: city.latitude,
              longitude: city.longitude,
              country_id: city.country_id
            };
          });
          return formattedAggressive;
        }
      }
      
      const formattedCities = cities.map(city => {
        // Use French name first, then English as fallback
        const name = city.fr || city.en || 'Unknown City';
        
        return {
          name: name,
          source: 'firestore',
          latitude: city.latitude,
          longitude: city.longitude,
          country_id: city.country_id
        };
      });
      
      return formattedCities;
    } catch (error) {
      console.error('Error fetching city suggestions:', error);
      
      // Fallback to hardcoded cities on error
      const fallbackCities = [
        'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'
      ].filter(city => city.toLowerCase().includes(query.toLowerCase()));
      
      return fallbackCities.map(city => ({
        name: city,
        source: 'fallback',
        latitude: null,
        longitude: null,
        country_id: 'FR'
      }));
    }
  };

  const fetchStoreSuggestions = (query) => {
    if (!query.trim() || query.trim().length < 2 || !allStores.length) return [];

    const lowerQuery = query.toLowerCase();
    const matchingStores = allStores
      .filter(store => store?.name?.toLowerCase().startsWith(lowerQuery))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 15);

    return matchingStores.map(store => ({
      id: store.id,
      name: store.name,
      location: store.address?.[0]?.location?.geopoint || null,
    }));
  };

  const handleSuggestionPress = async (suggestion) => {
    // Dropdown closing is now handled immediately in the onPress
    setSearchQuery(suggestion.label);

    try {
      if (suggestion.type === "city") {
        await handleCitySelect(suggestion);
      } else if (suggestion.type === "store") {
        handleStoreSelect(suggestion);
      }
    } catch (error) {
      console.error('Error in handleSuggestionPress:', error);
      // Reset flags on error
      setIsSelecting(false);
      lastActionRef.current = null;
    }
  };

  const handleCitySelect = async (citySuggestion) => {
    try {
      setLoading(true);
      
      // Geocode the city
      const locations = await Location.geocodeAsync(citySuggestion.label);
      
      if (locations.length > 0) {
        const { latitude, longitude } = locations[0];
        
        // Clear the search query after city selection to show all stores in the area
        // Make sure to maintain the selecting state
        setSearchQuery('');
        lastActionRef.current = 'select'; // Ensure this stays as 'select'
        
        onCitySelect?.(citySuggestion.label, { latitude, longitude });
      } else {
        Alert.alert("Error", "Could not find coordinates for this city.");
        // Reset flags on error
        setIsSelecting(false);
        lastActionRef.current = null;
      }
    } catch (error) {
      console.error('Error handling city selection:', error);
      Alert.alert("Error", "Failed to process city selection.");
      // Reset flags on error
      setIsSelecting(false);
      lastActionRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const handleStoreSelect = (storeSuggestion) => {
    if (storeSuggestion.location) {
      // Maintain the selecting state to prevent dropdown from reopening
      lastActionRef.current = 'select';
      onStoreSelect?.(storeSuggestion);
    } else {
      Alert.alert("Error", "Store location not available.");
      // Reset flags on error
      setIsSelecting(false);
      lastActionRef.current = null;
    }
  };

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;

    lastActionRef.current = 'search'; // Mark this as a search action
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Use the performSearch from context
    await performSearch(searchQuery.trim());
    
    // Also call the onSearch callback if provided
    onSearch?.(searchQuery.trim());
  };

  const handleShowSuggestions = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    
    setLoading(true);
    
    try {
      const fetchedSuggestions = await fetchSuggestions(searchQuery.trim());
      setSuggestions(fetchedSuggestions);
      if (fetchedSuggestions.length > 0) {
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    lastActionRef.current = null; // Reset action tracking
    setIsSelecting(false); // Reset selecting flag
    onSearch?.('');
  };

  const handleTextChange = (text) => {
    // Reset flags when user starts typing again
    if (lastActionRef.current === 'select' || lastActionRef.current === 'search' || isSelecting) {
      lastActionRef.current = null;
      setIsSelecting(false);
    }
    setSearchQuery(text);
  };

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
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              // Hide suggestions when input loses focus
              setTimeout(() => setShowSuggestions(false), 200);
            }}
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
                    key={`${suggestion.type}-${index}`}
                    style={styles.suggestionItem}
                    onPress={() => {
                      // Immediately close dropdown and prevent reopening
                      setShowSuggestions(false);
                      setSuggestions([]);
                      setIsSelecting(true);
                      lastActionRef.current = 'select';
                      
                      // Then handle the suggestion
                      handleSuggestionPress(suggestion);
                    }}
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
    minWidth: 0, // Allow flex items to shrink below their content size
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: height(2),
    color: AppColors.black,
    flexShrink: 1, // Allow text to shrink
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
