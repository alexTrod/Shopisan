// src/components/city-filter/index.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Modal, FlatList, TouchableOpacity, Text } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedCities, setCities } from '../../Redux/Actions/CitiesActions';
import { AppColors } from '../../utils';
import { width, height } from '../../utils/dimension';
import logging from '../../utils/logging';
import { getCitiesLocale } from '../../Redux/Reducers/CitiesReducer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CityFilter = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const dispatch = useDispatch();
  const { cities, selectedCities } = useSelector(state => state.cities);
  useEffect(() => {
    const loadCities = async () => {
      const cityList = await getCitiesLocale();
 
      dispatch(setCities(cityList));
    };
    loadCities();
  }, []);

  const data = cities.map(city => ({
    value: city.id,
    label: city.name,
    country_id: city.country_id,
    geohash: city.geohash,
    latitude: city.latitude,
    longitude: city.longitude,
    postal_codes: city.postal_codes,
  }));

  const getCityName = (id) => {
    const city = cities.find(c => c.id === id);
    return city ? city.name : null;
  }
  const handleSelectCity = (item) => {
    const newSelectedCities = selectedCities.includes(item.value)
      ? selectedCities.filter(city => city !== item.value) 
      : [...selectedCities, item.value]; 
    dispatch(setSelectedCities(newSelectedCities));
  };

  return (
    <View style={[styles.container, { zIndex: 9999 }]}>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.dropdown}>
        <View style={{ flexDirection: 'row', alignItems: 'center' , justifyContent:'center'}}>
          <Text style={styles.selectedTextStyle}>
          {selectedCities.length > 0 ? '+' : '+ City'}
          </Text>
        </View>
      </TouchableOpacity>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}        
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => {
              if (selectedCities.length === cities.length) {
                dispatch(setSelectedCities([]));
              } else {
                dispatch(setSelectedCities(cities.map(city => city.id)));
              }
            }} style={styles.cityItem}>
              <Text style={[styles.cityText, { color: selectedCities.length === cities.length ? AppColors.primary : AppColors.black }]}>All</Text>
            </TouchableOpacity>
            <FlatList   
              data={data}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleSelectCity(item)} style={styles.cityItem}>
                  <Text style={[styles.cityText, { color: selectedCities.includes(item.value) ? AppColors.primary : AppColors.black }]}>{item.label}</Text>
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
  selectedCitiesContainer: {
    flexDirection:'row',
    marginTop:2,
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
  container: {
    paddingHorizontal: width(6),
    marginVertical: height(2),
    zIndex: 9999,
    elevation: 9999,
    width: '100%',
    flexDirection:'row',
  },
  dropdown: {
    left:'10%',
    backgroundColor: AppColors.primary,
    borderRadius: 25,
    paddingLeft:15,
    paddingRight:15,
    justifyContent: 'center',
    marginRight:5,
    color:AppColors.white,
  },
  selectedTextStyle: {
    fontSize: 16,
    color:AppColors.white,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    height: '80%',
    backgroundColor: AppColors.white,
    borderRadius: 10,
    padding: 20,
  },
  cityItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_200,
    flexDirection:'row',
  },
  cityText: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 20,
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