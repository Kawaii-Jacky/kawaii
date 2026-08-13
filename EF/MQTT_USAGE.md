# EF MQTT deployment

Edit `config.h` only:

```cpp
#define WIFI_SSID "your-wifi"
#define WIFI_PASSWORD "your-password"
#define MQTT_PASSWORD "the esp32-001 broker password"
```

The firmware uses `wss://mqtt.astroy.xyz/mqtt`, TLS certificate-bundle verification,
QoS 1 and a single MQTT client. Topics:

- `devices/ef-001/telemetry`
- `devices/ef-001/status`
- `devices/ef-001/command`
- `devices/ef-001/reported`

Examples for the command topic:

```json
{"command":"servo","state":true}
{"command":"angle","value":180}
{"command":"led","state":true,"brightness":60}
{"command":"heater","state":true}
{"command":"heater_mode","enabled":true}
{"command":"humi_threshold","value":80}
{"command":"heater_power","value":50}
```

Compile with ESP32 Dev Module and `Huge APP (3MB No OTA/1MB SPIFFS)`.
