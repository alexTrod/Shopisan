import Auth from "./Auth";
import Configuration from "./Configuration";
import { combineReducers } from "redux";

const rootReducer = combineReducers({
  Auth: Auth,
  Configuration: Configuration,
});
export default rootReducer;
