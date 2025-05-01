import React, { useState } from "react";
import { View, TextInput, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "../../../../../firebaseconfig";
import ScreenWrapper from "../../../../components/screen-wrapper";
import Header from "../../../../components/header";
import Button from "../../../../components/button";
import { AppColors } from "../../../../utils";
import { width, height } from "../../../../utils/dimension";

export default function ChangeNameScreen() {
  const navigation = useNavigation();
  const user = useSelector(state => state.user.userData);
  const [newName, setNewName] = useState("");

  const handleChangeName = async () => {
    if (!newName.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un nom valide.");
      return;
    }

    try {
      const userRef = doc(firestore, "users", user.id);
      await updateDoc(userRef, {
        name: newName.trim()
      });

      Alert.alert("Succès", "Nom mis à jour avec succès.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du nom :", error);
      Alert.alert("Erreur", "Impossible de mettre à jour le nom.");
    }
  };

  return (
    <ScreenWrapper backgroundColor={AppColors.white_100}>
      <Header
        showLeft
        showBack
        title="Changer le nom"
        containerStyle={{ width: width(90), alignSelf: "center" }}
      />
      <View style={styles.container}>
        <TextInput
          placeholder="Entrez votre nouveau nom"
          value={newName}
          onChangeText={setNewName}
          style={styles.input}
        />
        <Button onPress={handleChangeName} containerStyle={styles.button}>
          Valider
        </Button>
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
