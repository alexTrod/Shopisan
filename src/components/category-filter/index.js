// src/components/category-filter/index.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Modal, FlatList, TouchableOpacity, Text } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedCategories, setCategories } from '../../Redux/Actions/CategoriesActions';
import { AppColors } from '../../utils';
import { width, height } from '../../utils/dimension';
import logging from '../../utils/logging';
import { getCategoriesLocale } from '../../Redux/Reducers/CategoriesReducer';
import { MaterialIcons } from '@expo/vector-icons';


const CategoryFilter = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const dispatch = useDispatch();
  const { categories, selectedCategories } = useSelector(state => state.categories);
  useEffect(() => {
    const loadCategories = async () => {
      const cats = await getCategoriesLocale();
      logging('Loaded categories', cats);
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
  }
  const handleSelectCategory = (item) => {
    const newSelectedCategories = selectedCategories.includes(item.value)
      ? selectedCategories.filter(cat => cat !== item.value) 
      : [...selectedCategories, item.value];

    dispatch(setSelectedCategories(newSelectedCategories));
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
            <TouchableOpacity onPress={() => dispatch(setSelectedCategories(selectedCategories.filter(cat => cat !== categoryID)))}>
              <MaterialIcons name="close" size={20} color={AppColors.black} />
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
              onPress={() => dispatch(setSelectedCategories([]))}
              style={styles.categoryItem}
            >
              <Text style={[styles.categoryText, { color: selectedCategories.length === 0 ? AppColors.primary : AppColors.black }]}>
                Unselect
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
    flexDirection:'row',
    marginTop:2,
  },
  selectedCategoryItem: {
    flexDirection:'row',
    borderColor:AppColors.black,
    borderWidth:width(0.5),
    borderRadius:25,
    paddingLeft:10,
    paddingRight:10,
    margin:2,
  },
  container: {
    flexDirection:'row',
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
    flexDirection:'row',
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

export default CategoryFilter;