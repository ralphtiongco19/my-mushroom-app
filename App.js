import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import Dashboard from './screens/Dashboard'; // <-- note the path

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <Dashboard />
    </SafeAreaView>
  );
}
