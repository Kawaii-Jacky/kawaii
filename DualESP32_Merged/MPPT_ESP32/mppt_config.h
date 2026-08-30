#pragma once
#define MPPT_WIFI_SSID "CHANGE_ME_WIFI_SSID"
#define MPPT_WIFI_PASSWORD "Czh040731"
#define MPPT_MQTT_URI "wss://mqtt.astroy.xyz/mqtt"
#define MPPT_MQTT_CLIENT_ID "mppt-001"
#define MPPT_MQTT_USERNAME "mppt-001"
// Set a unique password for this device; do not reuse another device's credential.
#define MPPT_MQTT_PASSWORD "ZnOtJV_wXCV3BBNnQQlCEMrmDww0nnDX"
#define MPPT_TOPIC_ROOT "devices/mppt-001"
#define MPPT_TOPIC_TELEMETRY MPPT_TOPIC_ROOT "/telemetry"
#define MPPT_TOPIC_STATUS MPPT_TOPIC_ROOT "/status"
#define MPPT_TOPIC_COMMAND MPPT_TOPIC_ROOT "/command"
#define MPPT_TOPIC_REPORTED MPPT_TOPIC_ROOT "/reported"
#define MPPT_MQTT_INTERVAL_MS 5000UL
#define MPPT_WIFI_TIMEOUT_MS 20000UL
#define MPPT_WIFI_RETRY_MS 10000UL
#define MPPT_MQTT_RETRY_MS 5000UL
#define MPPT_MQTT_QOS 1

// Power-stage control stability
#define MPPT_CONTROL_INTERVAL_MS 500UL
#define MPPT_POWER_DEADBAND_W 0.35f
#define MPPT_PANEL_VOLTAGE_DEADBAND_V 0.08f
#define MPPT_BATTERY_CV_DEADBAND_V 0.08f
#define MPPT_PWM_STEP 2
#define MPPT_MAX_PWM_STEP_PER_UPDATE 2
#define MPPT_MIN_INPUT_MARGIN_V 1.0f
#define MPPT_MAX_INPUT_VOLTAGE 100.0f
#define MPPT_MAX_OUTPUT_VOLTAGE 100.0f
