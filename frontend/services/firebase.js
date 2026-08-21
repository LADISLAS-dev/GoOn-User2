// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence
} from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';



// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0g_4xnU7zk9bXebhvTDXGfOO5jVix6zo",
  authDomain: "goone6-549f8.firebaseapp.com",
  databaseURL: "https://goone6-549f8-default-rtdb.firebaseio.com",
  projectId: "goone6-549f8",
  storageBucket: "goone6-549f8.firebasestorage.app",
  messagingSenderId: "126331559523",
  appId: "1:126331559523:web:640acf13e2c36bffa0a256"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export default app;