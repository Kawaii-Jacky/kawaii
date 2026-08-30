#ifndef SETTINGS_H
#define SETTINGS_H

#include <stdint.h>
#include "device_config.h"
/*---------------------------------请按照实际情况修改以下参数设置---------------------------------*/

// MQTT/Wi-Fi/camera credentials are stored in device_config.h.
// ========================================== 蓝牙配置 ==========================================
// OnStep的MAC地址
uint8_t onstepMac[] = {0x78, 0x1C, 0x3C, 0xA2, 0xD0, 0x16};//OnStep的MAC地址
// ========================================== 串口配置 ==========================================
#define SERIAL_BAUD_RATE 115200//串口波特率
// ======================================== 摄像头控制变量 ====================
// 摄像头类型选择 - 请选择一种摄像头类型，注释掉另一种
#define HIKVISION_CAMERA    // 海康摄像头 - RTSP 地址通过 device_config.h 配置
// #define XIAOMI_CAMERA     // 小米摄像头 - 仅支持电源控制，不传输RTSP流

bool cameraPowerState = false;              // 摄像头电源状态
unsigned long cameraPowerStartTime = 0;     // 摄像头开启时间
unsigned long cameraAutoOffTime = DEVICE_CAMERA_AUTO_OFF_MS;
bool cameraStartupComplete = false;         // 摄像头启动完成标志
unsigned long cameraStartupDelay = DEVICE_CAMERA_STARTUP_DELAY_MS;

// 海康摄像头RTSP配置（仅在海康摄像头模式下使用）
String rtspUrl = DEVICE_CAMERA_RTSP_URL;

// 小米摄像头配置（仅在小米摄像头模式下使用）
// 小米摄像头使用自己的平台，不需要RTSP配置

// ========================================== 统一ESP32引脚配置 ==========================================

// Rain_Sensor_demo.ino 引脚配置
#define RAIN_ANALOG_PIN 26    // GPIO39 未引出；GPIO26 作为预留 ADC 输入
#define RAIN_DIGITAL_PIN 4    // GPIO19 已被无线 WS4460(U46) 占用

// DHT11.ino 引脚配置
#define DHT11_PIN 23          // PCB: S1(AM2302) 数据脚连接 GPIO23

// IRF540 MOSFET控制引脚配置
#define MOSFET_PIN 25        // GPIO2 未在 PCB U33 引出，改用可用 GPIO25

// INA226.ino 引脚配置
#define INA226_I2C_ADDRESS 0x42    // PCB 重塑后的 IoT INA226 地址

// UTC电阻模块引脚配置
#define UTC_ANALOG_PIN 35    // GPIO34 已连接 PCB CN10 NTC，IoT UTC 改用 GPIO35
// #define UTC_DIGITAL_PIN 14   // UTC电阻模块数字量输入引脚(35)

// 加热片控制引脚配置
#define HEATER_PIN_1 17          // 加热片控制引脚1 (GPIO17，正极)
#define HEATER_PIN_0 16          // 加热片控制引脚0 (GPIO16，负极)

// 摄像头电源控制引脚配置
#define CAMERA_POWER_PIN 0      // GPIO5 未引出；GPIO0 仅作为临时摄像头电源控制，注意启动绑带

// 电机控制引脚配置
#define MOTOR_FORWARD_PIN 12     // 电机正转控制引脚 (GPIO21)
#define MOTOR_REVERSE_PIN 13     // 电机反转控制引脚 (GPIO22)

// Fan control pins
#define FAN_POSITIVE_PIN 14   // PCB: U28 栅极/风扇低端开关
#define FAN_NEGATIVE_PIN 255  // PCB 无第二路风扇反向驱动

// ========================================== 模块参数配置 ==========================================

// 控制参数 - 在settings.h中定义
uint8_t humidityThreshold = 80;   // 湿度阈值
uint8_t tempDiffThreshold = 5;    // 温度差值阈值
unsigned long reportInterval = DEVICE_MQTT_REPORT_INTERVAL_MS;

// 定时上报配置
#define REPORT_INTERVAL 5000    // 上报间隔(ms)，1分钟 = 60000ms

// 传感器读取间隔配置

#define SENSORS_READ_INTERVAL 5000  // 传感器读取间隔(ms)，5秒读取一次
#define RAIN_CHECK_INTERVAL 1000UL
#define ESPNOW_SEND_INTERVAL 5000UL

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

// EEPROM layout (keep within EEPROM_SIZE)
#define EEPROM_SIZE 512
#define EEPROM_MAGIC_NUMBER 0x4C4F5431UL
#define EEPROM_MAGIC_NUMBER_ADDR 4
#define IOT_AUTO_HEATER_ADDR 8
#define FAN_TEMP_THRESHOLD_ADDR 16
#define ADDR_BUTTON_STATE 20
#define ADDR_MOTOR_STATE 24
#define ADDR_AUTOCLOSE_MOTOR 28
#define ADDR_TEMP_DIFF_THRESHOLD 32
#define ADDR_HEATER_AUTO_MODE 36
#define ADDR_REPORT_INTERVAL 40
#define ADDR_TIMER_ENABLED 44
#define ADDR_MOSFET_DELAY_ENABLED 48
#define ADDR_MOSFET_DELAY_TIME 52
#define ADDR_HUMIDITY_THRESHOLD 56
#define MAC_ADDRESSES_ADDR 60
#define IOT_HUMI_THRESHOLD_ADDR 68

// Remote control is provided by MQTT topics in device_config.h.
// ========================================== 类型定义 ==========================================
#define uchar unsigned char
#define uint unsigned int

#endif
