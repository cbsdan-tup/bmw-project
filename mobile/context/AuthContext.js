import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { auth } from '../config/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';

// Create Auth context
export const AuthContext = createContext();

// Custom hook for easy auth access
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Watch for Firebase authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          console.log("Error getting user data:", err);
          setUser(null);
          setError("Failed to load user data");
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setIsLoading(false);
    });
    
    // Cleanup subscription
    return unsubscribe;
  }, []);
  
  // Login function
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to login');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Register function
  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.register(userData);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to register');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Google sign in
  const googleSignIn = async (googleToken) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.googleSignIn(googleToken);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to login with Google');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Auth context value
  const value = {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    googleSignIn,
    isAuthenticated: !!user,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
