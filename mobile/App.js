import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import AuthNavigator from './navigation/AuthNavigator';
import { globalStyles } from './styles/globalStyles';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

// Error boundary for navigation container
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Something went wrong with the navigation
        </Text>
        <Text style={{ marginBottom: 20, textAlign: 'center' }}>
          There was a problem loading the app navigation. Please restart the app.
        </Text>
        <TouchableOpacity 
          style={{ padding: 10, backgroundColor: '#0066cc', borderRadius: 4 }}
          onPress={() => setHasError(false)}
        >
          <Text style={{ color: 'white' }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={{ flex: 1 }} 
      onError={(error) => {
        console.log('Navigation error caught:', error);
        setHasError(true);
      }}
    >
      {children}
    </View>
  );
};

// Main App Content with Navigation
const AppNavigator = () => {
  const { colors, isDarkMode, isLoading: themeLoading } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Show loading while checking auth status or theme
  if (authLoading || themeLoading) {
    return (
      <View style={[globalStyles.container, { backgroundColor: isDarkMode ? '#121212' : '#ffffff' }]}>
        <ActivityIndicator size="large" color={isDarkMode ? '#3399ff' : '#0066cc'} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent"
        translucent={true}
      />
      <NavigationContainer
        theme={{
          dark: isDarkMode,
          colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.card,
            text: colors.text,
            border: colors.border,
            notification: colors.accent,
          },
        }}
      >
        {isAuthenticated ? <BottomTabNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </ErrorBoundary>
  );
};

// App Component
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
