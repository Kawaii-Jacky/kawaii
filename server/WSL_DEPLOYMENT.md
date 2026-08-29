# WSL / 小服务器部署说明

如果项目位于 `/mnt/c`、`/mnt/d` 等 Windows 挂载目录，请从 PowerShell 运行
`scripts/install-astra.ps1`，由安装器收紧 `.env` 和 `.secrets` 的 Windows ACL。
直接运行 Bash 安装器会在收集密钥前退出。也可以将项目放入 WSL 原生 ext4 文件系统。

项目不依赖 Docker Desktop。小服务器上安装 Docker Engine 和 Docker Compose
插件即可迁移：

```text
docker-compose.yml       标准 Linux 服务器
docker-compose.wsl.yml   当前 WSL 开发机（无 bridge/NAT 时使用）
```

WSL 的网段会随实例重建而变化，不要把 Docker bridge 固定在 172.x 网段。`wsl-start-docker.sh` 会：

- 切换到 WSL 可用的 `iptables-legacy`；
- 将 Docker bridge 固定为 `10.88.0.1/24`；
- 将 Compose 网络从 `10.89.0.0/16` 地址池分配，避免与 WSL DNS/NAT 冲突；
- 保留 Docker 内置 DNS（`127.0.0.11`），确保服务名 `postgres`、`mosquitto` 等可解析。

启动步骤：

```bash
cd "/mnt/d/h2o/remote astro/server"
bash wsl-start-docker.sh
docker compose up -d --build
```

标准 Linux 小服务器使用：

```bash
docker compose up -d --build
```

Compose 现在也会启动 `cloudflared`。不要同时运行主机上的手动 Tunnel
进程，否则两个 Connector 会同时使用同一个 Tunnel。查看状态：

```bash
docker compose ps
docker compose logs -f cloudflared
```

当前主机 Docker Hub 连接超时，导致镜像还未下载；这是网络限制，不是
Compose 配置错误。恢复 Docker Hub、配置镜像代理或在可联网机器预拉取并
导出镜像后，再执行 Compose 启动即可。
