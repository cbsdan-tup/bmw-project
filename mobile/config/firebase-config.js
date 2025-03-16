import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

// BMW Project Firebase config from google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyBcOEq0wpqykcX7m2qfwywtkJBpPJwWyLI",
  authDomain: "bmw-project-5ab42.firebaseapp.com",
  projectId: "bmw-project-5ab42",
  storageBucket: "bmw-project-5ab42.appspot.com",
  messagingSenderId: "14654770851",
  appId: "1:14654770851:android:085d66fa22a5ed240f3916",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with proper persistence for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Helper functions for authentication
export const getAuthToken = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.log("Error getting auth token:", error);
    return null;
  }
};

export default app;
