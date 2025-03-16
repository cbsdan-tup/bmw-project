import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_URL } from "../config/constants";
import { auth } from "../config/firebase-config"; // Import auth directly
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";

// Create auth context
export const AuthContext = createContext();

// Custom hook for easy auth access
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add token refresh logic
  useEffect(() => {
    let tokenRefreshInterval;

    const refreshTokenPeriodically = async () => {
      if (auth.currentUser) {
        try {
          // Force token refresh
          const token = await auth.currentUser.getIdToken(true);
          const userDoc = await getUserData(auth.currentUser.uid);

          setUser({
            ...userDoc,
            token,
          });
        } catch (error) {
          console.error("Token refresh error:", error);
        }
      }
    };

    // Refresh token every 30 minutes to prevent expiration
    tokenRefreshInterval = setInterval(
      refreshTokenPeriodically,
      30 * 60 * 1000
    );

    // Setup auth state listener
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const userDoc = await getUserData(firebaseUser.uid);

          setUser({
            ...userDoc,
            token,
          });
        } catch (error) {
          console.error("Auth state change error:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup
    return () => {
      unsubscribe();
      clearInterval(tokenRefreshInterval);
    };
  }, []);

  // Add token refresh method
  const refreshToken = async () => {
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(true);
        const userDoc = await getUserData(auth.currentUser.uid);

        setUser({
          ...userDoc,
          token,
        });
        return token;
      }
    } catch (error) {
      console.error("Manual token refresh error:", error);
      throw error;
    }
  };

  useEffect(() => {
    // Load token and user info from AsyncStorage
    const loadUserFromStorage = async () => {
      setIsLoading(true);
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Set the default Authorization header for all requests
          axios.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${storedToken}`;
        }
      } catch (err) {
        console.error("Error loading user data from storage:", err);
        setError("Failed to load user data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  // Add token refresh interval
  useEffect(() => {
    let refreshInterval;

    const setupTokenRefresh = async () => {
      if (auth.currentUser) {
        try {
          await auth.currentUser.getIdToken(true);
        } catch (error) {
          console.error("Token refresh failed:", error);
          // Force logout on token refresh failure
          await logout();
        }
      }
    };

    // Refresh token every 30 minutes
    refreshInterval = setInterval(setupTokenRefresh, 25 * 60 * 1000);

    // Initial token refresh
    setupTokenRefresh();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  // Login function
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the imported auth directly
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();

      // Get user info from backend using Firebase
      const response = await axios.post(
        `${API_URL}/getUserInfo`,
        {
          uid: result.user.uid,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        const userData = response.data.user;

        console.log("Login successful:", userData);

        // Save to state
        setToken(idToken);
        setUser(userData);

        // Save to AsyncStorage
        await AsyncStorage.setItem("token", idToken);
        await AsyncStorage.setItem("user", JSON.stringify(userData));

        // Set the default Authorization header for all requests
        axios.defaults.headers.common["Authorization"] = `Bearer ${idToken}`;

        return { success: true };
      } else {
        throw new Error(response.data.message || "User info not found");
      }
    } catch (err) {
      console.log("Login error:", err);
      const errorMsg = err.message || "Login failed. Please try again.";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-In function
  const googleSignIn = async (idToken) => {
    setIsLoading(true);
    setError(null);

    try {
      // Create a credential from the Google ID token
      const credential = GoogleAuthProvider.credential(idToken);

      // Sign in with the credential using the imported auth
      const result = await signInWithCredential(auth, credential);
      const firebaseToken = await result.user.getIdToken();

      // Get user info from backend using Firebase UID
      try {
        const response = await axios.post(
          `${API_URL}/getUserInfo`,
          {
            uid: result.user.uid,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.success && response.data.user) {
          const userData = response.data.user;

          // Save to state
          setToken(firebaseToken);
          setUser(userData);

          // Save to AsyncStorage
          await AsyncStorage.setItem("token", firebaseToken);
          await AsyncStorage.setItem("user", JSON.stringify(userData));

          // Set the default Authorization header for all requests
          axios.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${firebaseToken}`;

          return { success: true };
        } else {
          // User doesn't exist, create new user
          const userInfo = {
            uid: result.user.uid,
            email: result.user.email,
            firstName: result.user.displayName?.split(" ")[0] || "",
            lastName:
              result.user.displayName?.split(" ").slice(1).join(" ") || "",
            profilePicture: result.user.photoURL,
          };

          // Register the user
          const registerResponse = await axios.post(
            `${API_URL}/register`,
            userInfo,
            {
              headers: { "Content-Type": "application/json" },
            }
          );

          if (registerResponse.data.success) {
            const newUser = registerResponse.data.user;

            // Save new user data
            setToken(firebaseToken);
            setUser(newUser);

            await AsyncStorage.setItem("token", firebaseToken);
            await AsyncStorage.setItem("user", JSON.stringify(newUser));

            axios.defaults.headers.common[
              "Authorization"
            ] = `Bearer ${firebaseToken}`;

            return { success: true };
          } else {
            throw new Error("Failed to register new user");
          }
        }
      } catch (error) {
        // Handle error with getUserInfo or registration
        console.error("Error in user processing:", error);
        throw error;
      }
    } catch (err) {
      const errorMsg =
        err.message || "Google sign-in failed. Please try again.";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Register function - update to match web implementation
  const register = async (userData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/register`, userData, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data.success) {
        return { success: true, message: response.data.message };
      } else {
        throw new Error(response.data.message || "Registration failed");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Registration failed. Please try again.";
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

      // Remove from AsyncStorage
      await AsyncStorage.multiRemove(["token", "user"]);

      // Remove Authorization header
      delete axios.defaults.headers.common["Authorization"];
    } catch (err) {
      console.error("Error during logout:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (userData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.put(
        `${API_URL}/users/${user._id}`,
        userData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updatedUser = response.data.user;

      // Update state
      setUser(updatedUser);

      // Update AsyncStorage
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));

      return { success: true, user: updatedUser };
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to update profile.";
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
      const response = await axios.get(`${API_URL}/users/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const freshUserData = response.data.user;

      // Update state
      setUser(freshUserData);

      // Update AsyncStorage
      await AsyncStorage.setItem("user", JSON.stringify(freshUserData));

      return freshUserData;
    } catch (err) {
      console.error("Error refreshing user data:", err);
    } finally {
      setIsLoading(false);
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
    refreshToken, // Add refreshToken to context
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
