import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Platform, Text, View } from 'react-native';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import RentalsScreen from '../screens/RentalsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// Custom badge component to avoid font issues
const CustomBadge = ({ color, count }) => (
  <View style={{
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: color,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  }}>
    <Text style={{
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    }}>
      {count}
    </Text>
  </View>
);

export default function BottomTabNavigator() {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500', // Use string instead of Font.weight.medium
          marginBottom: 4,
        },
        headerStyle: {
          backgroundColor: colors.headerBackground,
          elevation: 5,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: {
          fontWeight: '600', // Use string instead of Font.bold
          fontSize: 18,
          color: colors.headerText,
        },
        headerTitle: (props) => (
          <Text 
            style={{
              fontWeight: '600', 
              fontSize: 18,
              color: colors.headerText,
            }}
          >
            {props.children}
          </Text>
        ),
        tabBarHideOnKeyboard: true,
        safeAreaInsets: undefined,
        headerStatusBarHeight: 0,
        
        // Add custom tab bar label function to avoid font issues
        tabBarLabel: ({ focused, color }) => {
          // Use a custom function for the tab label to avoid font issues
          return null; // Return null to only show icons, or use a Text component with proper styling
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: '500' }}>Home</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="heart" color={color} size={size} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: '500' }}>Favorites</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Rentals"
        component={RentalsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="car" color={color} size={size} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: '500' }}>Rentals</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          // Use a custom badge implementation instead of the built-in one
          tabBarIcon: ({ color, size }) => (
            <View>
              <Icon name="bell" color={color} size={size} />
              <CustomBadge color={colors.accent} count={1} />
            </View>
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 10, fontWeight: '500' }}>Notifications</Text>
          ),
          // Remove tabBarBadge prop that's causing issues
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" color={color} size={size} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: '500' }}>Profile</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
