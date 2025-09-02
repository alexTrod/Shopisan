import { createAction } from '@reduxjs/toolkit';

// Action types
export const SET_CUSTOM_LOCATION = 'SET_CUSTOM_LOCATION';
export const CLEAR_CUSTOM_LOCATION = 'CLEAR_CUSTOM_LOCATION';
export const SET_USER_LOCATION = 'SET_USER_LOCATION';
export const SET_LOCATION_PERMISSION = 'SET_LOCATION_PERMISSION';
export const SET_LOCATION_LOADING = 'SET_LOCATION_LOADING';
export const SET_LOCATION_ERROR = 'SET_LOCATION_ERROR';

// Action creators
export const setCustomLocation = createAction(SET_CUSTOM_LOCATION, (location) => ({
  payload: location
}));

export const clearCustomLocation = createAction(CLEAR_CUSTOM_LOCATION);

export const setUserLocation = createAction(SET_USER_LOCATION, (location) => ({
  payload: location
}));

export const setLocationPermission = createAction(SET_LOCATION_PERMISSION, (permission) => ({
  payload: permission
}));

export const setLocationLoading = createAction(SET_LOCATION_LOADING, (loading) => ({
  payload: loading
}));

export const setLocationError = createAction(SET_LOCATION_ERROR, (error) => ({
  payload: error
}));

// Async action creators
export const updateCustomLocation = (latitude, longitude) => (dispatch) => {
  dispatch(setCustomLocation({ latitude, longitude }));
};

export const resetToUserLocation = () => (dispatch) => {
  dispatch(clearCustomLocation());
};

export const setLocationWithCoordinates = (latitude, longitude) => (dispatch) => {
  dispatch(setCustomLocation({ latitude, longitude }));
};

// Helper function to validate coordinates
export const validateCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};
