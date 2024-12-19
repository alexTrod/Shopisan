import i18n from '../../translations/i18n';

export const setLocale = (languageCode) => {
  i18n.locale = languageCode;
  return {
    type: 'SET_LOCALE',
    payload: languageCode
  };
}; 