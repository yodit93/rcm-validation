// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAI, GoogleAIBackend } from "firebase/ai";
import { getFunctions } from "firebase/functions";

// --- START: Static Configuration Values (Hardcoded) ---
// These values are public and do not change, so they can be safely hardcoded.
const STATIC_CONFIG_PROPS = {
  // Hardcoded Static Values (Safe and Recommended)
  authDomain: "mini-rcm-validation-engine.firebaseapp.com",
  projectId: "mini-rcm-validation-engine",
  storageBucket: "mini-rcm-validation-engine.firebasestorage.app",
  messagingSenderId: "522534214712",
  measurementId: "G-Q46SV5TPZ8"
};

declare const FIREBASE_WEBAPP_CONFIG: string;
let config = null;

// 1. Prioritize the platform-injected configuration (available during build on Firebase Hosting)
if (typeof FIREBASE_WEBAPP_CONFIG !== 'undefined') {
  try {
    const platformConfig = JSON.parse(FIREBASE_WEBAPP_CONFIG);
    config = {
      ...STATIC_CONFIG_PROPS,
      // Dynamically load only the API Key and App ID from the platform
      apiKey: platformConfig.apiKey, 
      appId: platformConfig.appId, 
    };
  } catch (e) {
    console.error("Failed to parse FIREBASE_WEBAPP_CONFIG:", e);
  }
} 

// 2. Fallback to process.env (used primarily in local development or other environments)
if (!config && typeof process !== 'undefined') {
  config = {
    ...STATIC_CONFIG_PROPS,
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

let app = null;

// Conditionally initialize the app
// Only initialize if the app hasn't been initialized AND we have a valid config (specifically the API Key)
if (getApps().length === 0 && config && config.apiKey) {
  app = initializeApp(config);
} else if (getApps().length > 0) {
  app = getApp(); // Reuse existing app instance in subsequent server-side renders or HMR
} else {
  // This warning means Firebase is not initialized, likely due to missing NEXT_PUBLIC env vars in development
  console.error("Firebase Client App configuration missing. Services will be unavailable.");
}

// Initialize services using the single 'app' instance
// Use ternary operator to handle the case where 'app' might be null if config failed
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;
const auth = app ? getAuth(app) : null;
const ai = app ? getAI(app, { backend: new GoogleAIBackend() }) : null;
const functions = app ? getFunctions(app) : null;

if (app) {
    console.log("Firebase Client App Initialized Successfully.");
}

export { auth, db, storage, serverTimestamp, ai, functions };