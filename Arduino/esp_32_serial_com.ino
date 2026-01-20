#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"

// ===== WIFI =====
const char* ssid = "Converge_2.4GHz_ngC9";
const char* password = "EXwT3K6c";

// ===== SUPABASE =====
const char* supabaseUrl =
  "https://toorvgiehomhdycemphy.supabase.co/rest/v1/sensor_data";
const char* apiKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb3J2Z2llaG9taGR5Y2VtcGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzkxMTksImV4cCI6MjA4MTc1NTExOX0.TQq6wHKUHVs0rwrJFf_cBhAYpHPiGEYC84koUCMGxog";

// ===== DHT =====
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ===== Manual Mist =====
bool mistManual = false; // Updated from Supabase

// ===== Fetch manual mist state from Supabase =====
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
      state = (val == 't'); // true if 't', false if 'f'
    }
  }

  http.end();
  return state;
}

void setup() {
  Serial.begin(115200);                        // USB debug
  Serial2.begin(9600, SERIAL_8N1, 16, 17);    // TX2 → Arduino RX
  dht.begin();

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  String status = "OK";

  // ===== DHT ERROR =====
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    status = "Failed to read from DHT sensor!";
    Serial2.println("ERR"); // Send error to Arduino
  } else {
    // FETCH manual mist state
    mistManual = fetchMistState();

    // Send data + mist command to Arduino
    Serial2.print(temperature, 1);
    Serial2.print(",");
    Serial2.print(humidity, 1);
    Serial2.print(",");
    Serial2.println(mistManual ? "MIST_ON" : "MIST_AUTO");
  }

  // ===== SEND TO SUPABASE =====
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
    Serial.println("HTTP Code: " + String(code));
    http.end();
  }

  delay(5000); // 5 seconds
}
