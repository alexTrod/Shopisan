import i18n from '../../translations/i18n';

export const setLocale = (languageCode) => {
  try {
    if (i18n && i18n.locale) {
      i18n.locale = languageCode;
    }
  } catch (error) {
    console.warn('Failed to update i18n locale:', error);
  }
  
  return {
    type: 'SET_LOCALE',
    payload: languageCode
  };
}; 