import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppColors } from '../../utils';
import logging, { logError } from '../../utils/logging';


const AddressComponent = ({ address }) => {
  const { street = '', streetNumber = '', postalCode = '', city = '' } = address;
  logging('AddressComponent', address);
  // Number after the street, as written in Belgium and France
  // ("Rue de la Loi 16"). Legacy flat addresses already carry the number in
  // `street` and have no streetNumber, so nothing is doubled.
  const _street = street.length > 0 ? street : '';
  const _streetNumber =
    _street.length > 0 && String(streetNumber).length > 0
      ? ' ' + streetNumber
      : '';
  const _postalCode = postalCode.length > 0 ? ', ' + postalCode : '';
  const _city = city.length > 0 ? ', ' + city : '';
  return (
    <View style={styles.container}>
      <Text style={styles.addressComponent}>
        {_street}{_streetNumber}{_postalCode}{_city}</Text>
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