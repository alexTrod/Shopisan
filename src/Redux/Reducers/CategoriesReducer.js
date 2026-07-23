import i18n from '../../translations/i18n';
import { firestore } from '../../../firebaseconfig'; 
import { collection, getDocs } from 'firebase/firestore';

export const getCategoryLocale = (current_doc) => {
    // Ensure locale is valid, default to 'en' if undefined or invalid
    const locale = i18n && i18n.locale ? i18n.locale : 'en';
    
    switch(locale){
        case 'fr':
            return current_doc.fr || current_doc.en || 'Unknown';
        case 'en':
            return current_doc.en || current_doc.fr || 'Unknown';
        default:
            return current_doc.en || current_doc.fr || 'Unknown';
    }
}

export const getCategoriesLocale = async () => {
  const all_categories = collection(firestore, 'store_categories');
  const categoriesSnapshot = await getDocs(all_categories);
  const fetchedCategories = categoriesSnapshot.docs.map(doc => ({
    ref: doc.id,
    id: doc.data().id,
    sort_id: doc.data().sort_id,
    name: getCategoryLocale(doc.data().name),
  }));

  // advanced sorting
  fetchedCategories.sort((a, b) => {
    const sortIdA = Number(a.sort_id);
    const sortIdB = Number(b.sort_id);
    
    // If either sort_id is invalid, put it at the end
    if (isNaN(sortIdA) && isNaN(sortIdB)) return 0;
    if (isNaN(sortIdA)) return 1;
    if (isNaN(sortIdB)) return -1;
    
    return sortIdA - sortIdB;
  });

  return fetchedCategories;
};

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