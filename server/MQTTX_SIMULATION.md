# MQTTX 模拟设备测试

## 一键公网 WSS 模拟

以下两个脚本会从固件配置和服务器 `.env` 中读取现有凭据，凭据只在进程
内存中使用，不会写入日志或 MQTTX 配置文件：

```powershell
# 三个固件客户端分别发布遥测
& "D:\h2o\remote astro\server\scripts\mqttx-firmware-sim.ps1"

# backend-controller 下发命令，三个固件客户端分别订阅并确认收到
& "D:\h2o\remote astro\server\scripts\mqttx-command-roundtrip.ps1"
```

连接参数为 `wss://mqtt.astroy.xyz/mqtt`、端口 `443`、MQTT `3.1.1`、
QoS `1`。在 Windows PowerShell 中发布 JSON 时必须使用 MQTTX 的 `-s`
标准输入模式；直接使用 `-m` 会使 JSON 双引号被 PowerShell 参数解析移除。

本地启动 API 后，用 MQTTX 连接 Mosquitto（原生 MQTT 监听端口，默认
`127.0.0.1:1883`），使用对应设备账号发布下列消息。不要让设备账号发布到
自己的 `command`；命令应由 API 或 `backend-controller` 发布。

## 模拟 loT / esp32-001

Topic:

```text
devices/esp32-001/status
```

```json
{"schema":1,"device":"esp32-001","status":"online","ts":"2026-08-13T12:00:00Z"}
```

Topic:

```text
devices/esp32-001/telemetry
```

```json
{"schema":1,"device":"esp32-001","ts":"2026-08-13T12:00:05Z","seq":1,"data":{"dht_temperature":24.8,"dht_humidity":61.2,"utc_temperature":23.9,"output_voltage":12.18,"output_current":2.10,"power_output":25.6,"rain_analog":1018,"rain_detected":false,"heater":false,"fan":true,"mosfet":true,"camera":false}}
```

## 模拟 MPPT

Topic `devices/mppt-001/telemetry`，示例：

```json
{"schema":1,"device":"mppt-001","ts":"2026-08-13T12:00:05Z","seq":1,"data":{"power_input_w":42.6,"voltage_input_v":18.2,"current_input_a":2.34,"buck_power_w":38.1,"buck_voltage_v":12.4,"temperature":31,"pwm":96,"fan":1,"mode":1}}
```

## 模拟 EF

Topic `devices/ef-001/telemetry`，示例：

```json
{"schema":1,"device":"ef-001","ts":"2026-08-13T12:00:05Z","seq":1,"data":{"humidity":72,"servo":false,"led":true,"heater":false,"angle":0}}
```

## 从网页测试命令

在 Dashboard 点击加热、风扇、相机或 MOSFET 开关时，网页会调用：

```text
POST http://localhost:8080/api/v1/devices/esp32-001/commands
```

MQTTX 用 `backend-controller` 账号订阅：

```text
devices/esp32-001/command
devices/esp32-001/reported
```

模拟设备收到 command 后，在 `reported` 发布带相同 `id` 的确认消息，网页
终端面板即可显示实时事件。
