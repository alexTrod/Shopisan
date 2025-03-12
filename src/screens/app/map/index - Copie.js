import React, { useEffect, useState, useRef } from "react";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import Header from "../../../components/header";
import { height, width } from "../../../utils/dimension";
import { StyleSheet, View, Alert, TouchableOpacity, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";
import FloatingCards from "../../../components/card-Item";
import ItemDetailModal from "../../../components/item-card/ItemDetailModal";
import CategoryFilter from "../../../components/category-filter";
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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStoreDetails, setSelectedStoreDetails] = useState(null);
  const mapRef = useRef(null);

  const selectedCategories = useSelector((state) => state.categories.selectedCategories);

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
        console.warn("⚠️ Impossible d'obtenir la position de l'utilisateur.");
        return;
      }
  
      const { latitude, longitude } = location.coords;
      console.log("✅ Localisation récupérée :", { latitude, longitude });
  
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
      console.error("❌ Erreur lors de la récupération de la localisation :", error);
    }
  };  

  const fetchNearbyStores = async (latitude, longitude) => {
    try {
      setLoading(true);
      const storesRef = collection(firestore, "stores");
      const storesSnapshot = await getDocs(storesRef);

      const filteredStores = storesSnapshot.docs
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

      setStores(filteredStores);
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

      <View style={styles.container}>
        <View style={styles.filterContainer}>
          <CategoryFilter />
        </View>
        {cameraCoordinates ? (
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
        ) : (
          <View style={styles.loading}><Text>Chargement de la carte...</Text></View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  filterContainer: {
    position: "absolute",
    top: 0,
    left: 10,
    zIndex: 10,
    borderRadius: 10,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});

