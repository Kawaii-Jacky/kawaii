# ASTRA 账户与访问控制

## 部署步骤

1. 安装新增依赖：`pip install -r requirements.txt`。
2. 从 `.env.example` 复制或补齐认证变量。
3. 生成高强度密钥，例如：`python -c "import secrets; print(secrets.token_urlsafe(48))"`，填入 `AUTH_SECRET`。
4. 设置管理员的 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD`（至少 9 位）。安装 CLI 会设置 `ADMIN_PASSWORD_SYNC=1`，使该私有部署配置在迁移后恢复管理员角色和密码；仓库不包含默认管理员账号或密码。
5. 为生产环境设置邮件 SMTP 或短信网关；关闭 `AUTH_DEBUG_CODES`；HTTPS 部署时设置 `AUTH_COOKIE_SECURE=1`。
6. 用 Nginx `/api/` 代理让前端与 API 同源。`nginx.conf` 和 `nginx-wsl.conf` 已包含配置。

## 邮箱与短信验证

- 邮箱：设置 `SMTP_HOST`、`SMTP_PORT`、`SMTP_USERNAME`、`SMTP_PASSWORD`、`SMTP_FROM`。
- 手机号：设置 `SMS_WEBHOOK_URL`。该服务接收 `phone`、`code`、`purpose`、`product` JSON 字段，可在网关中接入阿里云短信、腾讯云短信或其他供应商。
- 验证码为 6 位，默认 10 分钟有效，60 秒内不能重发，连续错误 5 次后失效。
- `AUTH_DEBUG_CODES=1` 只用于本地演示，会在 API 响应中暴露验证码，绝不能在生产环境启用。

## 权限模型

| 角色 | 可查看设备与遥测 | 可执行设备命令 | 管理账户与系统 |
|---|---:|---:|---:|
| `user` | 是 | 否 | 否 |
| `operator` | 是 | 是 | 否 |
| `admin` | 是 | 是 | 是 |

当前注册账号默认为 `user`。首个管理员使用 `ADMIN_*` 环境变量创建。生产环境应通过受保护的管理 API 或运维脚本把授权用户提升为 `operator`，而不是开放所有新注册账户的控制权限。

## OpenAPI

FastAPI 自动提供 API 文档：

```text
https://your-domain/docs
https://your-domain/redoc
https://your-domain/openapi.json
```

导出规范：

```powershell
Invoke-WebRequest https://your-domain/openapi.json -OutFile openapi.json
```

MQTT 协议不属于 OpenAPI，使用同目录的 `asyncapi.yaml` 维护。

## 交付路线

1. 在测试环境完成邮箱 SMTP 和管理员登录验证。
2. 接入短信供应商并关闭调试验证码。
3. 让前端控制命令统一走受保护的 `/api/v1/devices/{id}/commands`，不再向浏览器暴露 MQTT 控制账号。
4. 建立管理员控制台：设备、遥测、命令审计、账号角色、备份与告警。
5. SQLite 遥测量增长后迁移 PostgreSQL/TimescaleDB，并将 SSE 事件总线迁移至 Redis 或 MQTT/WebSocket 网关。
