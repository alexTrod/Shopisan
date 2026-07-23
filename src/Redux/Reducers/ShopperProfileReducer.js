const initialState = {
    country : null,
    savedCategories: [],
    favoriteStores: [],
}


export const shopperProfileReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'SET_FAVORITE_STORES':
        return {
          ...state,
          favoriteStores: action.payload
        };
      case 'REMOVE_FAVORITE_STORE':
        return {
          ...state,
          favoriteStores: state.favoriteStores.filter(store => store.id !== action.payload)
        };  
      case 'ADD_FAVORITE_STORE':
        return {
          ...state,
          favoriteStores: [...state.favoriteStores, action.payload]
        };      
      case 'SET_SHOPPER_COUNTRY':
        return {
          ...state,
          country: action.payload
        };
      case 'ADD_SAVED_CATEGORY':
        return {
          ...state,
          savedCategories: [...state.savedCategories, action.payload]
        };
      case 'REMOVE_SAVED_CATEGORY':
        return {
          ...state,
          savedCategories: state.savedCategories.filter(cat => cat !== action.payload)
        };
      case 'SET_SAVED_CATEGORIES':
        return {
          ...state,
          savedCategories: action.payload
        };
      default:
        return state;
    }
  };