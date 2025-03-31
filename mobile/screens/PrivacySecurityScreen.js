import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useToast } from '../context/ToastContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const PrivacySecurityScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, refreshUserData, token } = useAuth();
  const toast = useToast();
  const { registerForPushNotifications, unregisterPushNotifications } = useNotification(); 
  
  // State for toggle switches
  const [multiFactorEnabled, setMultiFactorEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMfaToggling, setIsMfaToggling] = useState(false);
  
  // Initialize state based on user settings when component mounts
  useEffect(() => {
    if (user) {
      // Explicitly check if the property exists at all and default to false if missing
      const hasMfaEnabled = user.hasOwnProperty('multiFactorEnabled') 
        ? user.multiFactorEnabled 
        : false;
      
      setMultiFactorEnabled(hasMfaEnabled);
      
      // Check enablePushNotifications field first, fall back to tokens check
      setNotificationsEnabled(
        user.hasOwnProperty('enablePushNotifications') 
          ? user.enablePushNotifications 
          : (user.pushTokens && user.pushTokens.length > 0)
      );
    }
  }, [user]);
  
  // Handle multifactor authentication toggle
  const handleMultiFactorToggle = async (value) => {
    try {
      setIsMfaToggling(true);
      
      if (value) {
        // When enabling MFA, navigate to setup screen instead of toggling directly
        navigation.navigate('MultifactorSetup');
        return;
      }
      
      // When disabling MFA, update directly with a check for field existence
      const response = await api.post('/users/update-mfa-settings', { 
        enabled: false,
        initializeIfMissing: true // Signal to backend to initialize field if missing
      });
      
      if (response.data.success) {
        setMultiFactorEnabled(false);
        toast.success('Multifactor authentication disabled');
        await refreshUserData();
      } else {
        toast.error('Failed to update multifactor settings');
      }
    } catch (error) {
      console.error('MFA toggle error:', error);
      toast.error('Failed to update security settings');
    } finally {
      setIsMfaToggling(false);
    }
  };
  
  // Handle push notifications toggle
  const handleNotificationsToggle = async (value) => {
    try {
      setIsLoading(true);
      
      if (value) {
        // Register for push notifications when toggling on
        await registerForPushNotifications();
        
        // Also update the preference in case registration fails but user still wants notifications enabled
        await api.post('/toggle-notifications', {
          userId: user.uid,
          enabled: true
        });
        
        toast.success('Push notifications enabled');
      } else {
        // Unregister push notifications when toggling off
        await unregisterPushNotifications();
        
        // Also update the preference
        await api.post('/toggle-notifications', {
          userId: user.uid,
          enabled: false
        });
        
        toast.info('Push notifications disabled');
      }
      
      setNotificationsEnabled(value);
      await refreshUserData(); // Refresh user data to get updated settings
    } catch (error) {
      toast.error('Failed to update notification settings');
      console.error('Notification toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Security Settings
          </Text>
          
          <View style={[styles.settingContainer, { backgroundColor: colors.card }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Icon name="lock" size={20} color={colors.primary} style={styles.settingIcon} />
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Multifactor Authentication
                </Text>
              </View>
              <Switch
                value={multiFactorEnabled}
                onValueChange={handleMultiFactorToggle}
                trackColor={{ false: '#767577', true: colors.primary + '80' }}
                thumbColor={multiFactorEnabled ? colors.primary : '#f4f3f4'}
                disabled={isMfaToggling}
              />
            </View>
            
            <View style={styles.infoBox}>
              <Text style={[styles.infoText, { color: colors.secondary }]}>
                When enabled, you'll receive a one-time verification code via email each time you log in.
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Notification Settings
          </Text>
          
          <View style={[styles.settingContainer, { backgroundColor: colors.card }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Icon name="bell" size={20} color={colors.primary} style={styles.settingIcon} />
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Enable Push Notifications
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: '#767577', true: colors.primary + '80' }}
                thumbColor={notificationsEnabled ? colors.primary : '#f4f3f4'}
              />
            </View>
            
            <View style={styles.infoBox}>
              <Text style={[styles.infoText, { color: colors.secondary }]}>
                Receive notifications about your bookings, messages, and other important updates.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionContainer: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  settingText: {
    fontSize: 16,
  },
  infoBox: {
    padding: 12,
  },
  infoText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default PrivacySecurityScreen;
