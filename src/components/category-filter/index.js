// src/components/category-filter/index.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Modal, FlatList, TouchableOpacity, Text } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedCategories, setCategories } from '../../Redux/Actions/CategoriesActions';
import { AppColors } from '../../utils';
import { width, height } from '../../utils/dimension';
import logging from '../../utils/logging';
import { getCategoriesLocale } from '../../Redux/Reducers/CategoriesReducer';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../utils/useTranslation';


const CategoryFilter = ({ showMyStoresToggle = false, showMyStoresOnly = false, onToggleMyStores = null }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const dispatch = useDispatch();
  const { t, locale } = useTranslation();
  const { categories, selectedCategories } = useSelector(state => state.categories);
  
  useEffect(() => {
    const loadCategories = async () => {
      const cats = await getCategoriesLocale();
      dispatch(setCategories(cats));
    };
    loadCategories();
  }, [locale]); // Reload categories when language changes

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
    <View style={[styles.wrapper, { zIndex: 9999 }]}>
      {/* Top row: two buttons side by side */}
      <View style={styles.buttonsRow}>
        {/* Filter Categories button */}
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.filterButton}>
          <Ionicons name="filter" size={18} color="#6B21A8" />
          <Text style={styles.filterButtonText}>
            {selectedCategories.length > 0
              ? `${t('filters') || 'Filters'} (${selectedCategories.length})`
              : (t('filter_categories') || 'Filter')}
          </Text>
        </TouchableOpacity>

        {/* My Stores / All Stores toggle - only for merchants */}
        {showMyStoresToggle && (
          <TouchableOpacity
            onPress={onToggleMyStores}
            style={[styles.storeToggleButton, showMyStoresOnly && styles.storeToggleButtonActive]}
          >
            <MaterialIcons
              name={showMyStoresOnly ? "store" : "storefront"}
              size={18}
              color={showMyStoresOnly ? "#fff" : AppColors.black}
            />
            <Text style={[styles.storeToggleText, showMyStoresOnly && styles.storeToggleTextActive]}>
              {showMyStoresOnly ? (t('my_stores') || 'My Stores') : (t('all_stores') || 'All Stores')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Selected category chips below */}
      {selectedCategories.length > 0 && (
        <ScrollView horizontal={true} style={styles.selectedCategoriesContainer} showsHorizontalScrollIndicator={false}>
          {selectedCategories.map((categoryID) => (
            <View key={categoryID} style={styles.selectedCategoryItem}>
              <Text style={styles.selectedCategoryText}>{getCategoryName(categoryID)}</Text>
              <TouchableOpacity onPress={() => dispatch(setSelectedCategories(selectedCategories.filter(cat => cat !== categoryID)))}>
                <MaterialIcons name="close" size={18} color="#6B21A8" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
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
                {t('unselect')}
              </Text>
            </TouchableOpacity>

            <FlatList
              data={data}
              keyExtractor={item => item.value.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedCategories.includes(item.value);
                return (
                  <TouchableOpacity
                    onPress={() => handleSelectCategory(item)}
                    style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
                  >
                    <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && (
                      <MaterialIcons name="check" size={22} color="#6B21A8" style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>{t('finish')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'column',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderColor: '#6B21A8',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B21A8',
  },
  storeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.white,
    borderColor: AppColors.grey_200,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  storeToggleButtonActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  storeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.black,
  },
  storeToggleTextActive: {
    color: '#fff',
  },
  selectedCategoriesContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  selectedCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderColor: '#6B21A8',
    borderWidth: 1.5,
    borderRadius: 25,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 4,
    marginRight: 6,
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
    alignItems: 'center',
  },
  categoryItemSelected: {
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    marginHorizontal: -5,
    paddingHorizontal: 20,
  },
  categoryText: {
    fontSize: 14,
  },
  categoryTextSelected: {
    color: '#6B21A8',
    fontWeight: 'bold',
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
  selectedCategoryText: {
    color: '#6B21A8',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CategoryFilter;