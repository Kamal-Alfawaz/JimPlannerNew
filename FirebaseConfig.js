import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB7m7sDmDsENMLUfS0Ma_drRz2PCUUj9T4",
  authDomain: "finalproject-75da1.firebaseapp.com",
  projectId: "finalproject-75da1",
  storageBucket: "finalproject-75da1.appspot.com",
  messagingSenderId: "728226174273",
  appId: "1:728226174273:web:832fa49af35d92bebf7dc0",
  measurementId: "G-MH2HLJ8TSQ"
};

// Initialize Firebase
export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = getAuth(FIREBASE_APP);
export const FIREBASE_DB = getFirestore(FIREBASE_APP);