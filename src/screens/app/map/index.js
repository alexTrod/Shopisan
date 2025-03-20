import React, { useEffect, useState, useRef } from "react";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import Header from "../../../components/header";
import { height, width } from "../../../utils/dimension";
import { StyleSheet, View, Alert, TextInput, Text, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import FloatingCards from "../../../components/card-Item";
import ItemDetailModal from "../../../components/item-card/ItemDetailModal";
import CategoryFilter from "../../../components/category-filter";
import MapCategoryFilter from "../../../components/map-category-filter";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { firestore } from "../../../../firebaseconfig";
import { collection, getDocs } from "firebase/firestore";
import logging from "../../../utils/logging";

const SEARCH_RADIUS_KM = 3;
const REFRESH_DISTANCE_KM = 1;

export default function Map({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [cameraCoordinates, setCameraCoordinates] = useState(null);
  const [lastPosition, setLastPosition] = useState(null);
  const flatListRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStoreDetails, setSelectedStoreDetails] = useState(null);
  const mapRef = useRef(null);

  //const selectedCategories = useSelector((state) => state.categories.selectedCategories);
  const [selectedCategories, setSelectedCategories] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const getSuggestions = async () => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }
  
      const results = await fetchCitySuggestions(searchQuery);
      setSuggestions(results);
    };
  
    getSuggestions();
  }, [searchQuery]);  

  const fetchCountryCode = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Permission refusée pour la localisation.");
        return null;
      }
  
      const location = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
  
      if (reverseGeocode.length > 0) {
        return reverseGeocode[0].isoCountryCode;
      }
  
      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération du pays :", error);
      return null;
    }
  };

  const fetchCitySuggestions = async (query) => {
    if (!query.trim()) return [];
  
    try {
      const username = "saitoosu";
      const countryCode = await fetchCountryCode();
  
      if (!countryCode) {
        console.warn("Impossible de récupérer le code pays.");
        return [];
      }
  
      const url = `http://api.geonames.org/searchJSON?name_startsWith=${query}&featureClass=P&maxRows=5&country=${countryCode}&username=${username}`;
      const response = await fetch(url);
      const data = await response.json();
  
      if (!data.geonames) {
        console.error("Données incorrectes reçues :", data);
        return [];
      }
  
      const uniqueCities = [...new Set(data.geonames.map(city => city.name))];
  
      return uniqueCities;
    } catch (error) {
      console.error("Erreur lors de la récupération des suggestions :", error);
      return [];
    }
  };   

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const locations = await Location.geocodeAsync(searchQuery);
      if (locations.length > 0) {
        const { latitude, longitude } = locations[0];

        setCameraCoordinates({ latitude, longitude });

        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
          setSuggestions([]);
        }
      } else {
        Alert.alert("Ville non trouvée", "Veuillez entrer un nom valide.");
      }
    } catch (error) {
      console.error("Erreur lors de la recherche :", error);
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) fetchNearbyStores(userLocation.latitude, userLocation.longitude);
  }, [userLocation]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Activez la localisation pour voir les magasins près de vous.");
        return;
      }
  
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!location || !location.coords) {
        console.warn("Impossible d'obtenir la position de l'utilisateur.");
        return;
      }
  
      const { latitude, longitude } = location.coords;
  
      setUserLocation({ latitude, longitude });
      setCameraCoordinates({ latitude, longitude });
      setLastPosition({ latitude, longitude });
  
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
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
  
      setStores(filteredStores);
    } catch (error) {
      logging("Erreur lors de la récupération des magasins :", error);
    } finally {
      setLoading(false);
    }
  };  

  useEffect(() => {
    if (userLocation) {
      fetchNearbyStores(userLocation.latitude, userLocation.longitude);
    }
  }, [selectedCategories]);  

  const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const onRegionChangeComplete = (region) => {
    if (!lastPosition) return;
    const distanceMoved = getDistanceInKm(lastPosition.latitude, lastPosition.longitude, region.latitude, region.longitude);
    if (distanceMoved >= REFRESH_DISTANCE_KM) {
      setLastPosition({ latitude: region.latitude, longitude: region.longitude });
      fetchNearbyStores(region.latitude, region.longitude);
    }
  };

  return (
    <ScreenWrapper backgroundColor={AppColors.white_100} statusBarColor={AppColors.white_100} barStyle="dark-content">
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une ville..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
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
                setSearchQuery(suggestion);
                setSuggestions([]);
                handleSearch();
              }}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
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
                selectedCategories={selectedCategories} 
                setSelectedCategories={setSelectedCategories} 
              />
            </View>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: cameraCoordinates.latitude,
                longitude: cameraCoordinates.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onRegionChangeComplete={onRegionChangeComplete}
              showsUserLocation={true}
              provider="google"
            >
              {stores.map((store, index) => (
              <Marker
                key={`${store.id}-${index}`}
                coordinate={{ latitude: store.latitude, longitude: store.longitude }}
                title={store.name}
                description={store.description?.en || "No description available"}
                onPress={() => {
                  setSelectedStore(store);
                  setSelectedStoreDetails({
                    id: store.id,
                    title: store.name,
                    description: store.description?.en || "No description available",
                    tags: store.category || [],
                    address: store.address || "No address available",
                  });
                  setModalVisible(true);
                }}
              />
            ))}
            </MapView>
          </View>
        ) : (
          <View style={styles.loading}><Text>Chargement de la carte...</Text></View>
        )}
      </View>
      <FloatingCards 
        data={stores} 
        ref={flatListRef}
        selectedStore={selectedStore}
        onCardSelect={setSelectedStore}
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
  }
});
