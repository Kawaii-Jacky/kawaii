# ESP32 工程统一构建矩阵

最后验证日期：2026-08-13

| 工程 | Arduino Core | 分区方案 | 外部库 | 编译结果 | 固件 |
|---|---|---|---|---|---|
| `ESP32_MPPT` | `esp32:esp32 2.0.9` | `huge_app` | `INA226Lib 1.1.2` | 通过 | `D:\\ArduinoTools\\build\\MPPT\\ESP32_MPPT.ino.bin` |
| `loT/loT` | `esp32:esp32 2.0.9` | `huge_app` | `DHT sensor library 1.4.7`, `Adafruit Unified Sensor 1.1.15`, `INA226Lib 1.1.2` | 通过 | `D:\\ArduinoTools\\build\\loT\\loT.ino.bin` |
| `EF` | `esp32:esp32 2.0.9` | `huge_app` | 无额外用户库（使用 ESP32 内置 Wi-Fi、ESP-NOW、MQTT、EEPROM） | 通过 | `D:\\ArduinoTools\\build\\EF\\EF.ino.bin` |

## 资源占用

- `ESP32_MPPT`：程序 964,789 bytes（30%），全局 RAM 46,032 bytes（14%）。
- `loT/loT`：程序 1,704,869 bytes（54%），全局 RAM 60,132 bytes（18%）。
- `EF`：程序 932,485 bytes（29%），全局 RAM 45,128 bytes（13%）。

三者使用同一 Arduino Core 和分区方案。不要在其中一个工程单独升级 ESP32 Core 后直接烧录；若升级，应三个工程一起重新编译并复核库 API。
