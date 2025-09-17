import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import i18n from 'i18n-js';

export const useTranslation = () => {
  const locale = useSelector(state => state.locale.currentLocale);
  const isRTL = useSelector(state => state.locale.isRTL);

  // Update i18n locale when Redux state changes (side-effect in effect, not render)
  useEffect(() => {
    try {
      if (i18n && i18n.locale && i18n.locale !== locale) {
        i18n.locale = locale;
      }
    } catch (error) {
      console.warn('Failed to update i18n locale:', error);
    }
  }, [locale]);

  const t = (key, options = {}) => {
    try {
      if (!i18n || !i18n.t) {
        console.warn('i18n not initialized, returning key:', key);
        return key;
      }
      return i18n.t(key, options) || key;
    } catch (error) {
      console.warn(`Translation failed for key: ${key}`, error);
      return key;
    }
  };

  return { t, locale, isRTL };
};