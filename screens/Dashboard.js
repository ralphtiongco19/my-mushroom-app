import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../supabase';

export default function Dashboard() {
  const [temperature, setTemperature] = useState('--');
  const [humidity, setHumidity] = useState('--');
  const [status, setStatus] = useState('Connecting...');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initial fetch
    const fetchLatest = async () => {
      const { data } = await supabase
        .from('sensor_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        handleData(data[0]);
      }
    };

    fetchLatest();

    // Realtime subscription
    const channel = supabase
      .channel('realtime-sensor')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_data' },
        (payload) => {
          handleData(payload.new);
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => supabase.removeChannel(channel);
  }, []);

  const handleData = (data) => {
    if (data.status !== 'OK') {
      setStatus(data.status);
    } else {
      setStatus('Sensor OK');
      setTemperature(data.temperature);
      setHumidity(data.humidity);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Realtime Environment</Text>

      {/* Connection Indicator */}
      <Text style={[styles.connection, { color: connected ? 'green' : 'red' }]}>
        ● {connected ? 'Connected' : 'Disconnected'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Temperature</Text>
        <Text style={styles.value}>{temperature}°C</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Humidity</Text>
        <Text style={styles.value}>{humidity}%</Text>
      </View>

      {/* Status Message */}
      <Text style={[
        styles.status,
        { color: status === 'Sensor OK' ? 'green' : 'red' }
      ]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  connection: {
    fontSize: 14,
    marginBottom: 20,
  },
  card: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 18,
    color: '#555',
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  status: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
