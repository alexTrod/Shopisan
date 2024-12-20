import i18n from '../../translations/i18n';
import { categories } from '../../utils/dummy-data';
import logging from '../../utils/logging';

// selectedCategores is made of Category
// category is {name:"", id:""}

export const getCategoriesLocale = () => {
    const locale = i18n.locale;
    logging(locale, 'locale');
    if (locale === 'fr') {
        return categories['fr'];
    } else {
        return categories['en'];
    }
}

const initialState = {
    selectedCategories: [],
    categories: getCategoriesLocale(),
}

export const categoriesReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_SELECTED_CATEGORIES':
            return {
                ...state,
                selectedCategories: action.payload
            };
        default:
            return state;
    }
};