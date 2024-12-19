import React, { useEffect, useState } from "react";
import ScreenWrapper from "../../../components/screen-wrapper";
import { AppColors } from "../../../utils";
import Header from "../../../components/header";
import { height, width } from "../../../utils/dimension";
import { StyleSheet, View } from "react-native";
import Mapbox from "@rnmapbox/maps"; // Import your FloatingItem component
import FloatingCards from "../../../components/card-Item";
import { firestore } from "../../../../firebaseconfig";
import { collection, getDocs } from "firebase/firestore";

Mapbox.setAccessToken(
  "sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ"
);

const data = [
  {
    name: "Marsellie E.",
    rating: 4.5,
    image: require("../../../../assets/dummyImage.png"), // Replace with actual image URL
  },
  {
    name: "Big Latte",
    rating: 4.0,
    image: require("../../../../assets/dummyImage.png"), // Replace with actual image URL
  },
  {
    name: "Marsellie Ess",
    rating: 5,
    image: require("../../../../assets/dummyImage.png"), // Replace with actual image URL
  },
  {
    name: "Big Lattes",
    rating: 4.0,
    image: require("../../../../assets/dummyImage.png"), // Replace with actual image URL
  },
];
const markerCoordinates = {
  latitude: 45.5231,
  longitude: -122.6765,
};
export default function Carte({ navigation }) {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getHotelData();
  }, []);

  const getHotelData = async () => {
    const docRef = collection(firestore, "hotels");
    const exists = await getDocs(docRef);
    const hotelData = exists?.docs?.map((item) => {
      return item?.data();
    });
    setHotels(hotelData);
    setLoading(false);
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
      <View style={styles.container}>
        <Mapbox.MapView
          style={styles.map}
          scaleBarEnabled={false}
          projection="mercator"
        >
          {/* Camera to center the map on the marker location */}
          <Mapbox.Camera
            centerCoordinate={[
              markerCoordinates.longitude,
              markerCoordinates.latitude,
            ]}
            zoomLevel={14} // Set appropriate zoom level for focusing
          />

          {/* Marker View */}
          <Mapbox.MarkerView
            coordinate={[
              markerCoordinates.longitude,
              markerCoordinates.latitude,
            ]}
          ></Mapbox.MarkerView>
        </Mapbox.MapView>
      </View>
      <FloatingCards data={data} />
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
});
