#ifndef SETTINGS_H
#define SETTINGS_H

#include <stdint.h>
/*---------------------------------请按照实际情况修改以下参数设置---------------------------------*/
//esp_now:by Espressif Systems(1.0.6)
//ina226:by Rob Tillaart  (0.6.4)
//DHT sensor library by Adafruit（last version）



// ========================================== Blynk 配置 ==========================================
#define BLYNK_TEMPLATE_ID "ESP32-IoT"
#define BLYNK_TEMPLATE_NAME "ESP32 Dev Board"
#define BLYNK_AUTH_TOKEN "6DCsRK9DT4ZvuNypTn48hC6d1CFBviFe" //Blynk 令牌
#define BLYNK_SERVER "blynk.warmsake.top"  // 使用自定义服务器 "blynk.warmsake.top"
#define BLYNK_PORT 8080               // 使用自定义端口 8080

// ========================================== WiFi 配置 ==========================================
#define WIFI_SSID "Kawaii-Fatty" //WiFi 名称
#define WIFI_PASS "Czh040731" //WiFi 密码

//================================库文件设置========================================

//INA226  by Rob Tillaart  (0.6.4)
//DHT sensor library by Adafruit（last）


// ========================================== 邮箱配置 ==========================================
#define EMAIL_ADDRESS "418324305@qq.com"   // 收件人邮箱地址

// ========================================== MAC地址 配置 ==========================================
// 全局MAC地址变量定义（供其他模块使用）
uint8_t onstepMac[6] = {0x78, 0x1C, 0x3C, 0xA2, 0xD0, 0x16};  // OnStep默认MAC地址
uint8_t flatFieldMac[6] = {0x6C, 0xC8, 0x40, 0x56, 0xAF, 0x70};  // 平场板默认MAC地址
uint8_t mpptMac[6] = {0x68, 0x25, 0xDD, 0x2E, 0xBA, 0x60};  // MPPT默认MAC地址

// ========================================== 串口配置 ==========================================
#define SERIAL_BAUD_RATE 115200//串口波特率
// ======================================== 摄像头控制变量 ====================
// 摄像头类型选择 - 请选择一种摄像头类型，注释掉另一种
#define HIKVISION_CAMERA    // 海康摄像头 - 支持RTSP流传输到Blynk
// #define XIAOMI_CAMERA     // 小米摄像头 - 仅支持电源控制，不传输RTSP流

bool cameraPowerState = false;              // 摄像头电源状态
unsigned long cameraPowerStartTime = 0;     // 摄像头开启时间
unsigned long cameraAutoOffTime = 600000;   // 自动关闭时间（10分钟 = 600000毫秒）
bool cameraStartupComplete = false;         // 摄像头启动完成标志
unsigned long cameraStartupDelay = 3000;    // 摄像头启动延迟时间（毫秒）

// 海康摄像头RTSP配置（仅在海康摄像头模式下使用）
String rtspUrl = "rtsp://admin:Czh040731@10.168.1.102:554/Streaming/Channels/101?transportmode=unicast&profile=Profile_1";

// 小米摄像头配置（仅在小米摄像头模式下使用）
// 小米摄像头使用自己的平台，不需要RTSP配置

// ========================================== 统一ESP32引脚配置 ==========================================

// Rain_Sensor_demo.ino 引脚配置
#define RAIN_ANALOG_PIN 39    // 雨水传感器模拟量输入引脚 A0 (VP)
#define RAIN_DIGITAL_PIN 19   // 雨水传感器数字量输入引脚 D0 (VN)

// DHT11.ino 引脚配置
#define DHT11_PIN 26          // DHT11数据引脚 (GPIO26)

// IRF540 MOSFET控制引脚配置
#define MOSFET_PIN 2         // IRF540 MOSFET控制引脚 (GPIO2)

// INA226.ino 引脚配置
#define INA226_I2C_ADDRESS 0x40    // INA226 I2C地址

// UTC电阻模块引脚配置
#define UTC_ANALOG_PIN 34    // UTC电阻模块模拟量输入引脚(34)
// #define UTC_DIGITAL_PIN 14   // UTC电阻模块数字量输入引脚(35)

// 加热片控制引脚配置
#define HEATER_PIN_1 17          // 加热片控制引脚1 (GPIO17，正极)
#define HEATER_PIN_0 16          // 加热片控制引脚0 (GPIO16，负极)

// 摄像头电源控制引脚配置
#define CAMERA_POWER_PIN 5      // 摄像头电源控制引脚 (GPIO5，控制MOS管)

// 电机控制引脚配置
#define MOTOR_FORWARD_PIN 12     // 电机正转控制引脚 (GPIO21)
#define MOTOR_REVERSE_PIN 13     // 电机反转控制引脚 (GPIO22)

