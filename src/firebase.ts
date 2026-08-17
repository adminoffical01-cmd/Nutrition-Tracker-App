import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

// Configured credentials sourced from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDdzTlXMeLTzG07zSDv-zpT7v8QjpKw-Ds",
  authDomain: "gen-lang-client-0901887079.firebaseapp.com",
  projectId: "gen-lang-client-0901887079",
  databaseId: "ai-studio-36d3ba37-96a8-456b-a153-1c988429f837",
  storageBucket: "gen-lang-client-0901887079.firebasestorage.app",
  messagingSenderId: "760608873990",
  appId: "1:760608873990:web:33631309edcea313d12d87"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with IndexedDB Local Cache persistence enabled
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  console.log("[Firebase] Persistent Local Cache successfully configured.");
} catch (error) {
  console.error("[Firebase] Local Cache failed, falling back to standard Firestore: ", error);
  const { getFirestore } = require("firebase/firestore");
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
