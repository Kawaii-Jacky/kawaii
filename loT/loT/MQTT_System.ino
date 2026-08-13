#include <WiFi.h>
#include <esp_arduino_version.h>
#include <mqtt_client.h>
#include <esp_crt_bundle.h>

#if DEVICE_MQTT_VERIFY_TLS != 1
#error "TLS certificate verification must remain enabled"
#endif

static esp_mqtt_client_handle_t mqttClient = nullptr;
static volatile bool mqttConnected = false;
static unsigned long lastWifiAttempt = 0;

static String escapeJson(const String& value) {
  String result = value;
  result.replace("\\", "\\\\");
  result.replace("\"", "\\\"");
  result.replace("\r", "\\r");
  result.replace("\n", "\\n");
  return result;
}

bool mqttIsConnected() { return mqttConnected; }

void mqttPublishState(const char* key, const String& value) {
  if (!mqttConnected || mqttClient == nullptr) return;
  String payload = String("{\"key\":\"") + key + "\",\"value\":\"" + escapeJson(value) + "\"}";
  esp_mqtt_client_publish(mqttClient, DEVICE_MQTT_TOPIC_REPORTED, payload.c_str(), payload.length(), DEVICE_MQTT_QOS, 0);
}

void mqttPublishState(const char* key, int value) {
  if (!mqttConnected || mqttClient == nullptr) return;
  String payload = String("{\"key\":\"") + key + "\",\"value\":" + String(value) + "}";
  esp_mqtt_client_publish(mqttClient, DEVICE_MQTT_TOPIC_REPORTED, payload.c_str(), payload.length(), DEVICE_MQTT_QOS, 0);
}

void mqttPublishState(const char* key, unsigned long value) { mqttPublishState(key, static_cast<int>(value)); }

void mqttPublishState(const char* key, float value) {
  if (!mqttConnected || mqttClient == nullptr) return;
  String payload = String("{\"key\":\"") + key + "\",\"value\":" + String(value, 3) + "}";
  esp_mqtt_client_publish(mqttClient, DEVICE_MQTT_TOPIC_REPORTED, payload.c_str(), payload.length(), DEVICE_MQTT_QOS, 0);
}

void mqttLog(const String& message) {
  Serial.println(message);
  mqttPublishState("log", message);
}

static String jsonString(const String& json, const char* key) {
  String marker = String("\"") + key + "\"";
  int keyPos = json.indexOf(marker);
  if (keyPos < 0) return String();
  int colon = json.indexOf(':', keyPos + marker.length());
  int first = json.indexOf('"', colon + 1);
  int last = json.indexOf('"', first + 1);
  if (colon < 0 || first < 0 || last < 0) return String();
  return json.substring(first + 1, last);
}

static long jsonLong(const String& json, const char* key, long fallback) {
  String marker = String("\"") + key + "\"";
  int keyPos = json.indexOf(marker);
  if (keyPos < 0) return fallback;
  int colon = json.indexOf(':', keyPos + marker.length());
  if (colon < 0) return fallback;
  int end = json.indexOf(',', colon + 1);
  if (end < 0) end = json.indexOf('}', colon + 1);
  if (end < 0) end = json.length();
  String number = json.substring(colon + 1, end);
  number.trim();
  return number.toInt();
}

static bool jsonBool(const String& json, const char* key, bool fallback) {
  String marker = String("\"") + key + "\"";
  int keyPos = json.indexOf(marker);
  if (keyPos < 0) return fallback;
  int colon = json.indexOf(':', keyPos + marker.length());
  if (colon < 0) return fallback;
  String value = json.substring(colon + 1);
  value.trim();
  return value.startsWith("true") || value.startsWith("1");
}

