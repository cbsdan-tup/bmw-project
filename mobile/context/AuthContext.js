import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { auth, refreshFirebaseToken } from '../config/firebase-config';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithCredential,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { AppState } from 'react-native';
import {
  Platform
} from 'react-native';
import api from '../services/api';

// Create auth context
export const AuthContext = createContext();

// Custom hook for easy auth access
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [tokenExpiration, setTokenExpiration] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const verifyAndRefreshToken = async () => {
    try {
      const now = Date.now();
      const fiveMinutesFromNow = now + 5 * 60 * 1000;
      
      if (!tokenExpiration || tokenExpiration < fiveMinutesFromNow) {
        console.log('Token expired or about to expire, refreshing...');

        console.log('User state before refresh:', user?.email || 'null');
        console.log('Auth state:', auth?.currentUser?.email || 'null');

        const newToken = await refreshFirebaseToken();
        
        if (newToken) {
          const newExpiration = now + 3600 * 1000; 
          
          setToken(newToken);
          setTokenExpiration(newExpiration);
          
          await SecureStore.setItemAsync('auth_token', newToken);
          await AsyncStorage.setItem('tokenExpiration', newExpiration.toString());
          
          axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          
          return newToken;
        } else {
          console.log('Could not refresh token, and token is expired.');
          if (!token || (tokenExpiration && tokenExpiration < now)) {
            console.log('Logging user out due to expired token.');
            logout();
            return null;
          }
        }
      }
      
      return token;
    } catch (error) {
      console.error('Error verifying token:', error);
      if (error.code === 'auth/user-token-expired' || error.code === 'auth/user-not-found') {
        logout();
      }
      throw error;
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && user) {
        console.log('App has come to the foreground, checking token...');
        verifyAndRefreshToken();
      }
    });

    const loadUserFromStorage = async () => {
      setIsLoading(true);
      try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        const storedUser = await AsyncStorage.getItem('user');
        const storedExpiration = await AsyncStorage.getItem('tokenExpiration');
        
        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // If token expiration is stored, set it
          if (storedExpiration) {
            setTokenExpiration(parseInt(storedExpiration));
          }
          
          try {
            const validToken = await verifyAndRefreshToken();
            setToken(validToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${validToken}`;
          } catch (e) {
            console.log('Token verification failed, user will need to login again');
            await SecureStore.deleteItemAsync('auth_token');
            await AsyncStorage.multiRemove(['user', 'tokenExpiration']);
          }
        }
      } catch (err) {
        console.error('Error loading user data from storage:', err);
        setError('Failed to load user data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromStorage();
    
    return () => {
      // Clean up the subscription
      subscription.remove();
    };
  }, []);

  // Login function
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      
      const expirationTime = Date.now() + 3600 * 1000;
      
      // Get user info from backend using Firebase UID
      const response = await api.post(`/getUserInfo`, { 
        uid: result.user.uid 
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (response.data.success) {
        const userData = response.data.user;
        
        // Check if user is disabled
        if (response.data.isDisabled) {
          console.log("Login attempted for disabled user:", userData.email);
          setIsLoading(false);
          return { 
            success: false, 
            isDisabled: true,
            disableInfo: response.data.disableInfo,
            message: "Account is disabled"
          };
        }
        
        console.log("Login successful:", userData);
        
        setUser(userData);
        setToken(idToken);
        console.log("User Data: ", userData);
        console.log("User Token: ", idToken);
        setTokenExpiration(expirationTime);
        
        // Save to storage
        await SecureStore.setItemAsync('auth_token', idToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('tokenExpiration', expirationTime.toString());
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;
        
        return { success: true, user: userData };
      } else {
        throw new Error(response.data.message || 'User info not found');
      }
    } catch (err) {
      console.log("Login error:", err);
      const errorMsg = err.message || 'Login failed. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-In function
  const googleSignIn = async (signInData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Google sign-in attempt with data type:', typeof signInData);
      
      // Initialize variables for token and user info
      let idToken = null;
      let userInfo = null;
      
      // Case 1: Direct string token
      if (typeof signInData === 'string') {
        idToken = signInData;
        console.log('Found direct string token');
      } 
      // Case 2: Object with token or nested structure
      else if (signInData && typeof signInData === 'object') {
        // Try various possible locations for the token
        if (signInData.idToken) {
          idToken = signInData.idToken;
          console.log('Found token in signInData.idToken');
        } else if (signInData.googleSignInData?.idToken) {
          idToken = signInData.googleSignInData.idToken;
          userInfo = signInData.googleSignInData.user;
          console.log('Found token in signInData.googleSignInData.idToken');
        } else if (signInData.data?.idToken) {
          idToken = signInData.data.idToken;
          userInfo = signInData.data.user;
          console.log('Found token in signInData.data.idToken');
        } else if (signInData.originalResponse?.idToken) {
          idToken = signInData.originalResponse.idToken;
          console.log('Found token in originalResponse.idToken');
        }
        
        // If we didn't find a token in the object, try to log the structure
        if (!idToken) {
          console.log('No token found in object, object keys:', Object.keys(signInData));
          if (signInData.googleSignInData) {
            console.log('googleSignInData keys:', Object.keys(signInData.googleSignInData));
          }
        }
      }
      
      // If we still don't have a token, try to get one from GoogleSignin
      if (!idToken) {
        try {
          console.log('No token found in input, trying to get tokens from GoogleSignin');
          const tokens = await GoogleSignin.getTokens();
          if (tokens && tokens.idToken) {
            idToken = tokens.idToken;
            console.log('Successfully got token from GoogleSignin.getTokens()');
          }
        } catch (tokenError) {
          console.error('Error getting tokens:', tokenError);
        }
      }
      
      // Final check - if we don't have a token, we can't proceed
      if (!idToken) {
        console.error('Failed to find valid ID token');
        throw new Error('Failed to get authentication token');
      }
      
      console.log('Using Google ID token of length:', idToken.length);
      
      // Create credential and sign in to Firebase
      const credential = GoogleAuthProvider.credential(idToken);
      
      const result = await signInWithCredential(auth, credential);
      console.log('Firebase auth successful');
      
      const firebaseToken = await result.user.getIdToken();
      const firebaseUser = result.user;
      
      try {
        // Try to get existing user info
        const response = await api.post('/getUserInfo', { 
          uid: firebaseUser.uid 
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success && response.data.user) {
          // User exists, set up session
          const userData = response.data.user;
          setUser(userData);
          setToken(firebaseToken);
          setTokenExpiration(Date.now() + 3600 * 1000);
          
          await SecureStore.setItemAsync('auth_token', firebaseToken);
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          await AsyncStorage.setItem('tokenExpiration', (Date.now() + 3600 * 1000).toString());
          
          axios.defaults.headers.common['Authorization'] = `Bearer ${firebaseToken}`;
          
          return { success: true, user: userData };
        } else {
          console.log('User not found, creating new user');
        }
      } catch (error) {
        // User doesn't exist, create a new one
        console.log('Error fetching user, creating new user:', error);
      }
      
      // Create new user record
      const formData = new FormData();
      formData.append('uid', firebaseUser.uid);
      formData.append('email', firebaseUser.email);
      
      // Extract name parts from display name
      const displayName = userInfo?.displayName || firebaseUser.displayName || '';
      const nameParts = displayName.split(/\s+/);
      formData.append('firstName', nameParts[0] || '');
      formData.append('lastName', nameParts.slice(1).join(' ') || '');
      
      // Add photo URL if available
      const photoURL = userInfo?.photoURL || firebaseUser.photoURL;
      if (photoURL) {
        formData.append('photoURL', photoURL);
      }
      
      const registerResponse = await api.post('/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${firebaseToken}`
        }
      });
      
      if (registerResponse.data.success) {
        const newUser = registerResponse.data.user;
        
        setUser(newUser);
        setToken(firebaseToken);
        setTokenExpiration(Date.now() + 3600 * 1000);
        
        await SecureStore.setItemAsync('auth_token', firebaseToken);
        await AsyncStorage.setItem('user', JSON.stringify(newUser));
        await AsyncStorage.setItem('tokenExpiration', (Date.now() + 3600 * 1000).toString());
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${firebaseToken}`;
        
        return { success: true, user: newUser };
      } else {
        throw new Error(registerResponse.data.message || 'Failed to register user');
      }
    } catch (err) {
      console.error('Google sign-in error:', err.code, err.message);
      
      let errorMsg = 'Google sign-in failed. Please try again.';
      
      if (err.code === 'auth/invalid-credential') {
        errorMsg = 'Invalid authentication credential. Please try again.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMsg = 'Google sign-in is not enabled for this app.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Register function - update to match web implementation
  const register = async (userData) => {
    const { firstName, lastName, email, password, avatar } = userData;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 1: Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      // Step 2: Prepare form data for backend registration
      const formData = new FormData();
      formData.append("uid", user.uid);
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("email", email);
      
      // Handle avatar upload if selected
      if (avatar) {
        const filename = avatar.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        
        formData.append("avatar", {
          uri: Platform.OS === 'ios' ? avatar.replace('file://', '') : avatar,
          name: filename,
          type,
        });
      }
      
      // Step 3: Send data to backend API
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${idToken}`
        },
      };
      
      const response = await api.post(`/register`, formData, config);
      
      if (response.data.success) {
        return { 
          success: true, 
          message: response.data.message || 'Registration successful' 
        };
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (err) {
      console.log("Registration error details:", err);
      
      // Handle Firebase-specific errors
      if (err.code === 'auth/email-already-in-use') {
        const errorMsg = 'Email is already registered. Please use a different email.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } else if (err.code === 'auth/invalid-email') {
        const errorMsg = 'The email address is not valid.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } else if (err.code === 'auth/weak-password') {
        const errorMsg = 'Password should be at least 6 characters.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      const errorMsg = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      // Clear auth state
      setUser(null);
      setToken(null);
      setTokenExpiration(null);
      
      // Remove from storage
      await SecureStore.deleteItemAsync('auth_token');
      await AsyncStorage.multiRemove(['user', 'tokenExpiration']);
      
      // Remove Authorization header
      delete axios.defaults.headers.common['Authorization'];
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (params) => {
    const { userId, formData, isMultipart } = params;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const headers = { 
        'Content-Type': isMultipart ? 'multipart/form-data' : 'application/json'
      };
      
      // Use the correct endpoint for update-profile
      const response = await api.put(
        `/update-profile/${userId}`, 
        formData,
        { headers }
      );
      
      if (response.data.success) {
        const updatedUser = response.data.user;
        
        // Update state
        setUser(updatedUser);
        
        // Update AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        
        return { success: true, user: updatedUser };
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error in updateProfile:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update profile.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Get fresh user data
  const refreshUserData = async () => {
    if (!user || !token) return;
    
    setIsLoading(true);
    try {
      // Try to get user info using the user ID from auth
      const response = await api.post(`/getUserInfo`, { 
        uid: user.uid 
      }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        const freshUserData = response.data.user;
        
        // Update state
        setUser(freshUserData);
        
        // Update AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(freshUserData));
        
        return freshUserData;
      } else {
        console.log('User info refresh returned unsuccessful response:', response.data);
        return user; // Return current user data as fallback
      }
    } catch (err) {
      console.error('Error refreshing user data:', err);
      
      // Log more detailed error information
      if (err.response) {
        console.log('Error status:', err.response.status);
        console.log('Error data:', err.response.data);
      }
      
      // Even if refresh fails, we should continue with current user data
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP function
  const verifyOTP = async (email, otp) => {
    try {
      const response = await api.post('/verify-otp', { email, otp });
      return response.data;
    } catch (error) {
      // Don't log the full error object which causes the noisy console output
      console.log("OTP verification failed:", error.response?.status || 'Network error');
      
      // Create a user-friendly error object
      const userFriendlyError = {
        success: false,
        message: 'Invalid verification code. Please try again.'
      };
      
      // Use the server's error message if available
      if (error.response?.data?.message) {
        userFriendlyError.message = error.response.data.message;
      }
      
      return userFriendlyError;
    }
  };

  // Auth context value
  const authContextValue = {
    user,
    token,
    isLoading,
    error,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    updateProfile,
    refreshUserData,
    googleSignIn,
    refreshToken: verifyAndRefreshToken,
    verifyOTP,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
