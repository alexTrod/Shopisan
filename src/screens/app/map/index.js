import React, { useEffect, useState, useRef, useContext, useCallback, useMemo } from "react";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";
import { StyleSheet, View, Alert, TextInput, Text, TouchableOpacity } from "react-native";
import FloatingCards from "../../../components/card-Item";
import ItemDetailModal from "../../../components/item-card/ItemDetailModal";
import MapCategoryFilter from "../../../components/map-category-filter";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { firestore } from "../../../../firebaseconfig";
import { query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import cities from "../../../components/cities/cities.json";
import MapboxGL from "@rnmapbox/maps";
import CustomText from "../../../components/text";
import { StoreContext } from '../../../context/StoreContext';
import { signOut } from "../../../Redux/Actions/UserActions";
import { useNavigation, useRoute } from '@react-navigation/native';

import { setCustomLocation } from '../../../Redux/Actions/LocationActions';

import CustomMarker from "../../../components/customMarker";
import EnhancedMarker from "../../../components/customMarker/EnhancedMarker";
import MarkerCluster from "../../../components/customMarker/MarkerCluster";
import SearchBar from "../../../components/search-bar";
import ErrorBoundary from "../../../components/ErrorBoundary";
import { useTranslation } from "../../../utils/useTranslation";
import { map, error, warn, info, debug } from "../../../utils/logger";

MapboxGL.setAccessToken('sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ');

const SEARCH_RADIUS_KM = 6;
const REFRESH_DISTANCE_KM = 1;

function MapContent({ initialStore }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  // Use filteredStores from context instead of local stores state
  const [selectedStore, setSelectedStore] = useState(null);

  // Single context read to keep hook order absolutely stable
  const storeContext = useContext(StoreContext);
  const userLocation = storeContext?.userLocation;
  
  const [cameraCoordinates, setCameraCoordinates] = useState(null);

  const [lastPosition, setLastPosition] = useState(null);
  const flatListRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStoreDetails, setSelectedStoreDetails] = useState(null);
  const mapRef = useRef(null);
  const allCategories = useSelector(state => state.categories.categories);
  const [mapCenter, setMapCenter] = useState(null);
  const [currentRegion, setCurrentRegion] = useState(null);
  const markerRefs = useRef({});
  const [currentZoom, setCurrentZoom] = useState(12);
  const [useClustering, setUseClustering] = useState(false);
  const cameraRef = useRef(null);
  const user = useSelector(state => state.user.userData);
  const [loggingOut, setLoggingOut] = useState(false);
  const searchQuery = storeContext?.searchQuery;
  const setSearchQuery = storeContext?.setSearchQuery;
  const [userLocationMarker, setUserLocationMarker] = useState(null);
  
  // Global animation control - kept for future use, default to false for instant movement
  // To enable smooth flying animations, change this to: useState(true)
  // To disable animations and keep instant movement, keep as: useState(false)
  const [enableMapAnimations, setEnableMapAnimations] = useState(false);
  
  const previousLocationRef = useRef(null);

  const dispatch = useDispatch();

  const filteredStores = storeContext?.filteredStores ?? [];
  const allStores = storeContext?.allStores ?? [];

  // Debug logging for filteredStores
  useEffect(() => {
    map('filteredStores updated', {
      count: filteredStores.length,
      hasStores: filteredStores.length > 0,
      firstStore: filteredStores[0] ? {
        name: filteredStores[0].name,
        latitude: filteredStores[0].latitude,
        longitude: filteredStores[0].longitude
      } : null
    });
  }, [filteredStores]);

  const lastRecenteringTime = useRef(0);

  // Add cleanup refs
  const locationUpdateTimeoutRef = useRef(null);
  const isComponentMountedRef = useRef(true);

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMountedRef.current = false;
      if (locationUpdateTimeoutRef.current) {
        clearTimeout(locationUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Modify the userLocation useEffect to add debouncing and safety checks
  useEffect(() => {
    if (!isComponentMountedRef.current) return;

    const now = Date.now();

    if (
      userLocation &&
      now - lastRecenteringTime.current > 3000 && // Increased from 2000 to 3000ms
      (!previousLocationRef.current ||
        getDistanceInKm(
          previousLocationRef.current.latitude,
          previousLocationRef.current.longitude,
          userLocation.latitude,
          userLocation.longitude
        ) > 0.2) // Increased from 0.1 to 0.2km
    ) {
      lastRecenteringTime.current = now;
      previousLocationRef.current = userLocation;

      // Add timeout to prevent rapid updates
      if (locationUpdateTimeoutRef.current) {
        clearTimeout(locationUpdateTimeoutRef.current);
      }

      locationUpdateTimeoutRef.current = setTimeout(() => {
        if (!isComponentMountedRef.current) return;
        
        setCameraCoordinates({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
          zoom: initialStore ? 14 : 12
        });
      }, 500); // 500ms delay
    }
  }, [userLocation]);



  const shouldIgnoreRegionChange = useRef(false);



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

  const storesWithNamedTags = useMemo(() => 
    filteredStores.map(store => ({
      ...store,
      tags: store.category?.map(getCategoryName) || [],
    })), [filteredStores, allCategories]
  );

  useEffect(() => {
    if (initialStore && filteredStores.length > 0) {
      const matchingStore = filteredStores.find((store) => store.id === initialStore.id);
      if (matchingStore) {
        setSelectedStore(matchingStore);
        
        // Automatically open the preview modal for initialStore
        setSelectedStoreDetails({
          id: matchingStore.id,
          title: matchingStore.name,
          description: matchingStore.description?.fr || "No description available",
          tags: matchingStore.category?.map(getCategoryName) || [],
          address: matchingStore.address || "No address available",
          openingHours: matchingStore.openingHours || null,
        });
        setModalVisible(true);
      }
    }
    
    // Initialize camera coordinates if initialStore is provided
    if (initialStore && 
        typeof initialStore.latitude === 'number' && 
        typeof initialStore.longitude === 'number' &&
        !isNaN(initialStore.latitude) && 
        !isNaN(initialStore.longitude) &&
        Math.abs(initialStore.latitude) <= 90 &&
        Math.abs(initialStore.longitude) <= 180) {
      
      // Set camera coordinates for the MapboxGL.Camera component
      setCameraCoordinates({
        latitude: initialStore.latitude,
        longitude: initialStore.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
        zoom: 14
      });
    }
  }, [initialStore, filteredStores]);  

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
      warn("Impossible d'obtenir le centre de la caméra via les bounds", error);
    }

    return null;
  };

  const findClosestStore = async () => {
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
              Alert.alert(t('unknown_location'), t('unable_determine_map_center'));
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

        const distance = getDistanceInKm(
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
            animationDuration: enableMapAnimations ? 1000 : 0, // Use global animation control
          });
        }
      } else {
        Alert.alert(t('no_stores_found'), t('no_valid_stores_found'));
      }
    } catch (error) {
      error("Erreur lors de la recherche du magasin le plus proche", error);
    }
  };

  

  // Add state to control UserLocation visibility
  // const [showUserLocation, setShowUserLocation] = useState(false);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t('permission_denied'), t('enable_location_stores'));
        return;
      }

      const location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
        maximumAge: 60000
      });
      
      if (!location || !location.coords) {
        warn("Impossible d'obtenir la position de l'utilisateur");
        return;
      }

      const { latitude, longitude } = location.coords;

      // Add safety check for component mount
      if (!isComponentMountedRef.current) return;
      
      // Set custom user location marker
      setUserLocationMarker({
        id: 'user-location',
        latitude,
        longitude,
        type: 'user'
      });
      
      dispatch(setCustomLocation({ latitude, longitude }));

      setCameraCoordinates({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
        zoom: initialStore ? 14 : 12,
      });      
      setLastPosition({ latitude, longitude });

      // Add safety check before setting camera
      if (cameraRef.current && isComponentMountedRef.current) {
        try {
          cameraRef.current.setCamera({
            centerCoordinate: [longitude, latitude],
            zoom: initialStore ? 14 : 12,
            animationDuration: enableMapAnimations ? 1000 : 0, // Use global animation control
          });
        } catch (error) {
          warn("Error setting camera", error);
        }
      }      
    } catch (error) {
      error("Erreur lors de la récupération de la localisation", error);
    }
  };

  // Add a safer location update handler
  const handleLocationUpdate = useCallback((location) => {
    if (!isComponentMountedRef.current || !location) return;
    
    try {
      const { latitude, longitude } = location.coords;
      
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
          isNaN(latitude) || isNaN(longitude)) {
        return;
      }

      dispatch(setCustomLocation({ latitude, longitude }));
    } catch (error) {
      warn("Error handling location update", error);
    }
  }, [dispatch]);

  const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const onRegionChangeComplete = (regionFeature) => {
    try {
      if (!regionFeature || !regionFeature.properties || !isComponentMountedRef.current) return;
    
      const zoomLevel = regionFeature.properties.zoomLevel;
      const center = regionFeature.geometry.coordinates;
    
      if (center) {
        const region = {
          latitude: center[1],
          longitude: center[0],
        };
        setMapCenter(region);
        setCurrentRegion(region);
        setCurrentZoom(zoomLevel);

        if (shouldIgnoreRegionChange.current) return;
    
        const previous = lastPosition || region;
        const distanceMoved = getDistanceInKm(previous.latitude, previous.longitude, region.latitude, region.longitude);
        setLastPosition({ latitude: region.latitude, longitude: region.longitude });

        if (distanceMoved >= REFRESH_DISTANCE_KM) {
          dispatch(setCustomLocation({ latitude: region.latitude, longitude: region.longitude }));
        }
      }
    } catch (error) {
      warn("Error in onRegionChangeComplete", error);
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


 
  useEffect(() => {
    showCalloutsIfZoomed();
  }, [currentRegion]);

  const handleCitySearch = useCallback((cityName, coordinates) => {
    map('City search triggered', { cityName, coordinates });
    
    // Validate coordinates before using them
    if (!coordinates || 
        typeof coordinates.latitude !== 'number' || 
        typeof coordinates.longitude !== 'number' ||
        isNaN(coordinates.latitude) || 
        isNaN(coordinates.longitude) ||
        Math.abs(coordinates.latitude) > 90 ||
        Math.abs(coordinates.longitude) > 180) {
      warn('Invalid coordinates received for city search', coordinates);
      return;
    }
    
    setCameraCoordinates({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [coordinates.longitude, coordinates.latitude],
        zoomLevel: 12,
        animationDuration: 0, // Use global animation control
      });
    }

    map('Dispatching setCustomLocation', coordinates);
    dispatch(setCustomLocation(coordinates));
  }, [dispatch]);

  const handleStoreSearch = useCallback((storeSuggestion) => {
    if (storeSuggestion.location) {
      const { latitude, longitude } = storeSuggestion.location;
      
      // Validate coordinates before using them
      if (typeof latitude !== 'number' || 
          typeof longitude !== 'number' ||
          isNaN(latitude) || 
          isNaN(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180) {
        warn('Invalid coordinates received for store search', { latitude, longitude });
        return;
    }
      
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
          animationDuration: 0, // Use global animation control
        });
      }

      dispatch(setCustomLocation({ latitude, longitude }));
    }
  }, [dispatch]);

  const handleSearchChange = useCallback((query) => {
    // This will be handled by the StoreContext
    // The search component will manage its own state
  }, []);

  return (
    <ErrorBoundary>
      <ScreenWrapper backgroundColor={AppColors.white_100} statusBarColor={AppColors.white_100} barStyle="dark-content">
        {loggingOut && (
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', zIndex: 20000 }}>
            <CustomText>Déconnexion en cours...</CustomText>
          </View>
        )}
        {!user && (
          <TouchableOpacity
            onPress={handleDirectLogout}
            style={{
              position: 'absolute',
              top: 0,
              right: 20,
              zIndex: 10000,
            }}
          >

            Go to signup
          </CustomText>
        </TouchableOpacity>
      )}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a city..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          blurOnSubmit={false}
          onSubmitEditing={() => {}}
        />
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => {
                setSearchQuery(suggestion.label);                
                handleSearch(suggestion);
                setSuggestions([]); 
              }}
            >
              Go to signup
            </CustomText>
          </TouchableOpacity>
        )}
        <View style={styles.topBar}>
          <SearchBar
            placeholder={t('search_placeholder')}
            onCitySelect={handleCitySearch}
            onStoreSelect={handleStoreSearch}
            allStores={allStores}
            containerStyle={styles.searchBarContainer}
          />
        </View>



        <View style={styles.container}>
          {cameraCoordinates ? (
            <View style={{ flex: 1 }}>
              <View style={styles.filterContainer}>
                <MapCategoryFilter 
                  stores={filteredStores} 
                />
              </View>
              <TouchableOpacity
                style={styles.centerButton}
                onPress={getUserLocation}
              >
                <Ionicons name="locate" size={24} color="black" />
              </TouchableOpacity>
              
              {/* Animation Toggle Button - REMOVED */}
              <MapboxGL.MapView
                ref={mapRef}
                style={styles.map}
                styleURL={MapboxGL.StyleURL.Street}
                logoEnabled={false}
                attributionEnabled={false}
                compassEnabled={true}
                onRegionDidChange={(regionFeature) => onRegionChangeComplete(regionFeature)}
                onCameraChanged={(event) => {
                  setCurrentZoom(event.properties.zoomLevel);
                  // Enable clustering when zoomed out and many stores
                  setUseClustering(event.properties.zoomLevel < 13 && filteredStores.length > 20);
                }}
              >
                <MapboxGL.Camera
                  ref={cameraRef}
                  zoomLevel={initialStore ? 14 : cameraCoordinates?.zoom || 12}
                  centerCoordinate={[
                    initialStore && typeof initialStore.longitude === 'number' && !isNaN(initialStore.longitude) 
                      ? initialStore.longitude 
                      : (cameraCoordinates?.longitude && typeof cameraCoordinates.longitude === 'number' && !isNaN(cameraCoordinates.longitude) 
                          ? cameraCoordinates.longitude 
                          : 2.35),
                    initialStore && typeof initialStore.latitude === 'number' && !isNaN(initialStore.latitude) 
                      ? initialStore.latitude 
                      : (cameraCoordinates?.latitude && typeof cameraCoordinates.latitude === 'number' && !isNaN(cameraCoordinates.latitude) 
                          ? cameraCoordinates.latitude 
                          : 48.85)
                  ]}
                  animationDuration={0} // Prevent initial flying animation
                />

                {/* Remove UserLocation component completely - it's causing the crashes */}
                {/* {showUserLocation && (
                  <MapboxGL.UserLocation 
                    visible={true} 
                    androidRenderMode="normal"
                    showsUserHeadingIndicator={false}
                    onUpdate={handleLocationUpdate}
                  />
                )} */}

                {/* Use only the custom user location marker */}
                {userLocationMarker && 
                 typeof userLocationMarker.longitude === 'number' && 
                 typeof userLocationMarker.latitude === 'number' &&
                 !isNaN(userLocationMarker.longitude) && 
                 !isNaN(userLocationMarker.latitude) && (
                  <MapboxGL.PointAnnotation
                    id="user-location-marker"
                    coordinate={[userLocationMarker.longitude, userLocationMarker.latitude]}
                  >
                    <View style={styles.userLocationMarker}>
                      <View style={styles.userLocationDot} />
                    </View>
                  </MapboxGL.PointAnnotation>
                )}

                {useClustering ? (
                  <MarkerCluster
                    stores={filteredStores.filter(store => 
                      typeof store.latitude === "number" &&
                      typeof store.longitude === "number" &&
                      !isNaN(store.latitude) &&
                      !isNaN(store.longitude)
                    )}
                    selectedStore={selectedStore}
                    userLocation={userLocation}
                    showLabels={currentZoom > 12}
                    onClusterPress={(cluster) => {
                      if (cluster.stores.length === 1) {
                        const store = cluster.stores[0];
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
                      }
                    }}
                    onMarkerPress={(store) => {
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
                ) : (
                  (() => {
                    const seenCoords = new Set();
                    const coordCounts = new Map();

                    return filteredStores.map((store, index) => {
                      if (
                        typeof store.latitude !== "number" ||
                        typeof store.longitude !== "number" ||
                        isNaN(store.latitude) ||
                        isNaN(store.longitude)
                      ) {
                        return null;
                      }

                      const key = `${store.latitude.toFixed(6)}_${store.longitude.toFixed(6)}`;
                      const count = coordCounts.get(key) || 0;
                      coordCounts.set(key, count + 1);

                      let lat = store.latitude;
                      let lng = store.longitude;

                      if (seenCoords.has(key)) {
                        const offset = 0.00002 * count;
                        lat += offset;
                        lng += offset;
                      }

                      seenCoords.add(key);

                      // Create a unique key for each marker
                      const uniqueKey = `${store.id}_${index}_${count}`;

                      return (
                        <EnhancedMarker
                          key={uniqueKey}
                          store={{ ...store, latitude: lat, longitude: lng }}
                          selected={selectedStore?.id === store.id}
                          showLabel={currentZoom > 12}
                          userLocation={userLocation}
                          showTooltip={selectedStore?.id === store.id && currentZoom > 14}
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
                  })()
                )}
              </MapboxGL.MapView>          

              {!loading && filteredStores.length === 0 && (
                <View style={styles.noStoreContainer}>
                  <Text style={styles.noStoreText}>No stores found in this area.</Text>

                  <TouchableOpacity onPress={findClosestStore}>
                    <Text style={styles.closestStoreButtonText}>Find the nearest store</Text>
                  </TouchableOpacity>
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

              // Automatically open the preview modal
              setSelectedStoreDetails({
                id: store.id,
                title: store.name,
                description: store.description?.fr || "No description available",
                tags: store.category?.map(getCategoryName) || [],
                address: store.address || "No address available",
                openingHours: store.openingHours || null,
              });
              setModalVisible(true);

              // Center camera on the store
              if (store.latitude && store.longitude && cameraRef.current &&
                  typeof store.latitude === 'number' && 
                  typeof store.longitude === 'number' &&
                  !isNaN(store.latitude) && 
                  !isNaN(store.longitude) &&
                  Math.abs(store.latitude) <= 90 &&
                  Math.abs(store.longitude) <= 180) {
                cameraRef.current.setCamera({
                  centerCoordinate: [store.longitude, store.latitude],
                  zoomLevel: 12,
                  animationDuration: enableMapAnimations ? 1000 : 0, // Use global animation control
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
      </ScreenWrapper>
    </ErrorBoundary>
  );
}

export default function MapScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const initialStore = route?.params?.initialStore || null;
  return <MapContent initialStore={initialStore} />;
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  searchBarContainer: {
    // Add any specific styling for the map search bar
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
    top: 10,
    right: 20,
    backgroundColor: "white",
    borderRadius: 30,
    padding: 10,
    elevation: 5,
    zIndex: 10,
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
  userLocationMarker: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
  },
  // animationToggleButton style removed - no longer needed
});
