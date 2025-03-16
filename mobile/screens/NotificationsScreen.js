import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import { API_URL } from '../config/constants';

const NotificationsScreen = () => {
  const { colors } = useTheme();
  const { user, token } = useAuth();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Mock notifications for demo purposes
  // In a real app, you would fetch these from your backend
  const mockNotifications = [
    {
      _id: '1',
      title: 'Booking Confirmed',
      message: 'Your booking for BMW X5 has been confirmed.',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      type: 'booking',
      relatedId: 'booking123'
    },
    {
      _id: '2',
      title: 'Payment Received',
      message: 'Your payment of ₱5,980 has been received.',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      type: 'payment',
      relatedId: 'payment456'
    },
    {
      _id: '3',
      title: 'New Car Available',
      message: 'BMW 3 Series is now available in your area.',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      type: 'car',
      relatedId: 'car789'
    },
    {
      _id: '4',
      title: 'Rental Reminder',
      message: 'Your BMW X1 rental starts tomorrow. Pickup location: Manila Airport.',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      type: 'reminder',
      relatedId: 'booking321'
    }
  ];

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);

    // In a real app, you would use your actual API endpoint
    // For now, we'll use mock data
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app:
      // const response = await axios.get(`${API_URL}/notifications`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // setNotifications(response.data.notifications);
      
      // Using mock data for demo
      setNotifications(mockNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (notificationId) => {
    // In a real app, you would call your API to mark the notification as read
    // For now, we'll just update our local state
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => 
        notification._id === notificationId 
          ? { ...notification, isRead: true } 
          : notification
      )
    );
  };

  const handleNotificationPress = (notification) => {
    markAsRead(notification._id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'booking':
        navigation.navigate('BookingDetails', { bookingId: notification.relatedId });
        break;
      case 'car':
        navigation.navigate('CarDetails', { carId: notification.relatedId });
        break;
      case 'payment':
        navigation.navigate('PaymentDetails', { paymentId: notification.relatedId });
        break;
      default:
        // Just mark as read but don't navigate
        break;
    }
  };

  const renderNotificationItem = ({ item }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let iconName;
    switch (item.type) {
      case 'booking':
        iconName = 'calendar-check-o';
        break;
      case 'payment':
        iconName = 'credit-card';
        break;
      case 'car':
        iconName = 'car';
        break;
      case 'reminder':
        iconName = 'clock-o';
        break;
      default:
        iconName = 'bell';
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          { 
            backgroundColor: item.isRead ? colors.card : colors.primary + '10',
            borderLeftColor: item.isRead ? colors.border : colors.primary,
          }
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[
          styles.iconContainer,
          { backgroundColor: colors.primary + '20' }
        ]}>
          <Icon name={iconName} size={20} color={colors.primary} />
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={[
            styles.title,
            { 
              color: colors.text,
              fontWeight: item.isRead ? 'normal' : 'bold' 
            }
          ]}>
            {item.title}
          </Text>
          <Text style={[styles.message, { color: colors.secondary }]}>
            {item.message}
          </Text>
          <Text style={[styles.time, { color: colors.secondary }]}>
            {formattedDate}
          </Text>
        </View>
        
        {!item.isRead && (
          <View style={[styles.unreadIndicator, { backgroundColor: colors.primary }]} />
        )}
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Icon name="lock" size={50} color={colors.secondary} />
          <Text style={[styles.placeholderText, { color: colors.text }]}>
            Please log in to view your notifications
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[
        styles.header,
        { 
          backgroundColor: colors.headerBackground,
          borderBottomColor: colors.border
        }
      ]}>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>
          Notifications
        </Text>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            setNotifications(prevNotifications => 
              prevNotifications.map(notification => ({ ...notification, isRead: true }))
            );
          }}
        >
          <Text style={[styles.headerButtonText, { color: colors.primary }]}>
            Mark all as read
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Icon name="exclamation-triangle" size={50} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchNotifications}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.notificationList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <Icon name="bell-slash" size={50} color={colors.secondary} />
              <Text style={[styles.placeholderText, { color: colors.text }]}>
                No notifications yet
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerButtonText: {
    fontSize: 14,
  },
  notificationList: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loginButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});

export default NotificationsScreen;
