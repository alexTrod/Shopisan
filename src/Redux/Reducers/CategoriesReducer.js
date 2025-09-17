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
    sort_id: doc.data().sort_id,
    name: getCategoryLocale(doc.data().name),
  }));

  // Debug logging to see what we're working with
  console.log('Categories before sorting:', fetchedCategories.map(cat => ({ 
    name: cat.name, 
    sort_id: cat.sort_id, 
    sort_id_type: typeof cat.sort_id 
  })));

  // More robust sorting that handles:
  // 1. String numbers (converts to numbers)
  // 2. Missing/null sort_id values (puts them at the end)
  // 3. Invalid sort_id values (puts them at the end)
  fetchedCategories.sort((a, b) => {
    const sortIdA = Number(a.sort_id);
    const sortIdB = Number(b.sort_id);
    
    // If either sort_id is invalid, put it at the end
    if (isNaN(sortIdA) && isNaN(sortIdB)) return 0;
    if (isNaN(sortIdA)) return 1;
    if (isNaN(sortIdB)) return -1;
    
    return sortIdA - sortIdB;
  });

  console.log('Categories after sorting:', fetchedCategories.map(cat => ({ 
    name: cat.name, 
    sort_id: cat.sort_id 
  })));

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