import {
  View,
  Pressable,
  ImageBackground,
  FlatList,
  ActivityIndicator,
} from "react-native";

import React, { useEffect, useState } from "react";

import ScreenWrapper from "../../../components/screen-wrapper";

import { AppColors } from "../../../utils";

import Header from "../../../components/header";

import ItemCard from "../../../components/item-card/ItemCard";
import CustomText from "../../../components/text";
import { height, width } from "../../../utils/dimension";
import { firestore } from "../../../../firebaseconfig";
import { collection, getDocs } from "firebase/firestore";

export default function FavoritesScreen() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getHotelData();
  }, []);

  const getHotelData = async () => {
    const docRef = collection(firestore, "hotels");
    const exists = await getDocs(docRef);
    const hotelData = exists?.docs?.map((item) => {
      return item?.data();
    });
    setHotels(hotelData);
    setLoading(false);
  };
  return (
    <ScreenWrapper
      backgroundColor={AppColors.white_100}
      statusBarColor={AppColors.white_100}
      barStyle="dark-content"
    >
      <Header
        showLeft={true}
        showBack
        title="Favorites"
        rightIcon
        onRightPress={() => {}}
        containerStyle={{ width: width(90), alignSelf: "center" }}
      />
      <CustomText
        textAlign="left"
        color={AppColors.black}
        textProps={{ fontFamily: "Mulish-Bold" }}
        textStyles={{
          fontFamily: "Mulish-Bold",
          paddingHorizontal: width(8),
          marginTop: height(4),
        }}
        size={2.2}
      >
        VOS STORES PREFERES
      </CustomText>
      {loading ? (
        <ActivityIndicator color={"black"} size={"large"} />
      ) : (
        <FlatList
          data={hotels ?? []}
          showsVerticalScrollIndicator={false}
          keyExtractor={(index) => index?.toString()}
          renderItem={({ item }) => {
            return (
              <ItemCard
                key={item.id}
                title={item.title}
                rating={item.rating}
                tags={item.tags}
                description={item.description}
                image={{ uri: item.image }}
                fromFavorite={true}
              />
            );
          }}
          ListEmptyComponent={() => {
            <CustomText
              textAlign="center"
              color={AppColors.grey_100}
              textProps={{ fontFamily: "Mulish-Bold" }}
              textStyles={{ fontFamily: "Mulish-Bold" }}
              size={2.2}
            >
              No items available
            </CustomText>;
          }}
        />
      )}
    </ScreenWrapper>
  );
}
