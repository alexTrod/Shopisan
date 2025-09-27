import i18n from '../../translations/i18n';
import { getAllCities, getLocalizedCityName } from '../../utils/citiesService';

export const getCityLocale = (current_doc) => {
    try {
        const locale = i18n?.locale || 'en';
        // Handle both old and new data structures
        if (current_doc.name && typeof current_doc.name === 'object') {
            // New Firestore structure: { name: { fr: "...", en: "..." } }
            switch(locale){
                case 'fr':
                    return current_doc.name.fr || current_doc.name.en || 'Unknown';
                case 'en':
                    return current_doc.name.en || current_doc.name.fr || 'Unknown';
                default:
                    return current_doc.name.en || current_doc.name.fr || 'Unknown';
            }
        } else {
            // Old structure: { fr: "...", en: "..." }
            switch(locale){
                case 'fr':
                    return current_doc.fr || current_doc.en || 'Unknown';
                case 'en':
                    return current_doc.en || current_doc.fr || 'Unknown';
                default:
                    return current_doc.en || current_doc.fr || 'Unknown';
            }
        }
    } catch (error) {
        console.warn('Failed to get city locale, defaulting to English:', error);
        return current_doc.name?.en || current_doc.en || 'Unknown';
    }
}

export const getCitiesLocale = async () => {
    try {
        const allCities = await getAllCities();
        const locale = i18n?.locale || 'en';
        
        const fetchedCities = allCities.map(city => ({
            ref: city.id,
            country_id: city.country_id,
            name: getLocalizedCityName(city, locale),
            geohash: city.geohash,
            latitude: city.coordinates?.latitude,
            longitude: city.coordinates?.longitude,
            postal_codes: city.postal_codes,
        }));
        
        return fetchedCities;
    } catch (error) {
        console.error('Error fetching cities:', error);
        return [];
    }
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