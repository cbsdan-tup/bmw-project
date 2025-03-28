import "react-native-gesture-handler";
import React, { useState, useEffect, useRef } from "react";
import { StatusBar, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View, Text, TouchableOpacity, Alert } from "react-native";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import BottomTabNavigator from "./navigation/BottomTabNavigator";
import AuthNavigator from "./navigation/AuthNavigator";
import { globalStyles } from "./styles/globalStyles";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import IntroScreen from "./components/IntroScreen";
import { Provider, useDispatch } from "react-redux";
import { store } from "./redux/store";
import { ToastProvider } from "./context/ToastContext";
import { LogBox } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import * as SecureStore from "expo-secure-store";
// Import Firebase config early to ensure initialization happens first
import app, { auth } from "./config/firebase-config";
import { fetchUserBookings } from "./redux/slices/bookingSlice";
import { fetchUserFavorites } from "./redux/slices/carSlice";
import { fetchUserReviews } from "./redux/slices/reviewSlice";
import {useNotification} from "./context/NotificationContext";

LogBox.ignoreLogs(["Warning: ..."]);

// Error boundary for navigation container
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
          Something went wrong with the navigation
        </Text>
        <Text style={{ marginBottom: 20, textAlign: "center" }}>
          There was a problem loading the app navigation. Please restart the
          app.
        </Text>
        <TouchableOpacity
          style={{ padding: 10, backgroundColor: "#0066cc", borderRadius: 4 }}
          onPress={() => setHasError(false)}
        >
          <Text style={{ color: "white" }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1 }}
      onError={(error) => {
        console.log("Navigation error caught:", error);
        setHasError(true);
      }}
    >
      {children}
    </View>
  );
};

// Create a NavigationHandler component that will use the notification context
const NavigationHandler = ({ children }) => {
  const navigationRef = useRef(null);
  const { notificationNavigation, clearNotificationNavigation } = useNotification();
  
  useEffect(() => {
    if (notificationNavigation && navigationRef.current) {
      navigationRef.current.navigate(
        notificationNavigation.screen,
        notificationNavigation.params
      );
      
      clearNotificationNavigation();
    }
  }, [notificationNavigation, clearNotificationNavigation]);
  
  return (
    <NavigationContainer ref={navigationRef}>
      {children}
    </NavigationContainer>
  );
};

const AppNavigator = () => {
  const { colors, isDarkMode, isLoading: themeLoading } = useTheme();
  const { isAuthenticated, isLoading: authLoading, user, token } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [isIntroLoading, setIsIntroLoading] = useState(true);

  const dispatch = useDispatch();
  useEffect(() => {
    console.log("User:", user?.email);
    console.log("User Role:", user?.role);
    console.log("User Token:", token);
    if (user && token) {
      dispatch(fetchUserBookings(user?._id));
      dispatch(fetchUserFavorites(user?._id));
      dispatch(fetchUserReviews(user?._id));
    }
  }, [isAuthenticated, user]);

  // Add this debug useEffect
  useEffect(() => {
    console.log("Authentication state changed:", isAuthenticated);
    console.log("Current user:", user?.email || "No user");
  }, [isAuthenticated, user]);

  useEffect(() => {
    const checkIntroStatus = async () => {
      try {
        const hasViewedIntro = await AsyncStorage.getItem("hasViewedIntro");
        if (hasViewedIntro === "true") {
          setShowIntro(false);
        }
        setIsIntroLoading(false);
      } catch (error) {
        console.log("Error checking intro status:", error);
        setShowIntro(false);
        setIsIntroLoading(false);
      }
    };

    checkIntroStatus();
  }, []);

  const handleIntroComplete = async () => {
    try {
      await AsyncStorage.setItem("hasViewedIntro", "true");
      setShowIntro(false);
    } catch (error) {
      console.log("Error saving intro status:", error);
      setShowIntro(false);
    }
  };

  if (authLoading || themeLoading || isIntroLoading) {
    return (
      <View
        style={[
          globalStyles.container,
          { backgroundColor: isDarkMode ? "#121212" : "#ffffff" },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={isDarkMode ? "#3399ff" : "#0066cc"}
        />
      </View>
    );
  }

  if (showIntro) {
    return <IntroScreen onComplete={handleIntroComplete} />;
  }

  return (
    <ErrorBoundary>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent={true}
      />
      {isAuthenticated ? (
        <BottomTabNavigator userRole={user?.role} />
      ) : (
        <AuthNavigator />
      )}
    </ErrorBoundary>
  );
};

// Main App component without the hooks that need context
export default function App() {
  useEffect(() => {
    // Log that we're initializing the app to confirm Firebase is ready
    console.log(
      "App initialized with Firebase app:",
      app ? "Firebase app loaded" : "Firebase app missing"
    );

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(
        "Firebase Auth State Changed:",
        user ? user.email : "No user"
      );
      
      // If a user is found in Firebase but no token in storage, refresh it
      if (user) {
        try {
          const storedToken = await SecureStore.getItemAsync('auth_token');
          if (!storedToken) {
            console.log("User present but no token found, refreshing token...");
            const newToken = await user.getIdToken(true);
            await SecureStore.setItemAsync('auth_token', newToken);
          }
        } catch (error) {
          console.error("Token check/refresh error:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Provider store={store}>
          <ThemeProvider>
            <AuthProvider>
              <NotificationProvider>
                <ToastProvider position="bottom">
                  {/* Use the NavigationHandler here, inside NotificationProvider */}
                  <NavigationHandler>
                    <AppNavigator />
                  </NavigationHandler>
                </ToastProvider>
              </NotificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
