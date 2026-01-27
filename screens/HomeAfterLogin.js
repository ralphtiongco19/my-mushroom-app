import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function HomeAfterLogin({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome Back!</Text>
      <Text style={styles.subtitle}>Select an option to continue:</Text>

      {/* Dashboard Card */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Dashboard')}
      >
        <Text style={styles.cardTitle}>Dashboard</Text>
        <Text style={styles.cardSubtitle}>View your stats and data</Text>
      </TouchableOpacity>

      {/* Camera Stream Card */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CameraStream')}
      >
        <Text style={styles.cardTitle}>Camera Stream</Text>
        <Text style={styles.cardSubtitle}>Stream your camera feed</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5, // for Android shadow
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#777',
  },
});
