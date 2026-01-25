import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const HomeAfterLogin = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>Choose an action below:</Text>

      {/* Button to go to Dashboard */}
      <Button
        title="Go to Dashboard"
        onPress={() => navigation.navigate('Dashboard')}
      />

      {/* Placeholder for future Camera Stream */}
      <Button
        title="Camera Stream"
        onPress={() => navigation.navigate('CameraStream')} // You can create this later
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    color: '#555',
  },
});

export default HomeAfterLogin;
