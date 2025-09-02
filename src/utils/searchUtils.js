import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { AppColors } from '../../utils';
import { height, width } from '../../utils/dimension';
import cities from '../cities/cities.json';

const SearchBar = ({
  placeholder = "Search for a city or store",
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
  const [searchQuery, setSearchQuery] = useState('');
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

  // Debounced search suggestions
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

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
    if (!query.trim()) return;

    setLoading(true);
    try {
      const citySuggestions = await fetchCitySuggestions(query);
      const storeSuggestions = fetchStoreSuggestions(query);

      const formattedCities = citySuggestions.map(city => ({ 
        label: city, 
        type: "city" 
      }));
      
      const formattedStores = storeSuggestions.map(store => ({ 
        label: store.name, 
        id: store.id, 
        location: store.location, 
        type: "store" 
      }));

      const allSuggestions = [...formattedCities, ...formattedStores];
      setSuggestions(allSuggestions);
      setShowSuggestions(allSuggestions.length > 0);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCitySuggestions = async (query) => {
    const lowerQuery = query.toLowerCase();
    
    // First, check our predefined cities
    const predefinedCities = cities.filter(city =>
      city.toLowerCase().startsWith(lowerQuery)
    );

    // If we have enough predefined cities, return them
    if (predefinedCities.length >= 5) {
      return predefinedCities.slice(0, 5);
    }

    // Try to get additional cities from Mapbox/geocoding
    try {
      const locations = await Location.geocodeAsync(query);
      const geocodedCities = locations
        .map(location => {
          // Extract city name from location if possible
          // This is a simplified approach - you might want to use reverse geocoding
          return location.name || query;
        })
        .filter(city => !predefinedCities.includes(city));

      return [...predefinedCities, ...geocodedCities].slice(0, 5);
    } catch (error) {
      console.warn('Geocoding failed, using only predefined cities:', error);
      return predefinedCities;
    }
  };

  const fetchStoreSuggestions = (query) => {
    if (!query.trim() || !allStores.length) return [];

    const lowerQuery = query.toLowerCase();
    return allStores
      .filter(store => store?.name?.toLowerCase().startsWith(lowerQuery))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 5)
      .map(store => ({
        id: store.id,
        name: store.name,
        location: store.address?.[0]?.location?.geopoint || null,
      }));
  };

  const handleSuggestionPress = async (suggestion) => {
    setSearchQuery(suggestion.label);
    setShowSuggestions(false);
    setSuggestions([]);

    if (suggestion.type === "city") {
      await handleCitySelect(suggestion);
    } else if (suggestion.type === "store") {
      handleStoreSelect(suggestion);
    }
  };

  const handleCitySelect = async (citySuggestion) => {
    try {
      setLoading(true);
      
      // Check if it's a predefined city
      const isPredefinedCity = cities.some(
        city => city.toLowerCase() === citySuggestion.label.toLowerCase()
      );

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
      if (locations.length > 0) {
        const { latitude, longitude } = locations[0];
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
    if (storeSuggestion.location) {
      onStoreSelect?.(storeSuggestion);
    } else {
      Alert.alert("Error", "Store location not available.");
    }
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;

    const matchedSuggestion = suggestions.find(
      sugg => sugg.label.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (matchedSuggestion) {
      handleSuggestionPress(matchedSuggestion);
    } else {
      // If no exact match, try to treat as city search
      handleCitySelect({ label: searchQuery.trim() });
    }
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
            placeholder={placeholder}
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
              // Delay hiding suggestions to allow for taps
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
          {showClearButton && searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={AppColors.grey_200} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={`${suggestion.type}-${index}`}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(suggestion)}
            >
              <View style={styles.suggestionContent}>
                <Ionicons 
                  name={suggestion.type === "city" ? "location" : "business"} 
                  size={16} 
                  color={AppColors.grey_200} 
                  style={styles.suggestionIcon}
                />
                <Text style={styles.suggestionText}>
                  {suggestion.label}
                </Text>
                <Text style={styles.suggestionType}>
                  {suggestion.type === "city" ? "(city)" : "(store)"}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
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
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: AppColors.white,
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    maxHeight: 300,
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
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 16,
    color: AppColors.black,
  },
  suggestionType: {
    fontSize: 12,
    color: AppColors.grey_200,
    fontStyle: 'italic',
  },
});

export default SearchBar;
