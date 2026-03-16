import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppColors } from '../../utils';
import logging, { logError } from '../../utils/logging';


const AddressComponent = ({ address }) => {
  const { street, postalCode, city } = address;
  logging('AddressComponent', address);
  const _street = street.length > 0 ? street : '';
  const _postalCode = postalCode.length > 0 ? ', ' + postalCode : '';
  const _city = city.length > 0 ? ', ' + city : '';
  return (
    <View style={styles.container}>
      <Text style={styles.addressComponent}>
        {_street}{_postalCode}{_city}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    width: '100%',
  },
  addressComponent: {
    fontSize: 14,
    color: AppColors.darkGray,
    marginBottom: 8,
  }
});

export default AddressComponent; 