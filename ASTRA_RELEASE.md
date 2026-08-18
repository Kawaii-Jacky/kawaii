# ASTRA 发布与部署

交付物包含：Web/PWA（iOS/iPadOS Safari 添加到主屏幕）、Tauri Windows EXE、
Android universal debug APK，以及后端 Docker Compose 发布包。Apple 端不生成 IPA。

## Docker

在 Linux 服务器执行 `server/deploy/install.sh`，Windows/WSL 执行
`server/deploy/install.ps1`。默认拉取 GHCR 版本镜像；设置
`ASTRA_VERSION`、`ASTRA_*_IMAGE` 或使用 Compose 的 `--build` 可切换版本/本地构建。
首次安装会自动生成 PostgreSQL、MQTT、AUTH_SECRET 和 Mosquitto 密码文件；
这些文件只保存在服务器 `.env`/`.secrets`，不会进入发布包。
安装脚本支持 `./deploy/install.sh --build-local` 或
`./deploy/install.ps1 -BuildLocal`。

可用命令：`status.sh`、`logs.sh`、`update.sh`、`backup.sh`、`restore.sh`、
`uninstall.sh`。只有 `uninstall.sh --purge-data` 才删除持久卷。

## Apple 安装

用 Safari 打开正式站点，点击分享 → 添加到主屏幕。Chrome/微信内置浏览器需要
先转到 Safari。PWA 只缓存应用壳；账户、遥测、API 和硬件命令永不进入缓存。
