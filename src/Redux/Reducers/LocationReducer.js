const initialState = {
  customLocation: null,
};

const LocationReducer = (state = initialState, action) => {
  switch (action.type) {
    case "SET_CUSTOM_LOCATION":
      return {
        ...state,
        customLocation: {
          ...action.payload,
          source: action.payload.source || "unknown",
          timestamp: action.payload.timestamp || Date.now(),
        },
      };
    default:
      return state;
  }
};

export default LocationReducer;
