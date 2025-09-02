import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import AppColors from "../../utils/app-colors";

const CLUSTER_RADIUS = 50; // meters

export default function MarkerCluster({ 
  stores, 
  onClusterPress, 
  onMarkerPress, 
  selectedStore,
  userLocation,
  showLabels = false 
}) {
  const [clusters, setClusters] = useState([]);
  const [expandedCluster, setExpandedCluster] = useState(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Group stores into clusters
  useEffect(() => {
    if (!stores || stores.length === 0) {
      setClusters([]);
      return;
    }

    const newClusters = [];
    const processedStores = new Set();

    stores.forEach((store, index) => {
      if (processedStores.has(store.id)) return;

      const cluster = {
        id: `cluster-${index}`,
        stores: [store],
        center: {
          latitude: store.latitude,
          longitude: store.longitude
        },
        isCluster: false
      };

      // Find nearby stores to cluster
      stores.forEach((otherStore, otherIndex) => {
        if (otherIndex <= index || processedStores.has(otherStore.id)) return;

        const distance = calculateDistance(
          store.latitude, store.longitude,
          otherStore.latitude, otherStore.longitude
        );

        if (distance <= CLUSTER_RADIUS) {
          cluster.stores.push(otherStore);
          processedStores.add(otherStore.id);
        }
      });

      processedStores.add(store.id);

      // If cluster has multiple stores, calculate center and mark as cluster
      if (cluster.stores.length > 1) {
        cluster.isCluster = true;
        const avgLat = cluster.stores.reduce((sum, s) => sum + s.latitude, 0) / cluster.stores.length;
        const avgLon = cluster.stores.reduce((sum, s) => sum + s.longitude, 0) / cluster.stores.length;
        cluster.center = { latitude: avgLat, longitude: avgLon };
      }

      newClusters.push(cluster);
    });

    setClusters(newClusters);
  }, [stores]);

  const handleClusterPress = (cluster) => {
    if (cluster.isCluster) {
      setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id);
      
      // Animate cluster expansion
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      onClusterPress?.(cluster);
    }
  };

  const getClusterColor = (storeCount) => {
    if (storeCount >= 10) return [AppColors.red, '#d32f2f'];
    if (storeCount >= 5) return [AppColors.primary, AppColors.purple];
    return [AppColors.grey_200, AppColors.grey_100];
  };

  const getClusterSize = (storeCount) => {
    if (storeCount >= 10) return 50;
    if (storeCount >= 5) return 45;
    return 40;
  };

  return (
    <>
      {clusters.map((cluster) => (
        <MapboxGL.PointAnnotation
          key={cluster.id}
          id={cluster.id}
          coordinate={[cluster.center.longitude, cluster.center.latitude]}
          onSelected={() => handleClusterPress(cluster)}
        >
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => handleClusterPress(cluster)}
          >
            <Animated.View 
              style={[
                styles.clusterContainer,
                {
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              {cluster.isCluster ? (
                // Render cluster marker
                <View
                  style={[
                    styles.clusterMarker,
                    {
                      width: getClusterSize(cluster.stores.length),
                      height: getClusterSize(cluster.stores.length),
                      borderRadius: getClusterSize(cluster.stores.length) / 2,
                      backgroundColor: getClusterColor(cluster.stores.length)[0]
                    }
                  ]}
                >
                  <Text style={styles.clusterText}>
                    {cluster.stores.length > 99 ? '99+' : cluster.stores.length}
                  </Text>
                </View>
              ) : (
                // Render single store marker
                <View style={styles.singleMarker}>
                  <View style={[
                    styles.markerDot,
                    {
                      backgroundColor: selectedStore?.id === cluster.stores[0].id 
                        ? AppColors.primary 
                        : AppColors.grey_200
                    }
                  ]} />
                </View>
              )}

              {/* Show expanded cluster stores */}
              {cluster.isCluster && expandedCluster === cluster.id && (
                <View style={styles.expandedCluster}>
                  {cluster.stores.map((store, index) => (
                    <TouchableOpacity
                      key={store.id}
                      style={[
                        styles.expandedMarker,
                        {
                          transform: [
                            { 
                              translateX: Math.cos(index * (2 * Math.PI / cluster.stores.length)) * 60 
                            },
                            { 
                              translateY: Math.sin(index * (2 * Math.PI / cluster.stores.length)) * 60 
                            }
                          ]
                        }
                      ]}
                      onPress={() => onMarkerPress(store)}
                    >
                      <View
                        style={[
                          styles.expandedMarkerDot,
                          {
                            backgroundColor: selectedStore?.id === store.id ? AppColors.primary : AppColors.white
                          }
                        ]}
                      >
                        <Text style={[
                          styles.expandedMarkerText,
                          { color: selectedStore?.id === store.id ? AppColors.white : AppColors.black }
                        ]}>
                          {index + 1}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </MapboxGL.PointAnnotation>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  clusterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  clusterMarker: {
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
    borderWidth: 3,
    borderColor: AppColors.white,
  },
  clusterText: {
    color: AppColors.white,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  singleMarker: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppColors.white,
  },
  expandedCluster: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedMarker: {
    position: 'absolute',
  },
  expandedMarkerDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: AppColors.white,
  },
  expandedMarkerText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
