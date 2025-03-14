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
  Alert,
  Image
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { buttonStyles } from '../../styles/components/buttonStyles';
import { globalStyles } from '../../styles/globalStyles';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GOOGLE_AUTH_CONFIG } from '../../config/google-auth-config';

// Configure WebBrowser for Google Sign-In
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }) => {
  const { login, googleSignIn, isLoading } = useAuth();
  const { colors } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginInProgress, setLoginInProgress] = useState(false);
  
  // Define textInputStyle here
  const textInputStyle = {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
  };
  
  // Define Google auth request hook using the centralized config
  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_AUTH_CONFIG);
  
  // Handle Google Sign-In response
  useEffect(() => {
    if (response?.type === 'success') {
      setLoginInProgress(true);
      const { id_token } = response.params;
      handleGoogleSignInComplete(id_token);
    }
  }, [response]);
  
  const handleGoogleSignInComplete = async (idToken) => {
    try {
      await googleSignIn(idToken);
    } catch (error) {
      console.log("Google sign in error:", error);
      Alert.alert('Google Sign In Failed', error.message || 'Please try again later');
    } finally {
      setLoginInProgress(false);
    }
  };
  
  const handleLogin = async () => {
    // Basic validation
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    try {
      setLoginInProgress(true);
      const result = await login(email, password);
      
      if (result.success) {
        console.log("Login successful, navigating to Home");
        // Ensure we navigate to the home screen after login
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }]
        });
      } else {
        Alert.alert(
          'Login Failed', 
          result.error || 'Please check your credentials and try again'
        );
      }
    } catch (error) {
      Alert.alert(
        'Login Failed', 
        error.message || 'Please check your credentials and try again'
      );
    } finally {
      setLoginInProgress(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    try {
      await promptAsync();
    } catch (error) {
      console.log("Google sign in prompt error:", error);
      Alert.alert('Google Sign In Failed', 'Could not start Google authentication');
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
