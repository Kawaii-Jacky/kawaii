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
{"voltage_battery_min":10.0}
{"voltage_battery_max":14.4}
{"current_charging":2.0}
{"temperature_fan":60}
```

The four persistent power-stage settings use the same EEPROM locations as the
former Blynk controls. Accepted ranges are 8-20 V cutoff, 12-48 V full voltage,
0.1-20 A charge-current limit and 20-80 °C fan threshold. Full voltage must stay
at least 0.5 V above cutoff voltage. Invalid values are rejected and reported
on `devices/mppt-001/reported` without overwriting the existing setting.

The Blynk transport was replaced with one long-lived `esp-mqtt` client. The
telemetry path uses a fixed stack buffer (`char[768]`) instead of repeated
`String` concatenation, and it never recreates the client on each report. This
addresses the likely heap-fragmentation/connection-lifetime failure mode.

Compile with ESP32 Dev Module and `Huge APP (3MB No OTA/1MB SPIFFS)`.
