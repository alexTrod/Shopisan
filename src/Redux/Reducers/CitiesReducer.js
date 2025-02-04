import i18n from '../../translations/i18n';
import { firestore } from '../../../firebaseconfig'; 
import { collection, getDocs } from 'firebase/firestore';

export const getCityLocale = (current_doc) => {
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

export const getCitiesLocale = async () => {
    const all_cities = collection(firestore, 'cities');
    const citiesSnapshot = await getDocs(all_cities);
    logging('citiesSnapshot', citiesSnapshot);
    const fetchedCities = citiesSnapshot.docs.map(doc => ({
        ref: doc.id,
        country_id: doc.data().country_id,
        name: getCityLocale(doc.data()),           
        geohash: doc.data().geohash,
        latitude: doc.data().latitude,
        longitude: doc.data().longitude,
        postal_codes: doc.data().postalCodes,
    }));
    return fetchedCities;
}

const initialState = {
    selectedCities: [],
    cities: [],
}

export const citiesReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_SELECTED_CITIES':
            return {
                ...state,
                selectedCities: action.payload
            };
        case 'SET_CITIES':
            return {
                ...state,
                cities: action.payload
            };
        default:
            return state;
    }
};