const initialState = {
    country : null,
    savedCategories: [],
}

export const shopperProfileReducer = (state = initialState, action) => {
    switch (action.type) {
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