import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppColors from '../../utils/app-colors';

export default function MarkerDemo({ onClose }) {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showTooltips, setShowTooltips] = useState(false);

  // Demo store data
  const demoStores = [
    {
      id: 1,
      name: "Café Central",
      category: ["cafe", "coffee"],
      latitude: 48.8566,
      longitude: 2.3522,
      openingHours: {
        1: { open: 700, close: 2200 }, // Monday
        2: { open: 700, close: 2200 }, // Tuesday
        3: { open: 700, close: 2200 }, // Wednesday
        4: { open: 700, close: 2200 }, // Thursday
        5: { open: 700, close: 2300 }, // Friday
        6: { open: 800, close: 2300 }, // Saturday
        0: { open: 800, close: 2100 }, // Sunday
      }
    },
    {
      id: 2,
      name: "Restaurant Le Gourmet",
      category: ["restaurant", "food"],
      latitude: 48.8584,
      longitude: 2.2945,
      openingHours: {
        1: { open: 1200, close: 2300 },
        2: { open: 1200, close: 2300 },
        3: { open: 1200, close: 2300 },
        4: { open: 1200, close: 2300 },
        5: { open: 1200, close: 2400 },
        6: { open: 1200, close: 2400 },
        0: { open: 1200, close: 2200 },
      }
    },
    {
      id: 3,
      name: "Boutique Fashion",
      category: ["shop", "clothing"],
      latitude: 48.8606,
      longitude: 2.3376,
      openingHours: {
        1: { open: 1000, close: 1900 },
        2: { open: 1000, close: 1900 },
        3: { open: 1000, close: 1900 },
        4: { open: 1000, close: 1900 },
        5: { open: 1000, close: 2000 },
        6: { open: 1000, close: 2000 },
        0: { open: 1100, close: 1800 },
      }
    },
    {
      id: 4,
      name: "Bar Le Soir",
      category: ["bar", "pub"],
      latitude: 48.8627,
      longitude: 2.2876,
      openingHours: {
        1: { open: 1800, close: 200 }, // Closed Monday
        2: { open: 1800, close: 200 },
        3: { open: 1800, close: 200 },
        4: { open: 1800, close: 200 },
        5: { open: 1800, close: 300 },
        6: { open: 1800, close: 300 },
        0: { open: 1800, close: 100 },
      }
    }
  ];

  const demoUserLocation = {
    latitude: 48.8566,
    longitude: 2.3522
  };

  const currentTime = new Date();
  const currentDay = currentTime.getDay();
  const currentHour = currentTime.getHours() * 100 + currentTime.getMinutes();

  const isStoreOpen = (store) => {
    const todayHours = store.openingHours[currentDay];
    if (!todayHours || !todayHours.open || !todayHours.close) return null;
    
    // Handle bars that close after midnight
    if (todayHours.close < todayHours.open) {
      return currentHour >= todayHours.open || currentHour <= todayHours.close;
    }
    
    return currentHour >= todayHours.open && currentHour <= todayHours.close;
  };

  const getMarkerIcon = (category) => {
    const cat = category?.[0]?.toLowerCase() || '';
    
    if (cat.includes('restaurant') || cat.includes('food')) {
      return 'restaurant';
    } else if (cat.includes('shop') || cat.includes('store')) {
      return 'bag';
    } else if (cat.includes('cafe') || cat.includes('coffee')) {
      return 'cafe';
    } else if (cat.includes('bar') || cat.includes('pub')) {
      return 'wine';
    } else {
      return 'location-sharp';
    }
  };

  const getMarkerColors = (store) => {
    const openStatus = isStoreOpen(store);
    const isSelected = selectedMarker?.id === store.id;
    
    if (isSelected) {
      return {
        gradient: [AppColors.primary, AppColors.purple],
        iconColor: AppColors.white,
        shadowColor: AppColors.primary,
      };
    } else if (openStatus === true) {
      return {
        gradient: [AppColors.white, '#e8f5e8'],
        iconColor: '#4CAF50',
        shadowColor: '#4CAF50',
      };
    } else if (openStatus === false) {
      return {
        gradient: [AppColors.white, '#ffe8e8'],
        iconColor: AppColors.red,
        shadowColor: AppColors.red,
      };
    } else {
      return {
        gradient: [AppColors.white, AppColors.grey_300],
        iconColor: AppColors.primary,
        shadowColor: AppColors.grey_200,
      };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enhanced Markers Demo</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={AppColors.black} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Marker Features</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Gradient backgrounds with shadows</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Category-based icons</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Opening status indicators</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Distance calculations</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Animated selection effects</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Rich tooltips with store info</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Marker clustering for performance</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demo Markers</Text>
          <View style={styles.markersContainer}>
            {demoStores.map((store) => {
              const colors = getMarkerColors(store);
              const openStatus = isStoreOpen(store);
              const isSelected = selectedMarker?.id === store.id;
              
              return (
                <TouchableOpacity
                  key={store.id}
                  style={styles.markerDemo}
                  onPress={() => setSelectedMarker(isSelected ? null : store)}
                >
                  <View style={styles.markerContainer}>
                    <View style={[
                      styles.marker,
                      {
                        backgroundColor: colors.gradient[0],
                        borderColor: colors.shadowColor,
                      }
                    ]}>
                      <Ionicons
                        name={getMarkerIcon(store.category)}
                        size={isSelected ? 24 : 20}
                        color={colors.iconColor}
                      />
                    </View>
                    
                    {openStatus !== null && (
                      <View style={[
                        styles.statusIndicator,
                        { backgroundColor: openStatus ? '#4CAF50' : AppColors.red }
                      ]}>
                        <Ionicons
                          name={openStatus ? 'checkmark' : 'close'}
                          size={8}
                          color={AppColors.white}
                        />
                      </View>
                    )}
                    
                    {isSelected && (
                      <View style={styles.selectionIndicator}>
                        <View style={styles.selectionDot} />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.markerInfo}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    <Text style={styles.storeCategory}>
                      {store.category.join(', ')}
                    </Text>
                    <Text style={[
                      styles.openStatus,
                      { color: openStatus === true ? '#4CAF50' : openStatus === false ? AppColors.red : AppColors.grey_200 }
                    ]}>
                      {openStatus === true ? '● Open now' : openStatus === false ? '● Closed' : '● Hours unknown'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legend</Text>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Open now</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: AppColors.red }]} />
              <Text style={styles.legendText}>Closed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: AppColors.primary }]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: AppColors.grey_200 }]} />
              <Text style={styles.legendText}>Unknown status</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_300,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.black,
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_300,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.black,
    marginBottom: 15,
  },
  featureList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: AppColors.black,
  },
  markersContainer: {
    gap: 15,
  },
  markerDemo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 10,
    backgroundColor: AppColors.grey_300,
    borderRadius: 12,
  },
  markerContainer: {
    position: 'relative',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AppColors.white,
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
  markerInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.black,
    marginBottom: 4,
  },
  storeCategory: {
    fontSize: 14,
    color: AppColors.grey_200,
    marginBottom: 4,
  },
  openStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  legend: {
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 14,
    color: AppColors.black,
  },
});
