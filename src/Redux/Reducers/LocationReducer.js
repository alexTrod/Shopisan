const initialState = {
  customLocation: null,
};

const LocationReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_CUSTOM_LOCATION':
      return {
        ...state,
        customLocation: action.payload,
      };
    default:
      return state;
  }
};

export default LocationReducer;
