import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

function getFirebaseConfig() {
  // Option 1: Parse whole config from JSON string if provided
  if (process.env.FIREBASE_CONFIG) {
    try {
      return JSON.parse(process.env.FIREBASE_CONFIG);
    } catch {
      // ignore parse error, fallback to individual env vars
    }
  }

  // Option 2: Read individual environment variables (with or without NEXT_PUBLIC_ prefix)
  return {
    apiKey:
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      process.env.FIREBASE_API_KEY ||
      "AIzaSyDImrt7lrSv0xXySl60zPLMBVFLy72iX2k",
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      process.env.FIREBASE_AUTH_DOMAIN ||
      "cinenova-23f33.firebaseapp.com",
    projectId:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      "cinenova-23f33",
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      process.env.FIREBASE_STORAGE_BUCKET ||
      "cinenova-23f33.firebasestorage.app",
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
      process.env.FIREBASE_MESSAGING_SENDER_ID ||
      "870545534911",
    appId:
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
      process.env.FIREBASE_APP_ID ||
      "1:870545534911:web:6d1dd0816a4ca7fa797b0a",
  };
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const config = getFirebaseConfig();
  if (!config.projectId) {
    return null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  try {
    firebaseApp = initializeApp(config);
    return firebaseApp;
  } catch (error) {
    console.error("🔥 [Firebase] Initialization error:", error);
    return null;
  }
}

export function getDb(): Firestore | null {
  if (firestoreDb) return firestoreDb;

  const app = getFirebaseApp();
  if (!app) return null;

  try {
    firestoreDb = getFirestore(app);
    return firestoreDb;
  } catch (error) {
    console.error("🔥 [Firebase] Firestore initialization error:", error);
    return null;
  }
}

export function getFirebaseStatus(): {
  isConfigured: boolean;
  projectId: string;
  authDomain: string;
  hasApiKey: boolean;
} {
  const config = getFirebaseConfig();
  return {
    isConfigured: Boolean(config.projectId && config.projectId.trim()),
    projectId: config.projectId || "Not configured",
    authDomain: config.authDomain || "Not configured",
    hasApiKey: Boolean(config.apiKey && config.apiKey.trim()),
  };
}
