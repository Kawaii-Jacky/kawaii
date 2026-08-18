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

## 用户与设备授权

网页账户和 MQTT 控制器账户是两套独立身份。管理员在 `/admin` 的账户列表中为
普通用户或操作员分配一个控制器套组，授权关系保存在 `user_controller_access`。
每个套组固定包含主控 `esp32-001`、能源 `mppt-001` 和平场板 `ef-001` 三台设备：

- 所有角色默认都没有设备权限，管理员角色也不能绕过套组隔离；
- 每个账户只能使用被明确分配的一整套三台设备；
- 设备列表、最新值、历史遥测、告警、命令查询、命令下发和 SSE 实时事件均按
  同一授权关系过滤；
- 未授权设备统一返回 `404`，避免通过接口枚举设备；
- 授权发生变化时，该用户已有会话会被撤销，需要重新登录后才可使用新权限。

前端用户不会获得 `backend-controller` 或任何 MQTT 用户名、密码，也不会直接
连接 MQTT 端口。网页账户始终通过统一 HTTPS `443` 访问服务端。管理员在
`/admin` 只需填写套组名称；服务端自动生成套组 ID、Backend Controller 凭据、
三台设备各自的凭据和 Topic 命名空间，写入 Mosquitto 密码库与 ACL，并重启 API。
真实控制器配置保存在被忽略的 `server/.secrets/mqtt-controllers.json`。

所有硬件仍使用统一的 `wss://mqtt.astroy.xyz/mqtt` 安全入口。默认套组保留旧的
`devices/<device-id>/...` Topic；新套组使用
`controllers/<controller-id>/devices/<device-id>/...`，并由独立账号与 ACL 强制
隔离，因此相同的三个逻辑设备 ID 不会串线，也无需为每套设备开放新的公网端口。
新套组按三位编号连续创建：`observatory-002` 对应 Backend Controller 账号
`backend-controller-002`，以及硬件账号/Client ID `esp32-002`、`mppt-002`、
`ef-002`；之后依次为 `003`、`004`，已删除的编号不会重新使用。三台设备在 API
和 Topic 中仍使用固定逻辑 ID `esp32-001`、`mppt-001`、`ef-001`，以兼容现有
固件协议。

创建成功后，管理页面会显示完整的三份硬件配置。凭据同时使用 AES-256-GCM
加密后保存到设备凭据库；管理员以后可在 `/admin` 重新输入自己的管理员密码来
查看或下载。明文密码不会写入 Cookie、普通数据库导出、日志或 Git，查看操作会
写入审计日志，接口响应禁止浏览器和代理缓存。

| 用途 | 端口 | 暴露范围 |
| --- | ---: | --- |
| 网页、认证、REST、SSE | `443` | 公网 HTTPS（Cloudflare） |
| Nginx Web 入口 | `8000` | 仅宿主机回环 |
| FastAPI | `8080` | 仅宿主机回环/Compose 内部 |
| 管理控制台 | `8100` | 仅宿主机回环，经 `/admin` 代理 |
| MQTT 设备接入 | `1883` | 仅宿主机回环/设备专网 |
| MQTT WebSocket | `9001` | 仅宿主机回环，普通前端不再使用 |
| PostgreSQL | `5432` | Compose 内部；WSL 模式仅回环 |

前端统一 HTTPS 端口复用现有 TLS、Cookie、Cloudflare 和防火墙策略；各套设备的
MQTT 端口只由服务端访问，不暴露给浏览器或 APK/EXE。
