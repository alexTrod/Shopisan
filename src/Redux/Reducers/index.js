import Auth from "./Auth";
import Configuration from "./Configuration";
import {localeReducer} from './LocaleReducer';
import { combineReducers } from "redux";
import { shopperProfileReducer } from './ShopperProfileReducer';


const rootReducer = combineReducers({
  Auth: Auth,
  Configuration: Configuration,
  locale: localeReducer,
  shopperProfile: shopperProfileReducer,
});
export default rootReducer;
