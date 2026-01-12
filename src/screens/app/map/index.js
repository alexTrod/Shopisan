import React, { useEffect, useState, useRef, useContext, useMemo, useCallback } from "react";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";
import { StyleSheet, View, Alert, TextInput, Text, TouchableOpacity, Modal } from "react-native";
import FloatingCards from "../../../components/card-Item";
import ItemDetailModal from "../../../components/item-card/ItemDetailModal";
import MapCategoryFilter from "../../../components/map-category-filter";
import SearchBar from "../../../components/search-bar";
import * as Location from "expo-location";
import { useSelector, useDispatch } from "react-redux";
import { firestore } from "../../../../firebaseconfig";
import { query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import logging from "../../../utils/logging";
import MapboxGL from "@rnmapbox/maps";
import CustomText from "../../../components/text";
import { StoreContext } from '../../../context/StoreContext';
import { signOut } from "../../../Redux/Actions/UserActions";
import { useTranslation } from "../../../utils/useTranslation";
import { useFocusEffect } from "@react-navigation/native";

import { setCustomLocation } from '../../../Redux/Actions/LocationActions';
import { setSelectedCategories } from '../../../Redux/Actions/CategoriesActions';
import locationService from "../../../utils/locationService";
import CustomMarker from "../../../components/customMarker";
import Toast from 'react-native-toast-message';
import perfLogger from "../../../utils/perfLogger";

MapboxGL.setAccessToken('sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ');

const SEARCH_RADIUS_KM = 10; // Initial radius for finding nearby stores
const REFRESH_DISTANCE_KM = 0.5; // Reduced to 500m to be more responsive to map movements

export default function Map({ navigation, route  }) {
  // Track component mount time
  const mountTimeRef = useRef(Date.now());
  useEffect(() => {
    perfLogger.start('Map.componentMount');
    return () => {
      perfLogger.end('Map.componentMount');
    };
  }, []);

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

  // Debug: Log searchQuery and customLocation changes on Map
  useEffect(() => {
    console.log('[Map] searchQuery from context:', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    console.log('[Map] customLocation from context:', customLocation);
  }, [customLocation]);
  
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
  const shouldIgnoreRegionChange = useRef(false);
  const isExploring = useRef(false);

  const dispatch = useDispatch();

  const lastRecenteringTime = useRef(0);

  // Load stores and initialize map on mount
  useEffect(() => {
    const initializeMap = async () => {
      perfLogger.start('Map.initializeMap.TOTAL');
      perfLogger.start('Map.initializeMap.setup');
      console.log('[Map] initializeMap started');
      try {
        setLoading(true);
        perfLogger.end('Map.initializeMap.setup');

        // Priority 1: If we have an initial store, use its location
        console.log('[Map] Checking initialStore:', !!initialStore);
        if (initialStore) {
          perfLogger.start('Map.initialStore.setCameraCoordinates');
          setCameraCoordinates({
            latitude: initialStore.latitude,
            longitude: initialStore.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
            zoom: 14
          });
          perfLogger.end('Map.initialStore.setCameraCoordinates');

          perfLogger.start('Map.initialStore.fetchNearbyStores');
          await fetchNearbyStores(initialStore.latitude, initialStore.longitude, true);
          perfLogger.end('Map.initialStore.fetchNearbyStores');

          setLoading(false);
          perfLogger.end('Map.initializeMap.TOTAL');
          perfLogger.summary();
          return;
        }

        // Priority 2: Use customLocation from home screen if available (for synchronization)
        console.log('[Map] Checking customLocation:', customLocation);
        if (customLocation?.latitude && customLocation?.longitude) {
          perfLogger.start('Map.customLocation.setCameraCoordinates');
          setCameraCoordinates({
            latitude: customLocation.latitude,
            longitude: customLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
            zoom: 12
          });
          perfLogger.end('Map.customLocation.setCameraCoordinates');

          // Fetch nearby stores within 10km
          perfLogger.start('Map.customLocation.fetchNearbyStores');
          await fetchNearbyStores(customLocation.latitude, customLocation.longitude, true);
          perfLogger.end('Map.customLocation.fetchNearbyStores');

          setLoading(false);
          perfLogger.end('Map.initializeMap.TOTAL');
          perfLogger.summary();
          return;
        }

        // Priority 3: Get user's current location with timeout ("Around me" mode)
        console.log('[Map] Getting user location, userLocation from context:', userLocation);
        let location = userLocation;
        if (!location) {
          try {
            perfLogger.start('Map.getUserLocation');
            // Wrap in timeout to prevent hanging forever
            location = await Promise.race([
              locationService.getUserLocation({
                useCache: true,
                showToast: false
              }),
              new Promise((resolve) => setTimeout(() => {
                console.log('[Map] Location service timeout after 5s');
                resolve(null);
              }, 5000))
            ]);
            perfLogger.end('Map.getUserLocation');
          } catch (e) {
            perfLogger.end('Map.getUserLocation');
            console.log('[Map] Location service error:', e);
            location = null;
          }
        }
        console.log('[Map] Got location result:', location);

        if (location) {
          // "Around me" auto-zoom: find stores with expanding radius and zoom to show them
          perfLogger.start('Map.getStoresWithExpandingRadius');
          const nearbyStores = locationService.getStoresWithExpandingRadius(
            allStores,
            { latitude: location.latitude, longitude: location.longitude },
            30 // Max city-level radius
          );
          perfLogger.end('Map.getStoresWithExpandingRadius');

          if (nearbyStores.length > 0) {
            // Find the furthest store to determine appropriate zoom
            const maxDistance = Math.max(...nearbyStores.map(s => s.distance || 0));
            let autoZoom = 12; // Default
            if (maxDistance <= 1) autoZoom = 14;
            else if (maxDistance <= 2) autoZoom = 13;
            else if (maxDistance <= 5) autoZoom = 12;
            else if (maxDistance <= 10) autoZoom = 11;
            else if (maxDistance <= 20) autoZoom = 10;
            else autoZoom = 9;

            console.log(`[Map] Auto-zoom: found ${nearbyStores.length} stores, max distance ${maxDistance}km, zoom ${autoZoom}`);

            perfLogger.start('Map.userLocation.setCameraAndStores');
            setCameraCoordinates({
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
              zoom: autoZoom
            });
            setStores(nearbyStores);
            perfLogger.end('Map.userLocation.setCameraAndStores');
            setLoading(false);
          } else {
            // No stores in city - show toast and use default zoom
            console.log('[Map] No stores found in city area');
            Toast.show({
              type: 'info',
              text1: t('no_stores_in_city') || 'No stores in your city yet',
              text2: t('add_store_or_explore') || 'Add your favorite shops or explore another city',
              position: 'bottom',
              visibilityTime: 4000,
            });
            setCameraCoordinates({
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
              zoom: 12
            });
            setStores([]);
            setLoading(false);
          }
          perfLogger.end('Map.initializeMap.TOTAL');
          perfLogger.summary();
          return;
        } else {
          // Fallback: use Brussels as default location
          console.log('[Map] Using Brussels fallback location');
          const fallbackLat = 50.8503;
          const fallbackLng = 4.3517;
          setCameraCoordinates({
            latitude: fallbackLat,
            longitude: fallbackLng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
            zoom: 12
          });
          // Fetch stores immediately - no delay needed
          perfLogger.start('Map.fallback.fetchNearbyStores');
          fetchNearbyStores(fallbackLat, fallbackLng, true).catch(e => {
            console.log('[Map] fetchNearbyStores error:', e);
          });
          perfLogger.end('Map.fallback.fetchNearbyStores');
          setLoading(false);
        }
      } catch (error) {
        console.error('[Map] Error initializing map:', error);
        // Even on error, use fallback location
        console.log('[Map] Using Brussels fallback due to error');
        const fallbackLat = 50.8503;
        const fallbackLng = 4.3517;
        setCameraCoordinates({
          latitude: fallbackLat,
          longitude: fallbackLng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
          zoom: 12
        });
        setLoading(false);
      }
      perfLogger.end('Map.initializeMap.TOTAL');
      perfLogger.summary();
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
    perfLogger.start('fetchNearbyStores.TOTAL');
    try {
      setLoading(true);

      const userLocation = { latitude, longitude };

      perfLogger.start('fetchNearbyStores.prepareStores');
      let storesToUse = useAllStores || isExploring.current ? allStores : filteredStores;
      perfLogger.checkpoint('fetchNearbyStores.prepareStores', `Starting with ${storesToUse.length} stores`);

      // Apply category filter (OR logic) even when using allStores
      // This ensures map respects category selections from StoreContext
      if (selectedCategories?.length > 0) {
        const selectedCatStrings = selectedCategories.map(c => String(c));
        storesToUse = storesToUse.filter(store =>
          Array.isArray(store.category) &&
          store.category.some(catId => selectedCatStrings.includes(String(catId)))
        );
        perfLogger.checkpoint('fetchNearbyStores.prepareStores', `After category filter: ${storesToUse.length} stores`);
      }
      perfLogger.end('fetchNearbyStores.prepareStores');

      // For map: Use strict radius filter (don't expand, don't return all stores if none found)
      // This ensures we show the modal when there are truly no stores nearby
      perfLogger.start('fetchNearbyStores.filterByRadius');
      const nearbyStores = locationService.filterStoresByRadius(
        storesToUse,
        userLocation,
        maxRadius
      );
      perfLogger.end('fetchNearbyStores.filterByRadius');
      perfLogger.checkpoint('fetchNearbyStores.TOTAL', `Found ${nearbyStores.length} nearby stores`);

      perfLogger.start('fetchNearbyStores.setStores');
      setStores(nearbyStores);
      setSuggestions([]);
      perfLogger.end('fetchNearbyStores.setStores');
    } catch (error) {
      logging("Erreur lors du filtrage local des magasins :", error);
    } finally {
      setLoading(false);
      perfLogger.end('fetchNearbyStores.TOTAL');
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

  // Refetch stores when category filters change or filteredStores updates
  useEffect(() => {
    if (currentRegion && !isExploring.current && allStores.length > 0) {
      fetchNearbyStores(currentRegion.latitude, currentRegion.longitude);
    }
  }, [selectedCategories, filteredStores]);

  // Sync camera to customLocation when Map tab becomes focused
  // This ensures the map moves to the searched location when switching tabs
  useFocusEffect(
    useCallback(() => {
      if (!customLocation?.latitude || !customLocation?.longitude) return;

      console.log('[Map] Tab focused, syncing to customLocation:', customLocation);

      // Reset exploring mode
      isExploring.current = false;

      // Ensure coordinates are numbers to avoid Mapbox decoding errors
      const numLat = Number(customLocation.latitude);
      const numLng = Number(customLocation.longitude);

      // Update state
      setCameraCoordinates({
        latitude: numLat,
        longitude: numLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
        zoom: 12
      });
      setCurrentRegion({
        latitude: numLat,
        longitude: numLng,
      });
      setLastPosition({
        latitude: numLat,
        longitude: numLng,
      });

      // Animate camera with delay to ensure it's mounted
      const animateToLocation = () => {
        if (cameraRef.current) {
          console.log('[Map] Animating camera to:', numLat, numLng);
          cameraRef.current.setCamera({
            centerCoordinate: [numLng, numLat],
            zoomLevel: 12,
            animationDuration: 500,
          });
        } else {
          setTimeout(animateToLocation, 100);
        }
      };

      // Small delay to ensure the map is ready
      setTimeout(animateToLocation, 100);

      // Fetch stores for this location
      fetchNearbyStores(numLat, numLng, true);
    }, [customLocation?.latitude, customLocation?.longitude])
  );

  // Debounce the "no stores" message to prevent it from flashing during searches/movements
  // Now uses Toast for consistency with Home screen (replaces Modal)
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

    // Only show "no stores" after stores have been empty for 1 second
    const timer = setTimeout(() => {
      if (stores.length === 0 && !loading && !initialStore) {
        // Show inline message with action buttons (no toast - inline is enough)
        setShowNoStoresMessage(true);
        setShowNoStoresModal(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [stores.length, loading, initialStore, selectedCategories, t]);

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
          // Using 2000ms to ensure the animation (1500ms) + settling time is complete
          setTimeout(() => {
            shouldIgnoreRegionChange.current = false;
            // Keep exploring mode active briefly to preserve the stores
            setTimeout(() => {
              isExploring.current = false;
            }, 1000);
          }, 2000);
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

  // Note: Suggestions are now handled internally by the SearchBar component
  // The Map's local suggestions state is no longer used  

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

      // Reset exploring mode - we're now at an explicit search location
      isExploring.current = false;

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

        // Reset exploring mode - we're now at an explicit search location
        isExploring.current = false;

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

      if (!location) {
        console.log('[Map] getUserLocation: No location available');
        return;
      }

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


  const lastZoomRef = useRef(12);

  // Handle camera changes to track zoom level in real-time
  const onCameraChanged = (state) => {
    if (state?.properties?.zoom !== undefined) {
      const newZoom = state.properties.zoom;
      // Only update state if zoom crossed the threshold to avoid unnecessary renders
      const wasAboveThreshold = currentZoom > 14;
      const isAboveThreshold = newZoom > 14;
      if (wasAboveThreshold !== isAboveThreshold) {
        setCurrentZoom(newZoom);
      }
      lastZoomRef.current = newZoom;
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

      // Get current zoom level from lastZoomRef (updated by onCameraChanged)
      const currentZoomLevel = lastZoomRef.current;

      // Update zoom state for label visibility (in case onCameraChanged missed it)
      setCurrentZoom(currentZoomLevel);

      const previous = lastPosition || region;
      const distanceMoved = locationService.getDistanceInKm(
        previous.latitude,
        previous.longitude,
        region.latitude,
        region.longitude
      );

      const zoomChanged = Math.abs(currentZoomLevel - lastZoomRef.current) > 0.5;
      const zoomedOut = currentZoomLevel < lastZoomRef.current;

      // Don't refetch stores when only zooming out - keep existing pins visible
      // Only refetch when user pans significantly (not just zooms)
      if (zoomedOut && distanceMoved < REFRESH_DISTANCE_KM * 2) {
        // User zoomed out without significant pan - keep current stores
        return;
      }

      if (distanceMoved >= REFRESH_DISTANCE_KM) {
        setHasRequestedStores?.(true);
        setLastPosition({ latitude: region.latitude, longitude: region.longitude });
        // Don't update customLocation when panning - only update it via explicit search
        // This keeps the Stores tab synced with search bar, not with map pan
        isExploring.current = true; // Mark as exploring so we use allStores
        await fetchNearbyStores(region.latitude, region.longitude, true);
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
      {/* Sign Up and Search bar moved to unified location in bottom-tab.js */}

      <View style={styles.container}>
        {cameraCoordinates ? (
          <View style={{ flex: 1 }}>
            <View style={styles.filterContainer}>
              <MapCategoryFilter
                stores={stores}
              />
            </View>
            {/* Invisible overlay on top of Mapbox compass to add locate functionality */}
            <TouchableOpacity
              style={styles.compassOverlay}
              onPress={getUserLocation}
              activeOpacity={1}
            />
            <MapboxGL.MapView
              ref={mapRef}
              style={styles.map}
              styleURL={MapboxGL.StyleURL.Street}
              logoEnabled={false}
              attributionEnabled={false}
              compassEnabled={true}
              compassPosition={{ top: 8, right: 16 }}
              onMapIdle={onMapIdle}
              onCameraChanged={onCameraChanged}
              onDidFinishLoadingMap={() => {
                perfLogger.end('MapboxGL.loadingMap');
                perfLogger.checkpoint('Map.render', 'Mapbox finished loading map');
                perfLogger.summary();
              }}
              onWillStartLoadingMap={() => {
                perfLogger.start('MapboxGL.loadingMap');
                perfLogger.checkpoint('Map.render', 'Mapbox started loading map');
              }}
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
                perfLogger.checkpoint('Map.render', `Rendering ${stores.length} markers`);

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
                      showLabel={currentZoom > 14}
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
                {selectedCategories && selectedCategories.length > 0 ? (
                  <>
                    <Text style={styles.noStoreText}>
                      {t('no_stores_with_filters') || 'No stores found with current filters.'}
                    </Text>
                    <TouchableOpacity
                      style={styles.clearFiltersButton}
                      onPress={() => dispatch(setSelectedCategories([]))}
                    >
                      <Text style={styles.clearFiltersButtonText}>
                        {t('clear_filters') || 'Clear filters'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.noStoreText}>
                      {t('city_waiting_for_shops') || t('no_stores_in_area') || 'Your city is still waiting for its shops on Shopisan.'}
                    </Text>
                    <Text style={styles.noStoreSubtext}>
                      {t('help_us_grow') || 'Help us grow: add your favorite shops.'}
                    </Text>

                    <TouchableOpacity
                      style={styles.addStoreButton}
                      onPress={() => navigation.navigate('AddStore')}
                    >
                      <Text style={styles.addStoreButtonText}>
                        {t('add_store_or_explore') || 'Add your favorite shops'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.exploreButton}
                      onPress={exploreRandomCity}
                    >
                      <Text style={styles.exploreButtonText}>
                        {t('or_search_another_city') || 'Or search for another city.'}
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
    top: 8,
    left: 16,
    right: 16,
    zIndex: 10,
    borderRadius: 10,
    paddingBottom: 12,
  },
  compassOverlay: {
    position: "absolute",
    top: 8,
    right: 16,
    width: 44,
    height: 44,
    zIndex: 20,
    backgroundColor: "transparent",
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
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  noStoreSubtext: {
    fontSize: 14,
    fontWeight: "400",
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
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
