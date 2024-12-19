import { useSelector } from 'react-redux';
import i18n from 'i18n-js';

export const useTranslation = () => {
  const locale = useSelector(state => state.locale.currentLocale);
  const isRTL = useSelector(state => state.locale.isRTL);

  const t = (key, options = {}) => {
    return i18n.t(key, options);
  };

  return { t, locale, isRTL };
};