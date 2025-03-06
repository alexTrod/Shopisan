import React, { useEffect, useState, useRef } from "react";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import Header from "../../../components/header";
import { height, width } from "../../../utils/dimension";
import { StyleSheet, View, Alert, TouchableOpacity } from "react-native";
import Mapbox from "@rnmapbox/maps";
import FloatingCards from "../../../components/card-Item";
import ItemDetailModal from "../../../components/item-card/ItemDetailM odal";
import CategoryFilter from "../../../components/category-filter";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from 'react-redux';
import { firestore } from "../../../../firebaseconfig";
import { collection, getDocs } from "firebase/firestore";
import logging from "../../../utils/logging";

Mapbox.setAccessToken("sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ");

const SEARCH_RADIUS_KM = 5;
const REFRESH_DISTANCE_KM = 1;

export default function Map({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [cameraCoordinates, setCameraCoordinates] = useState(null);
  const [lastPosition, setLastPosition] = useState(null);
  const flatListRef = useRef(null);
  const mapRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStoreDetails, setSelectedStoreDetails] = useState(null);

  const selectedCategories = useSelector(state => state.categories.selectedCategories);
  const categories = useSelector(state => state.categories.categories);

  useEffect(() => {
    setLoading(true);
    getStoreData();
  }, [selectedCategories]);

  const getStoreData = async () => {
    try {
      const storeQuery = getStoreQuery(selectedCategories, null, categories);
      const { stores: newStores } = await fetchStores(storeQuery);
      setStores(newStores);

      if (newStores.length > 0 && newStores[0]?.address?.[0]?.location?.geopoint) {
        const { longitude, latitude } = newStores[0].address[0].location.geopoint;
        setCameraCoordinates([longitude.toString(), latitude.toString()]);
      }
    } catch (error) {
      logging('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Activez la localisation pour voir les magasins près de vous.");
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      setUserLocation({ latitude, longitude });
      setCameraCoordinates([longitude, latitude]);
      setLastPosition({ latitude, longitude });
      fetchNearbyStores(latitude, longitude);
      
    } catch (error) {
      logging("Erreur de localisation :", error);
      setLoading(false);
    }
  };

  const fetchNearbyStores = async (latitude, longitude) => {
    try {
      setLoading(true);
      const storesRef = collection(firestore, "stores");
      const storesSnapshot = await getDocs(storesRef);

      const filteredStores = storesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(store => {
          if (!store.address?.[0]?.location?.geopoint) return false;

          const { latitude: storeLat, longitude: storeLng } = store.address[0].location.geopoint;
          return getDistanceInKm(latitude, longitude, storeLat, storeLng) <= SEARCH_RADIUS_KM;
        });

      setStores(filteredStores);
    } catch (error) {
      logging("Erreur lors de la récupération des magasins :", error);
    } finally {
      setLoading(false);
    }
  };

  const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const handleMapIdle = async () => {
    if (!mapRef.current) return;

    const center = await mapRef.current.getCenter();
    const newLatitude = center[1];
    const newLongitude = center[0];

    if (getDistanceInKm(lastPosition.latitude, lastPosition.longitude, newLatitude, newLongitude) >= REFRESH_DISTANCE_KM) {
      setLastPosition({ latitude: newLatitude, longitude: newLongitude });
      fetchNearbyStores(newLatitude, newLongitude);
    }
  };

  const recenterMap = () => {
    if (userLocation) {
      setCameraCoordinates([userLocation.longitude, userLocation.latitude]);
    }
  };

  return (
    <ScreenWrapper
      backgroundColor={AppColors.white_100}
      statusBarColor={AppColors.white_100}
      barStyle="dark-content"
    >
      <Header
        showLeft={true}
        showBack
        title="Map"
        rightIcon
        onRightPress={() => {}}
        containerStyle={{ width: width(90), alignSelf: "center" }}
      />
      <CategoryFilter />

      <View style={styles.container}>
        {cameraCoordinates && (
          <Mapbox.MapView
            ref={mapRef}
            style={styles.map}
            scaleBarEnabled={false}
            logoEnabled={false}
            compassEnabled={true}
            zoomEnabled={true}
            onMapIdle={handleMapIdle}
          >
            <Mapbox.Camera
              zoomLevel={14}
              animationMode="flyTo"
              animationDuration={2000}
              centerCoordinate={cameraCoordinates}
            />
            
            {stores.map((store) => {
              if (!store?.address?.[0]?.location?.geopoint) return null;
              const { longitude, latitude } = store.address[0].location.geopoint;
              
              return (
                <Mapbox.PointAnnotation
                  key={store.id}
                  id={store.id.toString()}
                  coordinate={[longitude, latitude]}
                  onSelected={() => {
                    setSelectedStore(store); 
                    setSelectedStoreDetails({
                      id: store.id,
                      title: store.name,
                      description: store.description?.en || "No description available",
                      tags: store.category || [],
                      address: store.address || "No address available"
                    });
                    setModalVisible(true);
                  }}
                >
                  <View style={[
                    styles.marker,
                    selectedStore?.id === store.id && styles.selectedMarker
                  ]} />
                </Mapbox.PointAnnotation>
              );
            })}
          </Mapbox.MapView>
        )}

        <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
          <Ionicons name="locate" size={28} color="white" />
        </TouchableOpacity>
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
  container: { height: height(90), width: width(100) },
  map: { flex: 1 },
  marker: { width: 20, height: 20, borderRadius: 10, backgroundColor: AppColors.primary, borderWidth: 2, borderColor: 'white' },
  selectedMarker: { backgroundColor: AppColors.secondary, transform: [{ scale: 1.2 }] },
  recenterButton: { position: "absolute", bottom: 20, right: 20, backgroundColor: AppColors.primary, padding: 12, borderRadius: 50, elevation: 5 },
});
