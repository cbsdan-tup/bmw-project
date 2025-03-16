import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import ProfileScreen from "../screens/ProfileScreen";
import MyCar from "../screens/MyCar";
import PutCarOnRent from "../screens/PutCarOnRent";
import RentalHistory from "../screens/RentalHistory";

const Stack = createStackNavigator();

const ProfileNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyCar"
        component={MyCar}
        options={{ title: "Current Rental" }}
      />
      <Stack.Screen
        name="PutCarOnRent"
        component={PutCarOnRent}
        options={{ title: "List Your Car" }}
      />
      <Stack.Screen
        name="RentalHistory"
        component={RentalHistory}
        options={{ title: "Rental History" }}
      />
    </Stack.Navigator>
  );
};

export default ProfileNavigator;
