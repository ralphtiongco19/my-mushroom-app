import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../supabase';

export default function HomeAfterLogin({ navigation }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [temperature, setTemperature] = useState('--');
  const [humidity, setHumidity] = useState('--');
  const [status, setStatus] = useState('Connecting...');
  const [connected, setConnected] = useState(false);
  const [autoMist, setAutoMist] = useState(true);
  
  // Alert thresholds (will be loaded from settings)
  const [tempMinThreshold, setTempMinThreshold] = useState(20);
  const [tempMaxThreshold, setTempMaxThreshold] = useState(30);
  const [humidMinThreshold, setHumidMinThreshold] = useState(40);
  const [humidMaxThreshold, setHumidMaxThreshold] = useState(80);
  
  // Alerts state
  const [alerts, setAlerts] = useState([]);
  const [alertsModalVisible, setAlertsModalVisible] = useState(false);
  const [environmentModalVisible, setEnvironmentModalVisible] = useState(false);

  // Load settings on component focus
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (data) {
        setTempMinThreshold(data.temp_min || 20);
        setTempMaxThreshold(data.temp_max || 30);
        setHumidMinThreshold(data.humid_min || 40);
        setHumidMaxThreshold(data.humid_max || 80);
        setAutoMist(data.auto_mist_enabled ?? true);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

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
      generateAlerts(data.temperature, data.humidity);
    }
  };

  const generateAlerts = (temp, humid) => {
    const newAlerts = [];
    const tempValue = parseFloat(temp);
    const humidValue = parseFloat(humid);

    // Temperature alerts
    if (tempValue < tempMinThreshold) {
      newAlerts.push({
        id: 'temp-low',
        type: 'warning',
        icon: '❄️',
        title: 'Temperature Too Low',
        message: `Current: ${temp}°C (Min: ${tempMinThreshold}°C)`,
        color: '#4ECDC4'
      });
    }
    if (tempValue > tempMaxThreshold) {
      newAlerts.push({
        id: 'temp-high',
        type: 'warning',
        icon: '🔥',
        title: 'Temperature Too High',
        message: `Current: ${temp}°C (Max: ${tempMaxThreshold}°C)`,
        color: '#FF6B6B'
      });
    }

    // Humidity alerts
    if (humidValue < humidMinThreshold) {
      newAlerts.push({
        id: 'humid-low',
        type: 'warning',
        icon: '🏜️',
        title: 'Humidity Too Low',
        message: `Current: ${humid}% (Min: ${humidMinThreshold}%)`,
        color: '#F093FB'
      });
    }
    if (humidValue > humidMaxThreshold) {
      newAlerts.push({
        id: 'humid-high',
        type: 'warning',
        icon: '💦',
        title: 'Humidity Too High',
        message: `Current: ${humid}% (Max: ${humidMaxThreshold}%)`,
        color: '#4ECDC4'
      });
    }

    // Connection alert
    if (!connected) {
      newAlerts.push({
        id: 'connection',
        type: 'error',
        icon: '📡',
        title: 'Connection Issue',
        message: 'Sensor connection lost',
        color: '#FF6B6B'
      });
    }

    setAlerts(newAlerts);
  };

  const getEnvironmentStatus = () => {
    const tempValue = parseFloat(temperature);
    const humidValue = parseFloat(humidity);

    let overallStatus = 'optimal';
    let statusColor = '#51CF66';
    let details = [];

    // Check temperature
    if (tempValue >= tempMinThreshold && tempValue <= tempMaxThreshold) {
      details.push({ label: 'Temperature', status: 'Optimal', value: `${temperature}°C`, color: '#51CF66' });
    } else {
      overallStatus = 'warning';
      statusColor = '#FF9800';
      details.push({ label: 'Temperature', status: 'Out of Range', value: `${temperature}°C`, color: '#FF6B6B' });
    }

    // Check humidity
    if (humidValue >= humidMinThreshold && humidValue <= humidMaxThreshold) {
      details.push({ label: 'Humidity', status: 'Optimal', value: `${humidity}%`, color: '#51CF66' });
    } else {
      overallStatus = 'warning';
      statusColor = '#FF9800';
      details.push({ label: 'Humidity', status: 'Out of Range', value: `${humidity}%`, color: '#FF6B6B' });
    }

    // Check sensor connection
    details.push({
      label: 'Sensor Status',
      status: status,
      value: connected ? 'Connected' : 'Disconnected',
      color: connected ? '#51CF66' : '#FF6B6B'
    });

    // Check auto mist
    details.push({
      label: 'Auto Mist',
      status: autoMist ? 'Active' : 'Inactive',
      value: autoMist ? 'ON' : 'OFF',
      color: autoMist ? '#51CF66' : '#999'
    });

    return { overallStatus, statusColor, details };
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              navigation.replace('Home');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
          style: 'destructive',
        },
      ]
    );
    setMenuVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mushroom Farm</Text>
          <Text style={styles.headerSubtitle}>Living Room</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Temperature Display */}
        <View style={styles.temperatureSection}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🌡️</Text>
              <Text style={styles.statValue}>{temperature}°C</Text>
              <Text style={styles.statLabel}>Temperature</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>💧</Text>
              <Text style={styles.statValue}>{humidity}%</Text>
              <Text style={styles.statLabel}>Humidity</Text>
            </View>
          </View>

          {/* Circular Gauge */}
          <View style={styles.gaugeContainer}>
            <View style={styles.gaugeOuter}>
              <View style={styles.gaugeInner}>
                <Text style={styles.gaugeValue}>{temperature}°C</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Control Cards */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Controls</Text>
          
          <View style={styles.controlsGrid}>
            {/* Dashboard Control */}
            <TouchableOpacity
              style={[styles.controlCard, { backgroundColor: '#667EEA' }]}
              onPress={() => navigation.navigate('Dashboard')}
              activeOpacity={0.8}
            >
              <Text style={styles.controlIcon}>📊</Text>
              <Text style={styles.controlTitle}>Dashboard</Text>
              <Text style={styles.controlSubtitle}>Monitor data</Text>
            </TouchableOpacity>

            {/* Camera Control */}
            <TouchableOpacity
              style={[styles.controlCard, { backgroundColor: '#F093FB' }]}
              onPress={() => navigation.navigate('CameraStream')}
              activeOpacity={0.8}
            >
              <Text style={styles.controlIcon}>📷</Text>
              <Text style={styles.controlTitle}>Camera</Text>
              <Text style={styles.controlSubtitle}>Live feed</Text>
            </TouchableOpacity>

            {/* Alerts Control */}
            <TouchableOpacity
              style={[styles.controlCard, { backgroundColor: alerts.length > 0 ? '#FF6B6B' : '#51CF66' }]}
              onPress={() => setAlertsModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.controlIcon}>🔔</Text>
              <Text style={styles.controlTitle}>Alerts</Text>
              <Text style={styles.controlSubtitle}>{alerts.length > 0 ? `${alerts.length} active` : 'All clear'}</Text>
            </TouchableOpacity>

            {/* Environment Control */}
            <TouchableOpacity
              style={[styles.controlCard, { backgroundColor: getEnvironmentStatus().statusColor }]}
              onPress={() => setEnvironmentModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.controlIcon}>🌿</Text>
              <Text style={styles.controlTitle}>Environment</Text>
              <Text style={styles.controlSubtitle}>Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Dashboard')}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navLabel}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('CameraStream')}>
          <Text style={styles.navIcon}>📷</Text>
          <Text style={styles.navLabel}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setMenuVisible(true)}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Menu</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuContent}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuHeaderIcon}>⚙️</Text>
                <Text style={styles.menuHeaderTitle}>Options</Text>
              </View>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('Settings');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={styles.menuIcon}>⚙️</Text>
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Settings</Text>
                  <Text style={styles.menuItemDescription}>Manage preferences</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemLogout]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#FFE8E8' }]}>
                  <Text style={styles.menuIcon}>🚪</Text>
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemTitle, styles.menuItemTitleDanger]}>Logout</Text>
                  <Text style={styles.menuItemDescription}>Sign out from your account</Text>
                </View>
                <Text style={[styles.menuArrow, { color: '#D32F2F' }]}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Alerts Modal */}
      <Modal
        visible={alertsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAlertsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAlertsModalVisible(false)}>
              <Text style={styles.modalCloseButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>System Alerts</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {alerts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyTitle}>All Clear</Text>
                <Text style={styles.emptyMessage}>No active alerts or warnings</Text>
              </View>
            ) : (
              alerts.map((alert) => (
                <View key={alert.id} style={[styles.alertItem, { borderLeftColor: alert.color }]}>
                  <Text style={styles.alertIcon}>{alert.icon}</Text>
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Environment Status Modal */}
      <Modal
        visible={environmentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEnvironmentModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEnvironmentModalVisible(false)}>
              <Text style={styles.modalCloseButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Environment Status</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {(() => {
              const envStatus = getEnvironmentStatus();
              return (
                <>
                  <View style={[styles.statusSummary, { backgroundColor: envStatus.statusColor + '20', borderColor: envStatus.statusColor }]}>
                    <Text style={styles.statusSummaryIcon}>
                      {envStatus.overallStatus === 'optimal' ? '✅' : '⚠️'}
                    </Text>
                    <Text style={[styles.statusSummaryText, { color: envStatus.statusColor }]}>
                      {envStatus.overallStatus === 'optimal' ? 'System Optimal' : 'System Alert'}
                    </Text>
                  </View>

                  {envStatus.details.map((detail, index) => (
                    <View key={index} style={styles.statusDetail}>
                      <View style={styles.statusDetailLeft}>
                        <Text style={styles.statusDetailLabel}>{detail.label}</Text>
                        <Text style={styles.statusDetailStatus}>{detail.status}</Text>
                      </View>
                      <Text style={[styles.statusDetailValue, { color: detail.color }]}>
                        {detail.value}
                      </Text>
                    </View>
                  ))}
                </>
              );
            })()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  menuButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  temperatureSection: {
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  gaugeContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  gaugeOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 15,
    borderColor: '#87CEEB',
  },
  gaugeInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  gaugeValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  controlsSection: {
    marginBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 15,
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  controlCard: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  controlIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
    textAlign: 'center',
  },
  controlSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  menuContainer: {
    alignItems: 'flex-end',
    paddingRight: 16,
    paddingTop: 10,
  },
  menuContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 260,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuHeaderIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  menuHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItemLogout: {
    marginTop: 4,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 22,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  menuItemTitleDanger: {
    color: '#D32F2F',
  },
  menuItemDescription: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  menuArrow: {
    fontSize: 18,
    color: '#CCC',
    marginLeft: 8,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCloseButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667EEA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  alertItem: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusSummary: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#51CF66',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  statusSummaryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statusSummaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#51CF66',
  },
  statusDetail: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusDetailLeft: {
    flex: 1,
  },
  statusDetailLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  statusDetailStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  statusDetailValue: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },
});
