import React, { forwardRef } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { height, width } from "../../utils/dimension";
import CardItem from "./CardItem";

const FloatingCards = forwardRef(({ data, selectedStore, onCardSelect }, ref) => {
  const renderItem = ({ item, index }) => (
    <CardItem 
      key={index} 
      item={item}
      isSelected={selectedStore?.id === item.id}
      onPress={() => onCardSelect(item)}
    />
  );

  return (
    <View style={styles.floatingContainer}>
      <FlatList
        ref={ref}
        data={data ?? []}
        keyExtractor={(item, index) => index.toString()}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        getItemLayout={(data, index) => ({
          length: width(70), // Approximate width of each card
          offset: width(70) * index,
          index,
        })}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    bottom: height(10),
    width: width(100),
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default FloatingCards;
