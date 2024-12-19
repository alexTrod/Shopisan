const initialState = {
  currentLocale: 'en' // default language
};

export const localeReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_LOCALE':
      return {
        ...state,
        currentLocale: action.payload
      };
    default:
      return state;
  }
}; 