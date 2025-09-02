import { I18n } from 'i18n-js';
import translations from '../index';
import * as Localization from 'expo-localization';

const i18n = new I18n(translations);

// Configure i18n
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.translations = translations;

// Set initial locale based on device locale
const deviceLocale = Localization.locale;
const supportedLocales = ['en', 'fr'];
const initialLocale = supportedLocales.includes(deviceLocale.split('-')[0]) 
  ? deviceLocale.split('-')[0] 
  : 'en';

i18n.locale = initialLocale;

export default i18n;