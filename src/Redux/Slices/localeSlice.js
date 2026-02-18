import { createSlice } from '@reduxjs/toolkit';
import { getLocales } from 'expo-localization';
import i18n from '../../translations/i18n';

// Normalize device locale to 'en' or 'fr' (default to 'en')
const getInitialLocale = () => {
  const locales = getLocales();
  const deviceLanguage = locales?.[0]?.languageCode || 'en';
  // Check if device is set to French
  return deviceLanguage === 'fr' ? 'fr' : 'en';
};

// Get RTL status from device
const getInitialRTL = () => {
  const locales = getLocales();
  return locales?.[0]?.textDirection === 'rtl' || false;
};

const localeSlice = createSlice({
  name: 'locale',
  initialState: {
    currentLocale: getInitialLocale(),
    isRTL: getInitialRTL(),
  },
  reducers: {
    setLocale: (state, action) => {
      const locale = action.payload === 'fr' ? 'fr' : 'en';
      state.currentLocale = locale;
      
      try {
        if (i18n && i18n.locale) {
          i18n.locale = locale;
        }
      } catch (error) {
        console.warn('Failed to update i18n locale:', error);
      }
      
      state.isRTL = locale.startsWith('ar') || locale.startsWith('he'); // for RTL languages
    },
  },
});

export const { setLocale } = localeSlice.actions;
export default localeSlice.reducer;