// 风扇控制引脚配置
#define FAN_POSITIVE_PIN 15      // 风扇正极控制引脚 (GPIO15)
#define FAN_NEGATIVE_PIN 14      // 风扇负极控制引脚 (GPIO14)

// ========================================== 模块参数配置 ==========================================

// 邮件系统参数配置
#define EMAIL_QUEUE_SIZE 10  // 邮件队列大小
#define EMAIL_MAX_LENGTH 500  // 邮件最大长度
#define EMAIL_SEND_TOTAL 3    // 邮件发送总次数
#define EMAIL_SEND_INTERVAL 5000  // 邮件发送间隔(ms)
#define QUEUE_STATUS_INTERVAL 10000  // 队列状态报告间隔(ms)

// 控制参数 - 在settings.h中定义
uint8_t humidityThreshold = 80;   // 湿度阈值
uint8_t tempDiffThreshold = 5;    // 温度差值阈值
unsigned long reportInterval = 5000;    // 上报间隔（毫秒）

// 定时上报配置
#define REPORT_INTERVAL 5000    // 上报间隔(ms)，1分钟 = 60000ms

// ESP-NOW数据发送配置
#define ESPNOW_SEND_INTERVAL 5000    // ESP-NOW数据发送间隔(ms)，5秒发送一次

// 传感器读取间隔配置

#define SENSORS_READ_INTERVAL 5000  // 传感器读取间隔(ms)，5秒读取一次

// 读取DHT11间隔配置
#define READ_DHT11_INTERVAL 10000  // 读取DHT11间隔(ms)，10秒读取一次

// INA226.ino 参数配置
#define INA226_MAX_CURRENT 8.0     // 最大电流 (A)
#define INA226_SHUNT_RESISTANCE 0.01 // 分流电阻值 (Ω)
#define INA226_AVG_COUNT_VS 5       // 电压采样平均次数
#define INA226_AVG_COUNT_CS 5       // 电流采样平均次数
#define INA226_AVG_COUNT 5          // INA226采样平均次数

// UTC电阻模块参数配置
#define UTC_VCC 3.3              // 实际输入电压（3.3V）
#define UTC_R1 10000.0           // 分压电阻值（10kΩ）
#define UTC_B 3950.0             // B值（NTC热敏电阻参数，根据实际NTC型号调整）
#define UTC_T0 298.15            // 参考温度（25°C = 298.15K）
#define UTC_R0 10000.0           // 参考电阻值（10kΩ @ 25°C，根据实际NTC型号调整）
#define UTC_ADC_RESOLUTION 4095  // ESP32的ADC分辨率（12位）
#define UTC_READ_INTERVAL 1000    // UTC温度读取间隔(ms)

// 3.3V输入校准参数
#define UTC_VOLTAGE_CORRECTION 1.1  // 电压校正系数（补偿3.3V输入，增大电压值）

// 日出日落计算参数配置
#define LATITUDE 24.40    // 纬度（北纬为正，北京坐标，可根据实际位置调整）
#define LONGITUDE 116.4074  // 经度（东经为正，北京坐标，可根据实际位置调整）
#define TIMEZONE 8          // 时区（UTC+8）

// ========================================== Blynk虚拟引脚配置 ==========================================

// 终端输出虚拟引脚
#define TERMINAL_VPIN V0        // Blynk终端输出 (用于状态信息显示)

// Rain_Sensor_demo.ino 虚拟引脚
#define RAIN_ANALOG_VPIN   V40    // 模拟量输出
#define RAIN_DIGITAL_VPIN  V41    // 数字量输出（1=有水，0=无水）

// Wireless_to_Motor.ino 虚拟引脚
#define MOTOR_BUTTON0_VPIN V42    // 电机控制按钮0：正转自锁
#define MOTOR_BUTTON1_VPIN V43    // 电机控制按钮1：反转自锁
// #define MOTOR_BUTTON2_VPIN V44    // 电机控制按钮2：正转自锁（备用）
// #define MOTOR_BUTTON3_VPIN V45    // 电机控制按钮3：反转自锁（备用）
#define MOTOR_TIMER_VPIN V46      // 电机定时器时间输入控件
#define MOTOR_TIMER_SWITCH_VPIN V47 // 电机定时器总开关 (0=关闭, 1=开启)

// DHT11.ino 虚拟引脚
#define DHT_TEMPERATURE_VPIN V48   // DHT11温度显示
#define DHT_HUMIDITY_VPIN V49      // DHT11湿度显示
#define DHT_TEMP_SET_VPIN V50      // DHT11温度设置值

// INA226.ino 虚拟引脚
#define OUTPUT_VOLTAGE_VPIN V51    // 输出电压显示
#define OUTPUT_CURRENT_VPIN V52    // 输出电流显示
#define OUTPUT_POWER_VPIN V53    // 输出功率显示

