import React, { useState } from 'react';
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
  Image,
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { buttonStyles } from '../../styles/components/buttonStyles';
import { globalStyles } from '../../styles/globalStyles';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useToast } from '../../context/ToastContext';
import { GOOGLE_SIGNIN_CONFIG } from '../../config/google-auth-config';
import { auth, app } from '../../config/firebase-config';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import api from '../../services/api';

GoogleSignin.configure(GOOGLE_SIGNIN_CONFIG);

const RegisterScreen = ({ navigation }) => {
  const { register, googleSignIn, isLoading } = useAuth();
  const { colors } = useTheme();
  const toast = useToast();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationInProgress, setRegistrationInProgress] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const textInputStyle = {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
  };
  
  const handlePickAvatar = () => {
    setIsModalVisible(true);
  };
  
  const handleChooseFromLibrary = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        toast.warning('You need to allow access to your photos to upload an avatar.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType ? 
          ImagePicker.MediaType.Images : 
          ImagePicker.MediaTypeOptions.Images, 
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
      toast.error('Failed to pick an image. Please try again.');
    } finally {
      setIsModalVisible(false);
    }
  };
  
  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        toast.warning('You need to allow camera access to take a photo.');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        if (result.assets && result.assets.length > 0) {
          setAvatar(result.assets[0].uri);
          console.log("Image captured:", result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      toast.error('Failed to take a photo. Please try again.');
    } finally {
      setIsModalVisible(false);
    }
  };
  
  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      toast.warning('Please fill in all required fields');
      return;
    }
    
    if (password.length < 6) {
      toast.warning('Password must be at least 6 characters long');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.warning('Please enter a valid email address');
      return;
    }
    
    try {
      setRegistrationInProgress(true);
      
      // Send OTP first
      const response = await api.post(`/generate-otp`, {
        email
      });
      
      if (response.data.success) {
        // Navigate to OTP verification with all registration data
        navigation.navigate('OTPVerification', {
          email,
          registrationData: {
            firstName,
            lastName,
            password,
            avatar
          }
        });
      } else {
        toast.error(response.data.message || 'Failed to send verification code');
      }
    } catch (error) {
      console.log("Registration error:", error);
      toast.error(error.response?.data?.message || 'Please check your information and try again');
    } finally {
      setRegistrationInProgress(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    try {
      setRegistrationInProgress(true);
      console.log('Starting Google Sign-in process...');
      
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('Google Play Services check passed');
      
      const signInResult = await GoogleSignin.signIn();
      console.log('Google sign-in successful, full result:', JSON.stringify(signInResult));
      
      const userEmail = signInResult.user?.email;
      
      if (!userEmail) {
        throw new Error('Failed to get email from Google Sign-in');
      }
      
      const response = await api.post(`/generate-otp`, {
        email: userEmail
      });
      
      if (response.data.success) {
        toast.success('Verification code sent to your email');
        
        navigation.navigate('OTPVerification', { 
          email: userEmail,
          googleSignInData: signInResult
        });
      } else {
        throw new Error(response.data.message || 'Failed to send verification code');
      }
    } catch (error) {
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
      
      let errorMessage = 'Google sign in failed. Please try again.';
      
      if (error) {
        if (typeof error === 'object') {
          if (error.message) {
            errorMessage = `Google sign in error: ${error.message}`;
          }
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
      setRegistrationInProgress(false);
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
          <View style={styles.nameRow}>
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
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Profile Photo</Text>
            
            <TouchableOpacity 
              style={[styles.modalOption, { borderBottomColor: colors.border }]} 
              onPress={handleTakePhoto}
            >
              <Icon name="camera" size={24} color={colors.primary} style={styles.modalOptionIcon} />
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={handleChooseFromLibrary}
            >
              <Icon name="image" size={24} color={colors.primary} style={styles.modalOptionIcon} />
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.background }]}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    width: 40,
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
    flex:1,
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
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  modalOptionIcon: {
    marginRight: 15,
  },
  modalOptionText: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
