/*
 * 电动平场板控制系统配置文件
 * 包含用户需要经常修改的核心配置参数
 * 
 * 使用说明：
 * 1. 修改以下参数以适配您的系统
 * 2. 保存文件后重新编译上传
 * 3. 建议在修改前备份当前配置
 */

#ifndef CONFIG_H
#define CONFIG_H

//========================================= WiFi 配置 ==============================================//
#define WIFI_SSID "Kawaii-Fatty"                    // WiFi 网络名称
#define WIFI_PASSWORD "Czh040731"                    // WiFi 密码

//========================================= Blynk 服务器配置 ==============================================//
#define BLYNK_AUTH_TOKEN "3LnRVfUhILu2Puxul1R3UAgHZQSb_puT"    // Blynk 身份验证令牌
#define BLYNK_SERVER "blynk.warmsake.top"                      // Blynk 服务器地址
#define BLYNK_PORT 8080                                        // Blynk 服务器端口

//========================================= 物理引脚定义 ==============================================//
#define SERVO_PIN 5    // 舵机控制引脚
#define LED_PIN 21     // LED控制引脚
#define HEATER_PIN 4   // 加热带控制引脚
#define SIGNAL_LED_PIN 2  // 信号指示灯引脚

//========================================= EEPROM 地址定义 ==============================================//
#define ANGLE_ADDRESS 0      // 舵机角度存储地址
#define BRIGHTNESS_ADDRESS 4 // LED亮度存储地址
#define HEATER_POWER_ADDRESS 16 // 加热带功率存储地址
#define HUMI_THRESHOLD_ADDRESS 8      // 湿度阈值存储地址
#define AUTO_HEATER_ADDRESS 12        // 自动加热带开关存储地址

//========================================= 舵机控制配置 ==============================================//
#define SERVO_STEP_DELAY 50      // 舵机减速步长延时(毫秒)，数值越大转动越慢
#define SERVO_STEP_SIZE 5        // 舵机每次移动的步长(度)，数值越小转动越平滑

//========================================= ESP-NOW 配置 ==============================================//


//========================================= Blynk 虚拟引脚定义 ==============================================//
#define BLYNK_TERMINAL_VPIN V0   // 终端输出引脚
#define BLYNK_SERVO_SWITCH V1    // 舵机开关控制
#define BLYNK_LED_SWITCH V2      // LED开关控制
#define BLYNK_HEATER_SWITCH V3   // 加热带控制
#define BLYNK_ANGLE_SLIDER V4    // 舵机角度设置
#define BLYNK_LED_BRIGHTNESS V5  // LED亮度设置
#define BLYNK_AUTO_HEATER_SWITCH V6   // 自动加热带开关
#define BLYNK_HUMI_THRESHOLD V7       // 湿度阈值设置
#define BLYNK_RECEIVED_HUMIDITY V8    // 接收到的实际湿度值显示
#define BLYNK_HEATER_POWER V10   // 加热带功率设置
#define BLYNK_HEATER_PWM_CONTROL V9  // 加热带PWM控制 (0-100)

#endif // CONFIG_H 