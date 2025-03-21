import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBcOEq0wpqykcX7m2qfwywtkJBpPJwWyLI",
  authDomain: "bmw-project-5ab42.firebaseapp.com",
  projectId: "bmw-project-5ab42",
  storageBucket: "bmw-project-5ab42.appspot.com",
  messagingSenderId: "14654770851",
  appId: "1:14654770851:android:085d66fa22a5ed240f3916",
};

console.log("Firebase config module loading...");
console.log("Current Firebase apps:", getApps().length);

// Initialize Firebase - use getApps() to check if already initialized
let app;
if (getApps().length === 0) {
  try {
    console.log("Initializing Firebase app for the first time");
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialization successful:", app.name);
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error; // Critical error - can't proceed without Firebase
  }
} else {
  console.log("Firebase app already exists, retrieving instance");
  app = getApp(); // Get the already initialized app
  console.log("Retrieved existing Firebase app:", app.name);
}

// Initialize auth with explicit app reference
let auth;
try {
  console.log("Initializing Firebase auth");
  auth = getAuth(app);
  if (!auth) {
    console.log("Auth not available with getAuth, trying initializeAuth");
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
  console.log("Firebase auth initialized successfully");
} catch (error) {
  console.error("Error during auth initialization:", error);
  // Last attempt to get auth
  auth = getAuth(app);
}

// Export the app first, then other services
export default app;
export { auth, app };

export const refreshFirebaseToken = async () => {
  console.log("Auth User:", auth?.currentUser?.email || "null");
  
  if (!auth?.currentUser) {
    console.log("No user signed in, checking for stored session...");
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('token');
      
      if (storedUser && storedToken) {
        console.log("Found stored user but Firebase auth is null - authentication state is inconsistent");

        return storedToken;
      }
    } catch (error) {
      console.error("Error checking stored auth:", error);
    }
    
    console.log("No stored session found");
    return null;
  }
  
  try {
    console.log("Refreshing token for user:", auth.currentUser.email);
    const newToken = await auth.currentUser.getIdToken(true);
    console.log("Token refreshed successfully");
    return newToken;
  } catch (error) {
    console.error("Error refreshing token:", error);
    if (error.code === 'auth/network-request-failed') {
      console.log("Network error during token refresh");
      const storedToken = await AsyncStorage.getItem('token');
      return storedToken;
    }
    throw error;
  }
};

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
