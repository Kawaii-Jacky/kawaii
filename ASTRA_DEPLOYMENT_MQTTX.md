# ASTRA 远程天文台：部署与 MQTTX 验收手册

## 1. 发布包说明

发布包包含前端、FastAPI/API、后台管理、PostgreSQL、Mosquitto、短信网关、Cloudflare Tunnel 配置、个人介绍静态网站和 MQTTX 自动化脚本。

本精简包不包含 `OnStep`、`EF`、`ESP32_MPPT`、`loT` 固件目录；固件请单独维护和烧录。服务器仍可接入这些设备，Mosquitto 账号可在安装器中配置。

出于安全原因，发布包不包含：

- `server/.env`、`server/.secrets/`、Cloudflare token；
- Mosquitto `passwd` 文件；
- PostgreSQL/Mosquitto 数据卷、备份和 Python 虚拟环境。

固件中的 Wi-Fi 和 MQTT 密码会由安装器写入；Blynk token 属于第三方应用凭据，安装器不会自动生成，请在烧录前按固件工程中的 `CHANGE_ME_BLYNK_AUTH_TOKEN` 提示填写。

部署时请从 `server/.env.example` 复制生成真实的 `server/.env`。

## 2. 正式 Linux/Docker 部署

### 一键安装器

Linux：

```bash
cd /opt/astroy/server
chmod +x scripts/install-astra.sh
sudo scripts/install-astra.sh
```

Windows + WSL：

```powershell
cd "D:\h2o\remote astro\server"
.\scripts\install-astra.ps1 -EnableCloudflare
```

安装器会逐项隐藏输入并重复确认 PostgreSQL、管理员、backend-controller、三台设备 MQTT、Wi-Fi 和备份加密口令；会拒绝过短密码或不一致的重复输入，生成 `AUTH_SECRET`，写入 `.env`，更新固件头文件，生成 Mosquitto 哈希密码文件，安装备份口令，并在启动后验证 PostgreSQL、MQTT、健康接口和认证 OpenAPI 路由。

不想立即启动容器时可追加 `-SkipStart`（PowerShell），或在 Bash 安装器中完成配置后手动执行 Compose。

```bash
cd /opt/astroy/server
cp .env.example .env
chmod 600 .env
```

至少修改这些变量：

```dotenv
POSTGRES_PASSWORD=<随机长密码>
AUTH_SECRET=<至少32位随机字符串>
MQTT_PASSWORD=<backend-controller密码>
ADMIN_EMAIL=<管理员邮箱>
ADMIN_PASSWORD=<管理员初始密码，至少9位>
ADMIN_DISPLAY_NAME=ASTRA管理员
CORS_ORIGINS=https://astroy.xyz,https://www.astroy.xyz
AUTH_COOKIE_SECURE=1
AUTH_DEBUG_CODES=0
MQTT_DISABLED=0
```

如果启用短信认证，填写 `ALIYUN_PNVS_*` 或 `ALIYUN_SMS_*`，并将 `SMS_GATEWAY_MODE` 设置为对应模式。配置 Cloudflare Tunnel token 后填写 `CLOUDFLARED_TOKEN_FILE`。

创建 Mosquitto 用户和 ACL（用户名必须和固件头文件一致）：

```bash
sudo apt-get install -y mosquitto-clients
sudo mosquitto_passwd -c server/mosquitto/passwd backend-controller
sudo mosquitto_passwd server/mosquitto/passwd mppt-001
sudo mosquitto_passwd server/mosquitto/passwd esp32-001
sudo mosquitto_passwd server/mosquitto/passwd ef-001
sudo ./server/scripts/prepare-mosquitto-permissions.sh
```

启动（正式 Linux）：

```bash
cd /opt/astroy/server
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:8000/health
```

预期 `/health` 中应看到 `database: postgresql`、`mqtt: true` 和 `mqtt_subscribed: true`。

### WSL 部署

WSL 使用专用覆盖文件，避免普通桥接网络的 DNS/host-gateway 问题：

```bash
cd /mnt/d/h2o/remote\ astro/server
docker compose -f docker-compose.yml -f docker-compose.wsl.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.wsl.yml ps
```

前端入口：`http://127.0.0.1:8000/`；后台管理入口：`http://127.0.0.1:8100/`。

## 2.1 个人介绍网站子域名

发布包中的 `remote-astro-service` 是独立静态网站，Compose 会在本机启动
`intro-web`，监听 `127.0.0.1:8200`。本机预览：

```text
http://127.0.0.1:8200/
```

可以放到独立子域名 `intro.astroy.xyz`。在 Cloudflare Zero Trust
中给同一个 Tunnel 增加 Public Hostname：

```text
Hostname: intro.astroy.xyz
Service:   http://localhost:8200
```

注意：Service 必须是不带末尾斜杠和路径的源站地址。以下写法会被 Cloudflare 拒绝：

```text
http://127.0.0.1:8200/
http://localhost:8200/intro
```

可使用下面任一写法：

```text
http://localhost:8200
http://127.0.0.1:8200
```

然后在 DNS 中确认 `intro.astroy.xyz` 指向该 Tunnel。Cloudflare 会自动提供
HTTPS；不需要把 8200 端口暴露到公网。当前主控制台仍使用 `astroy.xyz` / `www.astroy.xyz`，
MQTT 使用 `mqtt.astroy.xyz`。

## 3. Cloudflare 公网验收

确认 DNS 中 `astroy.xyz` 和 `www.astroy.xyz` 指向同一 Cloudflare Tunnel，并设置 HTTPS。公网检查：

```bash
curl -I https://astroy.xyz/
curl -I https://www.astroy.xyz/
curl -fsS https://astroy.xyz/health
```

