import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar, Platform } from 'react-native'; 
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import AuthNavigator from './navigation/AuthNavigator';
import { globalStyles } from './styles/globalStyles';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IntroScreen from './components/IntroScreen';
import { Provider } from 'react-redux';
import { store } from './redux/store';

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
  const { isAuthenticated, isLoading: authLoading, user } = useAuth(); // Add user here for debugging
  const [showIntro, setShowIntro] = useState(true);
  const [isIntroLoading, setIsIntroLoading] = useState(true);
  
  // Debugging the auth state
  useEffect(() => {
    console.log("Auth state changed:", { isAuthenticated, user });
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Check if intro has been viewed before
    const checkIntroStatus = async () => {
      try {
        const hasViewedIntro = await AsyncStorage.getItem('hasViewedIntro');
        if (hasViewedIntro === 'true') {
          setShowIntro(false);
        }
        setIsIntroLoading(false);
      } catch (error) {
        console.log('Error checking intro status:', error);
        setShowIntro(false);
        setIsIntroLoading(false);
      }
    };
    
    checkIntroStatus();
  }, []);
  
  const handleIntroComplete = async () => {
    try {
      await AsyncStorage.setItem('hasViewedIntro', 'true');
      setShowIntro(false);
    } catch (error) {
      console.log('Error saving intro status:', error);
      setShowIntro(false);
    }
  };

  // Show loading while checking auth status, theme or intro status
  if (authLoading || themeLoading || isIntroLoading) {
    return (
      <View style={[globalStyles.container, { backgroundColor: isDarkMode ? '#121212' : '#ffffff' }]}>
        <ActivityIndicator size="large" color={isDarkMode ? '#3399ff' : '#0066cc'} />
      </View>
    );
  }

  if (showIntro) {
    return <IntroScreen onComplete={handleIntroComplete} />;
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
          fonts: {
            regular: {
              fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
              fontWeight: '400',
            },
            medium: {
              fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
              fontWeight: '500',
            },
            light: {
              fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
              fontWeight: '300',
            },
            thin: {
              fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
              fontWeight: '100',
            },
          }
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
        <Provider store={store}>
          <ThemeProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