static void handleMqttCommand(const String& json) {
  String command = jsonString(json, "command");
  if (command.isEmpty()) command = jsonString(json, "action");
  command.toLowerCase();
  if (command == "mosfet") handleMosfetControl(jsonLong(json, "state", 0));
  else if (command == "heater_mode") { heaterAutoMode = jsonBool(json, "enabled", heaterAutoMode); saveSettingsToEEPROM(); }
  else if (command == "heater") setHeaterState(jsonBool(json, "state", false));
  else if (command == "fan_mode") fanAutoMode = jsonBool(json, "enabled", fanAutoMode);
  else if (command == "fan") { fanManualState = jsonBool(json, "state", fanManualState); if (!fanAutoMode) setFanState(fanManualState); }
  else if (command == "fan_threshold") setFanTempThreshold((uint8_t)jsonLong(json, "value", fanTempThreshold));
  else if (command == "camera") setCameraPower(jsonBool(json, "state", false));
  else if (command == "motor_forward") motorForward();
  else if (command == "motor_reverse") motorReverse();
  else if (command == "motor_stop") { digitalWrite(MOTOR_FORWARD_PIN, LOW); digitalWrite(MOTOR_REVERSE_PIN, LOW); motorForwardState = false; motorReverseState = false; }
  else if (command == "onstep") { int action = jsonLong(json, "action", 0); if (action == 1) sendDateTimeToOnStep(); else if (action == 2) sendParkCommand(); else if (action == 3) sendUnparkCommand(); else if (action == 4) sendHomeCommand(); else if (action == 5) setCurrentPositionAsHome(); else if (action == 6) setCurrentPositionAsPark(); }
  else if (command == "debug") sendAllDebugInfo();
  else if (command == "terminal") processTerminalCommand(jsonString(json, "value"));
  else { mqttLog(String("unknown command: ") + command); return; }
  mqttPublishState("last_command", command);
}

static void processMqttEvent(esp_mqtt_event_handle_t event) {
  if (event->event_id == MQTT_EVENT_CONNECTED) {
    mqttConnected = true;
    esp_mqtt_client_subscribe(event->client, DEVICE_MQTT_TOPIC_COMMAND, DEVICE_MQTT_QOS);
    esp_mqtt_client_subscribe(event->client, DEVICE_MQTT_TOPIC_DESIRED, DEVICE_MQTT_QOS);
    esp_mqtt_client_publish(event->client, DEVICE_MQTT_TOPIC_STATUS, DEVICE_MQTT_STATUS_ONLINE, 0, DEVICE_MQTT_QOS, 1);
    Serial.println("MQTT WSS connected");
  } else if (event->event_id == MQTT_EVENT_DISCONNECTED) {
    mqttConnected = false;
    Serial.println("MQTT disconnected");
  } else if (event->event_id == MQTT_EVENT_DATA) {
    String topic(event->topic, event->topic_len);
    String payload(event->data, event->data_len);
    if (topic == DEVICE_MQTT_TOPIC_COMMAND || topic == DEVICE_MQTT_TOPIC_DESIRED) handleMqttCommand(payload);
  } else if (event->event_id == MQTT_EVENT_ERROR) {
    Serial.println("MQTT transport/TLS error");
  }
}

#if ESP_ARDUINO_VERSION_MAJOR >= 3
static void mqttEventHandler(void*, esp_event_base_t, int32_t, void* eventData) {
  processMqttEvent(static_cast<esp_mqtt_event_handle_t>(eventData));
}
#else
static esp_err_t mqttEventHandler(esp_mqtt_event_handle_t event) {
  processMqttEvent(event);
  return ESP_OK;
}
#endif