// 充电相关虚拟引脚已移至MPPT处理

#define BT_CONTROL_VPIN V72        // OnStep控制分段开关 (0,1-4)
#define BT_CONNECT_VPIN V73        // 蓝牙连接开关
#define BT_DISCONNECT_VPIN V74     // 蓝牙断开开关
#define BT_POSITION_SET_VPIN V75   // 位置设置分段开关 (0,1-2)

// IRF540 MOSFET控制虚拟引脚
#define MOSFET_CONTROL_VPIN V55    // MOSFET控制按钮 (0/1 bool) - 同时用作状态显示
#define MOSFET_RUNTIME_VPIN V56    // MOSFET运行时间显示 (整数，分钟)
#define MOSFET_DELAY_VPIN V57      // MOSFET延时关闭开关 (0/1 bool)
#define MOSFET_DELAY_TIME_VPIN V81 // MOSFET延时关闭时间设置 (HH:MM格式)

// UTC电阻模块虚拟引脚
#define UTC_TEMPERATURE_VPIN V58    // UTC温度显示

// 加热片控制虚拟引脚
#define HEATER_CONTROL_VPIN V60    // 加热片控制按钮 (0=手动, 1=自动)
#define HEATER_MANUAL_VPIN V61     // 手动模式开关 (0=关闭, 1=开启)
#define HEATER_HUMIDITY_SET_VPIN V62  // 湿度阈值设置 (0-100)
#define HEATER_TEMP_DIFF_SET_VPIN V63 // 温度差值设置 (0-30)

// 上报间隔设置虚拟引脚
#define REPORT_INTERVAL_VPIN V65         // 上报间隔设置范围：1-300秒

// 恢复默认设置虚拟引脚
#define RESTORE_DEFAULT_VPIN V66    // 恢复默认设置按钮 (0/1 bool)

// 调试输出按钮虚拟引脚
#define DEBUG_OUTPUT_VPIN V67       // 调试输出按钮 (0/1 bool)

// ESP-NOW发送间隔设置虚拟引脚
#define ESPNOW_SEND_INTERVAL_VPIN V80      // ESP-NOW数据发送间隔设置 (1-60秒)

// 摄像头控制虚拟引脚
#define CAMERA_OUTPUT_VPIN V68    // 相机输出虚拟引脚
#define CAMERA_POWER_VPIN V69    // 相机电源控制开关 (0=关闭, 1=开启)
#define CAMERA_STATUS_VPIN V76   // 摄像头状态显示
#define CAMERA_RUNTIME_VPIN V77  // 摄像头运行时间百分比显示（0-100%）
#define CAMERA_AUTO_OFF_TIME_VPIN V82  // 摄像头自动关闭时间设置（分钟，1-120分钟）

// 电机控制虚拟引脚
#define MOTOR_STATUS_VPIN V78    // 电机状态显示
#define MOTOR_RUNTIME_VPIN V79   // 电机运行时间显示

// 风扇控制虚拟引脚
#define FAN_CONTROL_VPIN V83     // 风扇控制按钮 (0=手动, 1=自动)
#define FAN_MANUAL_VPIN V84      // 手动模式开关 (0=关闭, 1=开启)
#define FAN_TEMP_THRESHOLD_VPIN V85  // 温度阈值设置 (20-60度)
#define FAN_STATUS_VPIN V86      // 风扇状态显示
#define FAN_SPEED_VPIN V87  // 风扇状态显示
// ========================================== EEPROM地址定义 ==========================================
#define EEPROM_SIZE 512                // EEPROM大小
#define EEPROM_MAGIC_NUMBER 0         // EEPROM魔数
#define EEPROM_MAGIC_NUMBER_ADDR 4    // EEPROM魔数地址
#define ADDR_BUTTON_STATE 8           // 按钮状态地址
#define ADDR_MOTOR_STATE 12           // 电机状态地址
#define ADDR_AUTOCLOSE_MOTOR 16       // 自动开关顶开关地址
#define ADDR_TEMP_DIFF_THRESHOLD 20   // 温度差值阈值地址
#define ADDR_HEATER_AUTO_MODE 24      // 加热片自动模式地址
#define ADDR_REPORT_INTERVAL 28       // 上报间隔地址
#define ADDR_TIMER_ENABLED 32         // 定时器总开关地址
#define ADDR_MOSFET_DELAY_ENABLED 36  // MOSFET延时关闭功能开关地址 
#define ADDR_MOSFET_DELAY_TIME 40     // MOSFET延时关闭时间地址
#define ADDR_HUMIDITY_THRESHOLD 44    // 湿度阈值地址
#define FAN_TEMP_THRESHOLD_ADDR 48    // 风扇温度阈值地址
#define MAC_ADDRESSES_ADDR 52         // MAC地址存储地址


#endif

