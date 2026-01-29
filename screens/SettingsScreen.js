import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch, TextInput, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';
import { updateDeviceSettings, calibrateSensor, rebootDevice } from '../deviceCommandManager';

export default function SettingsScreen({ navigation }) {
  // Alert Thresholds
  const [tempMin, setTempMin] = useState('20');
  const [tempMax, setTempMax] = useState('30');
  const [humidMin, setHumidMin] = useState('40');
  const [humidMax, setHumidMax] = useState('80');

  // Auto Mist Settings
  const [humidTarget, setHumidTarget] = useState('60');
  const [mistDuration, setMistDuration] = useState('30');
  const [mistCooldown, setMistCooldown] = useState('300');

  // Notification Preferences
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Farm Information
  const [farmName, setFarmName] = useState('My Mushroom Farm');
  const [location, setLocation] = useState('Living Room');
  const [deviceId, setDeviceId] = useState('ESP32-001');

  // System Settings
  const [tempUnit, setTempUnit] = useState('C');
  const [darkMode, setDarkMode] = useState(false);
  const [commandLoading, setCommandLoading] = useState(false);
  const DEVICE_ID = 'esp32-main'; // Your device identifier

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is ok
        console.log('Error loading settings:', error);
        return;
      }

      if (data) {
        setTempMin(data.temp_min?.toString() || '20');
        setTempMax(data.temp_max?.toString() || '30');
        setHumidMin(data.humid_min?.toString() || '40');
        setHumidMax(data.humid_max?.toString() || '80');
        setHumidTarget(data.humid_target?.toString() || '60');
        setMistDuration(data.mist_duration?.toString() || '30');
        setMistCooldown(data.mist_cooldown?.toString() || '300');
        setAlertsEnabled(data.alerts_enabled ?? true);
        setSoundEnabled(data.sound_enabled ?? true);
        setCriticalOnly(data.critical_only ?? false);
        setFarmName(data.farm_name || 'My Mushroom Farm');
        setLocation(data.location || 'Living Room');
        setDeviceId(data.device_id || 'ESP32-001');
        setTempUnit(data.temp_unit || 'C');
        setDarkMode(data.dark_mode ?? false);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      // Validate inputs
      const temp_min = parseFloat(tempMin);
      const temp_max = parseFloat(tempMax);
      const humid_min = parseFloat(humidMin);
      const humid_max = parseFloat(humidMax);

      if (isNaN(temp_min) || isNaN(temp_max) || isNaN(humid_min) || isNaN(humid_max)) {
        Alert.alert('Error', 'Please enter valid numbers for thresholds');
        return;
      }

      setCommandLoading(true);

      // Check if settings exist first
      const { data: existingData } = await supabase
        .from('settings')
        .select('id')
        .eq('id', 1)
        .single();

      const settingsData = {
        temp_min,
        temp_max,
        humid_min,
        humid_max,
        humid_target: parseFloat(humidTarget),
        mist_duration: parseInt(mistDuration),
        mist_cooldown: parseInt(mistCooldown),
        alerts_enabled: alertsEnabled,
        sound_enabled: soundEnabled,
        critical_only: criticalOnly,
        farm_name: farmName,
        location: location,
        device_id: deviceId,
        temp_unit: tempUnit,
        dark_mode: darkMode,
        updated_at: new Date().toISOString()
      };

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('settings')
          .update(settingsData)
          .eq('id', 1);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('settings')
          .insert([{
            id: 1,
            ...settingsData,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
      }

      // Send settings to device
      const deviceResult = await updateDeviceSettings(DEVICE_ID, {
        temp_min,
        temp_max,
        humid_min,
        humid_max,
        auto_mist_enabled: true,
        auto_mist_interval: parseInt(mistCooldown),
        mist_duration: parseInt(mistDuration)
      });

      setCommandLoading(false);

      if (deviceResult.success) {
        Alert.alert('✅ Success', 'Settings saved and sent to device!');
      } else {
        Alert.alert('⚠️ Partial Success', `Settings saved locally, but device sync failed: ${deviceResult.error}`);
      }
    } catch (error) {
      setCommandLoading(false);
      Alert.alert('Error', 'Failed to save settings: ' + error.message);
    }
  };

  const clearHistory = () => {
    Alert.alert(
      'Clear Data',
      'Are you sure you want to delete all sensor logs? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await supabase
                .from('sensor_data')
                .delete()
                .neq('id', 0); // Delete all records

              Alert.alert('Success', 'All sensor logs have been deleted');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleCalibrateTemp = async () => {
    setCommandLoading(true);
    const result = await calibrateSensor(DEVICE_ID, 'temp');
    setCommandLoading(false);
    
    if (result.success) {
      Alert.alert('Success', 'Temperature sensor calibration initiated');
    } else {
      Alert.alert('Error', `Calibration failed: ${result.error}`);
    }
  };

  const handleCalibrateHumid = async () => {
    setCommandLoading(true);
    const result = await calibrateSensor(DEVICE_ID, 'humid');
    setCommandLoading(false);
    
    if (result.success) {
      Alert.alert('Success', 'Humidity sensor calibration initiated');
    } else {
      Alert.alert('Error', `Calibration failed: ${result.error}`);
    }
  };

  const handleRebootDevice = async () => {
    Alert.alert(
      'Reboot Device',
      'This will restart your ESP32. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reboot',
          onPress: async () => {
            setCommandLoading(true);
            const result = await rebootDevice(DEVICE_ID);
            setCommandLoading(false);
            
            if (result.success) {
              Alert.alert('Success', 'Device reboot initiated. It will be back online in 10 seconds.');
            } else {
              Alert.alert('Error', `Reboot failed: ${result.error}`);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Alert Thresholds */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌡️ Alert Thresholds</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Min Temperature (°C)</Text>
            <TextInput
              style={styles.input}
              value={tempMin}
              onChangeText={setTempMin}
              keyboardType="decimal-pad"
              placeholder="20"
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Max Temperature (°C)</Text>
            <TextInput
              style={styles.input}
              value={tempMax}
              onChangeText={setTempMax}
              keyboardType="decimal-pad"
              placeholder="30"
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Min Humidity (%)</Text>
            <TextInput
              style={styles.input}
              value={humidMin}
              onChangeText={setHumidMin}
              keyboardType="decimal-pad"
              placeholder="40"
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Max Humidity (%)</Text>
            <TextInput
              style={styles.input}
              value={humidMax}
              onChangeText={setHumidMax}
              keyboardType="decimal-pad"
              placeholder="80"
            />
          </View>
        </View>

        {/* Auto Mist Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💨 Auto Mist Settings</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Target Humidity (%)</Text>
            <TextInput
              style={styles.input}
              value={humidTarget}
              onChangeText={setHumidTarget}
              keyboardType="decimal-pad"
              placeholder="60"
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Mist Duration (seconds)</Text>
            <TextInput
              style={styles.input}
              value={mistDuration}
              onChangeText={setMistDuration}
              keyboardType="number-pad"
              placeholder="30"
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Cooldown Period (seconds)</Text>
            <TextInput
              style={styles.input}
              value={mistCooldown}
              onChangeText={setMistCooldown}
              keyboardType="number-pad"
              placeholder="300"
            />
          </View>
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Alerts</Text>
            <Switch
              value={alertsEnabled}
              onValueChange={setAlertsEnabled}
              trackColor={{ false: '#E0E0E0', true: '#81b0ff' }}
              thumbColor={alertsEnabled ? '#667EEA' : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Sound Notifications</Text>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#E0E0E0', true: '#81b0ff' }}
              thumbColor={soundEnabled ? '#667EEA' : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Critical Alerts Only</Text>
            <Switch
              value={criticalOnly}
              onValueChange={setCriticalOnly}
              trackColor={{ false: '#E0E0E0', true: '#81b0ff' }}
              thumbColor={criticalOnly ? '#667EEA' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Farm Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏠 Farm Information</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Farm Name</Text>
            <TextInput
              style={styles.input}
              value={farmName}
              onChangeText={setFarmName}
              placeholder="My Mushroom Farm"
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Living Room"
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Device ID</Text>
            <TextInput
              style={styles.input}
              value={deviceId}
              onChangeText={setDeviceId}
              placeholder="ESP32-001"
            />
          </View>
        </View>

        {/* System Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ System Settings</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Temperature Unit (°{tempUnit})</Text>
            <TouchableOpacity
              style={styles.unitToggle}
              onPress={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')}
            >
              <Text style={styles.unitToggleText}>{tempUnit}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E0E0E0', true: '#81b0ff' }}
              thumbColor={darkMode ? '#667EEA' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* System Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ System Information & Calibration</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device Status</Text>
            <Text style={[styles.infoValue, { color: '#51CF66' }]}>Connected</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Sync</Text>
            <Text style={styles.infoValue}>{new Date().toLocaleTimeString()}</Text>
          </View>

          <Text style={[styles.settingLabel, { marginTop: 15, marginBottom: 10 }]}>Sensor Calibration</Text>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleCalibrateTemp}
            disabled={commandLoading}
          >
            {commandLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.actionButtonText}>📏 Calibrate Temperature</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { marginTop: 8 }]} 
            onPress={handleCalibrateHumid}
            disabled={commandLoading}
          >
            {commandLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.actionButtonText}>💧 Calibrate Humidity</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dangerButton, { marginTop: 12 }]} 
            onPress={handleRebootDevice}
            disabled={commandLoading}
          >
            {commandLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.dangerButtonText}>🔄 Reboot Device</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Account</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>user@example.com</Text>
          </View>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Change Password</Text>
          </TouchableOpacity>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Data Management</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Data Retention</Text>
            <Text style={styles.infoValue}>90 days</Text>
          </View>

          <TouchableOpacity style={styles.exportButton}>
            <Text style={styles.exportButtonText}>📥 Export Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={clearHistory}>
            <Text style={styles.dangerButtonText}>🗑️ Clear All Logs</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
          <Text style={styles.saveButtonText}>💾 Save Settings</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 14,
  },
  settingRow: {
    marginBottom: 14,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1A1A1A',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  unitToggle: {
    backgroundColor: '#667EEA',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  unitToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  actionButton: {
    backgroundColor: '#667EEA',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  exportButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  dangerButton: {
    backgroundColor: '#FFE8E8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D32F2F',
  },
  saveButton: {
    backgroundColor: '#51CF66',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
