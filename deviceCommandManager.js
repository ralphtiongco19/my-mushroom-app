import { supabase } from './supabase';

// Send a command to a device
export const sendDeviceCommand = async (deviceId, commandType, commandData = {}) => {
  try {
    const { data, error } = await supabase
      .from('device_commands')
      .insert([
        {
          device_id: deviceId,
          command_type: commandType,
          command_data: commandData,
          status: 'pending'
        }
      ])
      .select();

    if (error) {
      console.error('Error sending command:', error);
      return { success: false, error: error.message };
    }

    console.log('Command sent:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Exception in sendDeviceCommand:', err);
    return { success: false, error: err.message };
  }
};

// Update settings on device
export const updateDeviceSettings = async (deviceId, settings) => {
  return sendDeviceCommand(deviceId, 'UPDATE_SETTINGS', {
    temp_min: settings.temp_min,
    temp_max: settings.temp_max,
    humid_min: settings.humid_min,
    humid_max: settings.humid_max,
    auto_mist_enabled: settings.auto_mist_enabled,
    auto_mist_interval: settings.auto_mist_interval,
    mist_duration: settings.mist_duration
  });
};

// Trigger manual mist
export const triggerMist = async (deviceId, duration = 5) => {
  return sendDeviceCommand(deviceId, 'MANUAL_MIST', {
    duration: duration
  });
};

// Toggle auto mist
export const toggleAutoMist = async (deviceId, enabled) => {
  return sendDeviceCommand(deviceId, 'TOGGLE_AUTO_MIST', {
    enabled: enabled
  });
};

// Calibrate sensors
export const calibrateSensor = async (deviceId, sensorType) => {
  return sendDeviceCommand(deviceId, 'CALIBRATE_SENSOR', {
    sensor_type: sensorType // 'temp' or 'humid'
  });
};

// Reboot device
export const rebootDevice = async (deviceId) => {
  return sendDeviceCommand(deviceId, 'REBOOT', {});
};

// Get device status
export const getDeviceStatus = async (deviceId) => {
  try {
    const { data, error } = await supabase
      .from('device_status')
      .select('*')
      .eq('device_id', deviceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching device status:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Exception in getDeviceStatus:', err);
    return null;
  }
};

// Subscribe to device command status changes
export const subscribeToDeviceStatus = (deviceId, callback) => {
  const subscription = supabase
    .from(`device_status:device_id=eq.${deviceId}`)
    .on('*', (payload) => {
      callback(payload.new);
    })
    .subscribe();

  return subscription;
};

// Subscribe to device command results
export const subscribeToCommandStatus = (callback) => {
  const subscription = supabase
    .from('device_commands')
    .on('UPDATE', (payload) => {
      callback(payload.new);
    })
    .subscribe();

  return subscription;
};
