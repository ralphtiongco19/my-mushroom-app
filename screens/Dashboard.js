import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../supabase'; // <-- import your supabase client

export default function Dashboard() {
  const [temperature, setTemperature] = useState(0);
  const [humidity, setHumidity] = useState(0);

  useEffect(() => {
    // Get latest data initially
    const fetchLatest = async () => {
      const { data, error } = await supabase
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

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('realtime-sensor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sensor_data' },
        (payload) => {
          setTemperature(payload.new.temperature);
          setHumidity(payload.new.humidity);
        }
      )
      .subscribe();

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
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f2f2', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 10, marginVertical: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  label: { fontSize: 18, color: '#555' },
  value: { fontSize: 32, fontWeight: 'bold', marginTop: 5 },
});
