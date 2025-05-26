import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Modal, FlatList, TouchableOpacity, Text } from "react-native";
import { useSelector } from "react-redux";
import { AppColors } from "../../utils";
import { width, height } from "../../utils/dimension";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const MapCategoryFilter = ({ stores, selectedCategories, setSelectedCategories }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const categories = useSelector(state => state.categories.categories);

  const [availableCategories, setAvailableCategories] = useState([]);

  useEffect(() => {
    if (stores.length > 0) {
      const uniqueCategoryIds = Array.from(
        new Set(stores.flatMap(store => store.category || []).filter(Boolean))
      );

      const mappedCategories = uniqueCategoryIds.map(categoryId => {
        const categoryObj = categories.find(cat => cat.id === categoryId);
        return categoryObj ? { id: categoryObj.id, name: categoryObj.name } : null;
      }).filter(Boolean);

      setAvailableCategories(mappedCategories);
    }
  }, [stores, categories]);

  const handleSelectCategory = (item) => {
    const categoryId = item.id;
    const newSelectedCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(cat => cat !== categoryId)
      : [...selectedCategories, categoryId];

    setSelectedCategories(newSelectedCategories);
  };

  const getCategoryName = (id) => {
    const category = categories.find(cat => cat.id === id);
    return category ? category.name : null;
  };

  return (
    <View style={[styles.container, { zIndex: 9999 }]}>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.dropdown}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={styles.selectedTextStyle}>
            {selectedCategories.length > 0 ? '+' : '+ Category'}
          </Text>
        </View>
      </TouchableOpacity>

      <ScrollView horizontal={true} style={styles.selectedCategoriesContainer}>
        {selectedCategories.map((categoryID) => (
          <View key={categoryID} style={styles.selectedCategoryItem}>
            <Text style={styles.selectedCategoryText}>{getCategoryName(categoryID)}</Text>
            <TouchableOpacity onPress={() =>
              setSelectedCategories(selectedCategories.filter(cat => cat !== categoryID))
            }>
              <Icon name="close" size={20} color={AppColors.black} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setSelectedCategories([])}
              style={styles.categoryItem}
            >
              <Text style={[styles.categoryText, {
                color: selectedCategories.length === 0 ? AppColors.primary : AppColors.black
              }]}>
                Unselect
              </Text>
            </TouchableOpacity>

            <FlatList
              data={availableCategories}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleSelectCategory(item)} style={styles.categoryItem}>
                  <Text style={[styles.categoryText, {
                    color: selectedCategories.includes(item.id) ? AppColors.primary : AppColors.black
                  }]}>
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
  selectedCategoriesContainer: {
    flexDirection: 'row',
    marginTop: 2,
  },
  selectedCategoryItem: {
    flexDirection: 'row',
    borderColor: AppColors.black,
    borderWidth: width(0.5),
    borderRadius: 25,
    paddingLeft: 10,
    paddingRight: 10,
    margin: 2,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: AppColors.white,
    borderColor: AppColors.black,
    borderWidth: 1,
    borderRadius: 16,
    height: 32,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 1,
    color: AppColors.black,
  },
  selectedTextStyle: {
    fontSize: 14,
    color: AppColors.black,
    lineHeight: 18,
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
    flexDirection: 'row',
  },
  categoryText: {
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: AppColors.primary,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: AppColors.white,
    fontWeight: 'bold',
  },
});

export default MapCategoryFilter;
