import React, { useEffect } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { AppColors } from "../utils";
import CustomText from "./text";
import { height, width } from "../utils/dimension";
import FranceFlag from "../../assets/icons/france-flag";
import GreeceFlag from "../../assets/icons/greece-flag";
import SpainFlag from "../../assets/icons/spain-flag";
import ItalyFlag from "../../assets/icons/italy-flag";
import UKFlag from "../../assets/icons/Uk-flag";
import BelgiqueFlag from "../../assets/icons/belgique-flag";
import Button from "./button";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedCountry, setCountries } from '../Redux/Actions/UserActions';
import { getCountries } from "../Redux/Reducers/UserReducer";
import logging from "../utils/logging";

export default function CountrySelector({ onSelectCountry }) {
  const countries = useSelector(state => state.user.countries);
  const selectedCountry = useSelector(state => state.user.selectedCountry);

  logging('current state', selectedCountry);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const countriesData = await getCountries();

        dispatch(setCountries(countriesData));
      } catch (error) {
        logging('Error fetching countries', error);
      }
    };
    fetchCountries();
  }, []);


  const countries_data = countries.map(country => ({
    id:countries.id,
    iso:country.iso,
    name:country.name._j.length > 0 ? country.name._j : 'UNDEFINED',
  }))

  return (
    <View>
      <CustomText
        color={AppColors.primary}
        textAlign="left"
        textStyles={styles.customText}
        size={2.2}
      >
        Choose a country
      </CustomText>
      <FlatList
        data={countries_data}
        keyExtractor={(item) => item?.id}
        renderItem={({ item }) => (
            <TouchableOpacity
            key={item?.id}
            style={styles.countryRow}
            onPress={() => {
              dispatch(setSelectedCountry(item?.iso));
            }}
          >
            <View
              style={[
                styles.radioButtonOuter,
                {
                  borderColor:
                    item?.iso === selectedCountry
                      ? AppColors.primary
                      : AppColors.grey_400,
                },
              ]}
            >
              {selectedCountry === item?.iso && (
                <AntDesign
                  name="check"
                  size={height(2)}
                  color={AppColors.primary}
                />
              )}
            </View>
            <View
              style={[
                styles.flagContainer,
                {
                  backgroundColor:
                    item?.iso === selectedCountry
                      ? AppColors.red_100
                      : AppColors.grey_300,
                },
              ]}
            >
              {item?.iso === "FR" ? (
                <FranceFlag height={height(4.5)} width={height(4.5)} />
              ) : item?.iso === "BE" ? (
                <BelgiqueFlag height={height(4.5)} width={height(4.5)} />
              ) : item?.iso === "GB" ? (
                <UKFlag height={height(4.5)} width={height(4.5)} />
              ) : item?.iso === "IT" ? (
                <ItalyFlag height={height(4.5)} width={height(4.5)} />
              ) : item?.iso === "ES" ? (
                <SpainFlag height={height(4.5)} width={height(4.5)} />
              ) : (
                <GreeceFlag height={height(4.5)} width={height(4.5)} />
              )}
            </View>
            <CustomText
              color={
                item?.id === selectedCountry
                  ? AppColors.primary
                  : AppColors.black
              }
              textAlign="left"
              textStyles={styles.countryNameText}
              size={1.8}
            >
              {item?.name}
            </CustomText>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = {
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: height(2),
  },
  radioButtonOuter: {
    width: height(3),
    height: height(3),
    borderRadius: height(1.5),
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: height(1),
  },
  flagContainer: {
    padding: height(1.6),
    borderRadius: height(1),
    justifyContent: "center",
    alignItems: "center",
  },
  customText: {
    fontFamily: "Mulish-Bold",
    marginBottom: height(5),
  },
  countryNameText: {
    fontFamily: "Mulish-Bold",
    marginLeft: height(1),
  },
  buttonText: {
    fontFamily: "Mulish-Bold",
    padding: width(2),
  },
  button: {
    marginTop: height(3),
  },
};