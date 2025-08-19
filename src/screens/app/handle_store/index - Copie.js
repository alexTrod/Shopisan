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
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { firestore } from "../../../../firebaseconfig";
import { useSelector, useDispatch } from "react-redux";
import { AppColors } from "../../../utils";
import { width } from "../../../utils/dimension";
import { getCategoriesLocale } from "../../../Redux/Reducers/CategoriesReducer";
import { setSelectedCategories, setCategories } from "../../../Redux/Actions/CategoriesActions";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function HandleStoreScreen({ route, navigation }) {
  const { storeId } = route.params;
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

  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeDocumentId, setStoreDocumentId] = useState(null);

  useEffect(() => {
    const fetchStoreData = async () => {
        try {      
          const storesRef = collection(firestore, "stores");
          const q = query(storesRef, where("id", "==", storeId));
      
          const querySnapshot = await getDocs(q);
      
          if (!querySnapshot.empty) {
            const storeSnap = querySnapshot.docs[0];
            const store = storeSnap.data();

            setStoreDocumentId(storeSnap.id);
      
            setStoreData(store);
      
            setName(store.name);
            setStreet(store.address[0]?.location?.address?.street || "");
            setCity(store.cityName || "");
            setPostalCode(store.address[0]?.location?.city?.postal_code || "");
            setLatitude(store.address[0]?.location?.geopoint?.latitude?.toString() || "");
            setLongitude(store.address[0]?.location?.geopoint?.longitude?.toString() || "");
            setDescription(store.description?.fr || "");
      
            dispatch(setSelectedCategories(Array.isArray(store.category) ? store.category : []));
          } else {
            Alert.alert("Erreur", "Magasin introuvable.");
            navigation.goBack();
          }
        } catch (error) {
          console.error("Erreur lors du chargement du magasin :", error);
          Alert.alert("Erreur", "Impossible de charger le magasin.");
          navigation.goBack();
        } finally {
          setLoading(false);
        }
      };

    fetchStoreData();
  }, [storeId, dispatch, navigation]);

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

  const handleUpdateStore = async () => {
    if (!name || !street || !city || !postalCode || !description || selectedCategories.length === 0 || !latitude || !longitude) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires !");
      return;
    }

    try {
      const storeRef = doc(firestore, "stores", storeDocumentId);

      const updatedData = {
        name,
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
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
              },
            },
          },
        ],
        cityName: city,
        description: { fr: description },
        category: selectedCategories,
      };

      await updateDoc(storeRef, updatedData);
      Alert.alert("Succès", "Magasin mis à jour !");
      navigation.goBack();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du magasin :", error);
      Alert.alert("Erreur", "Impossible de mettre à jour le magasin.");
    }
  };

  const handleDeleteStore = async () => {
    Alert.alert(
      "Supprimer le magasin",
      "Êtes-vous sûr de vouloir supprimer ce magasin ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const storeRef = doc(firestore, "stores", storeDocumentId);
              await deleteDoc(storeRef);
              Alert.alert("Succès", "Magasin supprimé !");
              navigation.goBack();
            } catch (error) {
              console.error("Erreur lors de la suppression du magasin :", error);
              Alert.alert("Erreur", "Impossible de supprimer le magasin.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

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

        <Text style={styles.label}>Latitude</Text>
        <TextInput style={styles.input} placeholder="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="numeric" />

        <Text style={styles.label}>Longitude</Text>
        <TextInput style={styles.input} placeholder="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="numeric" />

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

        <TouchableOpacity style={styles.handleButton} onPress={handleUpdateStore}>
          <Text style={styles.handleButtonText}>Mettre à jour</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteStore}>
          <Text style={styles.deleteButtonText}>Supprimer le magasin</Text>
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
  handleButton: {
    backgroundColor: AppColors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10
  },
  handleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
  deleteButton: {
    backgroundColor: AppColors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10
  },
  deleteButtonText: {
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

