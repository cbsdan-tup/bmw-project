import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import OTPVerificationScreen from "../screens/auth/OTPVerificationScreen";
import { useTheme } from "../context/ThemeContext";
import BottomTabNavigator from "./BottomTabNavigator";
import EditProfileScreen from "../screens/EditProfileScreen";
import MyFavoritesScreen from "../screens/MyFavoritesScreen";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";

const Stack = createStackNavigator();

const AuthNavigator = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 16 }}
            >
              <Icon name="arrow-left" size={20} color={colors.headerText} />
            </TouchableOpacity>
          ) : null,
      })}
    >
      <Stack.Screen
        name="MainTabs"
        component={BottomTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Sign In", presentation: 'modal', }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Sign Up" }}
      />
      <Stack.Screen
        name="OTPVerification"
        component={OTPVerificationScreen}
        options={{ 
          title: "Verify Email",
          presentation: 'modal',
          headerLeft: ({ onPress }) => (
            <TouchableOpacity onPress={onPress} style={{ marginLeft: 16 }}>
              <Icon name="arrow-left" size={20} color={colors.headerText} />
            </TouchableOpacity>
          )
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: "Edit Profile" }}
      />
      <Stack.Screen
        name="MyFavorites"
        component={MyFavoritesScreen}
        options={{ title: "My Favorites" }}
      />
      <Stack.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{ title: "Admin Dashboard" }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
