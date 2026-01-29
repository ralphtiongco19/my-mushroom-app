#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

// ===== WIFI =====
const char* ssid = "Converge_2.4GHz_ngC9";
const char* password = "EXwT3K6c";

// ===== SUPABASE =====
const char* supabaseUrl = "https://toorvgiehomhdycemphy.supabase.co/rest/v1/sensor_data";
const char* supabaseBase = "https://toorvgiehomhdycemphy.supabase.co";
const char* apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb3J2Z2llaG9taGR5Y2VtcGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzkxMTksImV4cCI6MjA4MTc1NTExOX0.TQq6wHKUHVs0rwrJFf_cBhAYpHPiGEYC84koUCMGxog";
const String DEVICE_ID = "esp32-main";

// ===== DHT =====
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ===== MIST CONTROL =====
#define MIST_PIN 23
bool mistManual = false;
bool mistActive = false;
unsigned long lastMistTime = 0;

// ===== TIMERS =====
unsigned long lastDataSend = 0;
unsigned long lastCommandCheck = 0;
unsigned long dataSendInterval = 5000;      // Send sensor data every 5s
unsigned long commandCheckInterval = 5000;  // Check commands every 5s

// ===== DEVICE SETTINGS =====
struct DeviceSettings {
  float temp_min = 20.0;
  float temp_max = 30.0;
  float humid_min = 40.0;
  float humid_max = 80.0;
  bool auto_mist_enabled = true;
  int auto_mist_interval = 300;
  int mist_duration = 30;
} settings;

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n===== ESP32 Mushroom Monitor v2.0 =====");

  // Initialize pins
  Serial2.begin(9600, SERIAL_8N1, 16, 17);  // TX2 → Arduino RX
  pinMode(MIST_PIN, OUTPUT);
  digitalWrite(MIST_PIN, LOW);
  
  dht.begin();

  // Connect to WiFi
  connectToWiFi();
  
  // Load settings from Supabase
  loadSettingsFromSupabase();
}

// ===== MAIN LOOP =====
void loop() {
  // Maintain WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  // Read sensors and send data
  if (millis() - lastDataSend >= dataSendInterval) {
    readAndSendSensorData();
    lastDataSend = millis();
  }

  // Check for pending commands
  if (millis() - lastCommandCheck >= commandCheckInterval) {
    checkAndExecuteCommands();
    lastCommandCheck = millis();
  }

  // Handle mist duration
  if (mistActive && (millis() - lastMistTime >= (settings.mist_duration * 1000UL))) {
    stopMist();
  }

  delay(100);
}

// ===== WIFI CONNECTION =====
void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to WiFi");
  }
}

// ===== READ SENSOR DATA =====
void readAndSendSensorData() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  String status = "OK";

  // DHT ERROR CHECK
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    status = "Failed to read from DHT sensor!";
    Serial2.println("ERR");
  } else {
    // Fetch mist state from Supabase
    mistManual = fetchMistState();

    // Send to Arduino via Serial2
    Serial2.print(temperature, 1);
    Serial2.print(",");
    Serial2.print(humidity, 1);
    Serial2.print(",");
    Serial2.println(mistManual ? "MIST_ON" : "MIST_AUTO");

    Serial.print("Temp: ");
    Serial.print(temperature, 1);
    Serial.print("°C, Humidity: ");
    Serial.print(humidity, 1);
    Serial.print("%, Mist: ");
    Serial.println(mistManual ? "ON" : "AUTO");
  }

  // SEND TO SUPABASE
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(supabaseUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", apiKey);
    http.addHeader("Authorization", String("Bearer ") + apiKey);
    http.addHeader("Prefer", "return=minimal");

    String json;
    if (status == "OK") {
      json = "{\"temperature\":" + String(temperature, 1) +
             ",\"humidity\":" + String(humidity, 1) +
             ",\"status\":\"OK\"}";
    } else {
      json = "{\"status\":\"Failed to read from DHT sensor!\"}";
    }

    int code = http.POST(json);
    Serial.println("Supabase HTTP: " + String(code));
    http.end();
  }
}

// ===== FETCH MIST STATE FROM SUPABASE =====
bool fetchMistState() {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin("https://toorvgiehomhdycemphy.supabase.co/rest/v1/mist_control?id=eq.1");
  http.addHeader("apikey", apiKey);
  http.addHeader("Authorization", String("Bearer ") + apiKey);

  int code = http.GET();
  bool state = false;

  if (code == 200) {
    String payload = http.getString();
    int stateIndex = payload.indexOf("\"state\":");
    if (stateIndex > 0) {
      char val = payload.charAt(stateIndex + 8);
      state = (val == 't');
    }
  }

  http.end();
  return state;
}

