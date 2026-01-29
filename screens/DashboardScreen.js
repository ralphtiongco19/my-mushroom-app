import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';
import { triggerMist, toggleAutoMist as sendAutoMistCommand } from '../deviceCommandManager';

export default function Dashboard({ navigation }) {
  const [temperature, setTemperature] = useState('--');
  const [humidity, setHumidity] = useState('--');
  const [status, setStatus] = useState('Connecting...');
  const [connected, setConnected] = useState(false);
  const [autoMist, setAutoMist] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('--');
  const [commandLoading, setCommandLoading] = useState(false);
  const DEVICE_ID = 'esp32-main'; // Your device identifier
  
  // Historical stats
  const [tempMin, setTempMin] = useState('--');
  const [tempMax, setTempMax] = useState('--');
  const [tempAvg, setTempAvg] = useState('--');
  const [humidMin, setHumidMin] = useState('--');
  const [humidMax, setHumidMax] = useState('--');
  const [humidAvg, setHumidAvg] = useState('--');
  
  // Thresholds
  const [tempMinThreshold, setTempMinThreshold] = useState(20);
  const [tempMaxThreshold, setTempMaxThreshold] = useState(30);
  const [humidMinThreshold, setHumidMinThreshold] = useState(40);
  const [humidMaxThreshold, setHumidMaxThreshold] = useState(80);

  useEffect(() => {
    fetchInitialData();
    setupRealtimeSubscription();
  }, []);

  const fetchInitialData = async () => {
    // Fetch latest sensor data
    const { data } = await supabase
      .from('sensor_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      handleSensorData(data[0]);
    }

    // Fetch today's stats
    fetchTodayStats();
  };

  const setupRealtimeSubscription = () => {
    const sensorChannel = supabase
      .channel('realtime-sensor')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_data' },
        (payload) => {
          handleSensorData(payload.new);
          fetchTodayStats();
        }
      )
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    return () => supabase.removeChannel(sensorChannel);
  };

  const handleSensorData = (data) => {
    if (data.status !== 'OK') {
      setStatus(data.status);
    } else {
      setStatus('Sensor OK');
      setTemperature(data.temperature);
      setHumidity(data.humidity);
      setLastUpdate(new Date(data.created_at).toLocaleTimeString());
    }
  };

  const fetchTodayStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('sensor_data')
      .select('temperature, humidity')
      .gte('created_at', today)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const temps = data.map(d => parseFloat(d.temperature));
      const humids = data.map(d => parseFloat(d.humidity));

      setTempMin(Math.min(...temps).toFixed(1));
      setTempMax(Math.max(...temps).toFixed(1));
      setTempAvg((temps.reduce((a, b) => a + b) / temps.length).toFixed(1));

      setHumidMin(Math.min(...humids).toFixed(1));
      setHumidMax(Math.max(...humids).toFixed(1));
      setHumidAvg((humids.reduce((a, b) => a + b) / humids.length).toFixed(1));
    }
  };

  const toggleAutoMist = async (value) => {
    setAutoMist(value);
    setCommandLoading(true);
    
    // Save to database
    await supabase
      .from('mist_control')
      .upsert({
        id: 1,
        auto_state: value,
        updated_at: new Date().toISOString()
      });
    
    // Send command to device
    const result = await sendAutoMistCommand(DEVICE_ID, value);
    setCommandLoading(false);
    
    if (result.success) {
      Alert.alert('Success', `Auto Mist ${value ? 'Enabled' : 'Disabled'}`);
    } else {
      Alert.alert('Error', `Failed to update device: ${result.error}`);
      setAutoMist(!value); // Revert on failure
    }
  };

  const triggerManualMist = async () => {
    setCommandLoading(true);
    const result = await triggerMist(DEVICE_ID, 5); // 5 seconds
    setCommandLoading(false);
    
    if (result.success) {
      Alert.alert('Success', 'Mist triggered for 5 seconds');
    } else {
      Alert.alert('Error', `Failed to trigger mist: ${result.error}`);
    }
  };

  const getTemperatureStatus = () => {
    const temp = parseFloat(temperature);
    if (temp < tempMinThreshold) return { status: 'Too Cold', color: '#4ECDC4' };
    if (temp > tempMaxThreshold) return { status: 'Too Hot', color: '#FF6B6B' };
    return { status: 'Optimal', color: '#51CF66' };
  };

  const getHumidityStatus = () => {
    const humid = parseFloat(humidity);
    if (humid < humidMinThreshold) return { status: 'Too Dry', color: '#F093FB' };
    if (humid > humidMaxThreshold) return { status: 'Too Wet', color: '#4ECDC4' };
    return { status: 'Optimal', color: '#51CF66' };
  };

  const tempStatus = getTemperatureStatus();
  const humidStatus = getHumidityStatus();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Advanced Dashboard</Text>
          <View style={[styles.connectionBadge, { backgroundColor: connected ? '#51CF66' : '#FF6B6B' }]}>
            <Text style={styles.connectionText}>{connected ? 'Connected' : 'Offline'}</Text>
          </View>
        </View>

        {/* Current Values Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Values</Text>
          <View style={styles.valuesGrid}>
            {/* Temperature Card */}
            <View style={[styles.valueCard, { borderLeftColor: tempStatus.color, borderLeftWidth: 4 }]}>
              <Text style={styles.valueLabel}>Temperature</Text>
              <Text style={styles.valueLarge}>{temperature}°C</Text>
              <Text style={[styles.statusBadge, { color: tempStatus.color }]}>{tempStatus.status}</Text>
              <Text style={styles.lastUpdate}>Last: {lastUpdate}</Text>
            </View>

            {/* Humidity Card */}
            <View style={[styles.valueCard, { borderLeftColor: humidStatus.color, borderLeftWidth: 4 }]}>
              <Text style={styles.valueLabel}>Humidity</Text>
              <Text style={styles.valueLarge}>{humidity}%</Text>
              <Text style={[styles.statusBadge, { color: humidStatus.color }]}>{humidStatus.status}</Text>
              <Text style={styles.lastUpdate}>Last: {lastUpdate}</Text>
            </View>
          </View>
        </View>

        {/* Today's Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Statistics</Text>
          <View style={styles.statsGrid}>
            {/* Temp Stats */}
            <View style={styles.statBox}>
              <Text style={styles.statBoxTitle}>Temperature</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Min:</Text>
                <Text style={styles.statValue}>{tempMin}°C</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Max:</Text>
                <Text style={styles.statValue}>{tempMax}°C</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Avg:</Text>
                <Text style={styles.statValue}>{tempAvg}°C</Text>
              </View>
            </View>

            {/* Humidity Stats */}
            <View style={styles.statBox}>
              <Text style={styles.statBoxTitle}>Humidity</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Min:</Text>
                <Text style={styles.statValue}>{humidMin}%</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Max:</Text>
                <Text style={styles.statValue}>{humidMax}%</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Avg:</Text>
                <Text style={styles.statValue}>{humidAvg}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Alert Thresholds */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Thresholds</Text>
          <View style={styles.thresholdCard}>
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdLabel}>🌡️ Temperature Range:</Text>
              <Text style={styles.thresholdValue}>{tempMinThreshold}°C - {tempMaxThreshold}°C</Text>
            </View>
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdLabel}>💧 Humidity Range:</Text>
              <Text style={styles.thresholdValue}>{humidMinThreshold}% - {humidMaxThreshold}%</Text>
            </View>
          </View>
        </View>

        {/* Controls Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Controls</Text>
          
          {/* Auto Mist Switch */}
          <View style={styles.controlCard}>
            <View style={styles.controlLeft}>
              <Text style={styles.controlTitle}>💨 Auto Mist System</Text>
              <Text style={styles.controlDescription}>Automatically trigger misting when needed</Text>
            </View>
            <Switch
              trackColor={{ false: '#E0E0E0', true: '#81b0ff' }}
              thumbColor={autoMist ? '#667EEA' : '#f4f3f4'}
              onValueChange={toggleAutoMist}
              value={autoMist}
              style={styles.switch}
            />
          </View>

          {/* Manual Mist Button */}
          <TouchableOpacity style={styles.actionButton} onPress={triggerManualMist}>
            <Text style={styles.actionButtonIcon}>💦</Text>
            <Text style={styles.actionButtonText}>Trigger Manual Mist</Text>
          </TouchableOpacity>

          {/* System Status */}
          <View style={styles.systemStatusCard}>
            <Text style={styles.systemStatusTitle}>System Status</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Sensor:</Text>
              <Text style={[styles.statusValue, { color: status === 'Sensor OK' ? '#51CF66' : '#FF6B6B' }]}>{status}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Connection:</Text>
              <Text style={[styles.statusValue, { color: connected ? '#51CF66' : '#FF6B6B' }]}>
                {connected ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingVertical: 15,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: -16,
    paddingHorizontal: 20,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667EEA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  connectionBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  valuesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  valueCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  valueLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 6,
  },
  valueLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  lastUpdate: {
    fontSize: 10,
    color: '#CCC',
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  thresholdCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#667EEA',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  thresholdLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  thresholdValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#667EEA',
  },
  controlCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  controlLeft: {
    flex: 1,
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  controlDescription: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  switch: {
    marginLeft: 12,
  },
  actionButton: {
    backgroundColor: '#667EEA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  systemStatusCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderTopWidth: 2,
    borderTopColor: '#F093FB',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  systemStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 12,
    fontWeight: '700',
  },
});
