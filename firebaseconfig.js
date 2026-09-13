import { Platform } from "react-native";
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import {
  initializeAuth,
  getReactNativePersistence,
  connectAuthEmulator,
} from "firebase/auth";
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

// Local Firebase emulators for manual testing without touching production:
//   EXPO_PUBLIC_USE_EMULATOR=1 npx expo start
// (10.0.2.2 is the host machine as seen from the Android emulator.)
if (process.env.EXPO_PUBLIC_USE_EMULATOR === "1") {
  const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  connectFirestoreEmulator(firestore, host, 8080);
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFunctionsEmulator(functions, host, 5001);
}

export { firestore, auth, functions };
