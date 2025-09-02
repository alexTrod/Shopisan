import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setLocale } from '../../../Redux/Slices/localeSlice';
import { useTranslation } from '../../../utils/useTranslation';
import CustomText from '../../../components/text';
import { AppColors } from '../../../utils';
import { height, width } from '../../../utils/dimension';
import Header from '../../../components/header';
import ScreenWrapper from '../../../components/screen-wrapper';
import { Ionicons } from '@expo/vector-icons';

const LanguageSelectionScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentLocale = useSelector(state => state.locale.currentLocale);

  const handleLanguageChange = (newLocale) => {
    dispatch(setLocale(newLocale));
    // Optionally go back to previous screen after selection
    navigation.goBack();
  };

  const languages = [
    {
      code: 'en',
      name: t('english'),
      nativeName: 'English',
      flag: '🇺🇸'
    },
    {
      code: 'fr', 
      name: t('french'),
      nativeName: 'Français',
      flag: '🇫🇷'
    }
  ];

  return (
    <ScreenWrapper
      backgroundColor={AppColors.white_100}
      statusBarColor={AppColors.white_100}
      barStyle="dark-content"
    >
      <Header
        showLeft={true}
        showBack
        title={t('language_settings')}
        containerStyle={{ width: width(90), alignSelf: "center"}}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <CustomText
            color={AppColors.black}
            textAlign="center"
            textProps={{ fontFamily: "Mulish-Bold" }}
            size={2.2}
            textStyles={styles.title}
          >
            {t('change_language')}
          </CustomText>
          
          <CustomText
            color={AppColors.grey_200}
            textAlign="center"
            textProps={{ fontFamily: "Mulish-Regular" }}
            size={1.6}
            textStyles={styles.subtitle}
          >
            {t('select_language_message')}
          </CustomText>

          <View style={styles.languagesContainer}>
            {languages.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageOption,
                  currentLocale === language.code && styles.selectedLanguage
                ]}
                onPress={() => handleLanguageChange(language.code)}
              >
                <View style={styles.languageContent}>
                  <View style={styles.languageInfo}>
                    <CustomText
                      color={currentLocale === language.code ? AppColors.white : AppColors.black}
                      textProps={{ fontFamily: "Mulish-Bold" }}
                      size={2.2}
                      textStyles={styles.flag}
                    >
                      {language.flag}
                    </CustomText>
                    <View style={styles.languageText}>
                      <CustomText
                        color={currentLocale === language.code ? AppColors.white : AppColors.black}
                        textProps={{ fontFamily: "Mulish-Bold" }}
                        size={2}
                      >
                        {language.nativeName}
                      </CustomText>
                      <CustomText
                        color={currentLocale === language.code ? AppColors.white : AppColors.grey_100}
                        textProps={{ fontFamily: "Mulish-Regular" }}
                        size={1.6}
                      >
                        {language.name}
                      </CustomText>
                    </View>
                  </View>
                  
                  {currentLocale === language.code && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={24} 
                      color={AppColors.white} 
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoContainer}>
            <CustomText
              color={AppColors.grey_200}
              textAlign="center"
              textProps={{ fontFamily: "Mulish-Regular" }}
              size={1.4}
              textStyles={styles.infoText}
            >
              {t('language_change_note')}
            </CustomText>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: width(4),
  },
  content: {
    paddingTop: height(4),
  },
  title: {
    marginBottom: height(1),
  },
  subtitle: {
    marginBottom: height(6),
  },
  languagesContainer: {
    gap: height(2),
  },
  languageOption: {
    backgroundColor: AppColors.white,
    borderRadius: width(2),
    padding: width(4),
    borderWidth: 2,
    borderColor: AppColors.grey_300,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  selectedLanguage: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    marginRight: width(3),
    fontSize: height(4),
  },
  languageText: {
    flex: 1,
  },
  infoContainer: {
    marginTop: height(6),
    paddingHorizontal: width(2),
  },
  infoText: {
    lineHeight: height(2.2),
  },
});

export default LanguageSelectionScreen;
