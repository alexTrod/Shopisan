import { SIGNIN, LOGOUT } from "../Types";
const intialState = {
  user: null,
  isSignin: false,
};
const reducer = (state = intialState, action) => {
  switch (action.type) {
    case SIGNIN: {
      return {
        ...state,
        user: action.payload,
        isSignin: true,
      };
    }
    case LOGOUT: {
      return {
        ...state,
        user: null,
        isSignin: false,
      };
    }
    default:
      return state;
  }
};
export default reducer;
