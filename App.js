import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeAfterLogin from './screens/HomeAfterLogin'; // new screen
import DashboardScreen from './screens/DashboardScreen';
import CameraStreamScreen from './screens/CameraStreamScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        {/* Public landing/home page */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />

        {/* Auth screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />

        {/* Post-login home screen */}
        <Stack.Screen
          name="HomeAfterLogin"
          component={HomeAfterLogin}
          options={{ headerShown: false }}
        />

        {/* Dashboard */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} />

        {/* Camera Stream */}
        <Stack.Screen name="CameraStream" component={CameraStreamScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