MQTTX 使用 WSS：`wss://mqtt.astroy.xyz/mqtt`，端口 `443`，协议 `MQTT 3.1.1`，TLS 开启，QoS 使用 1。

## 4. MQTTX 手工测试

### 4.1 建立设备连接

为每台设备建立一个 MQTTX Connection：

| 设备 | 用户名 | 客户端 ID | 订阅主题 |
|---|---|---|---|
| MPPT | `mppt-001` | `mqttx-mppt-001-firmware` | `devices/mppt-001/command` |
| 主控 | `esp32-001` | `mqttx-esp32-001-firmware` | `devices/esp32-001/command` |
| 平场板 | `ef-001` | `mqttx-ef-001-firmware` | `devices/ef-001/command` |

密码使用对应固件头文件中的 MQTT 密码。连接地址可用：

- 公网：`wss://mqtt.astroy.xyz/mqtt:443`
- 本机 MQTT：`mqtt://127.0.0.1:1883`

每台设备订阅自己的 `command`，同时再建立一个 `backend-controller` 连接订阅 `devices/+/reported`。

### 4.2 上报在线状态

发布到 `devices/esp32-001/status`，QoS 1，Retain 开启：

```json
{
  "schema": 1,
  "device": "esp32-001",
  "status": "online",
  "ts": "2026-08-17T05:00:00Z"
}
```

### 4.3 上报遥测

发布到 `devices/esp32-001/telemetry`，QoS 1：

```json
{
  "schema": 1,
  "device": "esp32-001",
  "ts": "2026-08-17T05:00:05Z",
  "seq": 1,
  "data": {
    "dht_temperature": 22.4,
    "dht_humidity": 43.0,
    "output_voltage": 12.18,
    "output_current": 2.10,
    "power_output": 25.6,
    "rain_detected": false,
    "heater": false,
    "fan": true,
    "mosfet": true,
    "camera": false
  }
}
```

MPPT 遥测主题 `devices/mppt-001/telemetry`：

```json
{
  "schema": 1,
  "device": "mppt-001",
  "ts": "2026-08-17T05:00:05Z",
  "seq": 1,
  "data": {
    "power_input_w": 42.6,
    "voltage_input_v": 18.2,
    "current_input_a": 2.34,
    "buck_power_w": 38.1,
    "buck_voltage_v": 12.4,
    "temperature": 31,
    "pwm": 96,
    "fan": 1,
    "mode": 1
  }
}
```

平场板遥测主题 `devices/ef-001/telemetry`：

```json
{
  "schema": 1,
  "device": "ef-001",
  "ts": "2026-08-17T05:00:05Z",
  "seq": 1,
  "data": {
    "humidity": 72,
    "servo": true,
    "led": true,
    "heater": false,
    "angle": 150
  }
}
```

### 4.4 模拟命令、ACK 和失败

在 `backend-controller` 连接发布到 `devices/esp32-001/command`：

```json
{
  "schema": 1,
  "id": "mqttx-command-001",
  "device": "esp32-001",
  "ts": "2026-08-17T05:01:00Z",
  "command": "fan",
  "state": true
}
```

设备连接收到命令后，在 `devices/esp32-001/reported` 发布 ACK：

```json
{
  "schema": 1,
  "id": "mqttx-command-001",
  "device": "esp32-001",
  "ts": "2026-08-17T05:01:01Z",
  "ok": true,
  "command": "fan",
  "state": true
}
```

失败 ACK：

```json
{
  "schema": 1,
  "id": "mqttx-command-001",
  "device": "esp32-001",
  "ts": "2026-08-17T05:01:01Z",
  "ok": false,
  "error": "motor_limit_reached"
}
```

API 会在未收到 ACK 时按 `COMMAND_RETRY_SECONDS` 重试，达到 `COMMAND_MAX_ATTEMPTS` 后将命令标记为失败并产生告警。

### 4.5 断线重连

1. 保持设备客户端 ID 不变，断开 MQTTX 连接；
2. 等待前端显示设备离线；
3. 使用相同用户名、密码和客户端 ID 重新连接；
4. 再发布一条 telemetry 和 status online；
5. 确认前端恢复在线、最新遥测更新时间刷新。

## 5. 自动化验收脚本

在 Windows PowerShell 中，先安装 MQTTX CLI，并确认 Node.js 可用：

```powershell
npm install -g mqttx-cli
```

运行三设备遥测上报：

```powershell
& "D:\h2o\remote astro\server\scripts\mqttx-firmware-sim.ps1"
```

本机直接验收 Mosquitto（不经过 Cloudflare）时：

```powershell
& "D:\h2o\remote astro\server\scripts\mqttx-firmware-sim.ps1" -Broker 127.0.0.1 -Port 1883 -Protocol mqtt -Path /mqtt
```

运行命令、ACK、断线和重连全链路验收：

```powershell
& "D:\h2o\remote astro\server\scripts\mqttx-command-roundtrip.ps1"
```

本机 MQTT 全链路验收：

```powershell
& "D:\h2o\remote astro\server\scripts\mqttx-command-roundtrip.ps1" -Broker 127.0.0.1 -Port 1883 -Protocol mqtt -Path /mqtt
```

成功时应分别输出三设备遥测发布成功，以及 `3 devices received commands, returned ACKs, disconnected, and reconnected`。

## 6. 常用运维命令

```bash
docker compose ps
docker compose logs --tail=100 api
docker compose logs --tail=100 mosquitto
docker compose restart api web
docker compose exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

备份与磁盘告警配置见 `server/BACKUP.md`；正式 Linux 恢复备份或更换密码文件后重新执行 `scripts/prepare-mosquitto-permissions.sh`。
