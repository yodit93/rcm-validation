// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAI, GoogleAIBackend } from "firebase/ai";
import { getFunctions } from "firebase/functions";

// Using the hardcoded values for the config that are provided by the Firebase environment.
// This bypasses the potentially unreliable 'process.env' lookups during build.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAyxwz2ZVbfXcyof40c5Jd6AHQLpvnFX_4", // Using fallback from the log
  authDomain: "mini-rcm-validation-engine.firebaseapp.com",
  projectId: "mini-rcm-validation-engine",
  storageBucket: "mini-rcm-validation-engine.firebasestorage.app",
  messagingSenderId: "522534214712",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:522534214712:web:0075c158eb6cb345829acd", // Using fallback from the log
  measurementId: "G-Q46SV5TPZ8"
};

let app;

// 🛑 CRITICAL FIX: Conditionally initialize the app 🛑
// This check prevents the Client SDK from being initialized multiple times 
// during Server-Side Rendering (SSR) and ensures it doesn't fail if the 
// build environment is missing the API key.
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  // If the app is already initialized (e.g., in a subsequent SSR call or on the client)
  app = getApp();
}

// Initialize services using the single 'app' instance
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const ai = getAI(app, { backend: new GoogleAIBackend() });
const functions = getFunctions(app);

// Log to see if it initializes successfully (this will only run on the client/serverless function)
console.log("Firebase Client App Initialized Successfully.");

export { auth, db, storage, serverTimestamp, ai, functions };