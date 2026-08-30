# 单 ESP32 合并固件（降压板 PCB 映射版）

本目录把 IoT 与 MPPT 固件合并到同一颗 ESP32。`loT.ino` 提供唯一的 `setup()`/`loop()`，MPPT 原入口已重命名为 `mpptSetup()`/`mpptLoop()` 并由主循环调用。

## 以 PCB 为准的映射

| 功能 | GPIO | 说明 |
| --- | ---: | --- |
| DHT11 数据 | 23 | PCB `S1_2` |
| 无线 WS4460 数据/控制 | 18/19 | PCB `U46`，不可分配给 IoT |
| MPPT 回流 MOSFET | 27 | PCB `R21/Q8` |
| MPPT PWM / EN | 33 / 32 | PCB `R32/R33` |
| MPPT 温度 NTC | 34 | PCB `CN10_2` |
| IoT INA226 | I2C `0x42` | 按要求修改；需确认 A0/A1 硬件跳线 |
| MPPT INA226 | I2C `0x40` / `0x41` | 继续使用原配置 |
| IoT 雨量数字 | 4 | 避开无线 GPIO19；需确认 PCB 外部走线 |
| IoT 雨量模拟 | 26 | 原 GPIO39 未引出；需确认 PCB 外部走线 |
| IoT MOSFET | 25 | 原 GPIO2 未引出；需确认 PCB 外部走线 |
| 摄像头电源 | 0 | 原 GPIO5 未引出；GPIO0 有启动绑带风险 |
| 风扇低端开关 | 14 | PCB `U28` 栅极；IoT/MPPT 共用 |

GPIO18/19 已为无线模块保留。原 PCB 没有 GPIO2、GPIO5、GPIO39 网络，因此这些功能的重映射只有在 PCB 已存在备用走线或后续改板后才会真正生效。

## EEPROM

MPPT 参数地址整体增加 `MPPT_EEPROM_BASE=256`，避免与 IoT EEPROM 地址重叠；合并固件使用 1024 字节 EEPROM 空间。

## 注意

当前环境未安装 `arduino-cli`，尚未完成实际编译。烧录前必须核对无线模块、NTC、摄像头、雨量传感器的实际走线，并确认 INA226 的 A0/A1 地址配置。
