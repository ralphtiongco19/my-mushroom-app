#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define RELAY_PIN 7   // Mist relay (active LOW)

// Humidity thresholds
int HUMIDITY_LOW = 85;
int HUMIDITY_HIGH = 92;

LiquidCrystal_I2C lcd(0x27, 16, 2);
String incoming = "";

void setup() {
  Serial.begin(9600);

  lcd.init();
  lcd.backlight();

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Relay OFF

  lcd.setCursor(0, 0);
  lcd.print("Waiting data...");
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      processData(incoming);
      incoming = "";
    } else {
      incoming += c;
    }
  }
}

void processData(String data) {
  lcd.clear();

  // ===== DHT ERROR =====
  if (data == "ERR") {
    lcd.setCursor(0, 0);
    lcd.print("DHT ERROR");
    lcd.setCursor(0, 1);
    lcd.print("Check sensor");
    digitalWrite(RELAY_PIN, HIGH); // Safety OFF
    return;
  }

  // ===== PARSE DATA =====
  int firstComma = data.indexOf(',');
  int secondComma = data.indexOf(',', firstComma + 1);

  float temp = data.substring(0, firstComma).toFloat();
  float hum = data.substring(firstComma + 1, secondComma).toFloat();
  String mistCommand = data.substring(secondComma + 1);

  // ===== MANUAL MIST OVERRIDE =====
  if (mistCommand == "MIST_ON") {
    digitalWrite(RELAY_PIN, LOW); // Mist ON
    lcd.setCursor(10, 1);
    lcd.print("ON ");
    return;
  } else if (mistCommand == "MIST_OFF") {
    digitalWrite(RELAY_PIN, HIGH); // Mist OFF
    lcd.setCursor(10, 1);
    lcd.print("OFF");
    return;
  }

  // ===== DISPLAY =====
  lcd.setCursor(0, 0);
  lcd.print("H:");
  lcd.print(hum, 1);
  lcd.print("%   ");

  lcd.setCursor(0, 1);
  lcd.print("T:");
  lcd.print(temp, 1);
  lcd.print("C ");

  // ===== AUTO HUMIDITY CONTROL =====
  if (hum < HUMIDITY_LOW) {
    digitalWrite(RELAY_PIN, LOW);
    lcd.setCursor(10, 1);
    lcd.print("ON ");
  } else if (hum > HUMIDITY_HIGH) {
    digitalWrite(RELAY_PIN, HIGH);
    lcd.setCursor(10, 1);
    lcd.print("OFF");
  }
}
