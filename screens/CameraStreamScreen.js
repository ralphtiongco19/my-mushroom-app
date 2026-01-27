import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

export default function CameraStreamScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [streamActive, setStreamActive] = useState(false);

  // Replace with your ESP32 camera IP address
  const ESP32_CAMERA_URL = 'http://10.118.152.30:81/stream'; // Change this to your ESP32 IP

  const toggleStream = () => {
    if (!streamActive) {
      setIsLoading(true);
      setStreamActive(true);
      setIsLoading(false);
    } else {
      setStreamActive(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>ESP32 Camera Stream</Text>

      {/* Camera Stream Container */}
      <View style={styles.streamContainer}>
        {streamActive ? (
          <>
            <Image
              source={{ uri: ESP32_CAMERA_URL }}
              style={styles.cameraStream}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
            />
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Connecting to camera...</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>📷</Text>
            <Text style={styles.placeholderTitle}>Camera Stream</Text>
            <Text style={styles.placeholderSubtitle}>Tap start to view live feed from your ESP32</Text>
          </View>
        )}
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, streamActive ? styles.stopButton : styles.startButton]}
          onPress={toggleStream}
        >
          <Text style={styles.buttonText}>
            {streamActive ? 'Stop Stream' : 'Start Stream'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Connection Info:</Text>
        <Text style={styles.infoText}>URL: {ESP32_CAMERA_URL}</Text>
        <Text style={styles.infoText}>Status: {streamActive ? '🟢 Active' : '🔴 Inactive'}</Text>
        <Text style={styles.infoHint}>To change the IP address, edit the ESP32_CAMERA_URL in CameraStreamScreen.js</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  streamContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    minHeight: 300,
  },
  cameraStream: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 60,
    marginBottom: 10,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  infoHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