static void connectMqtt() {
  if (mqttClient != nullptr || WiFi.status() != WL_CONNECTED) return;
  esp_mqtt_client_config_t config = {};
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  config.broker.address.uri = DEVICE_MQTT_URI;
  config.credentials.client_id = DEVICE_MQTT_CLIENT_ID;
  config.credentials.username = DEVICE_MQTT_USERNAME;
  config.credentials.authentication.password = DEVICE_MQTT_PASSWORD;
  config.session.last_will.topic = DEVICE_MQTT_TOPIC_STATUS;
  config.session.last_will.msg = DEVICE_MQTT_STATUS_OFFLINE;
  config.session.last_will.qos = DEVICE_MQTT_QOS;
  config.session.last_will.retain = 1;
  config.session.keepalive = DEVICE_MQTT_KEEPALIVE_SEC;
  config.network.reconnect_timeout_ms = DEVICE_MQTT_RETRY_INTERVAL_MS;
  config.broker.verification.crt_bundle_attach = esp_crt_bundle_attach;
#else
  config.uri = DEVICE_MQTT_URI;
  config.client_id = DEVICE_MQTT_CLIENT_ID;
  config.username = DEVICE_MQTT_USERNAME;
  config.password = DEVICE_MQTT_PASSWORD;
  config.lwt_topic = DEVICE_MQTT_TOPIC_STATUS;
  config.lwt_msg = DEVICE_MQTT_STATUS_OFFLINE;
  config.lwt_qos = DEVICE_MQTT_QOS;
  config.lwt_retain = 1;
  config.keepalive = DEVICE_MQTT_KEEPALIVE_SEC;
  config.reconnect_timeout_ms = DEVICE_MQTT_RETRY_INTERVAL_MS;
  config.crt_bundle_attach = esp_crt_bundle_attach;
  config.event_handle = mqttEventHandler;
#endif
  mqttClient = esp_mqtt_client_init(&config);
  if (mqttClient == nullptr) { Serial.println("MQTT client init failed"); return; }
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  esp_mqtt_client_register_event(mqttClient, MQTT_EVENT_ANY, mqttEventHandler, nullptr);
#endif
  esp_mqtt_client_start(mqttClient);
}

static void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  unsigned long now = millis();
  if (now - lastWifiAttempt < DEVICE_WIFI_RETRY_INTERVAL_MS) return;
  lastWifiAttempt = now;
  WiFi.mode(WIFI_STA);
  WiFi.begin(DEVICE_WIFI_SSID, DEVICE_WIFI_PASSWORD);
  Serial.printf("WiFi connecting: %s\n", DEVICE_WIFI_SSID);
}

void initMqttSystem() {
  ensureWifi();
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < DEVICE_WIFI_CONNECT_TIMEOUT_MS) delay(250);
  if (WiFi.status() == WL_CONNECTED) { Serial.println("WiFi connected"); connectMqtt(); }
  else Serial.println("WiFi timeout; retrying in loop");
}

void mqttLoop() { ensureWifi(); if (WiFi.status() == WL_CONNECTED && mqttClient == nullptr) connectMqtt(); }

void publishTelemetry() {
  if (!mqttConnected || mqttClient == nullptr) return;
  char payload[768];
  const int n = snprintf(payload, sizeof(payload),
    "{\"device\":\"%s\",\"dht_temperature\":%.1f,\"dht_humidity\":%.1f,\"utc_temperature\":%.1f,\"output_voltage\":%.2f,\"output_current\":%.2f,\"power_output\":%.2f,\"rain_analog\":%u,\"rain_detected\":%s,\"heater\":%s,\"fan\":%s,\"mosfet\":%s,\"camera\":%s,\"bluetooth\":%s}",
    DEVICE_MQTT_CLIENT_ID, dhtTemperature, dhtHumidity, utcTemperature, outputVoltage, outputCurrent, powerOutput,
    (unsigned)rainAnalogValue, rainDetected ? "true" : "false", heaterState ? "true" : "false", fanState ? "true" : "false",
    mosfetState ? "true" : "false", cameraPowerState ? "true" : "false", btConnected ? "true" : "false");
  if (n > 0 && n < (int)sizeof(payload)) esp_mqtt_client_publish(mqttClient, DEVICE_MQTT_TOPIC_TELEMETRY, payload, n, DEVICE_MQTT_QOS, 0);
}
