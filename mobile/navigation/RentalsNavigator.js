import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import CartScreen from "../screens/CartScreen";
import BookingScreen from "../screens/BookingScreen";
import { useTheme } from "../context/ThemeContext";

const Stack = createStackNavigator();

const RentalsNavigator = () => {
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
        name="CartScreen"
        component={CartScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookingScreen"
        component={BookingScreen}
        options={{ title: "Book Your Rental" }}
      />
    </Stack.Navigator>
  );
};

export default RentalsNavigator;
