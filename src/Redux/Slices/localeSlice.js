import { createSlice } from '@reduxjs/toolkit';
import * as Localization from 'expo-localization';
import i18n from '../../translations/i18n';

// Get device locale and determine initial locale
const deviceLocale = Localization.locale;
const supportedLocales = ['en', 'fr'];
const initialLocale = supportedLocales.includes(deviceLocale.split('-')[0]) 
  ? deviceLocale.split('-')[0] 
  : 'en';

const localeSlice = createSlice({
  name: 'locale',
  initialState: {
    currentLocale: initialLocale,
    isRTL: Localization.isRTL,
  },
  reducers: {
    setLocale: (state, action) => {
      const locale = action.payload === 'fr' ? 'fr' : 'en';
      state.currentLocale = locale;
      i18n.locale = locale;
      state.isRTL = locale.startsWith('ar') || locale.startsWith('he'); // for RTL languages
    },
  },
});

export const { setLocale } = localeSlice.actions;
export default localeSlice.reducer;