import { I18n } from 'i18n-js';
import translations from '../index';
import * as Localization from 'expo-localization';

console.log('Starting i18n initialization...');

// Create i18n instance with error handling
let i18n;

try {
  console.log('Creating I18n instance...');
  i18n = new I18n(translations);

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
  
  // Ensure all required methods exist
  if (!i18n.t) {
    i18n.t = i18n.translate || ((key, options = {}) => {
      try {
        return i18n.translate(key, options) || key;
      } catch (error) {
        console.warn(`Translation failed for key: ${key}`, error);
        return key;
      }
    });
  }
  
  if (!i18n.translate) {
    i18n.translate = i18n.t;
  }
  
  console.log('i18n instance created successfully:', {
    locale: i18n.locale,
    defaultLocale: i18n.defaultLocale,
    hasTranslations: !!i18n.translations,
    hasTMethod: !!i18n.t,
    hasTranslateMethod: !!i18n.translate
  });
  
} catch (error) {
  console.error('Failed to initialize i18n:', error);
  
  // Create a fallback i18n instance
  i18n = new I18n({
    en: { fallback: 'Fallback text' },
    fr: { fallback: 'Texte de secours' }
  });
  i18n.enableFallback = true;
  i18n.defaultLocale = 'en';
  i18n.locale = 'en';
  
  // Ensure fallback methods exist
  i18n.t = (key, options = {}) => key;
  i18n.translate = i18n.t;
  
  console.log('Fallback i18n instance created');
}

// Add a safety check method
i18n.isInitialized = () => {
  const initialized = i18n && i18n.locale && i18n.translations;
  //console.log('i18n.isInitialized() called, result:', initialized);
  return initialized;
};

// Ensure the module is fully loaded and available
if (typeof global !== 'undefined') {
  global.i18n = i18n;
  console.log('i18n added to global scope');
}

// Export for both CommonJS and ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
  console.log('i18n exported for CommonJS');
}

console.log('i18n module export completed');

export default i18n;