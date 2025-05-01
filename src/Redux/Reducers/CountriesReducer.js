import i18n from '../../translations/i18n';
import { firestore } from '../../../firebaseconfig'; 
import { collection, getDocs } from 'firebase/firestore';

export const getCountryLocale = (country_doc) => {
  const locale = i18n.locale;
  switch (locale) {
    case 'fr':
      return country_doc.fr;
    case 'en':
      return country_doc.en;
    default:
      return country_doc.en;
  }
};

export const getCountriesLocale = async () => {
  const all_countries = collection(firestore, 'countries');
  const countriesSnapshot = await getDocs(all_countries);

  const fetchedCountries = countriesSnapshot.docs.map(doc => ({
    ref: doc.id,
    id: doc.data().id,
    name: getCountryLocale(doc.data().name),
  }));

  return fetchedCountries;
};

const initialState = {
  selectedCountries: [],
  countries: [],
};

export const countriesReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_SELECTED_COUNTRIES':
      return {
        ...state,
        selectedCountries: action.payload,
      };
    case 'SET_COUNTRIES':
      return {
        ...state,
        countries: action.payload,
      };
    default:
      return state;
  }
};
