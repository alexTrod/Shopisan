import React, { useState } from "react";
import { View, Image, FlatList, StyleSheet } from "react-native";
import StorefrontIcon from "../../../assets/icons/storefront-icon";
import { AppColors } from "../../utils";
import { width } from "../../utils/dimension";

// Photo and placeholder share this ratio so the sheet keeps the same height
// whether or not a store has images.
const IMAGE_ASPECT_RATIO = 1.4;

const ImageGallery = ({
  images = [],
  fallbackIcon: FallbackIcon = StorefrontIcon,
  onIndexChange,
  currentIndex = 0,
}) => {
  // Paging needs a fixed item width, so measure the container instead of
  // guessing: the gallery has to line up with the text below it.
  const [itemWidth, setItemWidth] = useState(width(85));

  const handleLayout = (e) => {
    const measured = e.nativeEvent.layout.width;
    if (measured > 0 && measured !== itemWidth) {
      setItemWidth(measured);
    }
  };

  const handleScroll = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / itemWidth);
    if (onIndexChange) {
      onIndexChange(index);
    }
  };

  if (images.length === 0) {
    return (
      <View
        style={[styles.noImageContainer, { aspectRatio: IMAGE_ASPECT_RATIO }]}
        onLayout={handleLayout}
      >
        <FallbackIcon width={60} height={60} color={AppColors.grey_400} />
      </View>
    );
  }

  return (
    <View style={styles.imageGalleryContainer} onLayout={handleLayout}>
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
            style={[
              styles.storeImage,
              { width: itemWidth, aspectRatio: IMAGE_ASPECT_RATIO },
            ]}
            resizeMode="cover"
          />
        )}
      />
      {images.length > 1 && (
        <View style={styles.paginationDots}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, currentIndex === index && styles.activeDot]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  imageGalleryContainer: {
    width: "100%",
    marginBottom: 16,
  },
  storeImage: {
    borderRadius: 12,
  },
  noImageContainer: {
    width: "100%",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: AppColors.primary,
  },
});

export default ImageGallery;
