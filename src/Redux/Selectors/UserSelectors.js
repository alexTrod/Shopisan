// Selectors
export const selectUser = state => state.user;
export const selectIsAuthenticated = state => state.user.isAuthenticated;
export const selectUserData = state => state.user.userData;
export const selectFavoriteStores = state => state.user.favoriteStores;
export const selectUserLoading = state => state.user.loading;
export const selectUserError = state => state.user.error; 