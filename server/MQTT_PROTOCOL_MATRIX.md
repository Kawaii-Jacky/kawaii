# ASTRA MQTT 协议矩阵

默认控制器使用 `devices/{device}/{kind}`；其他控制器使用 `controllers/{controllerId}/devices/{device}/{kind}`。`kind` 为 `telemetry`、`status`、`command`、`desired` 或 `reported`。

所有设备遥测必须包含匹配 Topic 的 `device`。推荐同时发送 `schema: 1`、UTC `ts` 和单调递增 `seq`。命令必须包含 `schema`、UUID `id`、`device`、UTC `ts`、`command`；ACK 必须回传相同的 `id`、`device`、`command` 和布尔值 `ok`。

## 遥测字段

| 设备 | 字段 |
|---|---|
| `esp32-001` | `dht_temperature`, `dht_humidity`, `utc_temperature`, `output_voltage`, `output_current`, `power_output`, `rain_analog`, `rain_detected`, `heater`, `heater_mode`, `fan`, `fan_mode`, `fan_threshold`, `mosfet`, `camera`, `cameraDurationMinutes`, `bluetooth`, `roof`, `roofPosition` |
| `mppt-001` | `power_input`, `battery_percent`, `current_input`, `buck_current`, `buck_power`, `voltage_input`, `buck_voltage`, `temperature`, `pwm`, `fan`, `enable_fan`, `mode`, `daily_energy`, `total_energy`, `buck_efficiency`, `days_running`, `voltage_battery_min`, `voltage_battery_max`, `current_charging`, `temperature_fan` |
| `ef-001` | `humidity`, `servo`, `servoMoving`, `led`, `heater`, `heater_mode`, `angle`, `maxAngle`, `brightness`, `humi_threshold`, `heater_power` |

物理范围和类型由 `app/device_protocol.py::TELEMETRY_FIELDS` 强制执行；未知字段、嵌套 `data`、NaN/Infinity、错设备和过期/超前时间都会被拒绝。

## 主控命令 `esp32-001`

| 命令 | 参数 | 前端用途 |
|---|---|---|
| `mosfet` | `state: 0/1` | 主电源 |
| `heater` | `state: bool` | 手动除露 |
| `heater_mode` | `enabled: bool` | 自动/手动除露 |
| `fan` | `state: bool` | 手动风扇 |
| `fan_mode` | `enabled: bool` | 自动/手动风扇 |
| `fan_threshold` | `value: 20..80` | 自动风扇温度 |
| `camera` | `state: bool` | 相机供电 |
| `camera_timer` | `minutes: 1..1439` | 自动关闭计时 |
| `bluetooth` | `state: bool` | OnStep 蓝牙连接 |
| `motor_forward` / `motor_reverse` / `motor_stop` | 无 | 屋顶控制 |
| `onstep` | `action: 1..6` | 同步、PARK、UNPARK、HOME 等 |
| `debug` | 无 | 诊断 |
| `terminal` | `value` 白名单 | `HELP/SHOW` 或三类 MAC 配置 |

## 能源命令 `mppt-001`

| 命令 | 参数 |
|---|---|
| `fan` | `state: bool`，固件字段为 `fan` |
| `enable_fan` | `state: bool`，固件字段为 `enable_fan` |
| `mode` | `value: 0/1`，固件字段为 `mode` |
| `voltage_battery_min` | `value: 8..20` |
| `voltage_battery_max` | `value: 12..48` |
| `current_charging` | `value: 0.1..20` |
| `temperature_fan` | `value: 20..80` |
| `settings` | 上述四项设置，且最大电压至少高 0.5V |
| `debug` / `terminal` | 诊断；终端仅允许 `HELP`、`STATUS` |

## 平场板命令 `ef-001`

| 命令 | 参数 |
|---|---|
| `servo` | `state: bool`, 可选 `angle: 0..300` |
| `led` | `state: bool`, 可选 `brightness: 0..100` |
| `heater` | `state: bool` |
| `heater_mode` | `enabled: bool` |
| `brightness` / `humi_threshold` / `heater_power` | `value: 0..100` |
| `angle` | `value: 0..300` |
| `debug` / `terminal` | 诊断；终端仅允许 `HELP`、`STATUS` |

## ACK 与失败

```json
{"schema":1,"device":"ef-001","id":"COMMAND_UUID","command":"brightness","ok":true}
```

```json
{"schema":1,"device":"ef-001","id":"COMMAND_UUID","command":"brightness","ok":false,"error":"brightness out of range"}
```

后端只接受来自同一控制器、同一逻辑设备且 ID 已存在的 ACK。错误设备 ACK 会被忽略；负 ACK 会按重试策略处理，达到最大次数后转为失败并产生告警。
