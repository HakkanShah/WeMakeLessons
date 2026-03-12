import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Check if Firebase is properly configured with real credentials
export const isFirebaseConfigured =
    !!firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "your-firebase-api-key" &&
    !!firebaseConfig.projectId &&
    firebaseConfig.projectId !== "your-project-id";

if (!isFirebaseConfigured) {
    console.warn(
        "[WeMakeLessons] Firebase is not configured. " +
        "Please create a .env.local file with your Firebase credentials. " +
        "See .env.local.example for the list of required environment variables."
    );
}

// Initialize Firebase app (always needed for SDK initialization)
const app: FirebaseApp = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

// Initialize services — these will fail gracefully if called without valid config
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

// Analytics is browser-only and optional
let analytics: import("firebase/analytics").Analytics | null = null;
if (typeof window !== "undefined" && isFirebaseConfigured) {
    import("firebase/analytics").then(({ getAnalytics, isSupported }) => {
        isSupported()
            .then((supported) => {
                if (supported) analytics = getAnalytics(app);
            })
            .catch(() => {
                // Analytics not supported — silently ignore
            });
    });
}

export { app, auth, db, storage, analytics };
