import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchStores } from "../../utils/storeUtils";
import { setCustomLocation } from "../../Redux/Actions/LocationActions";
import { View } from "react-native";
import HomeScreen from "../../screens/app/home";
import Map from "../../screens/app/map";
import { useRoute } from "@react-navigation/native";

export default function MainDataProvider({ routeName }) {
  const dispatch = useDispatch();
  const selectedCategories = useSelector(state => state.categories.selectedCategories);
  const selectedCities = useSelector(state => state.cities.selectedCities);
  const customLocation = useSelector(state => state.location.customLocation);

  const [allStores, setAllStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    fetchStores().then(setAllStores);
  }, []);

  useEffect(() => {
    if (allStores.length > 0) {
      const filtered = filterStoresLocally(
        allStores,
        selectedCategories,
        selectedCities,
        "",
        customLocation || userLocation
      );
      setFilteredStores(filtered);
    }
  }, [allStores, selectedCategories, selectedCities, customLocation]);

  if (routeName === "Home") {
    return <HomeScreen stores={filteredStores} />;
  }

  if (routeName === "Map") {
    return (
      <Map
        stores={filteredStores}
        allStores={allStores}
        location={customLocation || userLocation}
      />
    );
  }

  return <View />;
}
