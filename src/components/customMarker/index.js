import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { Ionicons } from "@expo/vector-icons";

export default function CustomMarker({ store, selected, onPress, showLabel }) {
  return (
    <MapboxGL.PointAnnotation
      key={`${store.id}-${selected ? 'selected' : 'unselected'}-${showLabel ? 'label' : 'nolabel'}`}
      id={store.id.toString()}
      coordinate={[store.longitude, store.latitude]}
      onSelected={onPress}
    >
      <TouchableOpacity activeOpacity={0.8}>
        <View style={styles.annotationContainer}>
          {showLabel &&
            <Text style={styles.labelText}>{store.name}</Text>
          }

          <Ionicons
            name="location-sharp"
            size={30}
            color={selected ? "blue" : "red"}
          />
        </View>
      </TouchableOpacity>
    </MapboxGL.PointAnnotation>
  );
}

const styles = StyleSheet.create({
  annotationContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "black",
    backgroundColor: "white",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
