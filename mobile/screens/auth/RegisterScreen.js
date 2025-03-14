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
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GOOGLE_AUTH_CONFIG } from '../../config/google-auth-config';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { buttonStyles } from '../../styles/components/buttonStyles';
import { globalStyles } from '../../styles/globalStyles';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Configure WebBrowser for Google Sign-In
WebBrowser.maybeCompleteAuthSession();

const RegisterScreen = ({ navigation }) => {
  const { register, googleSignIn, isLoading } = useAuth();
  const { colors } = useTheme();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationInProgress, setRegistrationInProgress] = useState(false);
  
  // Define textInputStyle here before using it
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
      setRegistrationInProgress(true);
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
      setRegistrationInProgress(false);
    }
  };
  
  const handlePickAvatar = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'You need to allow access to your photos to upload an avatar.');
        return;
      }
      
      // Update to use the non-deprecated MediaType property
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType ? 
          ImagePicker.MediaType.Images : 
          ImagePicker.MediaTypeOptions.Images, // Fallback for backward compatibility
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        if (result.assets && result.assets.length > 0) {
          setAvatar(result.assets[0].uri);
          console.log("Image selected:", result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert('Error', 'Failed to pick an image. Please try again.');
    }
  };
  
  const handleRegister = async () => {
    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    
    try {
      setRegistrationInProgress(true);
      
      // Use the centralized register function from AuthContext
      const result = await register({
        firstName,
        lastName,
        email,
        password,
        avatar
      });
      
      if (result.success) {
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully. Please log in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Registration Failed', result.error);
      }
    } catch (error) {
      console.log("Registration error:", error);
      Alert.alert(
        'Registration Failed', 
        error.message || 'Please check your information and try again'
      );
    } finally {
      setRegistrationInProgress(false);
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
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
        </View>
        
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
              <Icon name="camera" size={30} color={colors.secondary} />
            </View>
          )}
          <View style={[styles.addIconContainer, { backgroundColor: colors.primary }]}>
            <Icon name="plus" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
        
        <Text style={[globalStyles.text, { color: colors.secondary, textAlign: 'center', marginBottom: 24 }]}>
          Please add a profile photo (optional)
        </Text>
        
        <View style={styles.inputContainer}>
          {/* First Name and Last Name in one row */}
          <View style={styles.nameRow}>
            {/* First Name */}
            <View style={styles.nameInputGroup}>
              <Text style={[styles.label, { color: colors.secondary }]}>First Name</Text>
              <View style={[styles.inputWrapper, textInputStyle]}>
                <Icon name="account-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="First name"
                  placeholderTextColor={colors.secondary}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
            </View>
            
            {/* Last Name */}
            <View style={[styles.nameInputGroup, { marginLeft: 10 }]}>
              <Text style={[styles.label, { color: colors.secondary }]}>Last Name</Text>
              <View style={[styles.inputWrapper, textInputStyle]}>
                <Icon name="account-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Last name"
                  placeholderTextColor={colors.secondary}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>
          </View>
          
          {/* Email */}
          <Text style={[styles.label, { color: colors.secondary, marginTop: 16 }]}>Email</Text>
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
          
          {/* Password */}
          <Text style={[styles.label, { color: colors.secondary, marginTop: 16 }]}>Password</Text>
          <View style={[styles.inputWrapper, textInputStyle]}>
            <Icon name="lock-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Create a password"
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
          
          <TouchableOpacity
            style={[buttonStyles.primary, { backgroundColor: colors.primary, marginTop: 24 }]}
            onPress={handleRegister}
            disabled={isLoading || registrationInProgress}
          >
            {isLoading || registrationInProgress ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Register</Text>
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
            disabled={isLoading || registrationInProgress}
          >
            <View style={styles.googleButtonContent}>
              <Icon name="google" size={20} color="#DB4437" style={{ marginRight: 10 }} />
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                Continue with Google
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.loginContainer}>
            <Text style={{ color: colors.secondary }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Login</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40, // To balance the header
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
  },
  // New styles for the name row layout
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameInputGroup: {
    flex: 1,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  }
});

export default RegisterScreen;
