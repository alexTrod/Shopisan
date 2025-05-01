import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  ScrollView,
} from "react-native";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";
import { firestore } from "../../../../firebaseconfig";
import { useSelector, useDispatch } from "react-redux";
import { AppColors } from "../../../utils";
import { width, height } from "../../../utils/dimension";
import { getCategoriesLocale } from "../../../Redux/Reducers/CategoriesReducer";
import { setSelectedCategories, setCategories } from "../../../Redux/Actions/CategoriesActions";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function AddStoreScreen({ navigation }) {
  const user = useSelector((state) => state.user.userData);
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [description, setDescription] = useState("");
  const { categories, selectedCategories } = useSelector(state => state.categories);
  const [modalVisible, setModalVisible] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const loadCategories = async () => {
      const cats = await getCategoriesLocale();
      dispatch(setCategories(cats));
    };
    loadCategories();
  }, []);

  const data = categories.map(category => ({
    value: category.id,
    label: category.name,
  }));

  const getCategoryName = (id) => {
    const category = categories.find(cat => cat.id === id);
    return category ? category.name : null;
  };

  const handleSelectCategory = (item) => {
    const newSelectedCategories = selectedCategories.includes(item.value)
      ? selectedCategories.filter(cat => cat !== item.value)
      : [...selectedCategories, item.value];
    dispatch(setSelectedCategories(newSelectedCategories));
  };

  const handleRemoveCategory = (categoryID) => {
    dispatch(setSelectedCategories(selectedCategories.filter(cat => cat !== categoryID)));
  };

  const handleAddStore = async () => {
    if (!name || !street || !city || !postalCode || !description || selectedCategories.length === 0) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires !");
      return;
    }
  
    try {
      const fullAddress = `${street}, ${postalCode} ${city}, France`;
  
      const apiKey = 'AIzaSyCsGAmEtEu_aox4wHgf4GOQA2nGUgjdfrA';
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`
      );
      const data = await response.json();
  
      if (data.status !== "OK" || data.results.length === 0) {
        Alert.alert("Erreur", "Impossible de trouver l'adresse. Vérifiez les informations.");
        return;
      }
  
      const location = data.results[0].geometry.location;
      const latitude = location.lat;
      const longitude = location.lng;
  
      const ownerId = await getOwnerId(user.id);
      if (!ownerId) {
        console.error("Impossible de récupérer l'owner_id.");
        return;
      }
  
      const storesRef = collection(firestore, "stores");
      const storesSnapshot = await getDocs(storesRef);
  
      let maxId = 0;
      storesSnapshot.forEach((doc) => {
        const storeData = doc.data();
        if (storeData.id && typeof storeData.id === "number" && storeData.id > maxId) {
          maxId = storeData.id;
        }
      });
  
      const newStoreId = maxId + 1;
  
      const storeData = {
        id: newStoreId,
        name,
        owner_id: ownerId,
        address: [
          {
            location: {
              address: { street },
              city: {
                name: city,
                postal_code: postalCode,
                country_id: "FR",
              },
              geopoint: {
                latitude: latitude,
                longitude: longitude,
              },
            },
          },
        ],
        cityName: city,
        description: { fr: description },
        category: selectedCategories,
        storeStatus: 0,
        website: "",
      };
  
      await addDoc(storesRef, storeData);
  
      Alert.alert("Succès", "Magasin ajouté avec succès !");
      navigation.goBack();
    } catch (error) {
      console.error("Erreur lors de l'ajout du magasin :", error);
      Alert.alert("Erreur", "Impossible d'ajouter le magasin");
    }
  };  

  const getOwnerId = async (userId) => {
      try {
        const userRef = doc(firestore, "users", userId);
        const userSnap = await getDoc(userRef);
    
        if (userSnap.exists()) {
          const ownerId = userSnap.data().id;
          console.log("Owner ID récupéré :", ownerId);
          return ownerId;
        } else {
          console.error("Utilisateur introuvable dans Firestore.");
          return null;
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'owner_id :", error);
        return null;
      }
    };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView 
      contentContainerStyle={styles.scrollContainer} 
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <Text style={styles.label}>Nom du magasin</Text>
        <TextInput style={styles.input} placeholder="Entrez le nom" value={name} onChangeText={setName} />

        <Text style={styles.label}>Adresse</Text>
        <TextInput style={styles.input} placeholder="Rue" value={street} onChangeText={setStreet} />

        <Text style={styles.label}>Ville</Text>
        <TextInput style={styles.input} placeholder="Ville" value={city} onChangeText={setCity} />

        <Text style={styles.label}>Code postal</Text>
        <TextInput style={styles.input} placeholder="Code postal" value={postalCode} onChangeText={setPostalCode} keyboardType="numeric" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Décrivez votre magasin" value={description} onChangeText={setDescription} multiline />

        <Text style={styles.label}>Catégories</Text>
        <TouchableOpacity style={styles.categoryButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.categoryButtonText}>
            {selectedCategories.length > 0 ? `${selectedCategories.length} catégorie(s) sélectionnée(s)` : "Sélectionner des catégories"}
          </Text>
        </TouchableOpacity>

        <ScrollView horizontal={true} style={styles.selectedCategoriesContainer}>
          {selectedCategories.map((categoryID) => (
            <View key={categoryID} style={styles.selectedCategoryItem}>
              <Text style={styles.selectedCategoryText}>{getCategoryName(categoryID)}</Text>
              <TouchableOpacity onPress={() => handleRemoveCategory(categoryID)}>
                <Icon name="close" size={20} color={AppColors.black} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.addButton} onPress={handleAddStore}>
          <Text style={styles.addButtonText}>Ajouter le magasinss</Text>
        </TouchableOpacity>

        <Modal animationType="slide" transparent={true} visible={modalVisible}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                onPress={() => {
                  if (selectedCategories.length === categories.length) {
                    dispatch(setSelectedCategories([]));
                  } else {
                    dispatch(setSelectedCategories(categories.map(category => category.id)));
                  }
                }}
                style={styles.categoryItem}
              >
                <Text style={[styles.categoryText, { color: selectedCategories.length === categories.length ? AppColors.primary : AppColors.black }]}>
                  Tout sélectionner
                </Text>
              </TouchableOpacity>
              <FlatList
                data={data}
                keyExtractor={item => item.value.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => handleSelectCategory(item)} style={styles.categoryItem}>
                    <Text style={[styles.categoryText, { color: selectedCategories.includes(item.value) ? AppColors.primary : AppColors.black }]}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    padding: width(4),
    backgroundColor: AppColors.white_100
  },
  label: {
    fontSize: 16,
    fontWeight: "bold", 
    marginBottom: 5
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: "#f8f8f8" 
  },
  textArea: {
    height: 80,
    textAlignVertical: "top"
  },
  categoryButton: {
    backgroundColor: AppColors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15
  },
  categoryButtonText: {
    color: "#fff",
    fontSize: 16
  },
  selectedCategoriesContainer: {
    flexDirection: "row",
    marginTop: 10
  },
  selectedCategoryItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColors.black,
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 5,
    height: 40
  },
  selectedCategoryText: { 
    marginRight: 5,
    fontSize: 14
  },
  addButton: {
    backgroundColor: AppColors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    height: '80%',
    backgroundColor: AppColors.white,
    borderRadius: 10,
    padding: 20,
  },
  categoryItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_200,
    flexDirection:'row',
  },
  categoryText: {
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: AppColors.red,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: AppColors.white,
    fontWeight: 'bold',
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  container: { 
    padding: width(4),
    backgroundColor: AppColors.white_100
  },
});

