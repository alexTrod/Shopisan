import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Modal from 'react-native-modal';
import { useSelector } from 'react-redux';
import { selectLoader } from '~redux/slices/config';
import styles from './styles';
import { AppColors } from '~utils';

export default function Loader() {
  const appLoader = useSelector(selectLoader);

  return (
    <Modal
      animationIn={'lightSpeedIn'}
      animationOut={'lightSpeedOut'}
      isVisible={appLoader}
      backdropOpacity={0.4}>
      <View style={styles.container}>
        <ActivityIndicator size="small" color={AppColors.black} />
        <Text style={styles.text}>Loading</Text>
      </View>
    </Modal>
  );
}
