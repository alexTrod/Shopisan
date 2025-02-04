import i18n from '../../translations/i18n';
import { collection, getDocs} from 'firebase/firestore';
import { firestore } from '../../../firebaseconfig';
import logging from '../../utils/logging';

const initialState = {
  isAuthenticated: false,
  userData: null,
  favoriteStores: [],
  error: null,
  loading: false,
  noAuthenticationWanted:false,
  selectedCountry:'FR',
  countries:[]
};

export const getCountryLocale = async (current_doc) => {
  const locale = i18n.locale;
  switch(locale){
      case 'fr':
          return current_doc.fr;
      case 'en':
          return current_doc.en;
      default:
          return current_doc.en;
  }
}

export const getCountries = async () => {
  const countries = collection(firestore, 'countries');
  const countriesSnapshot = await getDocs(countries);
  const fetchedCountries = countriesSnapshot.docs.map(doc => ({
    ref: doc.id,
    id: doc.data().id,
    iso: doc.data().iso,
    name: getCountryLocale(doc.data().name),
  }));
  logging('get all countries in get countries', fetchedCountries);
  return fetchedCountries;
}

export const userReducer = (state = initialState, action) => {
  console.log('Reducing:', action.type);
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        loading: true,
        error: null
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        userData: action.payload,
        loading: false,
        error: null
      };

    case 'AUTH_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case 'AUTH_LOGOUT':
      return initialState;

    case 'ADD_FAVORITE_STORE':
      return {
        ...state,
        favoriteStores: [...state.favoriteStores, action.payload.id]
      };

    case 'REMOVE_FAVORITE_STORE':
      return {
        ...state,
        favoriteStores: state.favoriteStores.filter(id => id !== action.payload)
      };

    case 'SET_FAVORITE_STORES':
      return {
        ...state,
        favoriteStores: action.payload
      };
    case 'SET_NO_AUTHENTICATION_WANTED':
      console.log('setting SET_NO_AUTHENTICATION_WANTED');
      return {
        ...state,
        noAuthenticationWanted: true
      };
    case 'SET_SELECTED_COUNTRY':
      return {
        ...state, 
        selectedCountry: action.payload
      }
    case 'SET_COUNTRIES':
      logging('SETTING COUNTRIES FFS', action.payload);
      return {
        ...state, 
        countries: action.payload
      }

    default:
      return state;
  }
}; 