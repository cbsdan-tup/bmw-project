import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential 
} from "firebase/auth";
import { auth, getAuthToken } from '../config/firebase-config';

// Base URL for API calls
const BASE_URL = 'http://192.168.68.202:4000/api/v1';

// Create axios instance with base URL
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper function to store user data
const storeUserData = async (authToken, userData) => {
  await AsyncStorage.setItem('authToken', authToken);
  await AsyncStorage.setItem('user', JSON.stringify(userData));
};

// Authentication service functions
export const authService = {
  // Login with email and password
  login: async (email, password) => {
    try {
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      // Get user data from backend
      const response = await api.post('/getUserInfo', { uid: user.uid });
      
      if (response.data.success) {
        await storeUserData(idToken, response.data.user);
        return {
          token: idToken,
          user: response.data.user
        };
      } else {
        throw new Error('User data not found');
      }
    } catch (error) {
      console.log("Login error:", error);
      
      // Handle Firebase authentication errors
      if (error.code === 'auth/user-not-found') {
        throw { message: 'No account found with this email' };
      } else if (error.code === 'auth/wrong-password') {
        throw { message: 'Incorrect password' };
      } else if (error.code === 'auth/invalid-credential') {
        throw { message: 'Invalid login credentials' };
      } else if (error.code === 'auth/too-many-requests') {
        throw { message: 'Too many failed login attempts. Please try again later.' };
      }
      
      throw error.response?.data || { message: error.message || 'Login failed' };
    }
  },
  
  // Register new user
  register: async (userData) => {
    try {
      // Firebase authentication
      const { email, password, firstName, lastName, avatar } = userData;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      // Send user data to backend
      const formData = new FormData();
      formData.append("uid", user.uid);
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("email", email);
      
      // Add avatar if present
      if (avatar) {
        const uriParts = avatar.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append("avatar", {
          uri: avatar.uri,
          name: `avatar-${user.uid}.${fileType}`,
          type: `image/${fileType}`,
        });
      }
      
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${idToken}`
        },
      };
      
      const response = await api.post('/register', formData, config);
      
      if (response.data.success) {
        return {
          success: true,
          user: response.data.user
        };
      } else {
        throw new Error('Registration failed on server');
      }
    } catch (error) {
      console.log("Registration error:", error);
      throw error.response?.data || { message: error.message || 'Registration failed' };
    }
  },
  
  // Google Sign-In
  googleSignIn: async (idToken) => {
    try {
      if (!idToken) {
        throw new Error("No token provided");
      }
      
      // Create Google credential
      const credential = GoogleAuthProvider.credential(null, idToken);
      
      // Sign in with credential
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      const fbToken = await user.getIdToken();
      
      try {
        // Check if user exists in our backend
        const response = await api.post('/getUserInfo', { uid: user.uid });
        
        if (response.data.success && response.data.user) {
          // User exists, store data and return
          await storeUserData(fbToken, response.data.user);
          return {
            token: fbToken,
            user: response.data.user
          };
        } else {
          // User doesn't exist, register them
          const displayName = user.displayName || '';
          const nameParts = displayName.split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(" ") || '';
          
          // Create user in backend
          const formData = new FormData();
          formData.append("uid", user.uid);
          formData.append("email", user.email);
          formData.append("firstName", firstName);
          formData.append("lastName", lastName);
          
          if (user.photoURL) {
            // You might want to download the image and attach it
            // For now, we'll just send the URL
            formData.append("photoURL", user.photoURL);
          }
          
          const config = {
            headers: {
              "Content-Type": "multipart/form-data",
              "Authorization": `Bearer ${fbToken}`
            },
          };
          
          const registerResponse = await api.post('/register', formData, config);
          
          if (registerResponse.data.success) {
            await storeUserData(fbToken, registerResponse.data.user);
            return {
              token: fbToken,
              user: registerResponse.data.user
            };
          } else {
            throw new Error('Failed to register Google user');
          }
        }
      } catch (backendError) {
        console.log("Backend error during Google sign-in:", backendError);
        throw backendError;
      }
    } catch (error) {
      console.log("Google sign-in error:", error);
      
      // Handle specific Google auth errors
      if (error.code === 'auth/account-exists-with-different-credential') {
        throw { message: 'An account already exists with the same email address but different sign-in credentials' };
      }
      
      throw error.response?.data || { message: error.message || 'Google sign-in failed' };
    }
  },
  
  // Logout
  logout: async () => {
    try {
      await auth.signOut();
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.log("Logout error:", error);
      throw error;
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const user = await AsyncStorage.getItem('user');
      return !!token && !!user;
    } catch (error) {
      console.log("Auth check error:", error);
      return false;
    }
  },
  
  // Get current user
  getCurrentUser: async () => {
    try {
      const user = await AsyncStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.log("Get user error:", error);
      return null;
    }
  },
};

export default api;
