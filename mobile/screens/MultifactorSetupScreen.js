import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const MultifactorSetupScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, refreshUserData } = useAuth();
  const toast = useToast();
  
  const [step, setStep] = useState(1); // 1: Intro, 2: Verification, 3: Success
  const [isLoading, setIsLoading] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '']);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  
  // Create refs for each OTP input
  const otpInputs = useRef([]);
  
  // Request OTP when the screen loads and step is 2
  useEffect(() => {
    if (step === 2) {
      sendVerificationCode();
    }
  }, [step]);
  
  // Handle OTP input changes
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
  
  // Handle backspace key to navigate between OTP inputs
  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otpDigits[index] === '') {
      otpInputs.current[index - 1].focus();
    }
  };
  
  // Send verification code to user's email
  const sendVerificationCode = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      const response = await api.post('/users/send-mfa-setup-code', { email });
      
      if (response.data.success) {
        toast.success('Verification code sent to your email');
      } else {
        toast.error('Failed to send verification code');
        setErrorMessage(response.data.message || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      toast.error('Failed to send verification code');
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Verify the OTP and enable MFA
  const verifyAndEnableMFA = async () => {
    try {
      setIsLoading(true);
      
      // Combine OTP digits
      const otp = otpDigits.join('');
      
      if (otp.length !== 5) {
        setErrorMessage('Please enter the complete verification code');
        return;
      }
      
      const response = await api.post('/users/verify-mfa-setup', { otp, email });
      
      if (response.data.success) {
        // MFA successfully enabled
        await refreshUserData();
        setStep(3); // Move to success screen
      } else {
        setErrorMessage(response.data.message || 'Invalid verification code');
        toast.error('Verification failed');
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      setErrorMessage('Verification failed. Please try again.');
      toast.error('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Resend verification code
  const resendCode = async () => {
    // Reset OTP fields
    setOtpDigits(['', '', '', '', '']);
    setErrorMessage('');
    
    // Focus first input after a short delay
    setTimeout(() => {
      if (otpInputs.current[0]) {
        otpInputs.current[0].focus();
      }
    }, 100);
    
    // Resend code
    await sendVerificationCode();
  };
  
  // Render intro step
  const renderIntroStep = () => (
    <View style={styles.stepContainer}>
      <Icon name="shield" size={60} color={colors.primary} style={styles.icon} />
      <Text style={[styles.title, { color: colors.text }]}>
        Set Up Two-Factor Authentication
      </Text>
      <Text style={[styles.description, { color: colors.secondary }]}>
        Two-factor authentication adds an extra layer of security to your account. 
        You'll need to enter a verification code sent to your email whenever you sign in.
      </Text>
      <View style={styles.benefitsContainer}>
        <View style={styles.benefitItem}>
          <Icon name="lock" size={18} color={colors.primary} style={styles.benefitIcon} />
          <Text style={[styles.benefitText, { color: colors.text }]}>
            Protect your account from unauthorized access
          </Text>
        </View>
        <View style={styles.benefitItem}>
          <Icon name="key" size={18} color={colors.primary} style={styles.benefitIcon} />
          <Text style={[styles.benefitText, { color: colors.text }]}>
            Verify your identity with a unique code
          </Text>
        </View>
        <View style={styles.benefitItem}>
          <Icon name="envelope" size={18} color={colors.primary} style={styles.benefitIcon} />
          <Text style={[styles.benefitText, { color: colors.text }]}>
            Receive codes via email whenever you log in
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]} 
        onPress={() => setStep(2)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.cancelButton} 
        onPress={() => navigation.goBack()}
      >
        <Text style={{ color: colors.secondary }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Render verification step
  const renderVerificationStep = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.stepContainer}>
        <Icon name="envelope-o" size={60} color={colors.primary} style={styles.icon} />
        <Text style={[styles.title, { color: colors.text }]}>
          Verify Your Email
        </Text>
        <Text style={[styles.description, { color: colors.secondary }]}>
          We've sent a verification code to {email}.
          Enter the 5-digit code below to enable two-factor authentication.
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
          style={[styles.button, { backgroundColor: colors.primary }]} 
          onPress={verifyAndEnableMFA}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Verify & Enable</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.resendContainer}>
          <Text style={{ color: colors.secondary }}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={resendCode} disabled={isLoading}>
            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Resend</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => setStep(1)}
        >
          <Text style={{ color: colors.secondary }}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
  
  // Render success step
  const renderSuccessStep = () => (
    <View style={styles.stepContainer}>
      <Icon name="check-circle" size={80} color={colors.primary} style={styles.icon} />
      <Text style={[styles.title, { color: colors.text }]}>
        Two-Factor Authentication Enabled
      </Text>
      <Text style={[styles.description, { color: colors.secondary }]}>
        Your account is now protected with an additional layer of security.
        You'll receive a verification code via email whenever you sign in.
      </Text>
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {step === 1 && renderIntroStep()}
      {step === 2 && renderVerificationStep()}
      {step === 3 && renderSuccessStep()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitIcon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  benefitText: {
    fontSize: 16,
    flex: 1,
  },
  button: {
    width: '100%',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 16,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 16,
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
  resendContainer: {
    flexDirection: 'row',
    marginVertical: 16,
  }
});

export default MultifactorSetupScreen;
