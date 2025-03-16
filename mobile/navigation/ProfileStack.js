import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import ProfileScreen from "../screens/ProfileScreen";
import MyCar from "../screens/MyCar";
import PutCarOnRent from "../screens/PutCarOnRent";
import RentalHistory from "../screens/RentalHistory";

const Stack = createStackNavigator();

const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="MyCar" component={MyCar} />
      <Stack.Screen name="PutCarOnRent" component={PutCarOnRent} />
      <Stack.Screen name="RentalHistory" component={RentalHistory} />
    </Stack.Navigator>
  );
};

export default ProfileStack;
