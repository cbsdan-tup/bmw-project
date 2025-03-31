import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const OTPVerificationScreen = () => {
  const { colors } = useTheme();
  const { register, googleSignIn } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  
  const { email, registrationData, googleSignInData } = route.params || {};
  
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Create refs for each OTP input
  const otpInputs = useRef([]);
  
  useEffect(() => {
    // Focus the first input on mount
    if (otpInputs.current[0]) {
      otpInputs.current[0].focus();
    }
  }, []);
  
  useEffect(() => {
    // Handle countdown for OTP resend
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);
  
  const handleOtpChange = (text, index) => {
    // Ensure text is numeric
    if (!/^\d*$/.test(text)) return;
    
    // Update the digit at the specified index
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = text;
    setOtpDigits(newOtpDigits);
    
    // Clear any previous error
    if (errorMessage) setErrorMessage('');
    
    // Auto-focus next input if a digit was entered
    if (text.length === 1 && index < 4) {
      otpInputs.current[index + 1].focus();
    }
  };
  
  const handleOtpKeyPress = (e, index) => {
    // Handle backspace to move to previous input
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otpDigits[index] === '') {
      otpInputs.current[index - 1].focus();
    }
  };
  
  const handleResendOTP = async () => {
    try {
      setIsVerifying(true);
      setErrorMessage('');
      setResendDisabled(true);
      setCountdown(60); // Disable resend for 60 seconds
      
      // Make API call to resend OTP
      const response = await api.post('/generate-otp', { email });
      
      if (response.data.success) {
        toast.success('A new verification code has been sent to your email');
      } else {
        toast.error(response.data.message || 'Failed to resend code');
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      toast.error('Failed to resend verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleVerifyOTP = async () => {
    try {
      // Combine the OTP digits into a single string
      const otp = otpDigits.join('');
      
      if (otp.length !== 5) {
        setErrorMessage('Please enter all 5 digits of the verification code');
        return;
      }
      
      setIsVerifying(true);
      setErrorMessage('');
      
      try {
        // Make API call to verify OTP
        const response = await api.post('/verify-otp', {
          email,
          otp
        });
        
        if (response.data.success) {
          // OTP verified successfully, proceed with registration or google sign-in
          if (registrationData) {
            handleCompleteRegistration();
          } else if (googleSignInData) {
            handleCompleteGoogleSignIn();
          }
        }
      } catch (apiError) {
        // Handle API error with a user-friendly message
        console.log('API error details:', apiError.response?.data || apiError.message);
        
        // Extract meaningful error message
        let message = 'Invalid verification code. Please try again.';
        
        if (apiError.response?.data?.message) {
          message = apiError.response.data.message;
        }
        
        setErrorMessage(message);
        toast.error(message);
      }
    } catch (error) {
      // Handle unexpected errors
      console.error('Unexpected error in OTP verification:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleCompleteRegistration = async () => {
    try {
      const { firstName, lastName, password, avatar } = registrationData;
      
      // If there's an avatar, prepare form data for file upload
      let formData = null;
      
      if (avatar) {
        formData = new FormData();
        formData.append('firstName', firstName);
        formData.append('lastName', lastName);
        formData.append('email', email);
        formData.append('password', password);
        
        // Get file name and type from URI
        const uriParts = avatar.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append('avatar', {
          uri: avatar,
          name: `avatar.${fileType}`,
          type: `image/${fileType}`
        });
      }
      
      // Complete registration with or without avatar
      const result = await register({
        firstName,
        lastName,
        email,
        password,
        formData
      });
      
      if (result.success) {
        toast.success('Registration successful!');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }]
        });
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to complete registration');
    }
  };
  
  const handleCompleteGoogleSignIn = async () => {
    try {
      const result = await googleSignIn(googleSignInData.idToken);
      
      if (result.success) {
        toast.success(`Welcome ${result.user?.firstName || 'User'}!`);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }]
        });
      } else {
        toast.error(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error('Failed to complete Google sign in');
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.inner}>
              <Icon 
                name="shield-check" 
                size={70} 
                color={colors.primary} 
                style={styles.icon}
              />
              
              <Text style={[styles.title, { color: colors.text }]}>Verification Code</Text>
              
              <Text style={[styles.subtitle, { color: colors.secondary }]}>
                We've sent a verification code to {email}. Please enter it below.
              </Text>
              
              <View style={styles.otpContainer}>
                {otpDigits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => otpInputs.current[index] = ref}
                    style={[
                      styles.otpInput,
                      { 
                        backgroundColor: colors.surface,
                        color: colors.text,
                        borderColor: errorMessage ? colors.error : colors.border
                      }
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>
              
              {errorMessage ? (
                <Text style={[styles.errorMessage, { color: colors.error }]}>
                  {errorMessage}
                </Text>
              ) : null}
              
              <TouchableOpacity 
                style={[
                  styles.verifyButton, 
                  { backgroundColor: colors.primary },
                  isVerifying && { opacity: 0.7 }
                ]}
                onPress={handleVerifyOTP}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify Code</Text>
                )}
              </TouchableOpacity>
              
              <View style={styles.resendContainer}>
                <Text style={{ color: colors.secondary }}>Didn't receive the code? </Text>
                {resendDisabled ? (
                  <Text style={{ color: colors.primary }}>
                    Resend in {countdown}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOTP} disabled={isVerifying}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Resend</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={{ color: colors.primary }}>
                  <Icon name="arrow-left" size={16} /> Back
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 32,
  },
  otpInput: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorMessage: {
    marginBottom: 16,
    textAlign: 'center',
  },
  verifyButton: {
    width: '80%',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  backButton: {
    marginTop: 12,
  },
});

export default OTPVerificationScreen;
