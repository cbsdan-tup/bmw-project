import React, { useState } from 'react';
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
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import api from '../services/api';
const ForgotPasswordScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const validate = () => {
    if (!email) {
      setError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return false;
    }
    setError('');
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      await api.post(`/auth/forgot-password`, { email });
      setSuccess(true);
      
      Alert.alert(
        "Reset Link Sent",
        "If an account exists with this email, you will receive password reset instructions.",
        [{ text: "OK", onPress: () => navigation.navigate('Login') }]
      );
      
    } catch (err) {
      // For security reasons, don't show specific errors about whether email exists
      setSuccess(true);
      
      Alert.alert(
        "Reset Link Sent",
        "If an account exists with this email, you will receive password reset instructions.",
        [{ text: "OK", onPress: () => navigation.navigate('Login') }]
      );
      
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            <Icon 
              name="lock" 
              size={70} 
              color={colors.primary} 
              style={styles.icon}
            />
            
            <Text style={[styles.title, { color: colors.text }]}>Forgot Password</Text>
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
            
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.inputText,
                    borderColor: error ? colors.error : colors.inputBorder
                  }
                ]}
                placeholder="Enter your email"
                placeholderTextColor={colors.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!success}
              />
              {error ? (
                <Text style={[styles.errorMessage, { color: colors.error }]}>{error}</Text>
              ) : null}
              
              <TouchableOpacity 
                style={[
                  styles.submitButton, 
                  { backgroundColor: colors.primary },
                  (isLoading || success) && { opacity: 0.7 }
                ]}
                onPress={handleSubmit}
                disabled={isLoading || success}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.backToLogin}
                onPress={() => navigation.navigate('Login')}
              >
                <Icon name="arrow-left" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.primary }}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    marginBottom: 16,
  },
  submitButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backToLogin: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
});

export default ForgotPasswordScreen;
