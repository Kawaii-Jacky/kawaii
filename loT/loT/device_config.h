#pragma once

// Device deployment settings. Edit this file only when moving the device.
// Do not put these values in individual .ino modules.

// Wi-Fi
#define DEVICE_WIFI_SSID "CHANGE_ME_WIFI_SSID"
#define DEVICE_WIFI_PASSWORD "CHANGE_ME_WIFI_PASSWORD"

// Optional camera endpoint (used only when HIKVISION_CAMERA is enabled).
#define DEVICE_CAMERA_RTSP_URL "rtsp://user:password@192.0.2.10:554/Streaming/Channels/101"
#define DEVICE_CAMERA_AUTO_OFF_MS 600000UL
#define DEVICE_CAMERA_STARTUP_DELAY_MS 3000UL

// Cloudflare Tunnel endpoint. Mosquitto is exposed as MQTT over WebSocket.
#define DEVICE_MQTT_URI "wss://mqtt.astroy.xyz/mqtt"
#define DEVICE_MQTT_CLIENT_ID "esp32-001"
#define DEVICE_MQTT_USERNAME "esp32-001"
#define DEVICE_MQTT_PASSWORD "CHANGE_ME_MQTT_PASSWORD"

// Topic layout must match the Mosquitto ACL on the server.
#define DEVICE_MQTT_TOPIC_ROOT "devices/esp32-001"
#define DEVICE_MQTT_TOPIC_TELEMETRY DEVICE_MQTT_TOPIC_ROOT "/telemetry"
#define DEVICE_MQTT_TOPIC_STATUS DEVICE_MQTT_TOPIC_ROOT "/status"
#define DEVICE_MQTT_TOPIC_REPORTED DEVICE_MQTT_TOPIC_ROOT "/reported"
#define DEVICE_MQTT_TOPIC_COMMAND DEVICE_MQTT_TOPIC_ROOT "/command"
#define DEVICE_MQTT_TOPIC_DESIRED DEVICE_MQTT_TOPIC_ROOT "/desired"

// Network timing
#define DEVICE_WIFI_CONNECT_TIMEOUT_MS 20000UL
#define DEVICE_WIFI_RETRY_INTERVAL_MS 10000UL
#define DEVICE_MQTT_RETRY_INTERVAL_MS 5000UL
#define DEVICE_MQTT_KEEPALIVE_SEC 60
#define DEVICE_MQTT_QOS 1
#define DEVICE_MQTT_REPORT_INTERVAL_MS 5000UL

// TLS is verified with the ESP32 root certificate bundle. Never set this false
// for the production tunnel.
#define DEVICE_MQTT_VERIFY_TLS 1

// Last-will payloads
#define DEVICE_MQTT_STATUS_ONLINE "{\"status\":\"online\"}"
#define DEVICE_MQTT_STATUS_OFFLINE "{\"status\":\"offline\"}"
