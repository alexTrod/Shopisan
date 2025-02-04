import React, { useEffect, useState, useRef } from "react";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import Header from "../../../components/header";
import { height, width } from "../../../utils/dimension";
import { StyleSheet, View } from "react-native";
import Mapbox from "@rnmapbox/maps";
import FloatingCards from "../../../components/card-Item";
import CategoryFilter from "../../../components/category-filter";
import { useSelector } from 'react-redux';
import { fetchStores, getStoreQuery } from "../../../utils/storeUtils";
import logging from "../../../utils/logging";

Mapbox.setAccessToken(
  "sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ"
);

const DEFAULT_COORDINATES = ["-122.6765", "45.5231"]; // Default center if no stores

export default function Map({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [cameraCoordinates, setCameraCoordinates] = useState(DEFAULT_COORDINATES);
  const flatListRef = useRef(null);
  const mapRef = useRef(null);

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

      // Set initial camera position to first store if available
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

  const handleMarkerPress = (store) => {
    setSelectedStore(store);
    const storeIndex = stores.findIndex(s => s.id === store.id);
    if (storeIndex !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ 
        index: storeIndex, 
        animated: true,
        viewPosition: 0.5
      });
    }

    // Update camera position
    if (store?.address?.[0]?.location?.geopoint) {
      const { longitude, latitude } = store.address[0].location.geopoint;
      setCameraCoordinates([longitude.toString(), latitude.toString()]);
    }
  };

  const handleCardSelect = (store) => {
    setSelectedStore(store);
    if (store?.address?.[0]?.location?.geopoint) {
      const { longitude, latitude } = store.address[0].location.geopoint;
      setCameraCoordinates([longitude.toString(), latitude.toString()]);
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
        <Mapbox.MapView
          ref={mapRef}
          style={styles.map}
          scaleBarEnabled={false}
          logoEnabled={false}
          compassEnabled={true}
          zoomEnabled={true}
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
                coordinate={[longitude.toString(), latitude.toString()]}
                onSelected={() => handleMarkerPress(store)}
              >
                <View style={[
                  styles.marker,
                  selectedStore?.id === store.id && styles.selectedMarker
                ]} />
              </Mapbox.PointAnnotation>
            );
          })}
        </Mapbox.MapView>
      </View>
      <FloatingCards 
        data={stores} 
        ref={flatListRef}
        selectedStore={selectedStore}
        onCardSelect={handleCardSelect}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    height: height(90),
    width: width(100),
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AppColors.primary,
    borderWidth: 2,
    borderColor: 'white',
  },
  selectedMarker: {
    backgroundColor: AppColors.secondary,
    transform: [{ scale: 1.2 }],
  },
});
