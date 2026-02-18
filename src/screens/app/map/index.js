/**
 * Map Screen - Displays stores on a map
 *
 * Refactored to use the new service architecture:
 * - LocationManager for all location operations
 * - StoreService for store data and filtering
 * - Consolidated useEffects for better predictability
 */

import React, { useEffect, useState, useRef, useContext, useMemo, useCallback } from "react";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";
import { StyleSheet, View, Alert, Text, TouchableOpacity, Modal } from "react-native";
import FloatingCards from "../../../components/card-Item";
import ItemDetailModal from "../../../components/item-card/ItemDetailModal";
import MapCategoryFilter from "../../../components/map-category-filter";
import * as Location from "expo-location";
import { useSelector, useDispatch } from "react-redux";
import MapboxGL from "@rnmapbox/maps";
import CustomText from "../../../components/text";
import { StoreContext } from '../../../context/StoreContext';
import { signOut } from "../../../Redux/Actions/UserActions";
import { useTranslation } from "../../../utils/useTranslation";
import { useFocusEffect } from "@react-navigation/native";
import { setCustomLocation } from '../../../Redux/Actions/LocationActions';
import { setSelectedCategories } from '../../../Redux/Actions/CategoriesActions';
import CustomMarker from "../../../components/customMarker";
import Toast from 'react-native-toast-message';

// New services
import locationManager from "../../../services/LocationManager";
import storeService from "../../../services/StoreService";
import { LOCATION_CONFIG } from "../../../config/location";

MapboxGL.setAccessToken('sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ');

