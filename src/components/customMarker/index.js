import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { Ionicons } from "@expo/vector-icons";
import { AppColors } from "../../utils";

export default function CustomMarker({ store, selected, onPress, showLabel }) {
  // Truncate long names to prevent clutter
  const displayName = store.name?.length > 15
    ? store.name.substring(0, 13) + '...'
    : store.name;

  return (
    <MapboxGL.PointAnnotation
      key={`${store.id}-${selected ? 'selected' : 'default'}-${showLabel ? 'label' : 'nolabel'}`}
      id={store.id.toString()}
      coordinate={[store.longitude, store.latitude]}
      onSelected={onPress}
    >
      <TouchableOpacity activeOpacity={0.8}>
        <View style={styles.annotationContainer}>
          <Ionicons
            name="location-sharp"
            size={selected ? 36 : 30}
            color={selected ? AppColors.primary : "#E53935"}
          />
          {showLabel && (
            <Text style={styles.labelText} numberOfLines={1}>
              {displayName}
            </Text>
          )}
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
    marginTop: 2,
    fontSize: 10,
    fontWeight: '500',
    color: '#1a1a1a',
    textAlign: 'center',
    textShadowColor: 'white',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
    maxWidth: 80,
  },
});
