
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

export const setFavoriteStores = (stores) => ({
  type: 'SET_FAVORITE_STORES',
  payload: stores
});

export const removeFavoriteStore = (storeId) => ({
  type: 'REMOVE_FAVORITE_STORE',
  payload: storeId
});

export const addFavoriteStore = (store) => ({
  type: 'ADD_FAVORITE_STORE',
  payload: store
});

