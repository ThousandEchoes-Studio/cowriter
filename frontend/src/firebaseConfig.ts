// frontend/src/firebaseConfig.ts
// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDPOGpceKZT1xOW62cbwEqR16kgZ46Okxs",
  authDomain: "cowriter-2-app.firebaseapp.com",
  projectId: "cowriter-2-app",
  storageBucket: "cowriter-2-app.firebasestorage.app",
  messagingSenderId: "782061748481",
  appId: "1:782061748481:web:e6d30d01b9d6b86ebedb00",
  measurementId: "G-0SK7LZ6NB5"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
let analytics: Analytics | null = null;
if (typeof window !== "undefined") { // Ensure analytics is only initialized in browser environment
    analytics = getAnalytics(app);
}

export { app, auth, firestore, storage, analytics };
export default app; // Exporting app as default for convenience

