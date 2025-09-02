import { createReducer } from '@reduxjs/toolkit';
import { 
  SET_CUSTOM_LOCATION, 
  CLEAR_CUSTOM_LOCATION, 
  SET_USER_LOCATION, 
  SET_LOCATION_PERMISSION,
  SET_LOCATION_LOADING,
  SET_LOCATION_ERROR
} from '../Actions/LocationActions';

const initialState = {
  customLocation: null,
  userLocation: null,
  locationPermission: null,
  loading: false,
  error: null
};

const locationReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(SET_CUSTOM_LOCATION, (state, action) => {
      state.customLocation = action.payload;
      state.error = null;
      state.loading = false;
    })
    .addCase(CLEAR_CUSTOM_LOCATION, (state) => {
      state.customLocation = null;
      state.error = null;
    })
    .addCase(SET_USER_LOCATION, (state, action) => {
      state.userLocation = action.payload;
      state.error = null;
      state.loading = false;
    })
    .addCase(SET_LOCATION_PERMISSION, (state, action) => {
      state.locationPermission = action.payload;
    })
    .addCase(SET_LOCATION_LOADING, (state, action) => {
      state.loading = action.payload;
    })
    .addCase(SET_LOCATION_ERROR, (state, action) => {
      state.error = action.payload;
      state.loading = false;
    });
});

export default locationReducer;

