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
    if (selectedKey && selectedKey !== currentLocale) {
      onLanguageChange(selectedKey);
    }
    setIsOpen(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={[styles.dropdownButton, boxStyle]}
        onPress={() => setIsOpen(!isOpen)}
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
            >
              <CustomText style={[styles.itemText, dropdownTextStyles]}>
                {option.value}
              </CustomText>
              {option.key === currentLocale && (
                <Ionicons name="checkmark" size={16} color={AppColors.primary} />
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
    backgroundColor: AppColors.white_100,
    borderColor: AppColors.grey_400,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 5,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height(1.5),
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_200,
  },
  selectedItem: {
    backgroundColor: AppColors.grey_100,
  },
  itemText: {
    color: AppColors.black,
    fontSize: height(1.8),
  },
});

export default LanguageSelector;
