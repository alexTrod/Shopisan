import React, { useEffect, useState, useRef, useContext, useMemo } from "react";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";
import { StyleSheet, View, Alert, TextInput, Text, TouchableOpacity, Modal } from "react-native";
import FloatingCards from "../../../components/card-Item";
import ItemDetailModal from "../../../components/item-card/ItemDetailModal";
import MapCategoryFilter from "../../../components/map-category-filter";
import SearchBar from "../../../components/search-bar";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { firestore } from "../../../../firebaseconfig";
import { query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import logging from "../../../utils/logging";
import MapboxGL from "@rnmapbox/maps";
import CustomText from "../../../components/text";
import { StoreContext } from '../../../context/StoreContext';
import { signOut } from "../../../Redux/Actions/UserActions";
import { useTranslation } from "../../../utils/useTranslation";

import { setCustomLocation } from '../../../Redux/Actions/LocationActions';
import { setSelectedCategories } from '../../../Redux/Actions/CategoriesActions';
import locationService from "../../../utils/locationService";
import CustomMarker from "../../../components/customMarker";

MapboxGL.setAccessToken('sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ');

const SEARCH_RADIUS_KM = 10; // Initial radius for finding nearby stores
const REFRESH_DISTANCE_KM = 0.5; // Reduced to 500m to be more responsive to map movements

export default function Map({ navigation, route  }) {
  const { t } = useTranslation();
  const rawInitialStore = route?.params?.initialStore || null;
  
  // Extract coordinates from initial store if it has a geopoint
  const initialStore = useMemo(() => {
    if (!rawInitialStore) return null;
    const geopoint = rawInitialStore?.address?.[0]?.location?.geopoint;
    if (geopoint) {
      return {
        ...rawInitialStore,
        latitude: Number(geopoint.latitude),
        longitude: Number(geopoint.longitude),
      };
    }
    return rawInitialStore;
  }, [rawInitialStore?.id]);
  
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [showNoStoresMessage, setShowNoStoresMessage] = useState(false);
  const [showNoStoresModal, setShowNoStoresModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(initialStore ? initialStore : null);
  const [suggestions, setSuggestions] = useState([]);

  // Get all necessary data from StoreContext
  const { 
    userLocation, 
    customLocation, 
    searchQuery, 
    setSearchQuery, 
    filteredStores, 
    allStores,
    setHasRequestedStores 
  } = useContext(StoreContext);
  
  const [cameraCoordinates, setCameraCoordinates] = useState(
    initialStore
      ? {
          latitude: initialStore.latitude,
          longitude: initialStore.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
          zoom: 14
        }
      : null // No default location, will use user's location
  );

  const [lastPosition, setLastPosition] = useState(null);
  const flatListRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStoreDetails, setSelectedStoreDetails] = useState(null);
  const mapRef = useRef(null);
  const allCategories = useSelector(state => state.categories.categories);
  const selectedCategories = useSelector(state => state.categories.selectedCategories);
  const [mapCenter, setMapCenter] = useState(null);
  const [currentRegion, setCurrentRegion] = useState(null);
  const markerRefs = useRef({});
  const [currentZoom, setCurrentZoom] = useState(12);
  const cameraRef = useRef(null);
  const user = useSelector(state => state.user.userData);
  const [loggingOut, setLoggingOut] = useState(false);

  const previousLocationRef = useRef(null);

  const dispatch = useDispatch();

  const lastRecenteringTime = useRef(0);

  // Load stores and initialize map on mount
  useEffect(() => {
    const initializeMap = async () => {
      try {
        setLoading(true);
        
        // Priority 1: If we have an initial store, use its location
        if (initialStore) {
          setCameraCoordinates({
            latitude: initialStore.latitude,
            longitude: initialStore.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
            zoom: 14
          });
          await fetchNearbyStores(initialStore.latitude, initialStore.longitude, true);
          setLoading(false);
          return;
        }
        
        // Priority 2: Use customLocation from home screen if available (for synchronization)
        if (customLocation?.latitude && customLocation?.longitude) {
          setCameraCoordinates({
            latitude: customLocation.latitude,
            longitude: customLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
            zoom: 12
          });
          
          // Fetch nearby stores within 10km
          await fetchNearbyStores(customLocation.latitude, customLocation.longitude, true);
          setLoading(false);
          return;
        }
        
        // Priority 3: Get user's current location
        const location = userLocation || await locationService.getUserLocation({
          useCache: true,
          showToast: false
        });
        
        if (location) {
          setCameraCoordinates({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
            zoom: 12
          });
          
          // Fetch nearby stores within 10km
          await fetchNearbyStores(location.latitude, location.longitude);
        } else {
          // Fallback: no location available
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        setLoading(false);
      }
    };
    
    initializeMap();
  }, [initialStore?.id, initialStore?.latitude, initialStore?.longitude, customLocation?.latitude, customLocation?.longitude]); // use stable deps to avoid re-running each render

  useEffect(() => {
    const now = Date.now();

    // Only use userLocation if we have an initial store
    // For normal map loads without initial store, stick with Brussels default
    if (
      userLocation &&
      initialStore && // Only use userLocation when we have an initial store
      now - lastRecenteringTime.current > 2000 &&
      (!previousLocationRef.current ||
        locationService.getDistanceInKm(
          previousLocationRef.current.latitude,
          previousLocationRef.current.longitude,
          userLocation.latitude,
          userLocation.longitude
        ) > 0.1)
    ) {
      lastRecenteringTime.current = now;
      previousLocationRef.current = userLocation;

      fetchNearbyStores(userLocation.latitude, userLocation.longitude).then(() => {
        setCameraCoordinates({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
          zoom: initialStore ? 14 : 12
        });
      });
    }
  }, [userLocation, initialStore]);

  const fetchNearbyStores = async (latitude, longitude, useAllStores = false, maxRadius = SEARCH_RADIUS_KM) => {
    try {
      setLoading(true);
      
      // Use allStores when exploring (ignore category filters), otherwise use filteredStores
      const userLocation = { latitude, longitude };
      const storesToUse = useAllStores || isExploring.current ? allStores : filteredStores;
      
      // For map: Use strict radius filter (don't expand, don't return all stores if none found)
      // This ensures we show the modal when there are truly no stores nearby
      const nearbyStores = locationService.filterStoresByRadius(
        storesToUse, 
        userLocation, 
        maxRadius
      );
      
      setStores(nearbyStores);
      setSuggestions([]);
    } catch (error) {
      logging("Erreur lors du filtrage local des magasins :", error);
    } finally {
      setLoading(false);
    }
  };

  // Don't automatically fetch all stores - only fetch when we have a specific location
  // This prevents showing all stores by default
  useEffect(() => {
    // Only refetch if we already have a location set (don't run on initial mount)
    if (userLocation && allStores.length > 0 && cameraCoordinates) {
      fetchNearbyStores(userLocation.latitude, userLocation.longitude);
    }
  }, [allStores]);

  // Refetch stores when category filters change
  useEffect(() => {
    if (currentRegion && !isExploring.current && allStores.length > 0) {
      fetchNearbyStores(currentRegion.latitude, currentRegion.longitude);
    }
  }, [selectedCategories]);

  const shouldIgnoreRegionChange = useRef(false);
  const isExploring = useRef(false);

  // Debounce the "no stores" message/modal to prevent it from flashing during searches/movements
  useEffect(() => {
    if (loading || initialStore) { // Don't show if we have an initial store
      setShowNoStoresMessage(false);
      setShowNoStoresModal(false);
      return;
    }

    if (stores.length > 0) {
      setShowNoStoresMessage(false);
      setShowNoStoresModal(false);
      return;
    }

    // Only show "no stores" after stores have been empty for 1.5 seconds
    const timer = setTimeout(() => {
      if (stores.length === 0 && !loading && !initialStore) {
        // If no category filters, show modal. Otherwise show inline message.
        if (!selectedCategories || selectedCategories.length === 0) {
          setShowNoStoresModal(true);
        } else {
          setShowNoStoresMessage(true);
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [stores.length, loading, initialStore, selectedCategories]);

  const handleDirectLogout = () => {
      setLoggingOut(true);
      setTimeout(() => {
        dispatch(signOut());
      }, 100);
  };

  const getCategoryName = (id) => {
    const match = allCategories.find(cat => cat.id === id);
    return match ? match.name : `#${id}`;
  };  

  // Map stores to include named tags AND extract coordinates from geopoint
  const storesWithNamedTags = stores.map(store => {
    const geopoint = store?.address?.[0]?.location?.geopoint;
    const latitude = geopoint ? Number(geopoint.latitude) : null;
    const longitude = geopoint ? Number(geopoint.longitude) : null;
    
    return {
      ...store,
      latitude,
      longitude,
      tags: store.category?.map(getCategoryName) || [],
    };
  }).filter(store => store.latitude !== null && store.longitude !== null); // Only include stores with valid coordinates

  useEffect(() => {
    if (initialStore && stores.length > 0) {
      const matchingStore = stores.find((store) => store.id === initialStore.id);
      if (matchingStore) {
        setSelectedStore(matchingStore);
      }
    }
  }, [initialStore?.id, stores.length]);  

  const getCameraCenterFromBounds = async () => {
    try {
      if (mapRef.current && mapRef.current.getVisibleBounds) {
        const bounds = await mapRef.current.getVisibleBounds();
        if (Array.isArray(bounds) && bounds.length === 2) {
          const [sw, ne] = bounds;

          const centerLat = (sw[1] + ne[1]) / 2;
          const centerLng = (sw[0] + ne[0]) / 2;

          return { latitude: centerLat, longitude: centerLng };
        }
      }
    } catch (error) {
      console.warn("Impossible d'obtenir le centre de la caméra via les bounds :", error);
    }

    return null;
  };

  const exploreRandomCity = async () => {
    try {
      // Get all cities with stores
      const citiesWithStores = [...new Set(allStores.map(store => store.cityName).filter(Boolean))];
      
      if (citiesWithStores.length === 0) {
        Alert.alert(
          t('no_stores_found') || "No stores found",
          t('no_stores_available') || "No stores available at the moment."
        );
        return;
      }
      
      // Pick a random city
      const randomCity = citiesWithStores[Math.floor(Math.random() * citiesWithStores.length)];
      
      // Find stores in that city
      const cityStores = allStores.filter(store => store.cityName === randomCity);
      
      if (cityStores.length > 0) {
        // Get the first store to center the map
        const firstStore = cityStores[0];
        const geopoint = firstStore?.address?.[0]?.location?.geopoint;
        
        if (geopoint && cameraRef.current) {
          const storeLat = Number(geopoint.latitude);
          const storeLng = Number(geopoint.longitude);
          
          // Set exploring mode to prevent region changes from using filtered stores
          isExploring.current = true;
          shouldIgnoreRegionChange.current = true;
          
          // Animate to the random city
          cameraRef.current.setCamera({
            centerCoordinate: [storeLng, storeLat],
            zoomLevel: 12,
            animationDuration: 1500,
          });
          
          // Update search query to show the city
          setSearchQuery(randomCity);
          
          // Fetch nearby stores (use all stores to ignore category filters when exploring)
          await fetchNearbyStores(storeLat, storeLng, true);
          
          // Re-enable region change handling after animation and settling completes
          // Using 3500ms to ensure the animation (1500ms) + settling time is fully complete
          setTimeout(() => {
            shouldIgnoreRegionChange.current = false;
            // Keep exploring mode active longer to preserve the stores
            setTimeout(() => {
              isExploring.current = false;
            }, 2000);
          }, 3500);
        }
      }
    } catch (error) {
      console.error("Error exploring random city:", error);
    }
  };

  const findClosestStore = async () => {
    setSuggestions([]);
    setSearchQuery("");
    const center = await getCameraCenterFromBounds();

    if (
      !center ||
      typeof center.latitude !== 'number' ||
      typeof center.longitude !== 'number' ||
      isNaN(center.latitude) ||
      isNaN(center.longitude) ||
      Math.abs(center.latitude) > 90 ||
      Math.abs(center.longitude) > 180
    ) {
      Alert.alert("Unknown location", "Unable to determine the map center.");
      return;
    }


    try {

      let closestStore = null;
      let minDistance = Infinity;

      allStores.forEach((store) => {
        const geopoint = store?.address?.[0]?.location?.geopoint;
        if (!geopoint) return;

        const storeLat = Number(geopoint.latitude);
        const storeLng = Number(geopoint.longitude);

        if (
          typeof storeLat !== 'number' ||
          typeof storeLng !== 'number' ||
          isNaN(storeLat) || isNaN(storeLng) ||
          Math.abs(storeLat) > 90 || Math.abs(storeLng) > 180
        ) {
          return;
        }

        const distance = locationService.getDistanceInKm(
          center.latitude,
          center.longitude,
          storeLat,
          storeLng
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestStore = {
            ...store,
            latitude: storeLat,
            longitude: storeLng,
            distance: distance.toFixed(2),
          };
        }
      });

      if (closestStore) {
        const region = {
          latitude: closestStore.latitude,
          longitude: closestStore.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        dispatch(setCustomLocation({ latitude: region.latitude, longitude: region.longitude }));
        setCameraCoordinates(region);
        setLastPosition({ latitude: region.latitude, longitude: region.longitude });

        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [region.longitude, region.latitude],
            zoomLevel: 12,
            animationDuration: 1000,
          });
        }
      } else {
        Alert.alert("No stores found", "No valid stores found near your location.");
      }
    } catch (error) {
      console.error("Erreur lors de la recherche du magasin le plus proche :", error);
    }
  };

  const expandSearchAround = async () => {
    try {
      // Determine base location: map center preferred, fallback to userLocation
      const center = await getCameraCenterFromBounds();
      const base =
        center && typeof center.latitude === 'number' && typeof center.longitude === 'number'
          ? center
          : userLocation;
      
      if (!base) {
        Alert.alert(
          t('location_required') || 'Location Required',
          t('enable_location_message') || 'Please enable location services to expand search.'
        );
        return;
      }
      
      // Use expanding radius against allStores, up to 500km
      const nearbyStores = locationService.getStoresWithExpandingRadius(
        allStores,
        { latitude: base.latitude, longitude: base.longitude },
        500
      );
      
      setStores(nearbyStores);
      setShowNoStoresMessage(false);
      setShowNoStoresModal(false);
    } catch (error) {
      console.error('Error expanding search around:', error);
    }
  };

  useEffect(() => {
    const getSuggestions = async () => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      if (searchQuery.length === 0) {
        setSuggestions([]);
        return;
      }
  
      const citySuggestions = await fetchCitySuggestions(searchQuery);
      const storeSuggestions = await fetchStoreNameSuggestions(searchQuery);
  
      const formattedCities = citySuggestions.map(city => ({ label: city, type: "city" }));
      const formattedStores = storeSuggestions.map(store => ({ label: store.name, id: store.id, location: store.location, type: "store" }));
  
      setSuggestions([...formattedCities, ...formattedStores]);
    };
  
    const delayDebounce = setTimeout(() => {
      getSuggestions();
    }, 300);
    
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);  

  const fetchCitySuggestions = async (query) => {
    if (!query.trim()) return [];
    
    try {
      //const cities = await getCitiesForSearch(query, 15);
      const cities = []
      return cities.map(city => city.name);
    } catch (error) {
      console.error('Error fetching city suggestions:', error);
      return [];
    }
  };    

  // Map-specific search handlers for SearchBar component
  const handleMapCitySelect = async (cityName, coordinates) => {
    try {
      const { latitude, longitude } = coordinates;
      
      // Prevent region change from refetching during animation
      shouldIgnoreRegionChange.current = true;
      
      setCameraCoordinates({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: 12,
          animationDuration: 1000,
        });
      }

      setHasRequestedStores?.(true);
      dispatch(setCustomLocation({ latitude, longitude }));
      setLastPosition({ latitude, longitude });
      await fetchNearbyStores(latitude, longitude, true);
      
      // Re-enable region changes after animation completes
      setTimeout(() => {
        shouldIgnoreRegionChange.current = false;
      }, 1500);
    } catch (error) {
      console.error("Error handling city selection in map:", error);
    }
  };

  const handleMapStoreSelect = async (storeSuggestion) => {
    if (storeSuggestion.location) {
      try {
        const { latitude, longitude } = storeSuggestion.location;
        
        // Prevent region change from refetching during animation
        shouldIgnoreRegionChange.current = true;
        
        setCameraCoordinates({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [longitude, latitude],
            zoomLevel: 14,
            animationDuration: 1000,
          });
        }

        setHasRequestedStores?.(true);
        dispatch(setCustomLocation({ latitude, longitude }));
        setLastPosition({ latitude, longitude });
        await fetchNearbyStores(latitude, longitude, true);
        
        // Re-enable region changes after animation completes
        setTimeout(() => {
          shouldIgnoreRegionChange.current = false;
        }, 1500);
      } catch (error) {
        console.error("Error handling store selection in map:", error);
      }
    }
  };

  const handleMapSearch = (query) => {
    // For map, we don't need to do anything special on search
    // The SearchBar component will handle suggestions and selection
    console.log('Map search query:', query);
  };  

  const getUserLocation = async () => {
    try {
      // Use location service with toast notifications
      const location = await locationService.getUserLocation({
        useCache: false, // Force fresh location
        showToast: true
      });

      const { latitude, longitude } = location;
  
      // Prevent region change from refetching during animation
      shouldIgnoreRegionChange.current = true;
      
      setHasRequestedStores?.(true);
      dispatch(setCustomLocation({ latitude, longitude }));

      setCameraCoordinates({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
        zoom: initialStore ? 14 : 12,
      });      
      setLastPosition({ latitude, longitude });
  
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: initialStore ? 14 : 12,
          animationDuration: 1000,
        });
      }
      
      await fetchNearbyStores(latitude, longitude);
      
      // Re-enable region changes after animation completes
      setTimeout(() => {
        shouldIgnoreRegionChange.current = false;
      }, 1500);
    } catch (error) {
      console.error("Erreur lors de la récupération de la localisation :", error);
    }
  };  


  const onMapIdle = async () => {
    try {
      const center = await getCameraCenterFromBounds();
      if (!center) return;

      const region = { latitude: center.latitude, longitude: center.longitude };
      setMapCenter(region);
      setCurrentRegion(region);

      if (shouldIgnoreRegionChange.current) return;

      const previous = lastPosition || region;
      const distanceMoved = locationService.getDistanceInKm(
        previous.latitude,
        previous.longitude,
        region.latitude,
        region.longitude
      );

      if (distanceMoved >= REFRESH_DISTANCE_KM) {
        setHasRequestedStores?.(true);
        setLastPosition({ latitude: region.latitude, longitude: region.longitude });
        dispatch(setCustomLocation({ latitude: region.latitude, longitude: region.longitude }));
        await fetchNearbyStores(region.latitude, region.longitude);
      }
    } catch (e) {
      console.warn('onMapIdle error:', e);
    }
  };

  const showCalloutsIfZoomed = () => {
    if (currentRegion?.latitudeDelta < 0.01) {
      Object.values(markerRefs.current).forEach((markerRef) => {
        if (markerRef) {
          markerRef.showCallout();
        }
      });
    }
  };

  const fetchStoreNameSuggestions = (searchText) => {
    if (!searchText.trim()) return [];

    const lowerSearch = searchText.toLowerCase();

    return allStores
      .filter(store => store?.name?.toLowerCase().startsWith(lowerSearch))
      .slice(0, 10)
      .map(store => ({
        id: store.id,
        name: store.name,
        location: store.address?.[0]?.location?.geopoint || null,
      }));
  };
 
  useEffect(() => {
    showCalloutsIfZoomed();
  }, [currentRegion]);

  if (loggingOut) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <CustomText>{t('logging_out') || 'Logging out...'}</CustomText>
      </View>
    );
  }

  return (
    <ScreenWrapper backgroundColor={AppColors.white_100} statusBarColor={AppColors.white_100} barStyle="dark-content">
      {!user && (
        <TouchableOpacity
          onPress={handleDirectLogout}
          style={{
            position: 'absolute',
            top: 0,
            right: 20,
            zIndex: 10000,
            marginTop: 0,
          }}
        >
          <CustomText
            size={3}
            color={AppColors.primary}
            textDecorationLine="underline"
            textStyles={{ fontFamily: "Roboto-Medium", fontWeight: "bold" }}
          >
            {t('sign_up')}
          </CustomText>
        </TouchableOpacity>
      )}
      <View style={styles.topBar}>
        <SearchBar
          placeholder={t('search_placeholder')}
          onCitySelect={handleMapCitySelect}
          onStoreSelect={handleMapStoreSelect}
          onSearch={handleMapSearch}
          allStores={allStores}
          containerStyle={styles.searchBarContainer}
        />
      </View>

      <View style={styles.container}>
        {cameraCoordinates ? (
          <View style={{ flex: 1 }}>
            <View style={styles.filterContainer}>
              <MapCategoryFilter 
                stores={stores} 
              />
            </View>
            <TouchableOpacity
              style={styles.centerButton}
              onPress={getUserLocation}
            >
              <Ionicons name="locate" size={24} color="black" />
            </TouchableOpacity>
            <MapboxGL.MapView
              ref={mapRef}
              style={styles.map}
              styleURL={MapboxGL.StyleURL.Street}
              logoEnabled={false}
              attributionEnabled={false}
              compassEnabled={true}
              onMapIdle={onMapIdle}
            >
              <MapboxGL.Camera
                ref={cameraRef}
                zoomLevel={initialStore ? 14 : cameraCoordinates?.zoom || 12}
                centerCoordinate={
                  initialStore && initialStore.longitude && initialStore.latitude
                    ? [initialStore.longitude, initialStore.latitude]
                    : cameraCoordinates?.longitude && cameraCoordinates?.latitude
                    ? [cameraCoordinates.longitude, cameraCoordinates.latitude]
                    : [4.3517, 50.8503] // Brussels fallback
                }
              />

              <MapboxGL.UserLocation visible={true} androidRenderMode="normal" />

              {(() => {
                const seenCoords = new Set();

                return stores.map((store, index) => {
                  if (
                    typeof store.latitude !== "number" ||
                    typeof store.longitude !== "number" ||
                    isNaN(store.latitude) ||
                    isNaN(store.longitude)
                  ) {
                    return null;
                  }

                  const key = `${store.latitude.toFixed(6)}_${store.longitude.toFixed(6)}`;

                  let lat = store.latitude;
                  let lng = store.longitude;

                  if (seenCoords.has(key)) {
                    const offset = 0.00002 * (index + 1);
                    lat += offset;
                    lng += offset;
                  }

                  seenCoords.add(key);

                  return (
                    <CustomMarker
                      key={store.id}
                      store={{ ...store, latitude: lat, longitude: lng }}
                      selected={selectedStore?.id === store.id}
                      showLabel={currentZoom > 12}
                      onPress={() => {
                        setSelectedStore(store);
                        setSelectedStoreDetails({
                          id: store.id,
                          title: store.name,
                          description: store.description?.fr || "No description available",
                          tags: store.category?.map(getCategoryName) || [],
                          address: store.address || "No address available",
                          openingHours: store.openingHours || null,
                        });
                        setModalVisible(true);
                      }}
                    />
                  );
                });
              })()}
            </MapboxGL.MapView>          

            {showNoStoresMessage && (
              <View style={styles.noStoreContainer}>
                <Text style={styles.noStoreText}>
                  {selectedCategories && selectedCategories.length > 0
                    ? t('no_stores_with_filters') || 'No stores found with current filters.'
                    : t('no_stores_in_area') || 'No stores found in this area.'
                  }
                </Text>

                {selectedCategories && selectedCategories.length > 0 ? (
                  <TouchableOpacity 
                    style={styles.clearFiltersButton}
                    onPress={() => dispatch(setSelectedCategories([]))}
                  >
                    <Text style={styles.clearFiltersButtonText}>
                      {t('clear_filters') || 'Clear filters'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={styles.expandButton}
                      onPress={expandSearchAround}
                    >
                      <Text style={styles.expandButtonText}>
                        {t('expand_search_around_me') || 'Expand search around me'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.addStoreButton}
                      onPress={() => navigation.navigate('AddStore')}
                    >
                      <Text style={styles.addStoreButtonText}>
                        {t('add_a_store') || 'Add a store'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.exploreButton}
                      onPress={exploreRandomCity}
                    >
                      <Text style={styles.exploreButtonText}>
                        {t('explore_random_city') || 'Explore a random city'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.loading}><Text>Loading the map...</Text></View>
        )}
      </View>
        <FloatingCards 
          data={storesWithNamedTags} 
          ref={flatListRef}
          selectedStore={selectedStore}
          onCardSelect={(store) => {
            setSelectedStore(store);

            if (store.latitude && store.longitude && cameraRef.current) {
              cameraRef.current.setCamera({
                centerCoordinate: [store.longitude, store.latitude],
                zoomLevel: 12,
                animationDuration: 1000,
              });
            }
          }}
        />
      {selectedStoreDetails && (
        <ItemDetailModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          item={selectedStoreDetails}
        />
      )}
      
      {/* No Stores Modal */}
      <Modal
        visible={showNoStoresModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoStoresModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t('no_stores_in_area') || 'No stores found in this area'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {t('no_stores_modal_description') || 'There are no stores in your current location. You can add a store or explore a random city.'}
            </Text>
            
            <TouchableOpacity 
              style={styles.modalPrimaryButton}
              onPress={() => {
                setShowNoStoresModal(false);
                navigation.navigate('AddStore');
              }}
            >
              <Text style={styles.modalPrimaryButtonText}>
                {t('add_a_store') || 'Add a store'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalSecondaryButton}
              onPress={() => {
                setShowNoStoresModal(false);
                exploreRandomCity();
              }}
            >
              <Text style={styles.modalSecondaryButtonText}>
                {t('explore_random_city') || 'Explore a random city'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowNoStoresModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>
                {t('close_button') || 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  topBar: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: width(4),
    paddingVertical: height(1),
    backgroundColor: AppColors.white_100,
  },
  searchBarContainer: {
    flex: 1,
  },
  categoryContainer: {
    flex: 0.3,
    marginRight: width(2),
  },
  searchInput: {
    flex: 1, 
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  mapContainer: {
    flex: 1,
  },
  map: { 
    flex: 1 
  },
  suggestionsContainer: {
    position: "absolute",
    top: 75,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    zIndex: 9999,
    borderRadius: 5,
    elevation: 3,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  suggestionText: {
    fontSize: 16,
  },
  filterContainer: {
    position: "absolute",
    top: -15,
    left: 10,
    right: 10,
    zIndex: 10,
    borderRadius: 10,
    padding: 10,
  },
  centerButton: {
    position: "absolute",
    bottom: 30,
    right: 10,
    backgroundColor: "white",
    borderRadius: 30,
    padding: 10,
    elevation: 5,
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  noStoreContainer: {
    position: "absolute",
    top: height(25),
    left: width(10),
    right: width(10),
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  
  noStoreText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#444",
    textAlign: "center",
  },
  closestStoreButtonText: {
    marginTop: 10,
    color: AppColors.primary,
    fontWeight: "600",
    fontSize: 15,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  addStoreButton: {
    marginTop: 15,
    backgroundColor: AppColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addStoreButtonText: {
    color: AppColors.white,
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  exploreButton: {
    marginTop: 12,
    backgroundColor: AppColors.white,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  exploreButtonText: {
    color: AppColors.primary,
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  expandButton: {
    marginTop: 12,
    backgroundColor: AppColors.white,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AppColors.grey_200,
  },
  expandButtonText: {
    color: AppColors.black,
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: 15,
    backgroundColor: AppColors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFiltersButtonText: {
    color: AppColors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: AppColors.white,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    width: width(85),
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 15,
    color: AppColors.grey_200,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalPrimaryButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  modalPrimaryButtonText: {
    color: AppColors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalSecondaryButton: {
    backgroundColor: AppColors.white,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AppColors.primary,
    marginBottom: 12,
  },
  modalSecondaryButtonText: {
    color: AppColors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalCloseButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: AppColors.grey_200,
    fontSize: 14,
  },
});
