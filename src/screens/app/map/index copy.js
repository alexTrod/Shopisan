import React, { useEffect, useState, useRef } from "react";
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
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import logging from "../../../utils/logging";
import cities from "../../../components/cities/cities.json";
import MapboxGL from "@rnmapbox/maps";
import CustomText from "../../../components/text";
import { filterStoresLocally } from "../../../utils/storeUtils";

import { setCustomLocation } from '../../../Redux/Actions/LocationActions';

import CustomMarker from "../../../components/customMarker";

MapboxGL.setAccessToken('sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ');

const SEARCH_RADIUS_KM = 3;
const REFRESH_DISTANCE_KM = 1;

export default function Map({ navigation, route  }) {
  const initialStore = route?.params?.initialStore;
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(initialStore ? initialStore : null);
  const [userLocation, setUserLocation] = useState(null);
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
  const [currentZoom, setCurrentZoom] = useState(14);
  const cameraRef = useRef(null);
  const user = useSelector(state => state.user.userData);
  const [loggingOut, setLoggingOut] = useState(false);
  const [allStores, setAllStores] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);

  const selectedCategories = useSelector(state => state.categories.selectedCategories);
  const dispatch = useDispatch();

  const customLocation = useSelector((state) => state.location.customLocation);

  const shouldIgnoreRegionChange = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
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
  }, [stores, initialStore]);  

  const findClosestStore = async () => {
    if (!mapCenter) {
      Alert.alert("Unknown location", "Unable to determine the map position.");
      return;
    }
  
    try {
      const storesRef = collection(firestore, "stores");
      const storesSnapshot = await getDocs(storesRef);
  
      let closestStore = null;
      let minDistance = Infinity;
  
      storesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!data.address?.[0]?.location?.geopoint) return;
  
        let { latitude: storeLat, longitude: storeLng } = data.address[0].location.geopoint;
        storeLat = Number(storeLat);
        storeLng = Number(storeLng);
  
        if (isNaN(storeLat) || isNaN(storeLng)) return;
  
        const distance = getDistanceInKm(mapCenter.latitude, mapCenter.longitude, storeLat, storeLng);
        if (distance < minDistance) {
          minDistance = distance;
          closestStore = {
            id: doc.id,
            ...data,
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
  
        setCameraCoordinates(region);
        setLastPosition({ latitude: region.latitude, longitude: region.longitude });
        fetchNearbyStores(region.latitude, region.longitude);
  
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [region.longitude, region.latitude],
            zoomLevel: 14,
            animationDuration: 1000,
          });
        }        
      } else {
        console.log("Aucun magasin trouvé.");
      }
    } catch (error) {
      console.error("Erreur lors de la recherche du magasin le plus proche :", error);
    }
  };  

  useEffect(() => {
    const filtered = filterStoresLocally(
      allStores,
      selectedCategories,
      selectedCities,
      "",
      userLocation
    );
    setStores(filtered);
  }, [allStores, selectedCategories, selectedCities, searchQuery, userLocation]);


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
              zoomLevel: 14,
              animationDuration: 1000,
            });
          }
  
          setSuggestions([]);

          setStores(filterStoresLocally(
            allStores,
            selectedCategories,
            selectedCities,
            item.type === "store" ? item.label : "",
            userLocation
          ));
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
            zoomLevel: 16,
            animationDuration: 1000,
          });
        }
  
        setSuggestions([]);
      } catch (error) {
        console.error("Erreur lors de la recherche du store :", error);
      }
    }
  };  

  useEffect(() => {
    if (
      initialStore &&
      !isNaN(Number(initialStore?.address?.[0]?.location?.geopoint.latitude)) &&
      !isNaN(Number(initialStore?.address?.[0]?.location?.geopoint.longitude)) &&
      !customLocation
    ) {
      console.log("aaaaaaaaaaaaaaaaaaaaaaaabb:",customLocation);
      const latitude = Number(initialStore?.address?.[0]?.location?.geopoint.latitude);
      const longitude = Number(initialStore?.address?.[0]?.location?.geopoint.longitude);
  
      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
  
      setCameraCoordinates(region);
      setUserLocation({ latitude, longitude });
      setLastPosition({ latitude, longitude });
  
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [region.longitude, region.latitude],
          zoomLevel: 14,
          animationDuration: 1000,
        });
      }      
  
      fetchNearbyStores(latitude, longitude);
    } else if (customLocation) {
      console.log("aaaaaaaaaaaaaaaaaaaaaaaabbccc:",customLocation);
      shouldIgnoreRegionChange.current = true;

      const region = {
        latitude: customLocation.latitude,
        longitude: customLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setCameraCoordinates(region);
      setUserLocation({ latitude: region.latitude, longitude: region.longitude });
      setLastPosition({ latitude: region.latitude, longitude: region.longitude });

      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [region.longitude, region.latitude],
          zoomLevel: 14,
          animationDuration: 1000,
        });
      }

      fetchNearbyStores(region.latitude, region.longitude);

      setTimeout(() => {
        shouldIgnoreRegionChange.current = false;
      }, 1000);
    } else {
      getUserLocation();
    }
  }, [initialStore]);
  
  useEffect(() => {
    if (customLocation) {
      shouldIgnoreRegionChange.current = true;

      const region = {
        latitude: customLocation.latitude,
        longitude: customLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setCameraCoordinates(region);
      setUserLocation({ latitude: region.latitude, longitude: region.longitude });
      setLastPosition({ latitude: region.latitude, longitude: region.longitude });

      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [region.longitude, region.latitude],
          zoomLevel: 14,
          animationDuration: 1000,
        });
      }

      fetchNearbyStores(region.latitude, region.longitude);

      setTimeout(() => {
        shouldIgnoreRegionChange.current = false;
      }, 1000);
    }
  }, [customLocation]);

  useEffect(() => {
    if (userLocation) fetchNearbyStores(userLocation.latitude, userLocation.longitude);
  }, [userLocation]);

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
  
      setUserLocation({ latitude, longitude });
      setCameraCoordinates({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });      
      setLastPosition({ latitude, longitude });
  
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: 14,
          animationDuration: 1000,
        });
      }      
    } catch (error) {
      console.error("Erreur lors de la récupération de la localisation :", error);
    }
  };  

  const fetchNearbyStores = async (latitude, longitude) => {
    try {
      setLoading(true);
      const storesRef = collection(firestore, "stores");
      const storesSnapshot = await getDocs(storesRef);
  
      const allStores = storesSnapshot.docs
        .map((doc) => {
          const data = doc.data();
          if (!data.address?.[0]?.location?.geopoint) return null;
  
          let { latitude: storeLat, longitude: storeLng } = data.address[0].location.geopoint;
          storeLat = Number(storeLat);
          storeLng = Number(storeLng);
  
          if (isNaN(storeLat) || isNaN(storeLng)) return null;
  
          return {
            id: doc.id,
            ...data,
            latitude: storeLat,
            longitude: storeLng,
          };
        })
        .filter((store) => store && getDistanceInKm(latitude, longitude, store.latitude, store.longitude) <= SEARCH_RADIUS_KM);
  
      const filteredStores = selectedCategories.length > 0
        ? allStores.filter(store => store.category && store.category.some(cat => selectedCategories.includes(cat)))
        : allStores;
  
      setAllStores(allStores);
    } catch (error) {
      logging("Erreur lors de la récupération des magasins :", error);
    } finally {
      setLoading(false);
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
      dispatch(setCustomLocation(region));
  
      if (!lastPosition) return;
  
      const distanceMoved = getDistanceInKm(lastPosition.latitude, lastPosition.longitude, region.latitude, region.longitude);
      if (distanceMoved >= REFRESH_DISTANCE_KM) {
        setLastPosition({ latitude: region.latitude, longitude: region.longitude });
        fetchNearbyStores(region.latitude, region.longitude);
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

  const fetchStoreNameSuggestions = async (searchText) => {
    if (!searchText.trim()) return [];
    const storesRef = collection(firestore, "stores");
    const endText = searchText.slice(0, -1) + String.fromCharCode(searchText.charCodeAt(searchText.length - 1) + 1);
  
    const q = query(
      storesRef,
      orderBy('name'),
      where('name', '>=', searchText),
      where('name', '<', endText),
      limit(10)
    );
  
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        location: data.address?.[0]?.location?.geopoint || null,
      };
    });
  };  

  const handleEnterSearch = () => {
    const matchedSuggestion = suggestions.find(
      (sugg) => sugg.label.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (matchedSuggestion) {
      handleSearch(matchedSuggestion);
    } else {
      setStores(filterStoresLocally(
        allStores,
        selectedCategories,
        selectedCities,
        searchQuery,
        userLocation
      ));
      setSuggestions([]);
    }
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
            alignSelf: 'flex-end',
            marginTop: 20,
            marginRight: 20,
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
          onSubmitEditing={handleEnterSearch}
          returnKeyType="search"
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
                zoomLevel={cameraCoordinates?.zoom || 14}
                centerCoordinate={[cameraCoordinates?.longitude || 2.35, cameraCoordinates?.latitude || 48.85]}
              />

              <MapboxGL.UserLocation
                visible={true}
                androidRenderMode="normal"
              />

              {stores.map((store) => (
                <CustomMarker
                  key={store.id}
                  store={store}
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
              ))}

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
                zoomLevel: 14,
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
