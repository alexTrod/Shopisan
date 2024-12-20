// src/components/category-filter/index.js
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Modal, FlatList, TouchableOpacity, Text } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedCategories } from '../../Redux/Actions/CategoriesActions';
import { AppColors } from '../../utils';
import { width, height } from '../../utils/dimension';
import logging from '../../utils/logging';
import { getCategoriesLocale } from '../../Redux/Reducers/CategoriesReducer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { bool } from 'yup';

const CategoryFilter = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const dispatch = useDispatch();
  const { categories, selectedCategories } = useSelector(state => state.categories);
  logging(selectedCategories, "selected cat")
  const data = categories.map(category => ({
    value: category.id,
    label: category.name,
  }));
  logging(data, "data out of state categories")

  const getCategoryName = (id) => {
    const category = categories.find(cat => cat.id === id);
    return category ? category.name : null;
  }
  const handleSelectCategory = (item) => {
    //logging(item, "item going throug my setSelectedCategory");
    const newSelectedCategories = selectedCategories.includes(item.value)
      ? selectedCategories.filter(cat => cat !== item.value) // Remove if already selected
      : [...selectedCategories, item.value]; // Add if not selected
    dispatch(setSelectedCategories(newSelectedCategories));
  };

  return (
    <View style={[styles.container, { zIndex: 9999 }]}>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.dropdown}>
        <View style={{ flexDirection: 'row', alignItems: 'center' , justifyContent:'center'}}>
          <Text style={styles.selectedTextStyle}>
            +
          </Text>
        </View>
      </TouchableOpacity>
      {/** labels for selected category*/}
      <ScrollView horizontal={true} style={styles.selectedCategoriesContainer}> 
        {selectedCategories.map((categoryID) => (
          <View key={categoryID} style={styles.selectedCategoryItem}>
            <Text style={styles.selectedCategoryText}>{getCategoryName(categoryID)}</Text>
            <TouchableOpacity onPress={() => dispatch(setSelectedCategories(selectedCategories.filter(cat => cat !== categoryID)))}>
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
            <TouchableOpacity onPress={() => {
              if (selectedCategories.length === categories.length) {
                dispatch(setSelectedCategories([]));
              } else {
                dispatch(setSelectedCategories(categories.map(category => category.id)));
              }
            }} style={styles.categoryItem}>
              <Text style={[styles.categoryText, { color: selectedCategories.length === categories.length ? AppColors.primary : AppColors.black }]}>All</Text>
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
    paddingHorizontal: width(6),
    marginVertical: height(2),
    zIndex: 9999,
    elevation: 9999,
    width: '100%',
    flexDirection:'row',
  },
  dropdown: {
    //width: '80%',
    left:'10%',
    backgroundColor: AppColors.grey_100,
    borderRadius: 25,
    paddingLeft:15,
    paddingRight:15,
    justifyContent: 'center',
    marginRight:5,
    color:AppColors.white,
    
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
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
    fontSize: 16,
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
});

export default CategoryFilter;