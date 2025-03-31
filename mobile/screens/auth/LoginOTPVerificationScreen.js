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
import { useNotification } from '../../context/NotificationContext';

const LoginOTPVerificationScreen = () => {
  const { colors } = useTheme();
  const { completeMfaLogin } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const { registerForPushNotifications } = useNotification();
  
  const { email, user, credentials, isMfaLogin } = route.params || {};
  
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const otpInputs = useRef([]);
  
  useEffect(() => {
    if (otpInputs.current[0]) {
      otpInputs.current[0].focus();
    }
  }, []);
  
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);
  
  const handleOtpChange = (text, index) => {
    if (!/^\d*$/.test(text)) return;
    
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = text;
    setOtpDigits(newOtpDigits);
    
    if (errorMessage) setErrorMessage('');
    
    if (text.length === 1 && index < 4) {
      otpInputs.current[index + 1].focus();
    }
  };
  
  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otpDigits[index] === '') {
      otpInputs.current[index - 1].focus();
    }
  };
  
  const handleResendOTP = async () => {
    try {
      setIsVerifying(true);
      setErrorMessage('');
      setResendDisabled(true);
      setCountdown(60);
      
      const response = await api.post('/send-login-mfa-code', { email });
      
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
      const otp = otpDigits.join('');
      
      if (otp.length !== 5) {
        setErrorMessage('Please enter all 5 digits of the verification code');
        return;
      }
      
      setIsVerifying(true);
      setErrorMessage('');
      
      try {
        const response = await api.post('/verify-login-mfa', {
          email,
          otp
        });
        
        if (response.data.success) {
          if (isMfaLogin && credentials) {
            const loginResult = await completeMfaLogin(user, credentials);
            
            if (!loginResult.success) {
              toast.error('Failed to complete login. Please try again.');
              return;
            }
          }
          
          toast.success(`Welcome back ${user?.firstName || 'User'}!`);
          
          try {
            await registerForPushNotifications();
          } catch (notifError) {
            console.error("Error registering notifications after login:", notifError);
          }
          
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }]
          });
        } else {
          setErrorMessage(response.data.message || 'Invalid verification code');
          toast.error(response.data.message || 'Verification failed');
        }
      } catch (apiError) {
        console.log('API error details:', apiError.response?.data || apiError.message);
        
        let message = 'Invalid verification code. Please try again.';
        
        if (apiError.response?.data?.message) {
          message = apiError.response.data.message;
        }
        
        setErrorMessage(message);
        toast.error(message);
      }
    } catch (error) {
      console.error('Unexpected error in OTP verification:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
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
                name="shield-lock" 
                size={70} 
                color={colors.primary} 
                style={styles.icon}
              />
              
              <Text style={[styles.title, { color: colors.text }]}>Two-Factor Authentication</Text>
              
              <Text style={[styles.subtitle, { color: colors.secondary }]}>
                Please enter the verification code sent to {email} to complete your login.
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
                  <Text style={styles.verifyButtonText}>Verify & Login</Text>
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
                  <Icon name="arrow-left" size={16} /> Back to Login
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

export default LoginOTPVerificationScreen;
