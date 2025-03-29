import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

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

// Initialize auth with proper initialization check
let auth;
try {
  console.log("Checking for existing Firebase auth instance");
  // First try to get the existing auth instance
  auth = getAuth(app);
  
  // If we get here, auth was successfully retrieved
  console.log("Existing Firebase auth instance found");
} catch (error) {
  console.log("No existing auth instance found, initializing with persistence");
  try {
    // Only initialize auth with persistence if it doesn't exist yet
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log("Firebase auth initialized with persistence");
  } catch (initError) {
    console.error("Error during auth initialization:", initError);
    // Last resort fallback
    auth = getAuth(app);
  }
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
      // Check both storage locations for token with both possible keys
      const storedToken = await SecureStore.getItemAsync('auth_token') || 
                           await AsyncStorage.getItem('token');
      
      if (storedUser && storedToken) {
        console.log("Found stored user but Firebase auth is null - authentication state is inconsistent");
        // Store token in new location if found in old location
        if (await AsyncStorage.getItem('token')) {
          await SecureStore.setItemAsync('auth_token', storedToken);
          // Consider removing the old token
          await AsyncStorage.removeItem('token');
        }
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
    // Store the refreshed token in SecureStore
    await SecureStore.setItemAsync('auth_token', newToken);
    return newToken;
  } catch (error) {
    console.error("Error refreshing token:", error);
    if (error.code === 'auth/network-request-failed') {
      console.log("Network error during token refresh");
      // Check both locations for fallback token
      const storedToken = await SecureStore.getItemAsync('auth_token') || 
                           await AsyncStorage.getItem('token');
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
