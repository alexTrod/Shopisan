import { createSlice } from '@reduxjs/toolkit';
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';

// Normalize device locale to 'en' or 'fr' (default to 'en')
const getInitialLocale = () => {
  const deviceLocale = Localization.locale || 'en';
  // Check if device is set to French (fr, fr-FR, fr-CA, etc.)
  return deviceLocale.toLowerCase().startsWith('fr') ? 'fr' : 'en';
};

const localeSlice = createSlice({
  name: 'locale',
  initialState: {
    currentLocale: getInitialLocale(),
    isRTL: Localization.isRTL,
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