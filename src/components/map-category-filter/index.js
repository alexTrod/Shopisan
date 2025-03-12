import React, { useState, useEffect } from "react";
import { View, ScrollView, Modal, FlatList, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { setSelectedCategories } from "../../Redux/Actions/CategoriesActions";
import { AppColors } from "../../utils";
import { width, height } from "../../utils/dimension";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const MapCategoryFilter = ({ stores, selectedCategories, setSelectedCategories }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const dispatch = useDispatch();

  const categories = useSelector(state => state.categories.categories);

  const [availableCategories, setAvailableCategories] = useState([]);

  useEffect(() => {
    if (stores.length > 0) {
      const uniqueCategoryIds = Array.from(new Set(stores.flatMap((store) => store.category || []).filter(Boolean)));

      const mappedCategories = uniqueCategoryIds.map(categoryId => {
        const categoryObj = categories.find(cat => cat.id === categoryId);
        return categoryObj ? { id: categoryObj.id, name: categoryObj.name } : null;
      }).filter(Boolean);

      setAvailableCategories(mappedCategories);
    }
  }, [stores, categories]);

  const handleSelectCategory = (categoryId) => {
    const newSelectedCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((cat) => cat !== categoryId)
      : [...selectedCategories, categoryId];

    setSelectedCategories(newSelectedCategories);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.dropdown}>
        <Text style={styles.selectedTextStyle}>
          {selectedCategories.length > 0 ? "+" : "+ Category"}
        </Text>
      </TouchableOpacity>

      <ScrollView horizontal style={styles.selectedCategoriesContainer}>
        {selectedCategories.map((categoryId) => {
          const categoryObj = categories.find(cat => cat.id === categoryId);
          return categoryObj ? (
            <View key={categoryId} style={styles.selectedCategoryItem}>
              <Text style={styles.selectedCategoryText}>{categoryObj.name}</Text>
              <TouchableOpacity onPress={() => handleSelectCategory(categoryId)}>
                <Icon name="close" size={20} color={AppColors.black} />
              </TouchableOpacity>
            </View>
          ) : null;
        })}
      </ScrollView>

      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() =>
                setSelectedCategories(selectedCategories.length === availableCategories.length ? [] : availableCategories.map(cat => cat.id))
              }
              style={styles.categoryItem}
            >
              <Text style={[styles.categoryText, { color: selectedCategories.length === availableCategories.length ? AppColors.primary : AppColors.black }]}>
                All
              </Text>
            </TouchableOpacity>

            <FlatList
              data={availableCategories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleSelectCategory(item.id)} style={styles.categoryItem}>
                  <Text style={[styles.categoryText, { color: selectedCategories.includes(item.id) ? AppColors.primary : AppColors.black }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: width(6),
    marginVertical: height(2),
    zIndex: 9999,
    elevation: 9999,
    width: '55%',
    flexDirection: "row",
  },
  dropdown: {
    backgroundColor: AppColors.primary,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedTextStyle: {
    fontSize: 14,
    color: AppColors.white,
  },
  selectedCategoriesContainer: {
    flexDirection: "row",
    marginLeft: 10,
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
  },
  selectedCategoryText: {
    marginRight: 5,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    height: "70%",
    backgroundColor: AppColors.white,
    borderRadius: 10,
    padding: 20,
  },
  categoryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_200,
  },
  categoryText: {
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: AppColors.red,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButtonText: {
    color: AppColors.white,
    fontWeight: "bold",
  },
});

export default MapCategoryFilter;
