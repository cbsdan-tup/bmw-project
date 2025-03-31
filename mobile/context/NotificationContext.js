import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, AppState, Alert } from 'react-native';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import * as Device from 'expo-device';

const NotificationContext = createContext();

// Configure how notifications are handled with more reliable settings
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📣 Notification received to handle:', notification);

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      presentationOptions: ['alert', 'sound', 'badge'], // iOS specific
    };
  },
});

export const NotificationProvider = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(null);
  const [permissions, setPermissions] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [notificationNavigation, setNotificationNavigation] = useState(null);

  const { user } = useAuth();

  // Check if notifications are enabled for the user
  const areNotificationsEnabled = () => {
    return user && user.enablePushNotifications !== false; // Default to true if not set
  };

  // Register push notifications whenever auth state changes
  useEffect(() => {
    if (user && !tokenSaved) {
      // Check if notifications are enabled for this user
      if (user.enablePushNotifications === false) {
        console.log('Push notifications are disabled for this user');
        return;
      }

      // If user is logged in and we haven't saved the token yet,
      // try to register notifications
      (async () => {
        try {
          const storedToken = await AsyncStorage.getItem('expoPushToken');
          
          // If we already have a token, save it to the backend
          if (storedToken) {
            await saveTokenToBackend(storedToken, user.uid);
            setTokenSaved(true);
          } else {
            // Otherwise try to get a new token
            await registerForPushNotifications();
          }
        } catch (error) {
          console.error("Error handling auth state change for notifications:", error);
        }
      })();
    } else if (!user) {
      // Reset state when user logs out
      setTokenSaved(false);
    }
  }, [user]);
  
  // Helper to save token to backend
  const saveTokenToBackend = async (token, userId) => {
    try {
      // Ensure we have the required data
      if (!token || !userId) {
        console.error('Missing token or userId for push notification registration');
        return false;
      }

      // Don't save token if notifications are disabled
      if (user && user.enablePushNotifications === false) {
        console.log('Push notifications are disabled for this user');
        return false;
      }

      console.log(`Attempting to save push token for user ${userId}`);
      
      const response = await api.post('/register-token', {
        userId,
        token
      });
      
      if (response.data.success) {
        console.log('Push token saved to user profile');
        return true;
      }
      console.log('Failed to save token, server response:', response.data);
      return false;
    } catch (error) {
      console.error('Error saving token to backend:', error);
      
      // More detailed logging
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received');
      }
      
      return false;
    }
  };
  
  // Set up notification categories for better handling
  useEffect(() => {
    // Set up notification categories (especially important for iOS)
    Notifications.setNotificationCategoryAsync('rentalUpdate', [
      {
        identifier: 'view',
        buttonTitle: 'View',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
          opensAppToForeground: true,
        },
      },
    ]);
    
    // This is particularly important for Android
    if (Platform.OS === 'android') {
      // Create multiple channels with different importance levels
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,  // Show full notification on lock screen
        bypassDnd: true, // Important - bypass Do Not Disturb
      });
      
      // High importance channel for rental updates
      Notifications.setNotificationChannelAsync('rental-updates', {
        name: 'Rental Updates',
        description: 'Critical notifications about your rental status changes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        lightColor: '#0000FF',
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });
    }
  }, []);
  
  // Enhanced registration process
  const registerForPushNotifications = async () => {
    try {
      // Must check if device is a physical device
      if (!Device.isDevice) {
        Alert.alert(
          'Notifications not available', 
          'Notifications require a physical device and will not work on the simulator.'
        );
        return;
      }

      // Request permissions with all options enabled
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        console.log('Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: true,
            allowCriticalAlerts: true,
          },
        });
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission required', 
          'Push notifications need appropriate permissions to work properly',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Settings', 
              onPress: () => {
                // On iOS this would open notification settings
                // On Android we'd need a package like 'react-native-open-settings'
              } 
            }
          ]
        );
        setPermissions(false);
        return;
      }
      
      setPermissions(true);
      
      // Get the token
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        
        console.log('Push token obtained:', token.data);
        setExpoPushToken(token.data);
        
        // Save token to AsyncStorage
        await AsyncStorage.setItem('expoPushToken', token.data);
        
        // Save to backend if user is authenticated
        if (user) {
          const saved = await saveTokenToBackend(token.data, user.uid);
          if (saved) {
            setTokenSaved(true);
          }
        }
        
        return token.data;
      } catch (tokenError) {
        console.error('Error getting token:', tokenError);
        throw tokenError;
      }
    } catch (error) {
      console.error('Error in registerForPushNotifications:', error);
      return null;
    }
  };
  
  // Add the unregister function
  const unregisterPushNotifications = async () => {
    try {
      const token = expoPushToken;
      
      // No token to unregister
      if (!token) {
        console.log('No push token to unregister');
        return true;
      }
      
      // Remove token from AsyncStorage
      await AsyncStorage.removeItem('expoPushToken');
      
      // Only try to remove from backend if user is logged in
      if (user && user.uid) {
        try {
          const response = await api.post('/unregister-token', {
            userId: user.uid,
            token
          });
          
          if (response.data.success) {
            console.log('Push token unregistered from backend');
          } else {
            console.warn('Failed to unregister token from backend:', response.data);
          }
        } catch (error) {
          console.error('Error unregistering token from backend:', error);
          // We still want to continue with client-side unregistration even if backend fails
        }
      }
      
      // Reset state
      setExpoPushToken('');
      setTokenSaved(false);
      
      return true;
    } catch (error) {
      console.error('Error in unregisterPushNotifications:', error);
      return false;
    }
  };
  
  // Enhanced notification listeners
  useEffect(() => {
    console.log('Setting up notification listeners');
    
    const foregroundListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('🔔 FOREGROUND NOTIFICATION RECEIVED!', notification);
        
        // Explicitly display the notification when in foreground
        if (Platform.OS === 'android') {
          // On Android, re-fire notification as local notification to ensure visibility
          const { title, body, data } = notification.request.content;
          
          Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data,
              sound: 'default',
              priority: 'max',
              vibrate: [0, 250, 250, 250],
              categoryIdentifier: data?.type || 'default',
            },
            trigger: null, 
          });
        }
        
        setNotification(notification);
      }
    );
    
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('🔔 Notification tapped by user:', response);
        const data = response.notification.request.content.data;
        console.log('Notification data:', data);
        
        if (data?.type === 'rentalUpdate') {
          console.log('Handling rental update notification click');
          
          if (data.navigation) {
            console.log('Setting navigation from rental update notification:', data.navigation);
            setNotificationNavigation(data.navigation);
          } else {
            setNotificationNavigation({
              screen: 'ProfileTab',
              params: {
                screen: 'BookingDetails',
                params: {
                  booking: {
                    _id: data.rentalId
                  }
                }
              }
            });
          }
        } else if (data?.type === 'newDiscount') {
          console.log('Handling discount notification click', data);
          // Store navigation data to be handled by navigation container
          setNotificationNavigation({
            screen: 'DiscountScreen',
            params: { 
              discountCode: data.code,
              discountId: data.discountId
            }
          });
        } else if (data?.type === 'message') {
          // Handle message notifications using the navigation data from notification
          console.log('Handling message notification click', data);
          
          if (data.navigation) {
            console.log('Setting navigation from message notification:', data.navigation);
            setNotificationNavigation(data.navigation);
          } else {
            // Fallback if navigation data is not provided
            console.log('Fallback: Creating navigation data from message fields');
            setNotificationNavigation({
              screen: 'ChatScreen',
              params: {
                recipientId: data.senderId,
                carId: data.carId,
                chatName: data.senderName || 'Chat'
              }
            });
          }
        }
      }
    );
    
    // Track app state to detect when the app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('App came to foreground, checking for notifications');
        // Optionally refresh token or check pending notifications
      }
    });
    
    // Check for existing token in AsyncStorage
    const getStoredToken = async () => {
      const storedToken = await AsyncStorage.getItem('expoPushToken');
      if (storedToken) {
        setExpoPushToken(storedToken);
      } else {
        registerForPushNotifications();
      }
    };
    
    getStoredToken();
    
    return () => {
      Notifications.removeNotificationSubscription(foregroundListener);
      Notifications.removeNotificationSubscription(responseListener);
      subscription.remove();
    };
  }, []);
  
  // Test function that uses a more reliable notification format
  const sendTestNotification = async () => {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'If you can see this, notifications are working!',
        data: { type: 'test' },
        sound: 'default',
        badge: 1,
        priority: 'high',
        // For Android
        android: {
          channelId: 'default',
          color: '#FF0000',
          priority: 'max',
          sticky: false,
          vibrate: [0, 250, 250, 250],
        },
      },
      trigger: { seconds: 1 },
    });
    
    console.log(`Test notification scheduled: ${identifier}`);
    return identifier;
  };
  
  // Enhanced verification function
  const verifyNotifications = async () => {
    try {
      // First check if this is a physical device
      if (!Device.isDevice) {
        Alert.alert(
          'Cannot test on simulator', 
          'Push notifications require a physical device to work properly'
        );
        return false;
      }
      
      // Check permissions status
      const { status } = await Notifications.getPermissionsAsync();
      console.log(`Current permission status: ${status}`);
      
      if (status !== 'granted') {
        // Request permissions
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'You need to grant notification permissions for this feature to work'
          );
          return false;
        }
      }
      
      // Test if we can schedule a local notification
      const notificationId = await sendTestNotification();
      return !!notificationId;
    } catch (error) {
      console.error('Error verifying notifications:', error);
      return false;
    }
  };
  
  // Add a diagnostic function to be called from settings
  const runNotificationDiagnostics = async () => {
    try {
      const results = {
        device: {
          isDevice: Device.isDevice,
          brand: Device.brand,
          manufacturer: Device.manufacturer,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
        },
        permissions: await Notifications.getPermissionsAsync(),
        token: expoPushToken,
        settings: await Notifications.getDevicePushTokenAsync().catch(() => 'unavailable'),
      };
      
      console.log('📱 Notification Diagnostics:', results);
      return results;
    } catch (error) {
      console.error('Error running diagnostics:', error);
      return { error: error.message };
    }
  };
  
  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        permissions,
        registerForPushNotifications,
        sendTestNotification,
        verifyNotifications,
        runNotificationDiagnostics,
        tokenSaved,
        notificationNavigation,
        clearNotificationNavigation: () => setNotificationNavigation(null),
        unregisterPushNotifications, // Add this line to expose the function
        areNotificationsEnabled,
      }}
    > 
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
