import { createSlice } from '@reduxjs/toolkit';
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';

const localeSlice = createSlice({
  name: 'locale',
  initialState: {
    currentLocale: Localization.locale,
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