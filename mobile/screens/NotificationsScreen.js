import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Platform,
  StatusBar,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import api from '../services/api';
import { useDispatch } from 'react-redux';
import { decrementNotificationCount, clearNotificationCount } from '../redux/slices/notificationSlice';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;

const NotificationsScreen = () => {
  const { colors } = useTheme();
  const { user, token } = useAuth();
  const navigation = useNavigation();
  const dispatch = useDispatch(); // Add dispatch
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Animation for marking as read
  const animateItem = (callback) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(callback);
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token, activeFilter]);

  const fetchNotifications = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/notifications?filter=${activeFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount || 0);
      } else {
        throw new Error(response.data.message || 'Failed to fetch notifications');
      }
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
    try {
      await api.put(`/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state with animation
      animateItem(() => {
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification._id === notificationId 
              ? { ...notification, isRead: true } 
              : notification
          )
        );
        
        // Update unread count - both local and Redux state
        setUnreadCount(prev => Math.max(0, prev - 1));
        dispatch(decrementNotificationCount());
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put(`/notifications/mark-all-read?filter=${activeFilter}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state with animation
      Animated.timing(translateY, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true
      }).start(() => {
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => ({ ...notification, isRead: true }))
        );
        
        // Reset unread count - both local and Redux state
        setUnreadCount(0);
        dispatch(clearNotificationCount());
        
        // Reset animation
        translateY.setValue(0);
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationPress = (notification) => {
    markAsRead(notification._id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'my_car_inquiries':
      case 'my_inquiries':
        navigation.navigate('ChatScreen', {
          recipientId: notification.sender?._id,
          carId: notification.carId?._id,
          chatName: notification.carId ? `${notification.carId.brand} ${notification.carId.model}` : 'Chat'
        });
        break;
      case 'booking':
        navigation.navigate('HomeTab', { 
          screen: 'BookingDetails', 
          params: { bookingId: notification.relatedId }
        });
        break;
      case 'car':
        navigation.navigate('HomeTab', {
          screen: 'CarDetails',
          params: { carId: notification.relatedId }
        });
        break;
      case 'payment':
        navigation.navigate('HomeTab', {
          screen: 'PaymentDetails',
          params: { paymentId: notification.relatedId }
        });
        break;
      default:
        // Just mark as read but don't navigate
        break;
    }
  };

  // Improved Filter tabs component
  const FilterTabs = () => (
    <View style={styles.filterTabsContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilter === 'all' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              activeFilter === 'all' && { color: '#fff' }
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilter === 'my_car_inquiries' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveFilter('my_car_inquiries')}
        >
          <Icon 
            name="comment-o" 
            size={14} 
            color={activeFilter === 'my_car_inquiries' ? '#fff' : colors.text} 
            style={styles.filterIcon}
          />
          <Text
            style={[
              styles.filterText,
              activeFilter === 'my_car_inquiries' && { color: '#fff' }
            ]}
          >
            My Car Inquiries
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilter === 'my_inquiries' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveFilter('my_inquiries')}
        >
          <Icon 
            name="question-circle-o" 
            size={14} 
            color={activeFilter === 'my_inquiries' ? '#fff' : colors.text} 
            style={styles.filterIcon}
          />
          <Text
            style={[
              styles.filterText,
              activeFilter === 'my_inquiries' && { color: '#fff' }
            ]}
          >
            My Inquiries
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderNotificationItem = ({ item, index }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let iconName;
    let iconBgColor = item.isRead ? colors.primary + '15' : colors.primary + '25';
    let iconColor = colors.primary;
    
    switch (item.type) {
      case 'my_car_inquiries':
        iconName = 'comment';
        break;
      case 'my_inquiries':
        iconName = 'question-circle';
        break;
      case 'booking':
        iconName = 'calendar-check-o';
        break;
      case 'payment':
        iconName = 'credit-card';
        break;
      case 'car':
        iconName = 'car';
        break;
      default:
        iconName = 'bell';
    }
    
    // Format sender name
    let senderName = '';
    if (item.sender) {
      if (typeof item.sender === 'object') {
        senderName = `${item.sender.firstName} ${item.sender.lastName}`;
      } else {
        senderName = item.sender;
      }
    }
    
    // Format car name
    let carName = '';
    if (item.carId) {
      if (typeof item.carId === 'object') {
        carName = `${item.carId.brand} ${item.carId.model}`;
      } else {
        carName = item.carId;
      }
    }
    
    // Animate opacity for the item
    return (
      <Animated.View 
        style={{ 
          opacity: fadeAnim,
          transform: [{ translateY: translateY }] 
        }}
      >
        <TouchableOpacity
          style={[
            styles.notificationItem,
            { 
              backgroundColor: item.isRead ? colors.card : colors.card,
              borderLeftColor: item.isRead ? colors.border : colors.primary,
              // Add a subtle shadow effect
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: item.isRead ? 0.1 : 0.2,
              shadowRadius: 2,
              elevation: item.isRead ? 1 : 3,
            }
          ]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.iconContainer,
            { backgroundColor: iconBgColor }
          ]}>
            <Icon name={iconName} size={20} color={iconColor} />
          </View>
          
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <Text style={[
                styles.title,
                { 
                  color: colors.text,
                  fontWeight: item.isRead ? '600' : '700',
                  fontSize: item.isRead ? 15 : 16
                }
              ]}>
                {item.title}
              </Text>
              <Text style={[styles.time, { color: colors.secondary }]}>
                {formattedDate}
              </Text>
            </View>
            
            <Text style={[
              styles.message, 
              { 
                color: item.isRead ? colors.secondary : colors.text,
                fontWeight: item.isRead ? 'normal' : '500'
              }
            ]}>
              {item.message}
            </Text>
            
            {(item.type === 'my_car_inquiries' || item.type === 'my_inquiries') && (
              <View style={styles.metadataContainer}>
                {senderName ? (
                  <View style={styles.metadataItem}>
                    <Icon 
                      name="user" 
                      size={12} 
                      color={colors.primary} 
                      style={styles.metadataIcon}
                    />
                    <Text style={[styles.senderInfo, { color: colors.primary }]}>
                      {item.type === 'my_car_inquiries' ? 'From: ' : 'To: '}{senderName}
                    </Text>
                  </View>
                ) : null}
                
                {carName ? (
                  <View style={styles.metadataItem}>
                    <Icon 
                      name="car" 
                      size={12} 
                      color={colors.primary} 
                      style={styles.metadataIcon}
                    />
                    <Text style={[styles.senderInfo, { color: colors.primary }]}>
                      {carName}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
          
          {!item.isRead && (
            <View style={[styles.unreadIndicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
          <Text style={[styles.headerTitle, { color: colors.headerText }]}>Notifications</Text>
        </View>
        
        <View style={styles.centerContent}>
          <View style={styles.emptyStateIconContainer}>
            <Icon name="lock" size={50} color={colors.primary + '50'} />
            <View style={[styles.emptyStateIconBg, { backgroundColor: colors.primary + '15' }]} />
          </View>
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
      <View style={[styles.header, { 
        backgroundColor: colors.headerBackground,
        paddingTop: Platform.OS === 'ios' ? 16 : 16 + (StatusBar.currentHeight || 0)
      }]}>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>
          Notifications
          {unreadCount > 0 && (
            <View style={styles.countBadgeContainer}>
              <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.countBadgeText}>{unreadCount}</Text>
              </View>
            </View>
          )}
        </Text>
        <TouchableOpacity
          style={[
            styles.headerButton,
            unreadCount === 0 && styles.headerButtonDisabled
          ]}
          onPress={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <Text style={[
            styles.headerButtonText, 
            { color: unreadCount > 0 ? colors.primary : colors.secondary }
          ]}>
            Mark all as read
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Filter Tabs */}
      <FilterTabs />

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondary }]}>
            Loading notifications...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <View style={styles.errorContainer}>
            <Icon name="exclamation-triangle" size={40} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={fetchNotifications}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
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
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <View style={styles.emptyStateIconContainer}>
                <Icon name="bell-slash" size={50} color={colors.secondary + '70'} />
                <View style={[styles.emptyStateIconBg, { backgroundColor: colors.secondary + '15' }]} />
              </View>
              <Text style={[styles.placeholderText, { color: colors.text }]}>
                {activeFilter === 'all' 
                  ? 'No notifications yet' 
                  : activeFilter === 'my_car_inquiries' 
                    ? 'No inquiries about your cars' 
                    : 'You have not made any inquiries'}
              </Text>
              <Text style={[styles.placeholderSubText, { color: colors.secondary }]}>
                {activeFilter === 'all'
                  ? 'When you receive notifications, they will appear here'
                  : 'Check back later for updates'}
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    position: 'relative',
  },
  countBadgeContainer: {
    marginLeft: 10,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterTabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#f8f8f8',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notificationList: {
    padding: 16,
    paddingBottom: 30,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contentContainer: {
    flex: 1,
    paddingRight: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  message: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  metadataContainer: {
    marginTop: 6,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metadataIcon: {
    marginRight: 6,
  },
  senderInfo: {
    fontSize: 12,
    fontWeight: '500',
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
    padding: 30,
  },
  emptyStateIconContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateIconBg: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    zIndex: -1,
  },
  placeholderText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  placeholderSubText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: '#ffefef',
    padding: 20,
    borderRadius: 12,
    maxWidth: '80%',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default NotificationsScreen;
