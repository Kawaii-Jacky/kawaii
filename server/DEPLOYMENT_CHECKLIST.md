# ASTRA 部署检查清单

## 服务拓扑

- `web`：Nginx 静态托管 `../remote-observatory-frontend`，将 `/api/*` 与 `/health` 转发到 API，并将 `/admin`、`/admin-api/*` 转发到管理控制台。
- `api`：FastAPI 控制面，提供设备、认证、SSE、Open-Meteo 和 7Timer 同源代理。
- `mosquitto`：设备 MQTT broker；生产环境只允许受控账号发布/订阅。
- `cloudflared`：可选的 Cloudflare Tunnel，不把 MQTT 密码或 Token 放进前端。

## 启动前检查

1. 复制 `.env.example` 为 `.env`，填写真实值；不要提交 `.env`、`mosquitto/passwd` 或 Token 文件。
2. 生产环境至少设置：
   - `AUTH_DEBUG_CODES=0`
   - `AUTH_COOKIE_SECURE=1`
   - `CORS_ORIGINS=https://<正式域名>`
   - `MQTT_DISABLED=0`
3. 确认 `CLOUDFLARED_TOKEN_FILE` 在运行 Docker 的 Linux/WSL 环境中可读。
4. 确认设备固件使用 `devices/<id>/{telemetry,status,reported}`，命令发布到 `devices/<id>/command`。

## 配置与冒烟测试

在 `server` 目录执行：

```bash
docker compose -f docker-compose.yml config
docker compose -f docker-compose.yml up -d --build
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:8000/admin >/dev/null
curl -fsS 'http://127.0.0.1:8000/api/astro?lat=31.22&lon=121.46'
curl -fsS 'http://127.0.0.1:8000/api/weather/forecast?latitude=31.22&longitude=121.46&forecast_days=1&hourly=temperature_2m'
curl -fsS 'http://127.0.0.1:8000/api/weather/geocoding?name=Shanghai&count=1&language=en'
```

`/health` 应返回 JSON；匿名访问 `/api/v1/auth/me` 和 `/admin-api/metrics` 应返回 `401`。后台页面可通过 Cloudflare Tunnel 的 `https://<正式域名>/admin` 打开。只有直接访问本机 `8100` 时允许 `?preview=1` 只读预览，经过 Nginx 或公网 Tunnel 时预览旁路必须返回 `401`。如果 API 或天气上游不可用，代理应返回 `502`，前端仍保留演示数据显示。

WSL 开发覆盖配置使用：

```bash
docker compose -f docker-compose.yml -f docker-compose.wsl.yml config
```

## 前端数据源

正式前端只调用同源 `/api/weather/*` 和 `/api/astro`，因此浏览器不需要直接访问 Open-Meteo 或 7Timer，也不会受到 7Timer CORS 限制。MQTT 实时模式仍通过用户填写的 WSS 地址连接；密码只保存在当前页面内存中。

限流、离线告警、命令重试、告警接收人、Mosquitto Linux 文件归属及三设备 MQTTX 验收步骤见 `RELIABILITY.md`。
