import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import i18n from '../translations/i18n';

export const useTranslation = () => {
  const locale = useSelector(state => state.locale.currentLocale);
  const isRTL = useSelector(state => state.locale.isRTL);

  // Update i18n locale when Redux state changes (side-effect in effect, not render)
  useEffect(() => {
    if (i18n.locale !== locale) {
      i18n.locale = locale;
    }
  }, [locale]);

  const t = (key, options = {}) => {
    return i18n.t(key, options);
  };

  return { t, locale, isRTL };
};