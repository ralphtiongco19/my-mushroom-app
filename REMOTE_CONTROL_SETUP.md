# Remote Control System Setup Guide

## Overview

Your mushroom monitoring app now has a **full remote control system** that allows real-time command execution on your ESP32 or Arduino devices. The system works through Supabase as a command broker.

## Architecture

```
Mobile App ─→ [Command] ─→ Supabase (device_commands table)
                           ↓
                      ESP32/Arduino polls every 5 seconds
                           ↓
                        Executes command
                           ↓
                      Updates status in device_status table
                           ↓
Mobile App ←─ [Status] ←─ Supabase
```

## Step 1: Supabase Database Setup

Execute this SQL in your Supabase SQL Editor:

```sql
-- Device Commands Table (for app → device communication)
CREATE TABLE device_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  command_type TEXT NOT NULL,
  command_data JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  error_message TEXT
);

-- Device Status Table (for device → app feedback)
CREATE TABLE device_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  last_command TEXT,
  last_command_status TEXT,
  device_online BOOLEAN DEFAULT FALSE,
  last_heartbeat TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_status ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view device commands" 
  ON device_commands FOR SELECT 
  USING (auth.role() = 'authenticated_user');

CREATE POLICY "Users can insert device commands" 
  ON device_commands FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated_user');

CREATE POLICY "Users can view device status" 
  ON device_status FOR SELECT 
  USING (auth.role() = 'authenticated_user');

CREATE POLICY "Users can update device status" 
  ON device_status FOR UPDATE 
  USING (auth.role() = 'authenticated_user');
```

## Step 2: Mobile App Configuration

### 1. Update DEVICE_ID in your screens

In both **DashboardScreen.js** and **SettingsScreen.js**, update:

```javascript
const DEVICE_ID = 'esp32-main'; // Change to your device identifier
```

This must match the device_id you'll use in your Arduino code.

### 2. The command system is already integrated:

- **DashboardScreen.js**: 
  - Toggle Auto Mist → sends `TOGGLE_AUTO_MIST` command
  - Manual Mist button → sends `MANUAL_MIST` command (5 seconds)

- **SettingsScreen.js**:
  - Save Settings → sends `UPDATE_SETTINGS` command with thresholds
  - Calibrate Temperature → sends `CALIBRATE_SENSOR` with type='temp'
  - Calibrate Humidity → sends `CALIBRATE_SENSOR` with type='humid'
  - Reboot Device → sends `REBOOT` command

## Step 3: Arduino/ESP32 Setup

### For ESP32:

1. **Install Libraries** (Arduino IDE):
   - Search for and install:
     - `DHT sensor library` by Adafruit
     - `ArduinoJson` by Benoit Blanchon
     - Check if `supabase-arduino` is available (or use HTTP directly)

2. **Configure the sketch** (esp32_supabase_command_handler.ino):
   ```cpp
   const char* WIFI_SSID = "YOUR_SSID";
   const char* WIFI_PASSWORD = "YOUR_PASSWORD";
   const char* SUPABASE_URL = "https://your-project.supabase.co";
   const char* SUPABASE_KEY = "YOUR_ANON_KEY";
   const String DEVICE_ID = "esp32-main";
   
   #define DHT_PIN 4      // Your DHT pin
   #define MIST_PIN 23    // Your relay pin
   ```

3. **Upload the sketch** to your ESP32

4. **Monitor serial output** to see command execution

### For Arduino (with Ethernet Shield):

1. **Install Libraries**:
   - Built-in: Ethernet
   - Search for: `ArduinoJson`

2. **Configure the sketch** (arduino_supabase_command_handler.ino):
   ```cpp
   byte mac[] = {0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED};
   IPAddress ip(192, 168, 1, 100);
   const char* SUPABASE_KEY = "YOUR_ANON_KEY";
   const String DEVICE_ID = "arduino-main";
   
   const int MIST_RELAY_PIN = 8;
   ```

3. **Upload to Arduino**

## Step 4: Available Commands

### 1. MANUAL_MIST
Trigger mist for specified duration
```javascript
triggerMist(deviceId, duration) // duration in seconds
```

### 2. TOGGLE_AUTO_MIST
Enable/disable automatic mist
```javascript
toggleAutoMist(deviceId, enabled) // boolean
```

### 3. UPDATE_SETTINGS
Send threshold settings to device
```javascript
updateDeviceSettings(deviceId, {
  temp_min: 20,
  temp_max: 30,
  humid_min: 40,
  humid_max: 80,
  auto_mist_enabled: true,
  auto_mist_interval: 300,
  mist_duration: 30
})
```

### 4. CALIBRATE_SENSOR
Calibrate temperature or humidity sensor
```javascript
calibrateSensor(deviceId, 'temp') // or 'humid'
```

### 5. REBOOT
Reboot the device
```javascript
rebootDevice(deviceId)
```

## Step 5: Testing

### From Mobile App:
1. Go to **Dashboard** → Toggle Auto Mist (should see command sent)
2. Go to **Dashboard** → Manual Mist (5-second trigger)
3. Go to **Settings** → Change thresholds → Save (sends UPDATE_SETTINGS)
4. Go to **Settings** → Calibrate buttons

### Monitor Command Status:
1. Open Supabase Dashboard
2. Go to **device_commands** table
3. Watch for new commands appearing
4. See them change from `pending` → `completed`

## Troubleshooting

### Commands not executing?
- Check that your device_id in app matches device_id in Arduino code
- Verify WiFi/Ethernet connectivity on device
- Check Arduino serial monitor for errors
- Ensure Supabase URL and API key are correct

### No response from device?
- Device might be offline - check last_heartbeat in device_status table
- Verify device is polling for commands (default: every 5 seconds)
- Check Supabase RLS policies allow device access

### Settings not updating device?
- Confirm command was created in device_commands table
- Check if device picked up the command (would be marked as 'completed')
- Verify device settings are being applied (add Serial.println in Arduino)

## Extending the System

To add new commands:

1. **Add to deviceCommandManager.js**:
```javascript
export const myNewCommand = async (deviceId, data) => {
  return sendDeviceCommand(deviceId, 'MY_COMMAND', data);
};
```

2. **Use in your screen**:
```javascript
import { myNewCommand } from '../deviceCommandManager';
const result = await myNewCommand(DEVICE_ID, { param: value });
```

3. **Handle in Arduino**:
```cpp
else if (commandType == "MY_COMMAND") {
  // Execute your logic
  return true;
}
```

## Real-Time Status Monitoring

The device_status table stores:
- `device_online`: Boolean - is device connected?
- `last_heartbeat`: When device last reported
- `last_command_status`: What the device is currently doing
- `last_command`: The last executed command

You can enhance the app to show this in a "Device Status" screen if desired.

---

**Note**: The command system is production-ready but always test thoroughly before deploying to production. Adjust command polling intervals (default 5 seconds) based on your needs and network bandwidth.
