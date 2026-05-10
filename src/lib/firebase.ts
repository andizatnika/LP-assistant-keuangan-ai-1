import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfigData from "../../firebase-applet-config.json";

const firebaseConfig = {
  ...firebaseConfigData,
  // Ensure we use the firestoreDatabaseId if provided
  firestoreDatabaseId: firebaseConfigData.firestoreDatabaseId
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

export default app;
