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

import { logout } from "../../../Redux/Actions/Auth";

import { useSelector } from "react-redux";
import ItemCard from "../../../components/item-card/ItemCard";
import CustomText from "../../../components/text";
import { height, width } from "../../../utils/dimension";
import { firestore } from "../../../../firebaseconfig";
import { collection, getDocs } from "firebase/firestore";
import CategoryFilter from "../../../components/category-filter";


import i18n from '../../../translations/i18n';
import { categories } from "../../../utils/dummy-data";

export default function HomeScreen({ navigation }) {
  const locale = useSelector(state => state.locale.currentLocale);
  i18n.locale = locale;
  const user = useSelector((state) => state?.Auth?.user);
  const [loading, setLoading] = useState(false);
  console.log("user", user);
  const [hotels, setHotels] = useState([]);


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

  const selectedCategory = useSelector(state => state.categories.selectedCategory);
  const filteredHotels = hotels.filter(hotel => 
    !selectedCategory || selectedCategory === 'All'
      ? true
      : hotel.category === selectedCategory
  );

  return (
    <ScreenWrapper
      backgroundColor={AppColors.white_100}
      statusBarColor={AppColors.white_100}
      barStyle="dark-content"
    >
      <View style={{ flex: 1 }}>
        <Header
          showLeft={true}
          showBack
          title={i18n.t('home_title')}
          rightIcon
          onRightPress={() => {}}
          containerStyle={{ width: width(90), alignSelf: "center" }}
        />
        <View style={{
          zIndex: 9999,
          elevation: 9999,
        }}>
          <CategoryFilter />
          
        </View>
        {loading ? (
          <ActivityIndicator color={"black"} size={"large"} />
        ) : (
          <FlatList
            style={{ zIndex: 1 }}
            data={hotels}
            showsVerticalScrollIndicator={false}
            keyExtractor={(index) => index?.toString()}
            renderItem={({ item }) => {
              return (
                <ItemCard
                  title={item.title}
                  rating={item.rating}
                  tags={item.tags}
                  description={item.description}
                  image={{ uri: item.image }}
                  fromFavorite={false}
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
      </View>
    </ScreenWrapper>
  );
}
