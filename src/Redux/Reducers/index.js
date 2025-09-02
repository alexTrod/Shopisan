import Auth from "./Auth";
import Configuration from "./Configuration";
import {localeReducer} from './LocaleReducer';
import { combineReducers } from "redux";
import { categoriesReducer } from "./CategoriesReducer";
import { citiesReducer } from "./CitiesReducer";
import { userReducer } from "./UserReducer";
import LocationReducer from "./LocationReducer";

const rootReducer = combineReducers({
  Auth: Auth,
  Configuration: Configuration,
  locale: localeReducer,
  categories: categoriesReducer,
  user: userReducer,
  cities: citiesReducer,
  location: LocationReducer,
});

export default rootReducer;
