# 客户端连接说明

浏览器、Android WebView/APK 和 Windows WebView/EXE 使用同一套 HTTPS API，
不为每个用户开放独立 TCP 端口。登录成功后，服务端只把随机会话令牌写入
`HttpOnly` Cookie；账户密码和 MQTT 密码都不会写入 Cookie，也不会交给前端。

每个已登录页面通过 `GET /api/v1/events/stream` 建立一条 SSE 长连接。服务端按
`session_id + subscription_id` 分配独立队列，同一条设备事件会广播到所有会话，
客户端之间不会抢消费。设备控制统一调用
`POST /api/v1/devices/{device_id}/commands`，请求体为
`{"command":"...","args":{...}}`，后端再按角色校验、记录命令并发布 MQTT。

客户端只需要配置一个参数：生产环境 API 基址 `https://astroy.xyz`。WebView 应
启用同站 Cookie；纯原生 HTTP 客户端也可在登录后维护 Cookie jar。

| 用途 | 端口 | 暴露范围 |
| --- | ---: | --- |
| 网页、认证、REST、SSE | `443` | 公网 HTTPS（Cloudflare） |
| Nginx Web 入口 | `8000` | 仅宿主机回环 |
| FastAPI | `8080` | 仅宿主机回环/Compose 内部 |
| 管理控制台 | `8100` | 仅宿主机回环，经 `/admin` 代理 |
| MQTT 设备接入 | `1883` | 仅宿主机回环/设备专网 |
| MQTT WebSocket | `9001` | 仅宿主机回环，普通前端不再使用 |
| PostgreSQL | `5432` | Compose 内部；WSL 模式仅回环 |

统一 HTTPS 端口复用现有 TLS、Cookie、Cloudflare 和防火墙策略，同时避免按用户
分配端口造成端口耗尽、端口回收和公网规则膨胀。
