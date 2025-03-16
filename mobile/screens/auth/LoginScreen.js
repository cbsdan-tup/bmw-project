import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { buttonStyles } from '../../styles/components/buttonStyles';
import { globalStyles } from '../../styles/globalStyles';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GOOGLE_SIGNIN_CONFIG } from '../../config/google-auth-config';
import { useToast } from '../../context/ToastContext';
import 'expo-dev-client';

import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Initialize Google Sign-in
GoogleSignin.configure(GOOGLE_SIGNIN_CONFIG);

const LoginScreen = ({ navigation }) => {
  const { login, googleSignIn, isLoading } = useAuth();
  const { colors } = useTheme();
  const toast = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginInProgress, setLoginInProgress] = useState(false);
  
  const textInputStyle = {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
  };
  
  const handleGoogleSignIn = async () => {
    try {
      setLoginInProgress(true);
      console.log('Starting Google Sign-in process...');
      
      // Check if your device has Google Play Services installed
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('Google Play Services check passed');
      
      // Get the user ID token
      console.log('Requesting Google sign-in...');
      const signInResult = await GoogleSignin.signIn();
      console.log('Google sign-in successful, full result:', JSON.stringify(signInResult));
      
      // The idToken is nested inside the data property, not directly on the result
      const idToken = signInResult.data?.idToken;
      
      if (!idToken) {
        throw new Error('Failed to get ID token from Google Sign-in');
      }
      
      console.log('Successfully retrieved idToken');
      
      // Create a Firebase credential with the token
      console.log('Creating Firebase credential');
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      
      // Sign in with credential to Firebase
      console.log('Signing in to Firebase');
      const userCredential = await auth().signInWithCredential(googleCredential);
      const firebaseUser = userCredential.user;
      
      console.log('Firebase User UID:', firebaseUser.uid);
      console.log('Firebase User Email:', firebaseUser.email);
      console.log('Firebase User DisplayName:', firebaseUser.displayName);
      
      // Use our auth context's googleSignIn method to properly save the user data
      console.log('Calling auth context googleSignIn method');
      const result = await googleSignIn(idToken);
      console.log('Auth context googleSignIn completed:', result);
      
      if (result && result.success) {
        // Show success message with user's name
        const displayName = result.user?.firstName || firebaseUser.displayName || 'User';
        toast.success(`Welcome ${displayName}!`);
        
        // Navigate to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }]
        });
      } else {
        const errorMsg = result?.error || 'Authentication failed';
        console.error('Authentication failed in auth context:', errorMsg);
        toast.error(errorMsg);
      }
      
    } catch (error) {
      // Comprehensive error logging
      console.error('Google sign in error details:', error);
      console.error('Error type:', typeof error);
      console.error('Error toString:', String(error));
      console.error('Error constructor:', error && error.constructor ? error.constructor.name : 'unknown');
      
      for (const key in error) {
        try {
          console.error(`Error property [${key}]:`, error[key]);
        } catch (e) {
          console.error(`Error accessing property [${key}]`);
        }
      }
      
      // Safe error message extraction
      let errorMessage = 'Google sign in failed. Please try again.';
      
      if (error) {
        if (typeof error === 'object') {
          if (error.message) {
            errorMessage = `Google sign in error: ${error.message}`;
          }
          // Only check code if we know it exists
          if ('code' in error) {
            if (error.code === 'CANCELED') {
              errorMessage = 'Sign in was canceled';
            } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
              errorMessage = 'Google Play Services is not available';
            } else {
              errorMessage = `Google sign in error (${error.code})`;
            }
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoginInProgress(false);
    }
  };
  
  const handleLogin = async () => {
    if (!email || !password) {
      toast.warning('Please fill in all fields');
      return;
    }
    
    try {
      setLoginInProgress(true);
      const result = await login(email, password);
      const user = result?.user;
      if (result.success) {
        toast.success(`Welcome back ${user?.firstName}!`);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }]
        });
      } else {
        toast.error(result.error || 'Please check your credentials and try again');
      }
    } catch (error) {
      toast.error(error.message || 'Please check your credentials and try again');
    } finally {
      setLoginInProgress(false);
    }
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/bmw-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text }]}>BMW Rentals</Text>
        </View>
        
        <Text style={[globalStyles.subtitle, { color: colors.text, alignSelf: 'center', marginBottom: 24 }]}>
          Log in to your account
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.secondary }]}>Email</Text>
          <View style={[styles.inputWrapper, textInputStyle]}>
            <Icon name="email-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Enter your email"
              placeholderTextColor={colors.secondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          
          <Text style={[styles.label, { color: colors.secondary, marginTop: 16 }]}>Password</Text>
          <View style={[styles.inputWrapper, textInputStyle]}>
            <Icon name="lock-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Enter your password"
              placeholderTextColor={colors.secondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.secondary}
              />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={{ color: colors.primary }}>Forgot Password?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[buttonStyles.primary, { backgroundColor: colors.primary, marginTop: 24 }]}
            onPress={handleLogin}
            disabled={isLoading || loginInProgress}
          >
            {isLoading || loginInProgress ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Log In</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.orContainer}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.secondary }]}>OR</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>
          
          <TouchableOpacity
            style={[buttonStyles.secondary, { 
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }]}
            onPress={handleGoogleSignIn}
            disabled={isLoading || loginInProgress}
          >
            <View style={styles.googleButtonContent}>
              <Icon name="google" size={20} color="#DB4437" style={{ marginRight: 10 }} />
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                Continue with Google
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.registerContainer}>
            <Text style={{ color: colors.secondary }}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  inputContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    paddingVertical: 8,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  orText: {
    marginHorizontal: 10,
    fontWeight: '600',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  }
});

export default LoginScreen;
