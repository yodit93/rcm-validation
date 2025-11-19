// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore"; // <-- Import Firestore functions
import { getStorage } from "firebase/storage"; // <-- Import Storage function
import { getAI, GoogleAIBackend } from "firebase/ai";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "mini-rcm-validation-engine.firebaseapp.com",
  projectId: "mini-rcm-validation-engine",
  storageBucket: "mini-rcm-validation-engine.firebasestorage.app",
  messagingSenderId: "522534214712",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: "G-Q46SV5TPZ8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);     // <-- Initialize Firestore
const storage = getStorage(app); // <-- Initialize Storage
console.log(storage);
const auth = getAuth(app);
const ai = getAI(app, { backend: new GoogleAIBackend() });
const functions = getFunctions(app);

export { auth, db, storage, serverTimestamp, ai, functions }; // <-- Export Firestore and Storage