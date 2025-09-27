import React, { useEffect, useState, useRef, useContext } from "react";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import { height, width } from "../../../utils/dimension";
import { StyleSheet, View, Alert, TextInput, Text, TouchableOpacity } from "react-native";
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

import { setCustomLocation } from '../../../Redux/Actions/LocationActions';
import locationService from "../../../utils/locationService";
import CustomMarker from "../../../components/customMarker";

MapboxGL.setAccessToken('sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ');

const SEARCH_RADIUS_KM = 6;
const REFRESH_DISTANCE_KM = 1;

export default function Map({ navigation, route  }) {
  const initialStore = route?.params?.initialStore || null;
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(initialStore ? initialStore : null);

  const { userLocation } = useContext(StoreContext);
  
  const [cameraCoordinates, setCameraCoordinates] = useState(
    initialStore
      ? {
          latitude: initialStore.latitude,
          longitude: initialStore.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
          zoom: 14
        }
      : null
  );

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
  const cameraRef = useRef(null);
  const user = useSelector(state => state.user.userData);
  const [loggingOut, setLoggingOut] = useState(false);
  const { searchQuery, setSearchQuery } = useContext(StoreContext);

  const previousLocationRef = useRef(null);

  const dispatch = useDispatch();

  const { filteredStores, allStores } = useContext(StoreContext);

  const lastRecenteringTime = useRef(0);

  useEffect(() => {
    const now = Date.now();

    if (
      userLocation &&
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
  }, [userLocation]);

  const fetchNearbyStores = async (latitude, longitude) => {
    try {
      setLoading(true);
      
      // Use location service with expanding radius
      const userLocation = { latitude, longitude };
      const nearbyStores = locationService.getStoresWithExpandingRadius(
        filteredStores, 
        userLocation, 
        500 // Max 500km radius
      );
      
      setStores(nearbyStores);
      setSuggestions([]);
    } catch (error) {
      logging("Erreur lors du filtrage local des magasins :", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLocation && filteredStores.length > 0) {
      fetchNearbyStores(userLocation.latitude, userLocation.longitude);
    }

  }, [filteredStores]);

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

  const storesWithNamedTags = stores.map(store => ({
    ...store,
    tags: store.category?.map(getCategoryName) || [],
  }));

  useEffect(() => {
    if (initialStore && stores.length > 0) {
      const matchingStore = stores.find((store) => store.id === initialStore.id);
      if (matchingStore) {
        setSelectedStore(matchingStore);
      }
    }
  }, [initialStore]);  

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

      dispatch(setCustomLocation({ latitude, longitude }));
      fetchNearbyStores(latitude, longitude);
    } catch (error) {
      console.error("Error handling city selection in map:", error);
    }
  };

  const handleMapStoreSelect = (storeSuggestion) => {
    if (storeSuggestion.location) {
      try {
        const { latitude, longitude } = storeSuggestion.location;
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

        dispatch(setCustomLocation({ latitude, longitude }));
        fetchNearbyStores(latitude, longitude);
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
          zoom: initialStore ? 14 : 12,
          animationDuration: 1000,
        });
      }      
    } catch (error) {
      console.error("Erreur lors de la récupération de la localisation :", error);
    }
  };  


  const onRegionChangeComplete = (regionFeature) => {
    if (!regionFeature || !regionFeature.properties) return;
  
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
      const distanceMoved = locationService.getDistanceInKm(previous.latitude, previous.longitude, region.latitude, region.longitude);
      setLastPosition({ latitude: region.latitude, longitude: region.longitude });

      if (distanceMoved >= REFRESH_DISTANCE_KM) {
        fetchNearbyStores(region.latitude, region.longitude);
        dispatch(setCustomLocation({ latitude: region.latitude, longitude: region.longitude }));
      }
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
        <CustomText>Déconnexion en cours...</CustomText>
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
          }}
        >
          <CustomText
            size={3}
            color={AppColors.grey_200}
            textDecorationLine="underline"
            textStyles={{ fontFamily: "Mulish-SemiBold", fontWeight: "bold" }}
          >
            Go to signup
          </CustomText>
        </TouchableOpacity>
      )}
      <View style={styles.topBar}>
        <SearchBar
          placeholder="Search for a city or store..."
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
              onRegionDidChange={(regionFeature) => onRegionChangeComplete(regionFeature)}
            >
              <MapboxGL.Camera
                ref={cameraRef}
                zoomLevel={initialStore ? 14 : cameraCoordinates?.zoom || 12}
                centerCoordinate={[
                  initialStore ? initialStore.longitude : cameraCoordinates?.longitude || 2.35,
                  initialStore ? initialStore.latitude : cameraCoordinates?.latitude || 48.85
                ]}
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

            {!loading && stores.length === 0 && (
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
  }    
});
