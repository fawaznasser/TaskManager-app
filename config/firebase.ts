// app/config/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentSingleTabManager, 
  CACHE_SIZE_UNLIMITED,
  type FirestoreSettings 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfVpkwiKL7KNgcRLie4JglxoxucXS7LDk",
  authDomain: "taskmanagerapp-b2bc7.firebaseapp.com",
  projectId: "taskmanagerapp-b2bc7",
  storageBucket: "taskmanagerapp-b2bc7.appspot.com",
  messagingSenderId: "1015341061955",
  appId: "1:1015341061955:web:04d4b70880f123c90f81f6",
  measurementId: "G-WDWMY6JYQ3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent cache
const firestoreSettings: FirestoreSettings = {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    tabManager: persistentSingleTabManager({ forceOwnership: true })
  }),
  experimentalForceLongPolling: true,
};

const db = initializeFirestore(app, firestoreSettings);
const auth = getAuth(app);
const storage = getStorage(app);

// Export Firebase services
export { db, auth, storage };