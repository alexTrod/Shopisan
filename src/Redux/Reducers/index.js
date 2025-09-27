import Auth from "./Auth";
import Configuration from "./Configuration";
import localeSlice from "../Slices/localeSlice";
import { combineReducers } from "redux";
import { categoriesReducer } from "./CategoriesReducer";
import { citiesReducer } from "./CitiesReducer";
import { userReducer } from "./UserReducer";
import LocationReducer from "./LocationReducer";

const rootReducer = combineReducers({
  Auth: Auth,
  Configuration: Configuration,
  locale: localeSlice,
  categories: categoriesReducer,
  user: userReducer,
  cities: citiesReducer,
  location: LocationReducer,
});

export default rootReducer;
