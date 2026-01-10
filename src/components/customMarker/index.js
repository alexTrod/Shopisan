import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { Ionicons } from "@expo/vector-icons";
import { AppColors } from "../../utils";

function CustomMarker({ store, selected, onPress, showLabel }) {
  // Truncate long names to prevent clutter
  const displayName = store.name?.length > 15
    ? store.name.substring(0, 13) + '...'
    : store.name;

  // Use MarkerView on Android for better performance (faster native rendering)
  // PointAnnotation is slow on Android due to native-JS bridge overhead
  const MarkerComponent = Platform.OS === 'android' ? MapboxGL.MarkerView : MapboxGL.PointAnnotation;

  return (
    <MarkerComponent
      id={store.id.toString()}
      coordinate={[store.longitude, store.latitude]}
      onSelected={Platform.OS === 'ios' ? onPress : undefined}
      anchor={{ x: 0.5, y: 1 }}
    >
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
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
    </MarkerComponent>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(CustomMarker, (prevProps, nextProps) => {
  return (
    prevProps.store.id === nextProps.store.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.showLabel === nextProps.showLabel &&
    prevProps.store.latitude === nextProps.store.latitude &&
    prevProps.store.longitude === nextProps.store.longitude
  );
});

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
