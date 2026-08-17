# Cloudflare Tunnel 控制

在 WSL Ubuntu 中执行：

```bash
cd "/mnt/d/h2o/remote astro/server"
chmod +x tunnel/*.sh
bash tunnel/start-tunnel.sh
bash tunnel/status-tunnel.sh
tail -f /tmp/cloudflared-mqtt.log
bash tunnel/stop-tunnel.sh
```

`status-tunnel.sh` 会检查 cloudflared 进程、Mosquitto 9001 监听和 Tunnel
注册日志。最终仍应使用 MQTTX 通过 `mqtt.astroy.xyz:443`、WebSocket
路径 `/mqtt` 验证公网连接。

Token 默认读取 `/root/.cloudflared/home-iot.token`，可用
`CLOUDFLARED_TOKEN_FILE` 覆盖。Token 文件不要提交 Git。
