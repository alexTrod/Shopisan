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
import { useSelector } from 'react-redux';

export default function ChangeEmailScreen() {
  const navigation = useNavigation();
  const user = useSelector(state => state.user.userData);

  const [currentEmail, setCurrentEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangeNameAndEmail = async () => {
    if (!currentEmail || !currentPassword || (!newEmail && !newName)) {
      Alert.alert('Erreur', 'Merci de remplir tous les champs requis.');
      return;
    }

    setLoading(true);
    const auth = getAuth();
    const currentUser = auth.currentUser;

    try {
      await signInWithEmailAndPassword(auth, currentEmail, currentPassword);

      const userRef = doc(firestore, 'users', user.id);

      if (newName.trim()) {
        await updateDoc(userRef, {
          name: newName.trim(),
        });
      }
 
      if (newEmail.trim()) {
        await verifyBeforeUpdateEmail(currentUser, newEmail.trim());
        await updateDoc(userRef, {
          email: newEmail.trim(),
        });
      }

      Alert.alert(
        'Succès',
        newEmail
          ? "Nom et email modifiés. Veuillez confirmer votre nouvelle adresse e-mail dans votre boîte mail."
          : "Nom modifié avec succès.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error('Erreur lors du changement de nom/email :', error);
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
        title="Changer nom et email"
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

        <CustomText>Nouveau nom (optionnel)</CustomText>
        <TextInput
          style={styles.input}
          placeholder="Nouveau nom"
          value={newName}
          onChangeText={setNewName}
        />

        <CustomText>Nouvelle adresse e-mail (optionnelle)</CustomText>
        <TextInput
          style={styles.input}
          placeholder="Nouvelle adresse e-mail"
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Button
          title={loading ? "Chargement..." : "Valider"}
          onPress={handleChangeNameAndEmail}
          disabled={loading}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: width(5),
    paddingTop: height(2),
  },
  input: {
    borderWidth: 1,
    borderColor: AppColors.grey_300,
    borderRadius: 12,
    paddingVertical: height(1.5),
    paddingHorizontal: width(4),
    fontSize: height(2),
    marginBottom: height(2),
    backgroundColor: AppColors.white,
    color: AppColors.black,
  },
  label: {
    fontSize: height(2),
    fontWeight: '600',
    marginBottom: height(1),
    color: AppColors.black,
  },
  button: {
    marginTop: height(3),
    paddingVertical: height(1.5),
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
  },
  buttonText: {
    color: AppColors.white,
    fontSize: height(2),
    fontWeight: 'bold',
  },
});

