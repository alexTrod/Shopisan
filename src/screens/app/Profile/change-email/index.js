import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { getAuth, signInWithEmailAndPassword, verifyBeforeUpdateEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../../../../firebaseconfig';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../../../components/screen-wrapper';
import { AppColors } from '../../../../utils';
import Header from '../../../../components/header';
import { width, height } from '../../../../utils/dimension';
import CustomText from '../../../../components/text';

export default function ChangeEmailScreen() {
  const navigation = useNavigation();

  const [currentEmail, setCurrentEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangeEmail = async () => {
    if (!currentEmail || !currentPassword || !newEmail) {
      Alert.alert('Erreur', 'Merci de remplir tous les champs.');
      return;
    }

    setLoading(true);
    const auth = getAuth();
    const user = auth.currentUser;

    try {
      await signInWithEmailAndPassword(auth, currentEmail, currentPassword);

      await verifyBeforeUpdateEmail(user, newEmail);

      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        email: newEmail,
      });

      Alert.alert(
        'Succès',
        "Un email de confirmation a été envoyé à votre nouvelle adresse. Veuillez vérifier votre boîte mail."
      );

      navigation.goBack();
    } catch (error) {
      console.error('Erreur lors du changement d\'email :', error);
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper backgroundColor={AppColors.white_100}>
      <Header
        showLeft
        showBack
        title="Changer l'adresse e-mail"
        containerStyle={{ width: width(90), alignSelf: 'center' }}
      />
      <View style={styles.container}>
        <CustomText>Adresse e-mail actuelle</CustomText>
        <TextInput
          style={styles.input}
          placeholder="Adresse e-mail actuelle"
          value={currentEmail}
          onChangeText={setCurrentEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <CustomText>Mot de passe</CustomText>
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
        <CustomText>Nouvelle adresse e-mail</CustomText>
        <TextInput
          style={styles.input}
          placeholder="Nouvelle adresse e-mail"
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button title={loading ? "Chargement..." : "Valider"} onPress={handleChangeEmail} disabled={loading} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 20,
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

