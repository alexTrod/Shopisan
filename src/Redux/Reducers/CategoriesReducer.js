import i18n from '../../translations/i18n';
import { firestore } from '../../../firebaseconfig'; 
import { collection, getDocs } from 'firebase/firestore';

export const getCategoryLocale = (current_doc) => {
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

export const getCategoriesLocale = async () => {
    const all_categories = collection(firestore, 'store_categories');
    const categoriesSnapshot = await getDocs(all_categories);
    const fetchedCategories = categoriesSnapshot.docs.map(doc => ({
        ref: doc.id,
        id: doc.data().id,
        name: getCategoryLocale(doc.data().name),           
    }));
    return fetchedCategories;
}

const initialState = {
    selectedCategories: [],
    categories: [],
}

export const categoriesReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_SELECTED_CATEGORIES':
            return {
                ...state,
                selectedCategories: action.payload
            };
        case 'SET_CATEGORIES':
            return {
                ...state,
                categories: action.payload
            };
        default:
            return state;
    }
};