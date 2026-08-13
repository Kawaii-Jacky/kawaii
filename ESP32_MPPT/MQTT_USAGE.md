# ESP32 MPPT MQTT deployment

Edit `mppt_config.h` only for Wi-Fi and MQTT credentials. The broker endpoint is
`wss://mqtt.astroy.xyz/mqtt` and TLS verification remains enabled.

The original MPPT sensor API requires **INA226Lib 1.1.2 (Peter Buchegger)**;
do not install Rob Tillaart INA226 0.6.x alongside it for this sketch.

Topics:

- `devices/mppt-001/telemetry`
- `devices/mppt-001/status`
- `devices/mppt-001/command`
- `devices/mppt-001/reported`

Commands are JSON, for example:

```json
{"fan":true}
{"mode":1}
{"enable_fan":true}
{"debug":true}
```

The Blynk transport was replaced with one long-lived `esp-mqtt` client. The
telemetry path uses a fixed stack buffer (`char[768]`) instead of repeated
`String` concatenation, and it never recreates the client on each report. This
addresses the likely heap-fragmentation/connection-lifetime failure mode.

Compile with ESP32 Dev Module and `Huge APP (3MB No OTA/1MB SPIFFS)`.
