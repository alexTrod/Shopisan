import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { Ionicons } from "@expo/vector-icons";
import AppColors from "../../utils/app-colors";

export default function CustomMarker({ store, selected, onPress, showLabel }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Animation effects
  useEffect(() => {
    if (selected) {
      // Pulse animation for selected marker
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      // Reset animations
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [selected]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getMarkerIcon = () => {
    // Category-based icons
    const category = store.category?.[0]?.toLowerCase() || '';
    
    if (category.includes('restaurant') || category.includes('food')) {
      return 'restaurant';
    } else if (category.includes('shop') || category.includes('store')) {
      return 'bag';
    } else if (category.includes('cafe') || category.includes('coffee')) {
      return 'cafe';
    } else if (category.includes('bar') || category.includes('pub')) {
      return 'wine';
    } else {
      return 'location-sharp';
    }
  };

  const getMarkerColors = () => {
    if (selected) {
      return {
        gradient: [AppColors.primary, AppColors.purple],
        iconColor: AppColors.white,
        shadowColor: AppColors.primary,
      };
    } else {
      return {
        gradient: [AppColors.white, AppColors.grey_300],
        iconColor: AppColors.primary,
        shadowColor: AppColors.grey_200,
      };
    }
  };

  const colors = getMarkerColors();

  return (
    <MapboxGL.PointAnnotation
      key={`${store.id}-${selected ? 'selected' : 'unselected'}-${showLabel ? 'label' : 'nolabel'}`}
      id={store.id.toString()}
      coordinate={[store.longitude, store.latitude]}
      onSelected={onPress}
    >
      <TouchableOpacity 
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View 
          style={[
            styles.annotationContainer,
            {
              transform: [
                { scale: Animated.multiply(scaleAnim, pulseAnim) }
              ]
            }
          ]}
        >
          {/* Glow effect for selected markers */}
          {selected && (
            <Animated.View 
              style={[
                styles.glowEffect,
                {
                  opacity: glowAnim,
                  backgroundColor: colors.shadowColor,
                }
              ]}
            />
          )}

          {/* Main marker container */}
          <View
            style={[
              styles.markerContainer,
              { backgroundColor: colors.gradient[0] }
            ]}
          >
            <Ionicons
              name={getMarkerIcon()}
              size={selected ? 24 : 20}
              color={colors.iconColor}
            />
          </View>

          {/* Store name label */}
          {showLabel && (
            <View style={styles.labelContainer}>
              <Text style={styles.labelText} numberOfLines={1}>
                {store.name}
              </Text>
            </View>
          )}

          {/* Selection indicator */}
          {selected && (
            <View style={styles.selectionIndicator}>
              <View style={styles.selectionDot} />
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </MapboxGL.PointAnnotation>
  );
}

const styles = StyleSheet.create({
  annotationContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.3,
    zIndex: -1,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: AppColors.white,
  },
  labelContainer: {
    backgroundColor: AppColors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: AppColors.grey_300,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.black,
    textAlign: 'center',
    maxWidth: 120,
  },
  selectionIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AppColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  selectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.primary,
  },
});
