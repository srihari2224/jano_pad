import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

// All values are read from VITE_FIREBASE_* env vars so the same build works on
// localhost and the deployed (Vercel) URL. These are browser-exposed by design
// — Firebase web config is not secret; access is controlled by Firebase
// Authentication authorized domains + security rules, not by hiding these keys.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// When the Firebase env vars are absent, calling getAuth() throws
// (auth/invalid-api-key) at import time and white-screens the whole app — even
// the login page. Guard on a present apiKey so an unconfigured deploy degrades
// gracefully (the AuthContext then reports "not configured") instead of crashing.
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

export const app: FirebaseApp | null = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : null;
export const auth: Auth | null = app ? getAuth(app) : null;

export const googleProvider = new GoogleAuthProvider();
// Always show the account chooser instead of silently reusing the last account.
googleProvider.setCustomParameters({ prompt: "select_account" });
