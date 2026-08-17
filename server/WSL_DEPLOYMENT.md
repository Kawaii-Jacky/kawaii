# WSL / 小服务器部署说明

项目不依赖 Docker Desktop。小服务器上安装 Docker Engine 和 Docker Compose
插件即可迁移：

```text
docker-compose.yml       标准 Linux 服务器
docker-compose.wsl.yml   当前 WSL 开发机（无 bridge/NAT 时使用）
```

WSL 当前内核不提供 Docker bridge 所需的 iptables 模块，因此先执行：

```bash
cd "/mnt/d/h2o/remote astro/server"
bash wsl-start-docker.sh
docker compose -f docker-compose.yml -f docker-compose.wsl.yml up -d --build
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
