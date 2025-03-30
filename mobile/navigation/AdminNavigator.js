import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Image } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import Icon from "react-native-vector-icons/FontAwesome";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

import UserManagementScreen from "../screens/admin/UserManagementScreen";
import CarsManagementScreen from "../screens/admin/CarsManagementScreen";
import EditCarScreen from "../screens/admin/EditCarScreen";
import CreateCarScreen from "../screens/admin/CreateCarScreen";
import CarRentalsScreen from "../screens/admin/CarRentalsScreen";
import RentalManagementScreen from "../screens/admin/RentalManagementScreen";
import ReviewsManagementScreen from "../screens/admin/ReviewsManagementScreen";
import DiscountsManagementScreen from "../screens/admin/DiscountsManagementScreen";
import CreateDiscountScreen from "../screens/admin/CreateDiscountScreen";
import EditDiscountScreen from "../screens/admin/EditDiscountScreen";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// Custom drawer content component for the drawer items
const DrawerIcon = ({ name, color }) => {
  return (
    <Icon name={name} size={20} color={color} style={{ marginRight: 20 }} />
  );
};

// Custom drawer content component
const CustomDrawerContent = (props) => {
  const { user } = useAuth();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      {/* Admin details header */}
      <View
        style={[
          styles.drawerHeader,
          {
            backgroundColor: colors.primary,
            borderBottomColor: colors.border,
            paddingTop: 40,
            height: "12.1%",
          },
        ]}
      >
        <View
          style={{ display: "flex", alignItems: "start", flexDirection: "row" }}
        >
          <View style={styles.adminAvatarContainer}>
            {user?.avatar?.url ? (
              // Display the user's avatar image
              <Image source={{ uri: user.avatar?.url }} style={styles.avatar} />
            ) : (
              // Fallback: Display an icon or placeholder with the user's initial
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user.firstName ? user.firstName[0].toUpperCase() : "U"}
                </Text>
              </View>
            )}
          </View>
          <View
            style={{
              display: "flex",
              alignItems: "start",
              flexDirection: "column",
            }}
          >
            <Text style={styles.adminName}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.adminEmail}> {user.email}</Text>
          </View>
        </View>
      </View>

      {/* Drawer items */}
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Close drawer button */}
      <TouchableOpacity
        style={[styles.closeDrawerButton, { backgroundColor: colors.card }]}
        onPress={() => props.navigation.closeDrawer()}
      >
        <Icon name="chevron-left" size={16} color={colors.primary} />
        <Text style={[styles.closeDrawerText, { color: colors.text }]}>
          Close Menu
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Stack navigators for screens that need nested navigation
const CarsStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: "#FFFFFF",
      }}
    >
      <Stack.Screen
        name="CarsManagement"
        component={CarsManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditCar"
        component={EditCarScreen}
        options={{ title: "Edit Car" }}
      />
      <Stack.Screen
        name="CreateCar"
        component={CreateCarScreen}
        options={{ title: "Create New Car" }}
      />
      <Stack.Screen
        name="CarRentals"
        component={CarRentalsScreen}
        options={{ title: "Car Rental History" }}
      />
    </Stack.Navigator>
  );
};

const DiscountsStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: "#FFFFFF",
      }}
    >
      <Stack.Screen
        name="DiscountsManagement"
        component={DiscountsManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateDiscount"
        component={CreateDiscountScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditDiscount"
        component={EditDiscountScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const AdminNavigator = () => {
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
          elevation: 4,
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 2,
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontWeight: "600",
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.text,
        drawerLabelStyle: {
          marginLeft: -20,
          fontSize: 16,
          fontWeight: "500",
        },
        drawerStyle: {
          backgroundColor: colors.background,
          width: 280,
        },
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          title: "Admin Dashboard",
          drawerIcon: ({ color }) => (
            <DrawerIcon name="dashboard" color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{
          title: "User Management",
          drawerIcon: ({ color }) => <DrawerIcon name="users" color={color} />,
        }}
      />
      <Drawer.Screen
        name="Cars Management"
        component={CarsStack}
        options={{
          headerShown: "Cars Management",

          drawerIcon: ({ color }) => <DrawerIcon name="car" color={color} />,
        }}
      />
      <Drawer.Screen
        name="RentalManagement"
        component={RentalManagementScreen}
        options={{
          title: "Rental Management",
          drawerIcon: ({ color }) => (
            <DrawerIcon name="calendar-check-o" color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="ReviewsManagement"
        component={ReviewsManagementScreen}
        options={{
          title: "Reviews Management",
          drawerIcon: ({ color }) => <DrawerIcon name="star" color={color} />,
        }}
      />
      <Drawer.Screen
        name="DiscountsStack"
        component={DiscountsStack}
        options={{
          title: "Discounts Management",
          drawerIcon: ({ color }) => (
            <DrawerIcon name="percent" color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  // We'll keep some basic styles in case we need them
  drawerHeader: {
    paddingTop: 12,
    padding: 15,
    alignItems: "center",
  },
  adminAvatarContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 25,
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFA500", // Example primary color
  },
  avatarInitial: {
    fontSize: 18,
    color: "#FFFFFF", // Text color for initials
    fontWeight: "bold",
  },
  adminName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  adminEmail: {
    color: "#FFFFFF",
    fontSize: 14,
    opacity: 0.8,
  },
  closeDrawerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  closeDrawerText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default AdminNavigator;
