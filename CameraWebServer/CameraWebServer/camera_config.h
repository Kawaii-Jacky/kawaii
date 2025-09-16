#ifndef CAMERA_CONFIG_H
#define CAMERA_CONFIG_H

#include "esp_wifi.h"

// ==================== 摄像头传感器类型选择 ====================
#define CAMERA_OV5640
// #define CAMERA_OV2640

// ==================== WiFi 配置 ====================
#define CAMERA_WIFI_SSID "Xiaomi_C1E4"      // WiFi名称
#define CAMERA_WIFI_PASS "Czh040731"  // WiFi密码

// ==================== 深度睡眠配置 ====================
#define DEEP_SLEEP_TIMEOUT 30000  // 客户端断开后进入睡眠的时间（毫秒）
// 注意：设备进入深度睡眠后将保持睡眠状态，直到手动重置或外部唤醒触发

// ==================== Blynk 配置 ====================
#define BLYNK_AUTH_TOKEN "BtPnZKG8QxrnZfgrPZdch6EyZFDWcRgs"  // 请替换为您的实际Blynk认证令牌

// ==================== Blynk 虚拟引脚配置 ====================
#define BLYNK_TERMINAL_VPIN V80           // Blynk终端输出（用于状态信息显示）
#define BLYNK_IP_DISPLAY_VPIN V81         // Local IP显示
#define BLYNK_WIFI_RSSI_VPIN V82          // WiFi信号强度
#define BLYNK_DEVICE_STATUS_VPIN V83      // 设备状态
#define MY_BLYNK_TIMEOUT 3000 // 自定义超时，不要用BLYNK_TIMEOUT

#define BLYNK_SERVER "blynk.warmsake.top" // 你的Blynk服务器地址
#define BLYNK_PORT 8080                // 你的Blynk端口

#define SERIAL_BAUD_RATE 115200 // 或你需要的波特率

#endif // CAMERA_CONFIG_H 