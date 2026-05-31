import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { Ionicons } from "@expo/vector-icons";
import { AppColors } from "../../utils";

const MAPBOX_TOKEN =
  "sk.eyJ1IjoiYWxleGZlIiwiYSI6ImNtMm1zYTVkNzByYngya3Fzamc2aDNzbHkifQ.N-lmJpX9_xjlt6ug-6uguQ";

// Set access token
MapboxGL.setAccessToken(MAPBOX_TOKEN);

// Helper to get translation with fallback (handles missing translation strings)
const getTranslation = (t, key, fallback) => {
  const value = t(key);
  if (!value || value.includes("missing") || value.includes("[")) {
    return fallback;
  }
  return value;
};

/**
 * MapPickerModal - Fullscreen map for picking a location
 *
 * @param {boolean} visible - Modal visibility
 * @param {Function} onClose - Called when modal closed without selection
 * @param {Function} onConfirm - Called with Mapbox feature when location confirmed
 * @param {Object} initialLocation - { latitude, longitude } to center map initially
 * @param {Function} t - Translation function
 */
const MapPickerModal = ({
  visible,
  onClose,
  onConfirm,
  initialLocation,
  t,
}) => {
  const cameraRef = useRef(null);
  const [centerCoordinate, setCenterCoordinate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Default to Paris if no initial location
  const defaultLocation = { latitude: 48.8566, longitude: 2.3522 };
  const startLocation = initialLocation || defaultLocation;

  useEffect(() => {
    if (visible) {
      setCenterCoordinate([startLocation.longitude, startLocation.latitude]);
      setError(null);
    }
  }, [visible, initialLocation]);

  const handleRegionDidChange = (feature) => {
    // Extract center from map region change
    if (feature?.geometry?.coordinates) {
      setCenterCoordinate(feature.geometry.coordinates);
    }
  };

  const handleConfirm = async () => {
    if (!centerCoordinate) return;

    setIsLoading(true);
    setError(null);

    // Create AbortController with manual timeout (AbortSignal.timeout not supported in RN)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const [longitude, latitude] = centerCoordinate;

      // Reverse geocode the center coordinate
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&language=fr`,
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        // Return the first (most relevant) result
        onConfirm(data.features[0]);
      } else {
        setError(
          getTranslation(
            t,
            "no_address_found",
            "No address found at this location. Try a different spot.",
          ),
        );
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Reverse geocoding error:", err);
      if (err.name === "AbortError") {
        setError(
          getTranslation(
            t,
            "network_timeout",
            "Connection timed out. Please try again.",
          ),
        );
      } else {
        setError(
          getTranslation(
            t,
            "geocoding_error",
            "Could not find address. Check your connection.",
          ),
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Map */}
        <MapboxGL.MapView
          style={styles.map}
          styleURL={MapboxGL.StyleURL.Street}
          onMapIdle={handleRegionDidChange}
          compassEnabled={true}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            centerCoordinate={
              centerCoordinate || [
                startLocation.longitude,
                startLocation.latitude,
              ]
            }
            zoomLevel={15}
            animationMode="flyTo"
            animationDuration={300}
          />
          <MapboxGL.UserLocation visible={true} />
        </MapboxGL.MapView>

        {/* Fixed crosshair in center */}
        <View style={styles.crosshairContainer} pointerEvents="none">
          <View style={styles.crosshair}>
            <Ionicons name="location" size={40} color={AppColors.primary} />
          </View>
          {/* Shadow/pin effect */}
          <View style={styles.pinShadow} />
        </View>

        {/* Header with close button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={AppColors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {getTranslation(t, "pick_location", "Pick location")}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionBanner}>
          <Text style={styles.instructionText}>
            {getTranslation(
              t,
              "drag_map_instruction",
              "Drag the map to position the pin on your address",
            )}
          </Text>
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={20} color="#fff" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Confirm button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmButton, isLoading && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.confirmButtonText}>
                  {getTranslation(t, "confirm_location", "Confirm location")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.white,
  },
  map: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.black,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  crosshairContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  crosshair: {
    marginBottom: 40, // Offset so pin point is at center
  },
  pinShadow: {
    position: "absolute",
    bottom: "50%",
    marginBottom: -8,
    width: 12,
    height: 6,
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  instructionBanner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 110 : 80,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionText: {
    fontSize: 14,
    color: AppColors.black,
    textAlign: "center",
  },
  errorBanner: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: AppColors.red || "#dc3545",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#fff",
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 20,
    left: 16,
    right: 16,
  },
  confirmButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default MapPickerModal;
