import Auth from "./Auth";
import Configuration from "./Configuration";
import localeReducer from '../Slices/localeSlice';
import { combineReducers } from "redux";
import { categoriesReducer } from "./CategoriesReducer";
import { citiesReducer } from "./CitiesReducer";
import { userReducer } from "./UserReducer";
import locationReducer from "./LocationReducer";

const rootReducer = combineReducers({
  Auth: Auth,
  Configuration: Configuration,
  locale: localeReducer,
  categories: categoriesReducer,
  user: userReducer,
  cities: citiesReducer,
  location: locationReducer,
});
export default rootReducer;
