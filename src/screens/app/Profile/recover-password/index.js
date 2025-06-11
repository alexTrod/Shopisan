import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import { sendPasswordResetEmail, getAuth } from 'firebase/auth';
import ScreenWrapper from '../../../../components/screen-wrapper';
import Header from '../../../../components/header';
import Button from '../../../../components/button';
import { AppColors } from '../../../../utils';
import { width, height } from '../../../../utils/dimension';

export default function RecoverPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const auth = getAuth();

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Success', 'A password reset email has been sent.');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.message || 'An error occurred.');
    }
  };

  return (
    <ScreenWrapper
      backgroundColor={AppColors.white_100}
      statusBarColor={AppColors.white_100}
      barStyle="dark-content"
    >
      <Header
        showLeft
        showBack
        title="Reset password"
        containerStyle={{ width: width(90), alignSelf: 'center' }}
      />
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button onPress={handlePasswordReset} containerStyle={styles.button}>
          Send password reset email
        </Button>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: AppColors.white_100,
  },
  button: {
    marginTop: 10,
    padding: height(2),
  },
});
