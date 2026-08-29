import { useSelector } from 'react-redux';
import { useCallback, useEffect, useState } from 'react';
import i18n from '../translations/i18n';

export const useTranslation = () => {
  const locale = useSelector(state => state.locale.currentLocale);
  const isRTL = useSelector(state => state.locale.isRTL);
  const [, forceUpdate] = useState(0);

  // Update i18n locale when Redux state changes (side-effect in effect, not render)
  useEffect(() => {
    try {
      // Only update if locale is a valid string
      if (locale && typeof locale === 'string' && i18n && i18n.locale !== locale) {
        i18n.locale = locale;
      }
      // Force re-render to update translations
      forceUpdate(prev => prev + 1);
    } catch (error) {
      console.warn('Failed to update i18n locale:', error);
    }
  }, [locale]);

  // Memoised on locale: several screens list `t` in effect deps, and a fresh
  // closure every render made those effects re-run after each setState, which
  // on the edit-store screen became an infinite refetch loop that froze the UI.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useCallback((key, options = {}) => {
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
  }, [locale]);

  return { t, locale, isRTL };
};