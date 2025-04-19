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
      Alert.alert('Erreur', 'Veuillez entrer votre adresse e-mail.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Succès', 'Un e-mail de réinitialisation a été envoyé.');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue.');
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
        title="Réinitialiser mot de passe"
        containerStyle={{ width: width(90), alignSelf: 'center' }}
      />
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Entrez votre e-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button onPress={handlePasswordReset} containerStyle={styles.button}>
          Envoyer l'e-mail de réinitialisation
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
