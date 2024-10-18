import { ISLOADING } from "../Types";
const initialState = {
  loading: false,
};
const reducer = (state = initialState, action) => {
  switch (action.type) {
    case ISLOADING: {
      return {
        ...state,
        loading: action.payload,
      };
    }

    default:
      return state;
  }
};
export default reducer;
