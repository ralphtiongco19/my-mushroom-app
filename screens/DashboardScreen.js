import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { supabase } from '../supabase';

export default function Dashboard() {
  const [temperature, setTemperature] = useState('--');
  const [humidity, setHumidity] = useState('--');
  const [status, setStatus] = useState('Connecting...');
  const [connected, setConnected] = useState(false);

  // --- Auto Mist Control ---
  const [autoMist, setAutoMist] = useState(true);

  useEffect(() => {
    // Fetch latest sensor data
    const fetchLatestSensor = async () => {
      const { data } = await supabase
        .from('sensor_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) handleSensorData(data[0]);
    };

    fetchLatestSensor();

    // Realtime subscription for sensor data
    const sensorChannel = supabase
      .channel('realtime-sensor')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_data' },
        (payload) => handleSensorData(payload.new)
      )
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    return () => supabase.removeChannel(sensorChannel);
  }, []);

  const handleSensorData = (data) => {
    if (data.status !== 'OK') {
      setStatus(data.status);
    } else {
      setStatus('Sensor OK');
      setTemperature(data.temperature);
      setHumidity(data.humidity);
    }
  };

  // Toggle Auto Mist
  const toggleAutoMist = async (value) => {
    setAutoMist(value);

    // Update Supabase
    await supabase
      .from('mist_control')
      .upsert({
        id: 1,
        auto_state: value,
        updated_at: new Date().toISOString()
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Realtime Environment</Text>

      {/* Connection Indicator */}
      <Text style={[styles.connection, { color: connected ? 'green' : 'red' }]}>
        ● {connected ? 'Connected' : 'Disconnected'}
      </Text>

      {/* Temperature Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Temperature</Text>
        <Text style={styles.value}>{temperature}°C</Text>
      </View>

      {/* Humidity Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Humidity</Text>
        <Text style={styles.value}>{humidity}%</Text>
      </View>

      {/* Status Message */}
      <Text style={[styles.status, { color: status === 'Sensor OK' ? 'green' : 'red' }]}>
        {status}
      </Text>

      {/* Auto Mist Switch */}
      <View style={styles.mistContainer}>
        <Text style={styles.mistLabel}>Auto Mist</Text>
        <Switch
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={autoMist ? '#f5dd4b' : '#f4f3f4'}
          onValueChange={toggleAutoMist}
          value={autoMist}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  connection: {
    fontSize: 14,
    marginBottom: 20,
  },
  card: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  label: {
    fontSize: 18,
    color: '#555',
  },
  value: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 5,
  },
  status: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
  },
  mistContainer: {
    marginTop: 30,
    alignItems: 'center',
    width: '60%',
    padding: 15,
    backgroundColor: '#cce6ff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mistLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
});
