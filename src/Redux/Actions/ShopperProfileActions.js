
export const setShopperCountry = (country) => ({
  type: 'SET_SHOPPER_COUNTRY',
  payload: country
});

export const addSavedCategory = (category) => ({
  type: 'ADD_SAVED_CATEGORY',
  payload: category
});

export const removeSavedCategory = (category) => ({
  type: 'REMOVE_SAVED_CATEGORY',
  payload: category
});

export const setSavedCategories = (categories) => ({
  type: 'SET_SAVED_CATEGORIES',
  payload: categories
});