export default function Map({ navigation, route }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  // Get initial store from route params
  const rawInitialStore = route?.params?.initialStore || null;
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

  // Context and Redux state
  const {
    userLocation,
    customLocation,
    searchQuery,
    setSearchQuery,
    allStores,
    setHasRequestedStores
  } = useContext(StoreContext);

  const allCategories = useSelector(state => state.categories.categories);
  const selectedCategories = useSelector(state => state.categories.selectedCategories);
  const user = useSelector(state => state.user.userData);

  // Local state
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [showNoStoresMessage, setShowNoStoresMessage] = useState(false);
  const [showNoStoresModal, setShowNoStoresModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(initialStore);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStoreDetails, setSelectedStoreDetails] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(12);
  const [loggingOut, setLoggingOut] = useState(false);

  // Camera state - prioritize Redux customLocation (most reliable), then context userLocation
  // Don't use locationManager cache directly as it may have stale data from previous sessions
  const [cameraCoordinates, setCameraCoordinates] = useState(() => {
    if (initialStore?.latitude && initialStore?.longitude) {
      return { latitude: initialStore.latitude, longitude: initialStore.longitude, zoom: 14 };
    }
    if (customLocation?.latitude && customLocation?.longitude) {
      return { latitude: customLocation.latitude, longitude: customLocation.longitude, zoom: 12 };
    }
    if (userLocation?.latitude && userLocation?.longitude) {
      return { latitude: userLocation.latitude, longitude: userLocation.longitude, zoom: 12 };
    }
    // Fallback to default - initializeMap effect will update with correct location
    return { ...LOCATION_CONFIG.DEFAULT_LOCATION, zoom: 12 };
  });

  // Refs
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const flatListRef = useRef(null);
  const lastZoomRef = useRef(12);
  const lastPositionRef = useRef(null);
  const isExploringRef = useRef(false);
  const shouldIgnoreRegionChangeRef = useRef(false);
  const lastCitySearchTimeRef = useRef(0);
  const hasInitializedWithLocationRef = useRef(false);

  /**
   * Calculate auto-zoom based on store distances
   */
  const calculateAutoZoom = useCallback((nearbyStores) => {
    return storeService.calculateAutoZoom(nearbyStores);
  }, []);

  /**
   * Fetch nearby stores for a location
   */
  const fetchNearbyStores = useCallback((location, useExpandingRadius = false) => {
    if (!location?.latitude || !location?.longitude) {
      setStores([]);
      return [];
    }

    let nearbyStores;
    if (useExpandingRadius) {
      const result = storeService.findStoresWithExpandingRadius(
        location,
        1,
        selectedCategories
      );
      nearbyStores = result.stores;
    } else {
      nearbyStores = storeService.filterStoresByRadius(
        location,
        LOCATION_CONFIG.SEARCH_RADIUS_KM,
        selectedCategories
      );
    }

    setStores(nearbyStores);
    return nearbyStores;
  }, [selectedCategories]);

  /**
   * Initialize map on mount or when userLocation becomes available
   */
  useEffect(() => {
    const initializeMap = async () => {
      // Skip if already initialized with a valid location (not default)
      if (hasInitializedWithLocationRef.current && userLocation?.source !== 'default') {
        console.log('[Map] Already initialized with valid location, skipping');
        return;
      }

      setLoading(true);
      console.log('[Map] Initializing map...');

      try {
        // Case 1: Initial store from navigation
        if (initialStore?.latitude && initialStore?.longitude) {
          console.log('[Map] Using initial store location:', initialStore.latitude, initialStore.longitude);
          const nearbyStores = fetchNearbyStores(initialStore);
          setCameraCoordinates({
            latitude: initialStore.latitude,
            longitude: initialStore.longitude,
            zoom: 14
          });
          setLoading(false);
          return;
        }

        // Case 2: Custom location from search (Redux)
        if (customLocation?.latitude && customLocation?.longitude) {
          console.log('[Map] Using customLocation from Redux:', customLocation.latitude, customLocation.longitude);
          const nearbyStores = fetchNearbyStores(customLocation);
          const autoZoom = calculateAutoZoom(nearbyStores);
          setCameraCoordinates({
            latitude: customLocation.latitude,
            longitude: customLocation.longitude,
            zoom: autoZoom
          });
          setLoading(false);
          return;
        }

        // Case 3: User location from context (set by StoreContext)
        // Don't call LocationManager directly - let StoreContext handle location logic
        // to ensure both tabs use the same location source
        const location = userLocation;
        console.log('[Map] userLocation from context:', userLocation?.latitude, userLocation?.longitude, userLocation?.source);

        if (location) {
          console.log('[Map] Using location from context:', location.latitude, location.longitude, location.source);
          const nearbyStores = fetchNearbyStores(location, true);
          const autoZoom = calculateAutoZoom(nearbyStores);
          console.log('[Map] Found', nearbyStores.length, 'nearby stores');

          // Mark as initialized if we got a real location (not default)
          if (location.source !== 'default') {
            hasInitializedWithLocationRef.current = true;
          }

          if (nearbyStores.length === 0) {
            Toast.show({
              type: 'info',
              text1: t('no_stores_in_city') || 'No stores in your city yet',
              text2: t('add_store_or_explore') || 'Add your favorite shops or explore another city',
              position: 'bottom',
              visibilityTime: 4000,
            });
          }

          setCameraCoordinates({
            latitude: location.latitude,
            longitude: location.longitude,
            zoom: autoZoom
          });
        } else {
          // userLocation not ready yet - use default for now
          // StoreContext will update userLocation which will trigger re-render
          console.log('[Map] userLocation not ready, using default Brussels temporarily');
          setCameraCoordinates({
            ...LOCATION_CONFIG.DEFAULT_LOCATION,
            zoom: 12
          });
          fetchNearbyStores(LOCATION_CONFIG.DEFAULT_LOCATION, true);
        }
      } catch (error) {
        console.error('[Map] Error initializing map:', error);
        setCameraCoordinates({
          ...LOCATION_CONFIG.DEFAULT_LOCATION,
          zoom: 12
        });
      } finally {
        setLoading(false);
      }
    };

    initializeMap();
    // Re-run when userLocation becomes available from StoreContext
  }, [initialStore?.id, userLocation?.latitude, userLocation?.longitude]);

  /**
   * Handle custom location changes (city search)
   */
  useEffect(() => {
    if (!customLocation?.latitude || !customLocation?.longitude) return;
    if (initialStore) return;

    // Mark city search time
    lastCitySearchTimeRef.current = Date.now();
    isExploringRef.current = false;

    const nearbyStores = fetchNearbyStores(customLocation);
    const autoZoom = calculateAutoZoom(nearbyStores);

    setCameraCoordinates({
      latitude: customLocation.latitude,
      longitude: customLocation.longitude,
      zoom: autoZoom
    });

    // Animate camera
    if (cameraRef.current) {
      setTimeout(() => {
        cameraRef.current?.setCamera({
          centerCoordinate: [customLocation.longitude, customLocation.latitude],
          zoomLevel: autoZoom,
          animationDuration: 500,
        });
      }, 50);
    }
  }, [customLocation?.latitude, customLocation?.longitude]);

  /**
   * Handle category changes
   */
  useEffect(() => {
    // Skip if city search just happened
    if (Date.now() - lastCitySearchTimeRef.current < 2000) return;

    const location = customLocation?.latitude && customLocation?.longitude
      ? customLocation
      : userLocation;

    if (location && allStores.length > 0) {
      fetchNearbyStores(location);
    }
  }, [selectedCategories, allStores.length]);

  /**
   * Handle store updates
   */
  useEffect(() => {
    if (Date.now() - lastCitySearchTimeRef.current < 2000) return;

    if (allStores.length > 0 && cameraCoordinates) {
      const location = customLocation?.latitude && customLocation?.longitude
        ? customLocation
        : userLocation;

      if (location) {
        fetchNearbyStores(location);
      }
    }
  }, [allStores.length]);

  /**
   * Sync camera on tab focus
   */
  useFocusEffect(
    useCallback(() => {
      if (!customLocation?.latitude || !customLocation?.longitude) return;
      if (Date.now() - lastCitySearchTimeRef.current < 1000) return;

      isExploringRef.current = false;

      const nearbyStores = fetchNearbyStores(customLocation);
      const autoZoom = calculateAutoZoom(nearbyStores);

      setCameraCoordinates({
        latitude: customLocation.latitude,
        longitude: customLocation.longitude,
        zoom: autoZoom
      });

      // Animate camera
      if (cameraRef.current) {
        setTimeout(() => {
          cameraRef.current?.setCamera({
            centerCoordinate: [customLocation.longitude, customLocation.latitude],
            zoomLevel: autoZoom,
            animationDuration: 500,
          });
        }, 100);
      }
    }, [customLocation?.latitude, customLocation?.longitude, allStores.length, selectedCategories])
  );

  /**
   * Handle no stores message
   */
  useEffect(() => {
    if (loading || initialStore) {
      setShowNoStoresMessage(false);
      return;
    }

    if (stores.length > 0) {
      setShowNoStoresMessage(false);
      return;
    }

    const timer = setTimeout(() => {
      if (stores.length === 0 && !loading && !initialStore) {
        setShowNoStoresMessage(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [stores.length, loading, initialStore]);

  /**
   * Handle map idle (pan/zoom complete)
   */
  const onMapIdle = useCallback(async () => {
    try {
      if (!mapRef.current?.getVisibleBounds) return;

      const bounds = await mapRef.current.getVisibleBounds();
      if (!bounds || bounds.length !== 2) return;

      const [sw, ne] = bounds;
      const centerLat = (sw[1] + ne[1]) / 2;
      const centerLng = (sw[0] + ne[0]) / 2;

      if (shouldIgnoreRegionChangeRef.current) return;

      const previous = lastPositionRef.current || { latitude: centerLat, longitude: centerLng };
      const distanceMoved = locationManager.getDistanceInKm(
        previous.latitude,
        previous.longitude,
        centerLat,
        centerLng
      );

      // Only refresh if user panned significantly
      if (distanceMoved >= LOCATION_CONFIG.REFRESH_DISTANCE_KM) {
        setHasRequestedStores?.(true);
        lastPositionRef.current = { latitude: centerLat, longitude: centerLng };
        isExploringRef.current = true;
        fetchNearbyStores({ latitude: centerLat, longitude: centerLng });
      }
    } catch (e) {
      console.warn('onMapIdle error:', e);
    }
  }, [fetchNearbyStores, setHasRequestedStores]);

  /**
   * Handle camera changes
   */
  const onCameraChanged = useCallback((state) => {
    if (state?.properties?.zoom !== undefined) {
      const newZoom = state.properties.zoom;
      const wasAboveThreshold = currentZoom > 14;
      const isAboveThreshold = newZoom > 14;
      if (wasAboveThreshold !== isAboveThreshold) {
        setCurrentZoom(newZoom);
      }
      lastZoomRef.current = newZoom;
    }
  }, [currentZoom]);

  /**
   * Get user location and center map
   */
  const getUserLocation = useCallback(async () => {
    try {
      shouldIgnoreRegionChangeRef.current = true;

      const location = await locationManager.getUserLocation({ forceRefresh: true });

      if (!location) return;

      setHasRequestedStores?.(true);
      dispatch(setCustomLocation({ latitude: location.latitude, longitude: location.longitude }));

      const nearbyStores = fetchNearbyStores(location, true);
      const autoZoom = calculateAutoZoom(nearbyStores);

      setCameraCoordinates({
        latitude: location.latitude,
        longitude: location.longitude,
        zoom: autoZoom
      });

      lastPositionRef.current = location;

      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [location.longitude, location.latitude],
          zoomLevel: autoZoom,
          animationDuration: 1000,
        });
      }

      setTimeout(() => {
        shouldIgnoreRegionChangeRef.current = false;
      }, 1500);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  }, [dispatch, fetchNearbyStores, calculateAutoZoom, setHasRequestedStores]);

  /**
   * Explore random city
   */
  const exploreRandomCity = useCallback(async () => {
    try {
      const citiesWithStores = [...new Set(allStores.map(store => store.cityName).filter(Boolean))];

      if (citiesWithStores.length === 0) {
        Alert.alert(
          t('no_stores_found') || "No stores found",
          t('no_stores_available') || "No stores available at the moment."
        );
        return;
      }

      const randomCity = citiesWithStores[Math.floor(Math.random() * citiesWithStores.length)];
      const cityStores = allStores.filter(store => store.cityName === randomCity);

      if (cityStores.length > 0) {
        const firstStore = cityStores[0];
        const geopoint = firstStore?.address?.[0]?.location?.geopoint;

        if (geopoint && cameraRef.current) {
          const storeLat = Number(geopoint.latitude);
          const storeLng = Number(geopoint.longitude);

          isExploringRef.current = true;
          shouldIgnoreRegionChangeRef.current = true;

          cameraRef.current.setCamera({
            centerCoordinate: [storeLng, storeLat],
            zoomLevel: 12,
            animationDuration: 1500,
          });

          setSearchQuery(randomCity);
          fetchNearbyStores({ latitude: storeLat, longitude: storeLng });

          setTimeout(() => {
            shouldIgnoreRegionChangeRef.current = false;
            setTimeout(() => {
              isExploringRef.current = false;
            }, 1000);
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Error exploring random city:", error);
    }
  }, [allStores, t, setSearchQuery, fetchNearbyStores]);

  /**
   * Handle city selection from search
   */
  const handleMapCitySelect = useCallback(async (cityName, coordinates) => {
    try {
      const { latitude, longitude } = coordinates;

      isExploringRef.current = false;
      shouldIgnoreRegionChangeRef.current = true;
      lastCitySearchTimeRef.current = Date.now();

      setHasRequestedStores?.(true);
      dispatch(setCustomLocation({ latitude, longitude }));
      lastPositionRef.current = { latitude, longitude };

      const nearbyStores = fetchNearbyStores({ latitude, longitude });
      const autoZoom = calculateAutoZoom(nearbyStores);

      setCameraCoordinates({ latitude, longitude, zoom: autoZoom });

      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: autoZoom,
          animationDuration: 1000,
        });
      }

      setTimeout(() => {
        shouldIgnoreRegionChangeRef.current = false;
      }, 1500);
    } catch (error) {
      console.error("Error handling city selection:", error);
    }
  }, [dispatch, fetchNearbyStores, calculateAutoZoom, setHasRequestedStores]);

  /**
   * Handle store selection from search
   */
  const handleMapStoreSelect = useCallback(async (storeSuggestion) => {
    if (!storeSuggestion.location) return;

    try {
      const { latitude, longitude } = storeSuggestion.location;

      isExploringRef.current = false;
      shouldIgnoreRegionChangeRef.current = true;

      setCameraCoordinates({ latitude, longitude, zoom: 14 });

      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: 14,
          animationDuration: 1000,
        });
      }

      setHasRequestedStores?.(true);
      dispatch(setCustomLocation({ latitude, longitude }));
      lastPositionRef.current = { latitude, longitude };
      fetchNearbyStores({ latitude, longitude });

      setTimeout(() => {
        shouldIgnoreRegionChangeRef.current = false;
      }, 1500);
    } catch (error) {
      console.error("Error handling store selection:", error);
    }
  }, [dispatch, fetchNearbyStores, setHasRequestedStores]);

  /**
   * Get category name by ID
   */
  const getCategoryName = useCallback((id) => {
    const match = allCategories.find(cat => cat.id === id);
    return match ? match.name : `#${id}`;
  }, [allCategories]);

  /**
   * Map stores with tags and coordinates
   */
  const storesWithNamedTags = useMemo(() => {
    return stores
      .map(store => {
        const geopoint = store?.address?.[0]?.location?.geopoint;
        const latitude = geopoint ? Number(geopoint.latitude) : store.latitude;
        const longitude = geopoint ? Number(geopoint.longitude) : store.longitude;

        if (!latitude || !longitude) return null;

        return {
          ...store,
          latitude,
          longitude,
          tags: store.category?.map(getCategoryName) || [],
        };
      })
      .filter(store => store !== null);
  }, [stores, getCategoryName]);

  /**
   * Handle initial store selection
   */
  useEffect(() => {
    if (initialStore && stores.length > 0) {
      const matchingStore = stores.find(store => store.id === initialStore.id);
      if (matchingStore) {
        setSelectedStore(matchingStore);
      }
    }
  }, [initialStore?.id, stores.length]);

  /**
   * Handle logout
   */
  const handleDirectLogout = useCallback(() => {
    setLoggingOut(true);
    setTimeout(() => {
      dispatch(signOut());
    }, 100);
  }, [dispatch]);

  if (loggingOut) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <CustomText>{t('logging_out') || 'Logging out...'}</CustomText>
      </View>
    );
  }

  return (
    <ScreenWrapper backgroundColor={AppColors.white_100} statusBarColor={AppColors.white_100} barStyle="dark-content">
      <View style={styles.container}>
        <View style={{ flex: 1 }}>
          <View style={styles.filterContainer}>
            <MapCategoryFilter stores={stores} />
          </View>

          {/* Compass overlay for location button */}
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
          >
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={cameraCoordinates?.zoom || 12}
              centerCoordinate={[
                cameraCoordinates?.longitude || LOCATION_CONFIG.DEFAULT_LOCATION.longitude,
                cameraCoordinates?.latitude || LOCATION_CONFIG.DEFAULT_LOCATION.latitude
              ]}
            />

            <MapboxGL.UserLocation visible={true} androidRenderMode="normal" />

            {(() => {
              const seenCoords = new Set();
              return stores.map((store, index) => {
                if (!store.latitude || !store.longitude) return null;

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
                    key={`${store.id}-${index}`}
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
                    {t('city_waiting_for_shops') || 'Your city is still waiting for its shops on Shopisan.'}
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
              {t('no_stores_modal_description') || 'There are no stores in your current location.'}
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
  map: {
    flex: 1
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
