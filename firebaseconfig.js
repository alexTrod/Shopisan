import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyByXMG_whb-DXs1OuF1lyr6Ae6ISOKX2lg",
  authDomain: "shopisan-bad76.firebaseapp.com",
  projectId: "shopisan-bad76",
  storageBucket: "shopisan-bad76.firebasestorage.app",
  messagingSenderId: "1029832363092",
  appId: "1:1029832363092:web:2ec1c50117888b1901b1c1",
  measurementId: "G-F2R69DSTEP",
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const functions = getFunctions(app);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export { firestore, auth, functions };
