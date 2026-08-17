# ASTRA 远程天文台前端

一个独立、无需构建步骤的响应式 Web 控制台。视觉采用黑白极简体系，功能直接对应三套 ESP32 固件的 MQTT 协议。

## 运行

本地开发建议启动带 7Timer 代理的服务器：

```powershell
node dev-server.mjs 4173
```

然后访问 <http://localhost:4173>。首次打开默认为 **Demo 演示模式**，不需要硬件即可体验全部页面、控制、历史曲线和数据导出。

## 账户验证

生产环境由同源 ASTRA API 提供登录、注册、找回密码和会话验证。未登录访问任意控制页面会进入独立的 `#login` 页面，登录后返回原目标页面。验证码可使用中国内地手机号或电子邮箱，会话保存在后端签发的 HttpOnly Cookie 中；密码和验证码均不写入浏览器本地存储。

个人中心仅在登录后开放，其中只提供当前账户的密码修改。管理员密码至少 9 位，普通账户密码至少 8 位。前端使用以下接口：

- `POST /api/v1/auth/verification/request`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/password/recover`
- `POST /api/v1/auth/password/change`
- `POST /api/v1/auth/logout`

## 连接实体设备

1. 点击右上角 `DEMO / 演示数据`。
2. 选择 `MQTT 实时模式`。
3. 填写 `wss://mqtt.astroy.xyz/mqtt` 的控制端用户名和密码。
4. 点击“应用连接”。

控制端账号必须具有以下权限：

- 订阅 `devices/+/telemetry`、`devices/+/status`、`devices/+/reported`
- 发布 `devices/esp32-001/command`
- 发布 `devices/mppt-001/command`
- 发布 `devices/ef-001/command`

设备密码仅保存在当前页面内存中，不写入 `localStorage`。

## 已实现页面

- 观测总览：设备就绪度、核心遥测、节点状态、快捷控制与自检；三枚状态 Sprite 在 Three.js 场景中环绕模型并参与真实深度遮挡
- 能源系统：MPPT、电池、能量流、充电策略、EEPROM 参数写入；参数支持直接输入、加减步进和长按加速
- 环境与屋顶：温湿度实时曲线、相机定时关闭、加热/风扇自动手动模式、风扇温度阈值、屋顶电机与 OnStep
- 在线天文天气：Open-Meteo 地点搜索、温度、湿度、云量、降水，以及 Open-Meteo 推算 / 7Timer 天文预报可选图表
- 电动平场板：主卡开合与灯光、可拖动限位角度、LED 亮度、自动加热、湿度阈值、加热功率和蒸汽状态动画
- 历史数据：能源与环境曲线、时间范围、图层开关和 CSV 导出
- 设备终端：四个控制分页均可通过自定义圆角设备选择浮层向三套节点发送指令并显示 reported 消息
- 登录与个人中心：独立登录/注册/找回密码页、未登录路由保护、登录后修改密码；同时提供 5 种全局主题色、亮/暗双色模式和小/中/大字号
- 全局主题：黑色、墨绿、深蓝、日珀、星粉；亮色为主题色＋白色，暗色为主题色＋纯黑灰色
- 导航：连接设置统一位于六个页面的右上角；桌面侧栏和移动端底部导航仅保留页面切换
- 卡片体系：全局无边线、无内阴影；外层与嵌套层通过中性灰透明度和背景模糊区分，暗色嵌套控件使用 `#1A1A1A`
- 主视觉素材：Three.js 实时加载 `assets/models/observatory-web.glb`，支持拖动旋转、写实物理材质、玻璃透射与环境反射；不启用地面投影或模型阴影。`assets/observatory-cutout-solid.png` 仅在 WebGL 或模型加载失败时作为备用图

在线天气通过 Open-Meteo 的 Geocoding 与 Forecast API 在浏览器端获取。Open-Meteo 视宁度是根据风速、湿度、云量与能见度计算的 0–100 观测参考分数。

7Timer 通过 `/api/astro` 获取在线天文预报。由于 7Timer 没有浏览器 CORS 头，生产环境请部署 `worker/` 中的 Cloudflare Worker；本地开发服务器已内置同等代理。7Timer 的 `seeing` 分类会映射为代表性 arcsec，透明度与云量会合成为晴朗程度。它们都是在线预报或模型推算，不是 DIMM / SCIDAR 仪器实测。

生产部署：

```powershell
npm install -g wrangler
wrangler login
cd worker
wrangler deploy
```

将 Worker 路由到前端同源的 `/api/astro`，即可保留前端现有请求地址。

### 字号规格（桌面端）

| 档位 | 主要标题 | 核心数据 | 主要按钮 |
| --- | ---: | ---: | ---: |
| 小 | 33px | 31px | 11px |
| 中 | 37px | 35px | 13px |
| 大 | 41px | 39px | 15px |

新版“小号”以旧版“大号”为起点。移动端会使用对应的响应式字号，避免六项底部导航和密集控制区溢出。

## Blender 模型管线

已针对 `D:\Blender\blender.exe`（Blender 5.2 LTS）配置自动化脚本：

```powershell
.\tools\blender\run-optimize.ps1
```

脚本会自动寻找微信文件目录中最新的 GLB，将 4K 纹理缩放至 512px、保留 25 个独立网格、锁定两块原始黑色箱体外壳、设置金属与玻璃 PBR 参数，并同时输出网页 GLB 与可编辑 Blender 文件。当前网页模型约 7.24MB，源模型约 136MB。

## 文件

- `index.html`：应用页面结构与所有控制区
- `app.css`：黑白设计系统、桌面/移动响应式布局
- `app.js`：状态管理、MQTT、协议映射、图表、交互和 Demo 数据
- `dev-server.mjs`：本地静态服务器与 7Timer 代理
- `worker/`：生产环境 Cloudflare 7Timer 代理
- `observatory-3d.js`：Three.js 场景、模型加载、物理玻璃、箱体中心旋转控制与写实模式
- `assets/models/observatory-web.glb`：Blender 优化后的网页三维模型
- `tools/blender/`：Blender 检查、优化、材质配置和导出脚本
- `assets/observatory-render.png`：天文台设备渲染图

## 部署注意

页面通过 CDN 加载 MQTT.js。生产部署建议将 `mqtt.min.js` 下载到本地并使用 HTTPS 托管，以避免浏览器 Mixed Content 限制并提升离线可靠性。实体屋顶与舵机控制均带二次确认，但现场硬件仍应保留限位、急停和雨水联锁等独立安全机制。
