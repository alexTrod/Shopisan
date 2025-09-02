import React, { useEffect, useState, useRef, useContext } from "react";
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
import logging from "../../../utils/logging";
import cities from "../../../components/cities/cities.json";
import MapboxGL from "@rnmapbox/maps";
import CustomText from "../../../components/text";
import { StoreContext } from '../../../context/StoreContext';
import { signOut } from "../../../Redux/Actions/UserActions";

import { setCustomLocation } from '../../../Redux/Actions/LocationActions';

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
        getDistanceInKm(
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
      const nearbyStores = filteredStores
        .map((store) => {
          const geopoint = store?.address?.[0]?.location?.geopoint;
          if (!geopoint) return null;

          const storeLat = Number(geopoint.latitude);
          const storeLng = Number(geopoint.longitude);

          if (isNaN(storeLat) || isNaN(storeLng)) return null;

          const distance = getDistanceInKm(latitude, longitude, storeLat, storeLng);

          if (distance > SEARCH_RADIUS_KM) return null;

          return {
            ...store,
            latitude: storeLat,
            longitude: storeLng,
            distance,
          };
        })
        .filter((s) => s !== null);
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

  const [suggestions, setSuggestions] = useState([]);

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
    const lowerQuery = query.toLowerCase();
  
    const filtered = cities.filter(city =>
      city.toLowerCase().startsWith(lowerQuery)
    );
  
    return [...new Set(filtered)];
  };    

  const handleSearch = async (item) => {
    if (!item) return;
  
    if (item.type === "city") {
      try {
        const locations = await Location.geocodeAsync(item.label);
        if (locations.length > 0) {
          const { latitude, longitude } = locations[0];

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
  
          setSuggestions([]);

          dispatch(setCustomLocation({ latitude, longitude }));

        } else {
          Alert.alert("City not found", "Please enter a valid name.");
        }
      } catch (error) {
        console.error("Erreur lors de la recherche de ville :", error);
      }
    } else if (item.type === "store" && item.location) {
      try {
        const { latitude, longitude } = item.location;

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
  
        setSuggestions([]);
        dispatch(setCustomLocation({ latitude, longitude }));

      } catch (error) {
        console.error("Erreur lors de la recherche du store :", error);
      }
    }
  };  

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Enable location to see stores near you.");
        return;
      }
  
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!location || !location.coords) {
        console.warn("Impossible d'obtenir la position de l'utilisateur.");
        return;
      }
  
      const { latitude, longitude } = location.coords;
  
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
      const distanceMoved = getDistanceInKm(previous.latitude, previous.longitude, region.latitude, region.longitude);
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
            size={1.5}
            color={AppColors.grey_200}
            textDecorationLine="underline"
            textStyles={{ fontFamily: "Mulish-SemiBold" }}
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
              <Text style={styles.suggestionText}>
                {suggestion.label} {suggestion.type === "store" ? "(store)" : "(city)"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
  }    
});
