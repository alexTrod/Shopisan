import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import rootReducer from "./Reducers";
import { enhancedReduxLogger } from "../utils/reduxLogger";

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ['locale', 'user'], // Only persist essential data
  blacklist: ['categories', 'cities', 'location'] // Don't persist frequently changing data
};


const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => {
    try {
      return getDefaultMiddleware({
        serializableCheck: false, 
      }).concat(enhancedReduxLogger);
    } catch (error) {
      console.warn('Failed to add Redux logging middleware:', error);
      return getDefaultMiddleware({
        serializableCheck: false, 
      });
    }
  },
});

const persistor = persistStore(store);

export { store, persistor };
