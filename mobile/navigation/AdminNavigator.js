import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../context/ThemeContext';

import AdminScreen from '../screens/admin/AdminScreen';

import PlaceholderScreen from '../screens/admin/PlaceholderScreen';

const Drawer = createDrawerNavigator();

const AdminNavigator = () => {
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.headerText,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.text,
        drawerStyle: {
          backgroundColor: colors.background,
          width: 280,
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.toggleDrawer()}
            style={{ marginLeft: 16 }}
          >
            <Icon name="bars" size={22} color={colors.headerText} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs')}
            style={{ marginRight: 16 }}
          >
            <Icon name="home" size={22} color={colors.headerText} />
          </TouchableOpacity>
        ),
      })}
    >
      <Drawer.Screen 
        name="AdminDashboard" 
        component={AdminScreen}
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <Icon name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="UserManagement" 
        component={PlaceholderScreen}
        options={{
          title: 'User Management',
          drawerIcon: ({ color, size }) => (
            <Icon name="users" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="CarsManagement" 
        component={PlaceholderScreen}
        options={{
          title: 'Cars Management',
          drawerIcon: ({ color, size }) => (
            <Icon name="car" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="RentalManagement" 
        component={PlaceholderScreen}
        options={{
          title: 'Rental Management',
          drawerIcon: ({ color, size }) => (
            <Icon name="calendar-check-o" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="ReviewsManagement" 
        component={PlaceholderScreen}
        options={{
          title: 'Reviews Management',
          drawerIcon: ({ color, size }) => (
            <Icon name="star" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="DiscountsManagement" 
        component={PlaceholderScreen}
        options={{
          title: 'Discounts Management',
          drawerIcon: ({ color, size }) => (
            <Icon name="percent" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

export default AdminNavigator;
