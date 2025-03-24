import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useTheme } from "../context/ThemeContext";
import ProfileScreen from "../screens/ProfileScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import MyFavoritesScreen from "../screens/MyFavoritesScreen";
import MyBookingsScreen from "../screens/MyBookingsScreen";
import AboutUsScreen from "../screens/AboutUsScreen";
import TermsConditionsScreen from "../screens/TermsConditionsScreen";
import MyReviewsScreen from "../screens/MyReviewsScreen";
import MyCar from "../screens/MyCar";
import PutCarOnRent from "../screens/PutCarOnRent";
import ChatScreen from "../screens/ChatScreen";
import RentalHistoryScreen from "../screens/RentalHistory";

const Stack = createStackNavigator();

const ProfileNavigator = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen
        name="MyCar"
        component={MyCar}
        options={{
          headerShown: true,
          title: "Current Rental",
        }}
      />
      <Stack.Screen
        name="PutCarOnRent"
        component={PutCarOnRent}
        options={{ headerShown: true, title: "List Your Car" }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          headerShown: true,
          title: "Edit Profile",
        }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          headerShown: true,
          title: "Chat",
        }}
      />
      <Stack.Screen
        name="MyFavorites"
        component={MyFavoritesScreen}
        options={{
          headerShown: true,
          title: "My Favorites",
        }}
      />
      <Stack.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{
          headerShown: true,
          title: "My Bookings",
        }}
      />
      <Stack.Screen
        name="MyReviews"
        component={MyReviewsScreen}
        options={{
          headerShown: true,
          title: "My Reviews",
        }}
      />
      <Stack.Screen
        name="RentalHistory"
        component={RentalHistoryScreen}
        options={{
          headerShown: true,
          title: "Rental History",
        }}
      />
      <Stack.Screen
        name="AboutUs"
        component={AboutUsScreen}
        options={{
          headerShown: true,
          title: "About Us",
        }}
      />
      <Stack.Screen
        name="TermsConditions"
        component={TermsConditionsScreen}
        options={{
          headerShown: true,
          title: "Terms & Conditions",
        }}
      />
    </Stack.Navigator>
  );
};

export default ProfileNavigator;
