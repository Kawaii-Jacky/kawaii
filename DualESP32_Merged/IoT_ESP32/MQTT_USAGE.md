# ESP32 MQTT configuration and testing

This remains an Arduino `.ino` project. A separate ESP-IDF installation is not
required. MQTT over Cloudflare WSS is implemented with the `esp-mqtt` component
bundled in the Arduino-ESP32 board package.

## 1. Deployment configuration

Edit `device_config.h` before compiling:

- `DEVICE_WIFI_SSID`
- `DEVICE_WIFI_PASSWORD`
- `DEVICE_MQTT_PASSWORD`
- `DEVICE_CAMERA_RTSP_URL` (only if the Hikvision camera is used)

The broker URI, device ID and MQTT topics are in the same file. Hardware pins,
sensor calibration and EEPROM layout remain in `settings.h`.

Never disable TLS certificate verification. The firmware uses the ESP32 trusted
root certificate bundle for `wss://mqtt.astroy.xyz/mqtt`.

## 2. Arduino IDE settings

- Board package: ESP32 by Espressif Systems 2.0.9 (the version compiled and verified here)
- Board: ESP32 Dev Module
- Partition Scheme: `Huge APP (3MB No OTA/1MB SPIFFS)`
- Upload speed: use the speed supported by the connected board

Required libraries:

- DHT sensor library by Adafruit 1.4.7
- Adafruit Unified Sensor 1.1.15
- INA226 by Rob Tillaart 0.6.4

WiFi, EEPROM, BluetoothSerial, Ticker, ESP-NOW and esp-mqtt come from the ESP32
board package.

## 3. Topic layout

- Telemetry: `devices/esp32-001/telemetry`
- Online/offline status: `devices/esp32-001/status`
- Command results/logs: `devices/esp32-001/reported`
- Commands: `devices/esp32-001/command`
- Desired settings: `devices/esp32-001/desired`

Telemetry, status and reported are published by the ESP32. Command and desired
are subscribed by the ESP32.

## 4. Command payload examples

Publish JSON to `devices/esp32-001/command`:

```json
{"command":"mosfet","state":1}
```

```json
{"command":"heater_mode","enabled":true}
```

```json
{"command":"fan_mode","enabled":false}
```

```json
{"command":"fan","state":true}
```

```json
{"command":"fan_threshold","value":40}
```

```json
{"command":"camera","state":true}
```

```json
{"command":"motor_forward"}
```

```json
{"command":"motor_reverse"}
```

```json
{"command":"motor_stop"}
```

OnStep actions use values 1 through 6: set time, park, unpark, home, set home,
and set park.

```json
{"command":"onstep","action":2}
```

Request a diagnostic report:

```json
{"command":"debug"}
```

## 5. MQTTX connection

- Protocol: MQTT over WebSocket
- Host: `mqtt.astroy.xyz`
- Port: `443`
- Path: `/mqtt`
- TLS: enabled
- MQTT version: 3.1.1

The current `esp32-001` broker account cannot publish to its own command topic;
that is intentional ACL separation. Use a separate controller/backend account
with write access to `devices/esp32-001/command` when remote control is enabled.
