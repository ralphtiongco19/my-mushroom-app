import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../supabase';

export default function Dashboard() {
  const [temperature, setTemperature] = useState(0);
  const [humidity, setHumidity] = useState(0);

  useEffect(() => {
    // 1. Fetch latest data on mount
    const fetchLatest = async () => {
      const { data } = await supabase
        .from('sensor_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setTemperature(data[0].temperature);
        setHumidity(data[0].humidity);
      }
    };
    fetchLatest();

    // 2. Subscribe to realtime updates
    const subscription = supabase
      .channel('realtime-sensor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sensor_data' },
        (payload) => {
          // Update state instantly when a new row is inserted
          setTemperature(payload.new.temperature);
          setHumidity(payload.new.humidity);
        }
      )
      .subscribe();

    // 3. Clean up subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Realtime Dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Temperature</Text>
        <Text style={styles.value}>{temperature}°C</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Humidity</Text>
        <Text style={styles.value}>{humidity}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  label: {
    fontSize: 18,
    color: '#555',
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 5,
  },
});
