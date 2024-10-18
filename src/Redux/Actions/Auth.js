import { LOGIN, LOGOUT } from "../Types";
import { store } from "../index";
export const login = (payload) => {
  return {
    type: LOGIN,
    payload: payload,
  };
};
export const logout = () => {
  return async (dispatch) => {
    return dispatch({
      type: LOGOUT,
      payload: null,
    });
  };
};
