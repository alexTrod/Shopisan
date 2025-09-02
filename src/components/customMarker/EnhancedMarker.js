import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { Ionicons } from "@expo/vector-icons";
import AppColors from "../../utils/app-colors";

export default function EnhancedMarker({ 
  store, 
  selected, 
  onPress, 
  showLabel, 
  userLocation,
  showTooltip = false 
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Calculate distance from user
  const getDistance = () => {
    if (!userLocation || !store.latitude || !store.longitude) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (store.latitude - userLocation.latitude) * Math.PI / 180;
    const dLon = (store.longitude - userLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(store.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  // Check if store is open
  const isOpen = () => {
    if (!store.openingHours) return null;
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const todayHours = store.openingHours[currentDay];
    if (!todayHours || !todayHours.open || !todayHours.close) return null;
    
    return currentTime >= todayHours.open && currentTime <= todayHours.close;
  };

  // Simple animation for selected marker
  useEffect(() => {
    if (selected) {
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
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
      toValue: selected ? 1.2 : 1,
      useNativeDriver: true,
    }).start();
  };

  const getMarkerIcon = () => {
    // Add more robust null checking for category
    const category = Array.isArray(store.category) && 
                     store.category.length > 0 && 
                     typeof store.category[0] === 'string'
      ? store.category[0].toLowerCase() 
      : '';
    
    if (category.includes('restaurant') || category.includes('food')) {
      return 'restaurant';
    } else if (category.includes('shop') || category.includes('store')) {
      return 'bag';
    } else if (category.includes('cafe') || category.includes('coffee')) {
      return 'cafe';
    } else if (category.includes('bar') || category.includes('pub')) {
      return 'wine';
    } else if (category.includes('pharmacy') || category.includes('health')) {
      return 'medical';
    } else if (category.includes('bank') || category.includes('finance')) {
      return 'card';
    } else {
      return 'location';
    }
  };

  const getMarkerStyle = () => {
    const openStatus = isOpen();
    
    if (selected) {
      return {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.white,
        borderWidth: 3,
      };
    } else if (openStatus === true) {
      return {
        backgroundColor: '#4CAF50',
        borderColor: AppColors.white,
        borderWidth: 2,
      };
    } else if (openStatus === false) {
      return {
        backgroundColor: AppColors.red,
        borderColor: AppColors.white,
        borderWidth: 2,
      };
    } else {
      return {
        backgroundColor: AppColors.grey_200,
        borderColor: AppColors.white,
        borderWidth: 2,
      };
    }
  };

  const distance = getDistance();
  const openStatus = isOpen();

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
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Simple marker */}
          <View style={[styles.marker, getMarkerStyle()]}>
            <Ionicons
              name={getMarkerIcon()}
              size={selected ? 20 : 16}
              color={AppColors.white}
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

          {/* Simple tooltip */}
          {selected && showTooltip && (
            <View style={styles.tooltipContainer}>
              <View style={styles.tooltip}>
                <Text style={styles.tooltipTitle}>{store.name}</Text>
                {store.category && (
                  <Text style={styles.tooltipCategory}>
                    {store.category.join(', ')}
                  </Text>
                )}
                {distance && (
                  <Text style={styles.tooltipText}>{distance} away</Text>
                )}
                {openStatus !== null && (
                  <Text style={[
                    styles.tooltipText,
                    { color: openStatus ? '#4CAF50' : AppColors.red }
                  ]}>
                    {openStatus ? '● Open' : '● Closed'}
                  </Text>
                )}
              </View>
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
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  labelContainer: {
    backgroundColor: AppColors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: AppColors.grey_300,
  },
  labelText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.black,
    textAlign: 'center',
    maxWidth: 100,
  },
  tooltipContainer: {
    position: 'absolute',
    bottom: 40,
    left: -80,
    width: 160,
    zIndex: 1000,
  },
  tooltip: {
    backgroundColor: AppColors.white,
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: AppColors.grey_300,
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.black,
    marginBottom: 2,
  },
  tooltipCategory: {
    fontSize: 10,
    color: AppColors.grey_200,
    marginBottom: 4,
  },
  tooltipText: {
    fontSize: 10,
    color: AppColors.black,
  },
});
