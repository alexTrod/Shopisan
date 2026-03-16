import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import CloseIcon from "../../../assets/icons/close-icon";
import { AppColors } from "../../utils";

const ModalHeader = ({ onClose }) => {
  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <CloseIcon width={24} height={24} color={AppColors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  closeButton: {
    padding: 10,
  },
});

export default ModalHeader;
