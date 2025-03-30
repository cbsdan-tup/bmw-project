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
import CarFormScreen from "../screens/CarFormScreen";
import ChatScreen from "../screens/ChatScreen";
import RentalHistoryScreen from "../screens/RentalHistory";
import BookingDetailsScreen from "../screens/BookingDetailsScreen";
import MyCarRentalDetails from "../screens/MyCarRentalDetails";

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
        name="MyCarRentalDetails"
        component={MyCarRentalDetails}
        options={{
          headerShown: true,
          title: "Rental Details",
        }}
      />
      <Stack.Screen
        name="PutCarOnRent"
        component={PutCarOnRent}
        options={{ headerShown: true, title: "List Your Car" }}
      />
      <Stack.Screen
        name="CarForm"
        component={CarFormScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.editingCar ? "Edit Car" : "Add New Car",
        })}
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
        name="BookingDetails"
        component={BookingDetailsScreen}
        options={{
          headerShown: true,
          title: "Booking Details",
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
