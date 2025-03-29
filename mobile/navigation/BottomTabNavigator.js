import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Icon from "react-native-vector-icons/FontAwesome";
import { Platform, Text, View } from "react-native";
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotificationCount } from '../redux/slices/notificationSlice';
import { useAuth } from '../context/AuthContext';
import HomeScreen from "../screens/HomeScreen";
import CarDetailsScreen from "../screens/CarDetailsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SearchScreen from "../screens/SearchScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ReviewsScreen from "../screens/ReviewsScreen";
import ChatScreen from "../screens/ChatScreen";
import DiscountScreen from "../screens/DiscountScreen"; // Import the DiscountScreen
import { useTheme } from "../context/ThemeContext";
import ProfileNavigator from "./ProfileNavigator";
import AdminNavigator from "./AdminNavigator";
import AboutUsScreen from "../screens/AboutUsScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack Navigator
const HomeStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AboutUsScreen"
        component={AboutUsScreen}
        options={{ title: "About BMW" }}
      />
      <Stack.Screen
        name="CarDetails"
        component={CarDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AllCars"
        component={SearchScreen}
        options={{ title: "All Cars" }}
      />
      <Stack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={({ route }) => ({
          title: route.params?.carTitle
            ? `Reviews for ${route.params.carTitle}`
            : "Reviews",
        })}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params?.chatName || "Chat" })}
      />
      <Stack.Screen 
        name="AdminNavigator" 
        component={AdminNavigator}
        options={{ 
          presentation: 'modal',
          headerShown: true,
          title: 'Admin Dashboard'
        }}
      />
      {/* Add DiscountScreen to the HomeStack */}
      <Stack.Screen
        name="DiscountScreen"
        component={DiscountScreen}
        options={{ headerShown: false }} // Using custom header in the screen itself
      />
    </Stack.Navigator>
  );
};

// Search Stack Navigator - Add this new stack for the Search tab
const SearchStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="SearchScreen"
        component={SearchScreen}
        options={{ title: "Search Cars" }}
      />
      <Stack.Screen
        name="CarDetails"
        component={CarDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={({ route }) => ({
          title: route.params?.carTitle
            ? `Reviews for ${route.params.carTitle}`
            : "Reviews",
        })}
      />
      {/* Add ChatScreen to the SearchStack */}
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params?.chatName || "Chat" })}
      />
      {/* Add DiscountScreen to the SearchStack */}
      <Stack.Screen
        name="DiscountScreen"
        component={DiscountScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Add Notifications Stack Navigator
const NotificationsStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="NotificationsScreen"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params?.chatName || "Chat" })}
      />
      <Stack.Screen
        name="CarDetails"
        component={CarDetailsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Bottom Tab Navigator
const BottomTabNavigator = ({ userRole }) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { user, token } = useAuth();
  const { unreadCount } = useSelector(state => state.notifications);
  
  // Fetch notification count on mount and set up interval
  useEffect(() => {
    if (user && token) {
      // Initial fetch
      dispatch(fetchNotificationCount());
      
      // Set up interval to refresh count (every 30 seconds)
      const interval = setInterval(() => {
        dispatch(fetchNotificationCount());
      }, 2000);
      
      // Clean up interval on unmount
      return () => clearInterval(interval);
    }
  }, [dispatch, user, token, unreadCount]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text + '80',
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'ios' ? 10 : 5,
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 80 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: Platform.OS === 'ios' ? 0 : 5,
        },
        headerShown: false
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          )
        }}
      />
      
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Icon name="search" size={size} color={color} />
          )
        }}
      />
      
      {/* Notification tab with badge */}
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStack}
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Icon name="bell" size={size} color={color} />
              {user && unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  right: -6,
                  top: -3,
                  backgroundColor: colors.notification || '#FF3B30',
                  borderRadius: 10,
                  width: unreadCount > 99 ? 22 : (unreadCount > 9 ? 18 : 16),
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" size={size} color={color} />
          )
        }}
      />

      {userRole === 'admin' && (
        <Tab.Screen
          name="AdminTab"
          component={AdminNavigator}
          options={{
            title: 'Admin',
            tabBarIcon: ({ color, size }) => (
              <Icon name="cog" size={size} color={color} />
            ),
            // Add these options to override the default behavior
            listeners: ({navigation}) => ({
              tabPress: (e) => {
                // Prevent default behavior
                e.preventDefault();
                // Navigate to the Dashboard screen directly
                navigation.navigate('AdminTab', {
                  screen: 'Dashboard'
                });
              },
            }),
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
