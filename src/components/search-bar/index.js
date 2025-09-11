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
import cities from '../cities/cities.json';
import { useTranslation } from '../../utils/useTranslation';
import { StoreContext } from '../../context/StoreContext';

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
  const { searchQuery, setSearchQuery } = useContext(StoreContext);
  const defaultPlaceholder = placeholder || t('search_placeholder') || 'Search stores or cities (press Enter)';
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);


  // Clear suggestions when search query is empty
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
  }, [searchQuery]);

  // Show suggestions as user types, but don't perform search until Enter is pressed
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Only start searching after 2 characters
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounced search for suggestions (but not for actual search)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const fetchSuggestions = async (query) => {
    if (!query.trim() || query.trim().length < 2) return;

    console.log('🔍 Fetching suggestions for query:', query);
    setLoading(true);
    try {
      const citySuggestions = await fetchCitySuggestions(query);
      const storeSuggestions = fetchStoreSuggestions(query);

      console.log('📍 City suggestions found:', citySuggestions.length);
      console.log('🏪 Store suggestions found:', storeSuggestions.length);

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
      
      console.log('📊 Final suggestions breakdown:');
      console.log('  - Cities from predefined list:', formattedCities.filter(c => c.source === 'predefined').length);
      console.log('  - Cities from geocoding:', formattedCities.filter(c => c.source === 'geocoded').length);
      console.log('  - Stores from local data:', formattedStores.length);
      console.log('  - Total suggestions:', allSuggestions.length);
      
      setSuggestions(allSuggestions);
      // Show suggestions after user has pressed Enter to search
      setShowSuggestions(allSuggestions.length > 0);
    } catch (error) {
      console.error('❌ Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCitySuggestions = async (query) => {
    if (query.trim().length < 2) return [];
    
    const lowerQuery = query.toLowerCase();
    
    console.log('🏙️ Searching for cities with query:', query);
    
    // First, check our predefined cities
    const predefinedCities = cities.filter(city =>
      city.toLowerCase().startsWith(lowerQuery)
    );
    
    console.log('📋 Predefined cities found:', predefinedCities.length);
    if (predefinedCities.length > 0) {
      console.log('📋 Predefined cities:', predefinedCities.slice(0, 3));
    }

    // If we have enough predefined cities, return them
    if (predefinedCities.length >= 15) {
      console.log('✅ Using only predefined cities (15+ found)');
      return predefinedCities.slice(0, 15).map(city => ({ name: city, source: 'predefined' }));
    }

    // Try to get additional cities from geocoding
    console.log('🌐 Attempting geocoding for additional cities...');
    try {
      const locations = await Location.geocodeAsync(query);
      console.log('🌐 Geocoding results:', locations.length, 'locations found');
      
      // Create a set of lowercase predefined city names for efficient lookup
      const predefinedCitySet = new Set(predefinedCities.map(city => city.toLowerCase()));
      
      const geocodedCities = locations
        .map(location => {
          // Extract city name from location if possible
          const cityName = location.name || location.city || query;
          console.log('🌐 Geocoded location:', { name: cityName, coords: location });
          return { name: cityName, source: 'geocoded', location };
        })
        .filter(city => {
          // Case-insensitive deduplication
          const isDuplicate = predefinedCitySet.has(city.name.toLowerCase());
          if (isDuplicate) {
            console.log('🔄 Filtering out duplicate city:', city.name, '(already in predefined list)');
          }
          return !isDuplicate;
        });

      console.log('🌐 Unique geocoded cities:', geocodedCities.length);
      
      const allCities = [
        ...predefinedCities.map(city => ({ name: city, source: 'predefined' })),
        ...geocodedCities
      ].slice(0, 15);
      
      console.log('🏙️ Final city suggestions:', allCities.map(c => `${c.name} (${c.source})`));
      return allCities;
      
    } catch (error) {
      console.warn('❌ Geocoding failed, using only predefined cities:', error);
      return predefinedCities.slice(0, 15).map(city => ({ name: city, source: 'predefined' }));
    }
  };

  const fetchStoreSuggestions = (query) => {
    if (!query.trim() || query.trim().length < 2 || !allStores.length) return [];

    console.log('🏪 Searching stores with query:', query);
    console.log('🏪 Total stores available:', allStores.length);

    const lowerQuery = query.toLowerCase();
    
    // Debug: Log all stores that contain the query
    const allMatchingStores = allStores.filter(store => 
      store?.name?.toLowerCase().includes(lowerQuery)
    );
    console.log('🔍 All stores containing query:', allMatchingStores.map(s => s.name));
    
    const matchingStores = allStores
      .filter(store => store?.name?.toLowerCase().startsWith(lowerQuery))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 15);
    
    console.log('🏪 Matching stores found:', matchingStores.length);
    if (matchingStores.length > 0) {
      console.log('🏪 Store names:', matchingStores.map(s => s.name));
    }

    // Check for duplicates in the results
    const storeNames = matchingStores.map(s => s.name);
    const uniqueNames = [...new Set(storeNames)];
    if (storeNames.length !== uniqueNames.length) {
      console.warn('⚠️ Duplicate store names found:', storeNames.filter((name, index) => storeNames.indexOf(name) !== index));
    }

    return matchingStores.map(store => ({
      id: store.id,
      name: store.name,
      location: store.address?.[0]?.location?.geopoint || null,
    }));
  };

  const handleSuggestionPress = async (suggestion) => {
    console.log('🎯 Suggestion selected:', {
      label: suggestion.label,
      type: suggestion.type,
      source: suggestion.source || 'unknown'
    });
    
    setSearchQuery(suggestion.label);
    setShowSuggestions(false);
    setSuggestions([]);

    try {
      if (suggestion.type === "city") {
        console.log('🏙️ Processing city selection...');
        await handleCitySelect(suggestion);
      } else if (suggestion.type === "store") {
        console.log('🏪 Processing store selection...');
        handleStoreSelect(suggestion);
      }
    } catch (error) {
      console.error('❌ Error in handleSuggestionPress:', error);
    }
  };

  const handleCitySelect = async (citySuggestion) => {
    console.log('handleCitySelect called with:', citySuggestion);
    try {
      setLoading(true);
      
      // Check if it's a predefined city
      const isPredefinedCity = cities.some(
        city => city.toLowerCase() === citySuggestion.label.toLowerCase()
      );

      console.log('Is predefined city:', isPredefinedCity);

      if (!isPredefinedCity) {
        Alert.alert(
          "City Not Supported",
          `${citySuggestion.label} is not yet supported by the app. Please try a different city.`,
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }

      // Geocode the city
      const locations = await Location.geocodeAsync(citySuggestion.label);
      console.log('Geocoded locations:', locations);
      
      if (locations.length > 0) {
        const { latitude, longitude } = locations[0];
        console.log('Calling onCitySelect with coordinates:', { latitude, longitude });
        
        // Clear the search query after city selection to show all stores in the area
        setSearchQuery('');
        
        onCitySelect?.(citySuggestion.label, { latitude, longitude });
      } else {
        Alert.alert("Error", "Could not find coordinates for this city.");
      }
    } catch (error) {
      console.error('Error handling city selection:', error);
      Alert.alert("Error", "Failed to process city selection.");
    } finally {
      setLoading(false);
    }
  };

  const handleStoreSelect = (storeSuggestion) => {
    console.log('handleStoreSelect called with:', storeSuggestion);
    if (storeSuggestion.location) {
      console.log('Calling onStoreSelect with location:', storeSuggestion.location);
      onStoreSelect?.(storeSuggestion);
    } else {
      console.log('Store location not available');
      Alert.alert("Error", "Store location not available.");
    }
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;

    console.log('🔍 Search submitted:', searchQuery.trim());
    
    // Fetch suggestions when user presses Enter
    fetchSuggestions(searchQuery.trim());
    
    // After fetching, try to find a match
    setTimeout(() => {
      const matchedSuggestion = suggestions.find(
        sugg => sugg.label.toLowerCase() === searchQuery.trim().toLowerCase()
      );

      if (matchedSuggestion) {
        handleSuggestionPress(matchedSuggestion);
      } else {
        // If no exact match, try to treat as city search
        handleCitySelect({ label: searchQuery.trim() });
      }
    }, 300); // Increased delay to ensure suggestions are loaded
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onSearch?.('');
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
            onChangeText={setSearchQuery}
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
              <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchButton}>
                <Ionicons name="search" size={20} color={AppColors.primary} />
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

            {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsWrapper}>
          <View style={styles.suggestionsContainer}>
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
                    console.log('🎯 TouchableOpacity pressed for:', suggestion.label);
                    handleSuggestionPress(suggestion);
                  }}
                  onPressIn={() => console.log('🎯 Press in:', suggestion.label)}
                  onPressOut={() => console.log('🎯 Press out:', suggestion.label)}
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
    fontSize: 16,
    color: AppColors.black,
    paddingVertical: 8,
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
    fontSize: 16,
    color: AppColors.black,
    flexShrink: 1, // Allow text to shrink
  },

});

export default SearchBar;
