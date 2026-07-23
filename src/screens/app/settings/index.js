import React from 'react';
import { View, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../../../firebaseconfig';
import CustomText from '../../../components/text';
import Button from '../../../components/button';
import { AppColors } from '../../../utils';

const SettingsScreen = () => {
  const user = useSelector(state => state?.Auth?.user);

  const handleSwitchUserType = async () => {
    try {
      const newUserType = user.userType === 'merchant' ? 'shopper' : 'merchant';
      
      // Update user type in Firestore
      const userRef = doc(firestore, 'users', user.email);
      await updateDoc(userRef, {
        userType: newUserType
      });

      // Show success message
      Toast.show({
        text1: 'Success',
        text2: `Switched to ${newUserType} mode`,
        type: 'success',
      });
    } catch (error) {
      Toast.show({
        text1: 'Error',
        text2: error.message,
        type: 'error',
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Other settings options */}
      
      <Button
        onPress={handleSwitchUserType}
        containerStyle={styles.switchButton}
      >
        Switch to {user?.userType === 'merchant' ? 'Shopper' : 'Merchant'} Mode
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: width(5),
  },
  switchButton: {
    marginVertical: height(2),
  },
});

export default SettingsScreen; 