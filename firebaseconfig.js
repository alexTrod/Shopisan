import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyByXMG_whb-DXs1OuF1lyr6Ae6ISOKX2lg",
  authDomain: "shopisan-bad76.firebaseapp.com",
  projectId: "shopisan-bad76",
  storageBucket: "shopisan-bad76.firebasestorage.app",
  messagingSenderId: "1029832363092",
  appId: "1:1029832363092:web:2ec1c50117888b1901b1c1",
  measurementId: "G-F2R69DSTEP",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export { firestore };
