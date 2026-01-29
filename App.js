import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from './supabase';

import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeAfterLogin from './screens/HomeAfterLogin'; // new screen
import DashboardScreen from './screens/DashboardScreen';
import CameraStreamScreen from './screens/CameraStreamScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setLoading(false);
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={session ? 'HomeAfterLogin' : 'Home'}>
        {session ? (
          // Authenticated screens
          <>
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

            {/* Settings */}
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        ) : (
          // Unauthenticated screens
          <>
            {/* Public landing/home page */}
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />

            {/* Auth screens */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