// ===== CHECK FOR PENDING COMMANDS =====
void checkAndExecuteCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(supabaseBase) + "/rest/v1/device_commands?device_id=eq." + DEVICE_ID + "&status=eq.pending&order=created_at.asc&limit=1";

  http.begin(url);
  http.addHeader("Authorization", String("Bearer ") + apiKey);
  http.addHeader("apikey", apiKey);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("Command data: " + payload);

    DynamicJsonDocument doc(2048);
    if (deserializeJson(doc, payload) == DeserializationError::Ok) {
      if (doc.size() > 0) {
        JsonObject command = doc[0];
        String commandId = command["id"];
        String commandType = command["command_type"];

        Serial.println("Executing: " + commandType);

        bool success = executeCommand(commandType, command["command_data"]);
        markCommandExecuted(commandId, success);
      }
    }
  }

  http.end();
}

// ===== EXECUTE COMMAND =====
bool executeCommand(String commandType, JsonObject commandData) {
  if (commandType == "MANUAL_MIST") {
    int duration = commandData["duration"] | 5;
    Serial.println("Manual mist for " + String(duration) + "s");
    startMist();
    settings.mist_duration = duration;
    return true;
  }
  else if (commandType == "TOGGLE_AUTO_MIST") {
    bool enabled = commandData["enabled"] | true;
    settings.auto_mist_enabled = enabled;
    Serial.println("Auto mist: " + String(enabled ? "ON" : "OFF"));
    return true;
  }
  else if (commandType == "UPDATE_SETTINGS") {
    settings.temp_min = commandData["temp_min"] | 20.0;
    settings.temp_max = commandData["temp_max"] | 30.0;
    settings.humid_min = commandData["humid_min"] | 40.0;
    settings.humid_max = commandData["humid_max"] | 80.0;
    settings.auto_mist_interval = commandData["auto_mist_interval"] | 300;
    settings.mist_duration = commandData["mist_duration"] | 30;

    Serial.println("Settings updated:");
    Serial.println("  Temp: " + String(settings.temp_min) + "-" + String(settings.temp_max));
    Serial.println("  Humidity: " + String(settings.humid_min) + "-" + String(settings.humid_max));
    return true;
  }
  else if (commandType == "CALIBRATE_SENSOR") {
    String sensorType = commandData["sensor_type"];
    Serial.println("Calibrating " + sensorType);
    return true;
  }
  else if (commandType == "REBOOT") {
    Serial.println("Reboot command received");
    delay(2000);
    ESP.restart();
    return true;
  }

  return false;
}

// ===== MARK COMMAND AS EXECUTED =====
void markCommandExecuted(String commandId, bool success) {
  HTTPClient http;
  String url = String(supabaseBase) + "/rest/v1/device_commands?id=eq." + commandId;

  http.begin(url);
  http.addHeader("Authorization", String("Bearer ") + apiKey);
  http.addHeader("apikey", apiKey);
  http.addHeader("Content-Type", "application/json");

  String statusValue = success ? "completed" : "failed";
  String payload = "{\"status\":\"" + statusValue + "\"}";

  int httpCode = http.PATCH(payload);
  Serial.println("Command marked as " + statusValue + " (HTTP " + String(httpCode) + ")");

  http.end();
}

// ===== LOAD SETTINGS FROM SUPABASE =====
void loadSettingsFromSupabase() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(supabaseBase) + "/rest/v1/settings?id=eq.1";

  http.begin(url);
  http.addHeader("Authorization", String("Bearer ") + apiKey);
  http.addHeader("apikey", apiKey);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();

    DynamicJsonDocument doc(2048);
    if (deserializeJson(doc, payload) == DeserializationError::Ok) {
      if (doc.size() > 0) {
        JsonObject setting = doc[0];
        settings.temp_min = setting["temp_min"] | 20.0;
        settings.temp_max = setting["temp_max"] | 30.0;
        settings.humid_min = setting["humid_min"] | 40.0;
        settings.humid_max = setting["humid_max"] | 80.0;
        settings.auto_mist_enabled = setting["auto_mist_enabled"] | true;
        settings.auto_mist_interval = setting["auto_mist_interval"] | 300;
        settings.mist_duration = setting["mist_duration"] | 30;

        Serial.println("Settings loaded from Supabase");
        Serial.println("Temp range: " + String(settings.temp_min) + "-" + String(settings.temp_max));
        Serial.println("Humidity range: " + String(settings.humid_min) + "-" + String(settings.humid_max));
      }
    }
  }

  http.end();
}

// ===== MIST CONTROL =====
void startMist() {
  digitalWrite(MIST_PIN, HIGH);
  mistActive = true;
  lastMistTime = millis();
  Serial.println("Mist started");
}

void stopMist() {
  digitalWrite(MIST_PIN, LOW);
  mistActive = false;
  Serial.println("Mist stopped");
}
