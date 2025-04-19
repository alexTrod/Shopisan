// src/components/city-filter/index.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, FlatList, TouchableOpacity, Text, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedCities, setCities } from '../../Redux/Actions/CitiesActions';
import { AppColors } from '../../utils';
import { width, height } from '../../utils/dimension';
import logging from '../../utils/logging';
import { getCitiesLocale } from '../../Redux/Reducers/CitiesReducer';
import { getCountriesLocale } from '../../Redux/Reducers/CountriesReducer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CityFilter = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const dispatch = useDispatch();
  const { cities, selectedCities } = useSelector(state => state.cities);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("all");

  useEffect(() => {
    const loadCitiesAndCountries = async () => {
      const [cityList, countryList] = await Promise.all([
        getCitiesLocale(),
        getCountriesLocale()
      ]);
      dispatch(setCities(cityList));
      setCountries([{ id: "all", name: "All" }, ...countryList]);
    };
    loadCitiesAndCountries();
  }, []);

  const filteredCities = cities.filter(city =>
    selectedCountry === "all" || city.country_id === selectedCountry
  );
  
  const data = filteredCities
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(city => ({
      value: city.name,
      label: city.name,
      country_id: city.country_id,
      geohash: city.geohash,
      latitude: city.latitude,
      longitude: city.longitude,
      postal_codes: city.postal_codes,
    }));
  

  const handleSelectCity = (item) => {
    const newSelectedCities = selectedCities.includes(item.value)
      ? selectedCities.filter(city => city !== item.value)
      : [...selectedCities, item.value];
    dispatch(setSelectedCities(newSelectedCities));
  };

  const handleSelectAll = () => {
    dispatch(setSelectedCities([]));
  };

  return (
    <View style={[styles.container, { zIndex: 9999 }]}>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.dropdown}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.selectedTextStyle}>
            {selectedCities.length > 0 ? '+' : '+ City'}
          </Text>
        </View>
      </TouchableOpacity>
      
      <ScrollView horizontal style={styles.selectedCitiesContainer}>
        {selectedCities.map((cityName) => (
          <View key={cityName} style={styles.selectedCityItem}>
            <Text style={styles.selectedCityText}>{cityName}</Text>
            <TouchableOpacity onPress={() => dispatch(setSelectedCities(selectedCities.filter(c => c !== cityName)))}>
              <Icon name="close" size={20} color={AppColors.black} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView
              horizontal
              style={styles.countryScroll}
              showsHorizontalScrollIndicator={false}
            >
              {countries.map(country => (
                <TouchableOpacity
                  key={country.id}
                  style={[
                    styles.countryButton,
                    selectedCountry === country.id && styles.selectedCountryButton
                  ]}
                  onPress={() => setSelectedCountry(country.id)}
                >
                  <Text
                    style={[
                      styles.countryText,
                      selectedCountry === country.id && styles.selectedCountryText
                    ]}
                  >
                    {country.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={handleSelectAll} style={styles.cityItem}>
              <Text style={[styles.cityText, { color: selectedCities.length === 0 ? AppColors.primary : AppColors.black }]}>
                All
              </Text>
            </TouchableOpacity>
            <FlatList
              data={data}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleSelectCity(item)} style={styles.cityItem}>
                  <Text style={[styles.cityText, { color: selectedCities.includes(item.value) ? AppColors.primary : AppColors.black }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: width(6),
    marginVertical: height(2),
    zIndex: 9999,
    elevation: 9999,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdown: {
    left: '0%',
    backgroundColor: AppColors.primary,
    borderRadius: 25,
    paddingLeft: 5,
    paddingRight: 5,
    justifyContent: 'center',
    marginRight: 0,
  },
  selectedTextStyle: {
    fontSize: 16,
    color: AppColors.white,
  },
  selectedCitiesContainer: {
    flexDirection: 'row',
    marginLeft: 5,
  },
  selectedCityItem: {
    flexDirection:'row',
    borderColor:AppColors.black,
    borderWidth:width(0.5),
    borderRadius:25,
    paddingLeft:10,
    paddingRight:10,
    margin:2,
  },
  selectedCityText: {
    fontSize: 14,
    color: AppColors.black,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '70%',
    height: '75%',
    backgroundColor: AppColors.white,
    borderRadius: 10,
    padding: 20,
    justifyContent: 'flex-start',
  },  
  countryScroll: {
    Height: 90,
  },  
  countryButton: {
    height: 40,
    minWidth: 80,
    paddingHorizontal: 12,
    marginBottom: 15,
    backgroundColor: AppColors.grey_100,
    borderRadius: 20,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },  
  selectedCountryButton: {
    backgroundColor: AppColors.primary,
  },  
  countryText: {
    color: AppColors.black,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },  
  selectedCountryText: {
    color: AppColors.white,
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },  
  cityList: {
    flexGrow: 0,
    height: '50%',
    marginBottom: 10,
  },  
  cityItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_200,
    flexDirection: 'row',
    alignItems: 'center',
  },  
  cityText: {
    fontSize: 14,
  },  
  cancelButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: AppColors.red,
    borderRadius: 5,
    alignItems: 'center',
  },  
  cancelButtonText: {
    color: AppColors.white,
    fontWeight: 'bold',
  },  
});

export default CityFilter;
