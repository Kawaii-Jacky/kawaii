# MQTTX 全链路模拟与验收

ASTRA 的遥测为扁平 JSON。`schema`、`device`、`ts`、`seq` 与具体遥测字段处于同一级，不能把读数包进 `data`。完整字段和命令以 `app/device_protocol.py` 及 `MQTT_PROTOCOL_MATRIX.md` 为准。

## 安全准备

建议在后台创建一套专用测试控制器，不要让模拟器与真实硬件共用 `default` Topic。测试凭据文件必须使用匹配 `*credentials*.json` 的名称；仓库根目录的 `.gitignore` 会排除它。

```json
{
  "controller_id": "observatory-999",
  "backend": {"username": "backend-controller-999", "password": "REPLACE_ME"},
  "devices": {
    "esp32-001": {"username": "esp32-999", "password": "REPLACE_ME"},
    "mppt-001": {"username": "mppt-999", "password": "REPLACE_ME"},
    "ef-001": {"username": "ef-999", "password": "REPLACE_ME"}
  }
}
```

脚本把 MQTTX 连接选项写到随机临时目录，密码不会出现在标准输出或 MQTTX 命令行参数中；退出时删除临时目录。测试结束后仍应删除本地凭据文件。

## 连续设备模拟

```powershell
& "D:\h2o\remote astro\server\scripts\mqttx-full-device-sim.ps1" `
  -ControllerId observatory-999 `
  -CredentialFile "D:\private\observatory-999-credentials.json"
```

它会：

- 使用三个独立设备账户和客户端连接；
- 每 5 秒发布三套完整遥测；
- retained 发布在线状态，并为异常断线注册 retained 离线遗嘱；
- 订阅每个设备自己的 `command`；
- 应用控制结果到后续遥测；
- 返回带相同 `id`、`device`、`command` 的 ACK 或负 ACK。

可用 `-DurationSeconds 60` 限时运行，或用 `-Scenario negative-ack` 让第一条命令返回负 ACK。

## 一键端到端验收

```powershell
& "D:\h2o\remote astro\server\scripts\mqttx-e2e-contract-test.ps1" `
  -ControllerId observatory-999 `
  -CredentialFile "D:\private\observatory-999-credentials.json" `
  -StartSimulator
```

验收项包括：

1. 前端使用的全部 35 条命令均到达对应设备；
2. 每条命令收到同 ID 的肯定 ACK；
3. 未知命令收到负 ACK；
4. 设备不能向另一个设备的遥测 Topic 写入；
5. backend 账户不能伪造设备遥测；
6. 三个模拟设备退出后均触发离线遗嘱；
7. 重启模拟器后均重新在线并继续收发。

兼容入口 `mqttx-command-roundtrip.ps1` 会调用同一套完整验收。

如确实要测试真实 `default` 命名空间，必须显式增加 `-AllowDefaultController`。这会与真实遥测共享 Topic，可能改变前端状态，仅应在真实硬件已断开且用户明确知情时执行。

## 单次遥测烟雾测试

`mqttx-firmware-sim.ps1` 只发布一次三设备完整遥测，适合快速确认后端入库与前端字段显示；它不代替完整命令、ACK、ACL 和离线重连验收。
