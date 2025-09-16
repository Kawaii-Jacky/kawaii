# ESP32 Camera WebServer with Blynk - Arduino IDE 设置指南

## 必需的库

在Arduino IDE中，您需要安装以下库：

### 1. ESP32 开发板支持
- 打开 Arduino IDE
- 进入 `文件` > `首选项`
- 在 `附加开发板管理器网址` 中添加：
  ```
  https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
  ```
- 进入 `工具` > `开发板` > `开发板管理器`
- 搜索 "ESP32" 并安装 "ESP32 by Espressif Systems"

### 2. Blynk 库
- 进入 `工具` > `管理库`
- 搜索 "Blynk" 
- 安装 "Blynk" 库 (作者: Volodymyr Shymanskyy)

### 3. ESP32 Camera 库
ESP32 Camera库通常已包含在ESP32开发板包中，无需单独安装。

## 配置步骤

### 1. 修改配置文件
编辑 `camera_config.h` 文件：
- 设置您的WiFi凭据
- 配置Blynk服务器地址和端口
- 设置Blynk认证令牌

### 2. 设置Blynk认证令牌
在 `CameraWebServer.ino` 文件中，将以下行：
```cpp
#define BLYNK_AUTH_TOKEN "your_blynk_auth_token_here"
```
替换为您的实际Blynk认证令牌。

### 3. 选择正确的开发板
- 进入 `工具` > `开发板` > `ESP32 Arduino`
- 选择您的ESP32开发板型号（如 "AI Thinker ESP32-CAM"）

### 4. 配置分区表
- 进入 `工具` > `分区表`
- 选择 "Huge APP (3MB No OTA/1MB SPIFFS)" 或类似的大分区表

### 5. 设置串口
- 进入 `工具` > `端口`
- 选择ESP32连接的COM端口

## 编译和上传

1. 点击 `验证` 按钮检查代码
2. 如果验证通过，点击 `上传` 按钮
3. 上传完成后，打开串口监视器查看调试信息

## 功能说明

### 新增功能
- **Blynk集成**: 实时状态监控和远程控制
- **深度睡眠**: 客户端断开后自动进入省电模式
- **客户端监控**: 检测Web客户端连接状态
- **状态报告**: 通过Blynk显示设备状态、IP地址、WiFi信号强度

### Blynk虚拟引脚
- V80: 终端输出（状态信息）
- V81: IP地址显示
- V82: WiFi信号强度
- V83: 设备状态

### 深度睡眠
- 客户端断开连接30秒后自动进入深度睡眠
- 可通过外部唤醒或手动重置唤醒设备

## 故障排除

### 常见问题
1. **编译错误**: 确保已安装所有必需的库
2. **WiFi连接失败**: 检查WiFi凭据是否正确
3. **Blynk连接失败**: 检查认证令牌和服务器地址
4. **内存不足**: 选择更大的分区表

### 调试信息
通过串口监视器可以查看：
- WiFi连接状态
- Blynk连接状态
- 客户端连接/断开事件
- 深度睡眠状态

## 注意事项

- 确保ESP32开发板有足够的PSRAM用于高分辨率图像
- 深度睡眠模式下设备将完全关闭，需要外部唤醒
- Blynk服务器地址需要根据您的设置进行配置 