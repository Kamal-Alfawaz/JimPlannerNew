// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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