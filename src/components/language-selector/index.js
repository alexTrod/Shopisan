import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import CustomText from "../text";
import { AppColors } from "../../utils";
import { height } from "../../utils/dimension";
import { Ionicons } from "@expo/vector-icons";

const LanguageSelector = ({ 
  currentLocale, 
  onLanguageChange, 
  containerStyle,
  boxStyle,
  dropdownTextStyles,
  inputStyles 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const languageOptions = [
    { key: 'en', value: 'English' },
    { key: 'fr', value: 'Français' }
  ];

  const currentLanguage = languageOptions.find(option => option.key === currentLocale) || languageOptions[0];

  const handleSelect = (selectedKey) => {
    console.log('Language selected:', selectedKey);
    setIsOpen(false);
    if (selectedKey && onLanguageChange) {
      onLanguageChange(selectedKey);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={[styles.dropdownButton, boxStyle]}
        onPress={() => {
          console.log('Dropdown toggled, isOpen:', !isOpen);
          setIsOpen(!isOpen);
        }}
        activeOpacity={0.7}
      >
        <CustomText style={[styles.buttonText, inputStyles]}>
          {currentLanguage.value}
        </CustomText>
        <Ionicons 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={AppColors.grey_400} 
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdown}>
          {languageOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.dropdownItem,
                option.key === currentLocale && styles.selectedItem
              ]}
              onPress={() => handleSelect(option.key)}
              activeOpacity={0.7}
            >
              <CustomText style={[styles.itemText, dropdownTextStyles]}>
                {option.value}
              </CustomText>
              {option.key === currentLocale && (
                <Ionicons name="checkmark" size={20} color={AppColors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    zIndex: 9999,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: AppColors.grey_400,
    borderBottomWidth: 1,
    paddingVertical: height(1),
    paddingHorizontal: 0,
  },
  buttonText: {
    color: AppColors.black,
    fontSize: height(1.8),
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.grey_400,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 5,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height(1.5),
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_200,
    backgroundColor: '#FFFFFF',
  },
  selectedItem: {
    backgroundColor: '#F5F5F5',
  },
  itemText: {
    color: AppColors.black,
    fontSize: height(1.8),
  },
});

export default LanguageSelector;
