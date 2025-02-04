import Auth from "./Auth";
import Configuration from "./Configuration";
import {localeReducer} from './LocaleReducer';
import { combineReducers } from "redux";
import { categoriesReducer } from "./CategoriesReducer";
import { citiesReducer } from "./CitiesReducer";
import { userReducer } from "./UserReducer";


const rootReducer = combineReducers({
  Auth: Auth,
  Configuration: Configuration,
  locale: localeReducer,
  //shopperProfile: shopperProfileReducer,
  categories: categoriesReducer,
  user: userReducer,
  cities: citiesReducer,
});
export default rootReducer;
