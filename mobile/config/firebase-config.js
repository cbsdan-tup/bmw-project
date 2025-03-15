import { initializeApp } from 'firebase/app';
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

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.log("Firebase app already initialized, using existing instance");
}

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  console.log("Firebase auth already initialized, using existing instance");
  auth = getAuth();
}

export { auth };

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

export default app;
