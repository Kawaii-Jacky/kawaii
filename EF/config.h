#pragma once
#include <stdint.h>

#define WIFI_SSID "CHANGE_ME_WIFI_SSID"
#define WIFI_PASSWORD "CHANGE_ME_WIFI_PASSWORD"
#define MQTT_URI "wss://mqtt.astroy.xyz/mqtt"
#define MQTT_CLIENT_ID "ef-001"
#define MQTT_USERNAME "ef-001"
// Set a unique password for this device; do not reuse another device's credential.
#define MQTT_PASSWORD "40XuOzMF-xbUUK6_VCySj6cONkQpHJnU"
#define MQTT_ROOT "devices/ef-001"
#define MQTT_TELEMETRY MQTT_ROOT "/telemetry"
#define MQTT_STATUS MQTT_ROOT "/status"
#define MQTT_COMMAND MQTT_ROOT "/command"
#define MQTT_REPORTED MQTT_ROOT "/reported"
#define MQTT_QOS 1
#define MQTT_INTERVAL_MS 5000UL
#define WIFI_TIMEOUT_MS 20000UL
#define SERVO_PIN 5
#define LED_PIN 21
#define HEATER_PIN 4
#define SIGNAL_LED_PIN 2
#define EEPROM_SIZE 512
#define ANGLE_ADDRESS 0
#define BRIGHTNESS_ADDRESS 4
#define HUMI_THRESHOLD_ADDRESS 8
#define AUTO_HEATER_ADDRESS 12
#define HEATER_POWER_ADDRESS 16
#define SERVO_STEP_DELAY 50UL
#define SERVO_STEP_SIZE 5
