import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, SafeAreaView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../context/ThemeContext';
import { CommonActions, useNavigation } from '@react-navigation/native';

import AdminScreen from '../screens/admin/AdminScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import CarsManagementScreen from '../screens/admin/CarsManagementScreen';
import EditCarScreen from '../screens/admin/EditCarScreen';
import CreateCarScreen from '../screens/admin/CreateCarScreen';
import CarRentalsScreen from '../screens/admin/CarRentalsScreen';
import RentalManagementScreen from '../screens/admin/RentalManagementScreen';
import ReviewsManagementScreen from '../screens/admin/ReviewsManagementScreen';
import DiscountsManagementScreen from '../screens/admin/DiscountsManagementScreen';
import CreateDiscountScreen from '../screens/admin/CreateDiscountScreen';
import EditDiscountScreen from '../screens/admin/EditDiscountScreen';

const Stack = createStackNavigator();

// Custom Admin Menu Header Button
const AdminMenuButton = ({ onPress }) => {
  const { colors } = useTheme();
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={styles.menuButton}
    >
      <Icon name="bars" size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

// Admin Menu Modal Component
const AdminMenu = ({ visible, onClose, navigation, colors }) => {
  const menuItems = [
    { id: 'dashboard', title: 'Dashboard', icon: 'dashboard', screen: 'AdminDashboard' },
    { id: 'users', title: 'User Management', icon: 'users', screen: 'UserManagement' },
    { id: 'cars', title: 'Cars Management', icon: 'car', screen: 'CarsManagement' },
    { id: 'rentals', title: 'Rental Management', icon: 'calendar-check-o', screen: 'RentalManagement' },
    { id: 'reviews', title: 'Reviews Management', icon: 'star', screen: 'ReviewsManagement' },
    { id: 'discounts', title: 'Discounts Management', icon: 'percent', screen: 'DiscountsManagement' },
  ];

  const handleMenuPress = (screenName) => {
    onClose();
    // Use dispatch to avoid nested navigation issues
    navigation.dispatch(
      CommonActions.navigate({
        name: screenName,
      })
    );
  };
  
  const renderMenuItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.menuItem, { borderBottomColor: colors.border }]} 
      onPress={() => handleMenuPress(item.screen)}
    >
      <View style={styles.menuIconContainer}>
        <Icon name={item.icon} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.menuText, { color: colors.text }]}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.menuContainer, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[
          styles.menuContent, 
          { 
            backgroundColor: colors.card,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
              },
              android: {
                elevation: 5,
              },
            }),
          }
        ]}>
          <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Admin Panel</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={menuItems}
            renderItem={renderMenuItem}
            keyExtractor={item => item.id}
            style={{ width: '100%' }}
          />
          
          <TouchableOpacity 
            style={[styles.closeMenuButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.closeMenuButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Creating a wrapper component that contains both the navigator and menu
const AdminNavigatorContent = () => {
  const { colors } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        initialRouteName="AdminDashboard"
        screenOptions={({ navigation }) => ({
          headerStyle: {
            backgroundColor: colors.primary,
            elevation: 4,
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 2,
          },
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerTintColor: '#FFFFFF',
          headerLeft: () => (
            <AdminMenuButton onPress={() => setMenuVisible(true)} />
          ),
        })}
      >
        <Stack.Screen 
          name="AdminDashboard" 
          component={AdminScreen}
          options={{ title: 'Admin Dashboard' }}
        />
        <Stack.Screen 
          name="UserManagement" 
          component={UserManagementScreen}
          options={{ title: 'User Management' }}
        />
        <Stack.Screen 
          name="CarsManagement" 
          component={CarsManagementScreen}
          options={{ title: 'Cars Management' }}
        />
        <Stack.Screen 
          name="EditCar" 
          component={EditCarScreen}
          options={{ 
            title: 'Edit Car',
            headerBackTitleVisible: false
          }}
        />
        <Stack.Screen 
          name="CreateCar" 
          component={CreateCarScreen}
          options={{ 
            title: 'Create New Car',
            headerBackTitleVisible: false
          }}
        />
        <Stack.Screen 
          name="CarRentals" 
          component={CarRentalsScreen}
          options={{ 
            title: 'Car Rental History',
            headerBackTitleVisible: false
          }}
        />
        <Stack.Screen 
          name="RentalManagement" 
          component={RentalManagementScreen}
          options={{ title: 'Rental Management' }}
        />
        <Stack.Screen 
          name="ReviewsManagement" 
          component={ReviewsManagementScreen}
          options={{ title: 'Reviews Management' }}
        />
        <Stack.Screen 
          name="DiscountsManagement" 
          component={DiscountsManagementScreen}
          options={{ title: 'Discounts Management' }}
        />
        <Stack.Screen 
          name="CreateDiscount" 
          component={CreateDiscountScreen}
          options={{ 
            title: 'Create New Discount',
            headerBackTitleVisible: false
          }}
        />
        <Stack.Screen 
          name="EditDiscount" 
          component={EditDiscountScreen}
          options={{ 
            title: 'Edit Discount',
            headerBackTitleVisible: false
          }}
        />
      </Stack.Navigator>
      
      <AdminMenu 
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
        colors={colors}
      />
    </View>
  );
};

// Main component that exports just the wrapper
const AdminNavigator = () => {
  return <AdminNavigatorContent />;
};

const styles = StyleSheet.create({
  menuButton: {
    marginLeft: 16,
    padding: 8,
    borderRadius: 4,
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    width: '85%',
    maxHeight: '75%',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 0,
  },
  menuHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    width: '100%',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  closeMenuButton: {
    width: '100%',
    padding: 16,
    alignItems: 'center',
  },
  closeMenuButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default AdminNavigator;
