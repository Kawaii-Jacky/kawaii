# ESP32 Camera WebServer 使用示例

## 快速开始

### 1. 基本配置
在 `camera_config.h` 文件中配置您的设置：

```cpp
// WiFi配置
#define CAMERA_WIFI_SSID "您的WiFi名称"
#define CAMERA_WIFI_PASS "您的WiFi密码"

// Blynk配置
#define BLYNK_AUTH_TOKEN "您的Blynk认证令牌"
#define BLYNK_SERVER "您的Blynk服务器地址"
#define BLYNK_PORT 8080
```

### 2. 编译和上传
1. 在Arduino IDE中打开 `CameraWebServer.ino`
2. 选择正确的ESP32开发板
3. 点击上传按钮

### 3. 使用Web界面
1. 打开串口监视器查看设备IP地址
2. 在浏览器中访问 `http://设备IP地址`
3. 使用Web界面控制摄像头

### 4. 使用Blynk监控
1. 在Blynk应用中创建项目
2. 添加以下组件：
   - 终端组件 (V80)
   - 标签组件 (V81, V82, V83)
3. 查看设备状态信息

## 功能演示

### 实时视频流
- 访问 `/stream` 端点获取实时视频流
- 支持多种分辨率和质量设置

### 拍照功能
- 访问 `/capture` 端点拍摄单张照片
- 支持JPEG和BMP格式

### 远程控制
- 通过Web界面调整摄像头参数
- 支持亮度、对比度、饱和度等设置

### 深度睡眠
- 客户端断开30秒后自动进入深度睡眠
- 节省电池电量

### Blynk集成
- 实时状态监控
- WiFi信号强度显示
- 设备连接状态

## 高级功能

### 自定义分辨率
```cpp
// 在setup()函数中设置
s->set_framesize(s, FRAMESIZE_UXGA);  // 1600x1200
```

### 自定义质量
```cpp
// 在setup()函数中设置
s->set_quality(s, 10);  // 0-63, 数字越小质量越高
```

### 自定义深度睡眠时间
```cpp
// 在camera_config.h中修改
#define DEEP_SLEEP_TIMEOUT 60000  // 60秒
```

## 故障排除

### 常见错误
1. **WiFi连接失败**
   - 检查WiFi凭据
   - 确保WiFi信号强度足够

2. **Blynk连接失败**
   - 检查认证令牌
   - 检查服务器地址和端口

3. **内存不足**
   - 选择更大的分区表
   - 降低图像分辨率

4. **摄像头初始化失败**
   - 检查硬件连接
   - 确认摄像头型号设置正确

### 调试技巧
- 使用串口监视器查看详细日志
- 检查Blynk终端输出
- 监控设备状态变化 