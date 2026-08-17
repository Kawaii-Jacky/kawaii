# Astroy 服务端

服务端包含一个 FastAPI 控制 API 和 MQTT ingestion worker。默认使用
`server/data/astroy.db`，用于先通过 MQTTX 模拟设备；生产环境可替换为
PostgreSQL，并把 MQTT 凭据放入环境变量。

## 本地启动

```powershell
cd "D:\h2o\remote astro\kawaii\server"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

如果暂时没有 MQTT Broker，可以在 `.env` 中设置 `MQTT_DISABLED=1`，API 和
网页仍然可以启动。拥有 Mosquitto 后，将 `MQTT_HOST`、`MQTT_PORT`、账号和
密码改为真实值。

## 主要接口

```text
GET  /health
GET  /api/v1/devices
GET  /api/v1/devices/{id}/latest
GET  /api/v1/devices/{id}/telemetry?limit=100
POST /api/v1/devices/{id}/commands
GET  /api/v1/events/stream
```

## 前端

`远程天文台/app/primitives.jsx` 中的 `useApiLiveData` 默认连接
`http://localhost:8080`，也可以在页面前设置：

```html
<script>window.ASTROY_API_BASE = 'https://api.astroy.xyz';</script>
```

前端 API 不保存 MQTT 凭据；命令由后端以 `backend-controller` 身份发布。

## Docker Compose ��������

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

��������ַ��`http://localhost:8000/observatory-eclipse.html#dashboard`
