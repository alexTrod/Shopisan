import React from 'react';
import { View, Image, FlatList, StyleSheet } from 'react-native';
import StorefrontIcon from "../../../assets/icons/storefront-icon";
import { AppColors } from "../../utils";
import { width } from "../../utils/dimension";

const ImageGallery = ({
  images = [],
  fallbackIcon: FallbackIcon = StorefrontIcon,
  onIndexChange,
  currentIndex = 0,
}) => {
  const handleScroll = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width(85));
    if (onIndexChange) {
      onIndexChange(index);
    }
  };

  if (images.length === 0) {
    return (
      <View style={styles.noImageContainer}>
        <FallbackIcon width={60} height={60} color={AppColors.grey_400} />
      </View>
    );
  }

  return (
    <View style={styles.imageGalleryContainer}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item: imageUrl }) => (
          <Image
            source={{ uri: imageUrl }}
            style={styles.storeImage}
            resizeMode="cover"
          />
        )}
      />
      {images.length > 1 && (
        <View style={styles.paginationDots}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index && styles.activeDot
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  imageGalleryContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  storeImage: {
    width: width(85),
    height: width(60),
    borderRadius: 12,
  },
  noImageContainer: {
    width: width(85),
    height: width(40),
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: AppColors.primary,
  },
});

export default ImageGallery;
