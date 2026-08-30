#include "settings.h"
#include <WiFi.h>
#include <time.h>
#include <EEPROM.h>
#include <DHT.h>
#include <INA226.h>
#include <BluetoothSerial.h>
#include <esp_now.h>
#include <mqtt_client.h>
#include <Wire.h>

// 命令类型定义
#define CMD_NONE 0
#define CMD_PARK 1
#define CMD_UNPARK 2
#define CMD_SET_DATETIME 3
#define CMD_HOME 4
#define CMD_SET_HOME 5  // 设置当前位置为零位
#define CMD_SET_PARK 6  // 设置当前位置为停放位

// 时间相关常量
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = TIMEZONE * 3600;  // 从settings.h获取时区
const int daylightOffset_sec = 0;

// 蓝牙重连超时常量
const unsigned long RECONNECT_TIMEOUT = 5000; // 5秒超时

// ==================== 全局变量定义 ====================//

// 时间相关变量
unsigned long lastReadTime = 0;  // 上次传感器读取时间
unsigned long lastDHT11ReadTime = 0;  // 上次DHT11读取时间
unsigned long lastReportTime = 0;  // 上次上报数据的时间

// 传感器数据变量
float dhtTemperature = 0.0;  // DHT11温度
float dhtHumidity = 0.0;     // DHT11湿度
bool dht11DataValid = false; // DHT11数据有效性
float utcTemperature = 0.0;  // UTC温度
bool utcDataValid = false;   // UTC数据有效性
float outputVoltage = 0.0;   // 输出电压
float outputCurrent = 0.0;   // 输出电流
float powerOutput = 0.0;     // 输出功率
uint16_t rainAnalogValue = 0;  // 雨水传感器模拟值
bool rainDigitalState = false;  // 雨水传感器数字状态
bool rainDetected = false;  // 雨水检测状态
bool rainActionNeeded = false;  // 需要处理雨水的标志位
bool rainActionTriggered = false;
unsigned long lastRainCheckTime = 0;

// ==================== 系统状态变量 ====================
bool motorState = false;                 // 电机状态
bool mosfetState = false;                // MOSFET状态
bool heaterState = false;                // 加热片状态
bool heaterAutoMode = true;              // 加热片自动模式（使用远程的默认值true）
bool autoclose_motor = false;            // 自动关顶开关
int buttonState = 0;                     // MOSFET按钮状态

// 定时器相关变量
bool timerEnabled = false;    // 定时器总开关
bool startTriggered = false;  // 启动触发标志
bool stopTriggered = false;   // 停止触发标志
int startHour = 0;           // 启动小时
int startMinute = 0;         // 启动分钟
int stopHour = 0;            // 停止小时
int stopMinute = 0;          // 停止分钟
bool hasStartTime = false;   // 是否有启动时间
bool hasStopTime = false;    // 是否有停止时间
bool isStartSunrise = false; // 启动是否为日出
bool isStartSunset = false;  // 启动是否为日落
bool isStopSunrise = false;  // 停止是否为日出
bool isStopSunset = false;   // 停止是否为日落
bool weekdays[7] = {true, true, true, true, true, true, true}; // 生效的星期几
String timezone = "CST-8";   // 时区
int timezoneOffset = 28800;  // 时区偏移（秒）
String timerInfo = "未设置"; // 定时器信息

// MOSFET相关变量
unsigned long mosfetStartTime = 0; // MOSFET开始时间
bool mosfetDelayEnabled = false;        // 延时关闭功能开关
unsigned long mosfetDelayTime = 0;      // 延时关闭时间（毫秒）
unsigned long mosfetDelayStartTime = 0; // 延时开始时间

BluetoothSerial BT;
bool btConnected = false;
bool btPairing = false;
bool CommandSent = false;  // 命令发送状态
int currentCommand = CMD_NONE;  // 当前命令类型


// 风扇控制相关变量
bool fanState = false;           // 风扇状态
bool fanAutoMode = true;         // 风扇自动模式
bool fanManualState = false;     // 风扇手动状态
uint8_t fanTempThreshold = 40;   // 风扇温度阈值（默认40度）

// 硬件对象实例
DHT myDHT11(DHT11_PIN, DHT11);
INA226 ina226;

// MAC地址相关变量
uint8_t flatFieldMac[6];  // 平场板MAC地址
uint8_t mpptMac[6];  // MPPT MAC地址

// 电机控制状态变量
bool motorForwardState = false;  // 正转状态
bool motorReverseState = false;  // 反转状态



//========================================结构体定义=========================================//
// ESP-NOW配置结构体
typedef struct {
  bool autoHeater;
  int humiThreshold;
} EspNowConfig;

// MPPT数据结构体
typedef struct {
  float buckVoltage;    // 降压电压
  float buckCurrent;    // 降压电流
  float buckPower;      // 降压功率
} MpptData;

// 只发送湿度阈值的ESP-NOW结构体
typedef struct {
  int humiThreshold;
} EspNowHumiConfig;

// MAC地址存储结构定义
typedef struct MACAddresses {
  uint8_t onstepMac[6];
  uint8_t flatFieldMac[6];
  uint8_t mpptMac[6];
} MACAddresses;
MACAddresses macAddresses;


// ========================================== 类型定义 ==========================================//
#define uchar unsigned char
#define uint unsigned int

// ================================================ 主程序 ==========================================//
void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  
  // 初始化EEPROM和读取设置
  initEEPROM();
  
  // 初始化所有模块
  initINA226();
  initDHT11();
  initRainSensor();
  initBluetooth();
  initMosfetControl();
  initUTCTemperature();
  initHeater();  // 初始化加热片控制
  initCameraControl();  // 初始化摄像头控制
  initTimeService();  // 初始化时间服务
  initMotorControl();  // 初始化电机控制
  initFanControl();  // 初始化风扇控制
  initMACConfig();  // 初始化MAC地址配置模块
  initEspNow();  // MAC 地址加载后再初始化 ESP-NOW

  // 所有 GPIO/执行器安全初始化完成后，再接受远程 MQTT 命令
  initMqttSystem();
  configTime(TIMEZONE * 3600, 0, "pool.ntp.org", "time.nist.gov");
  
  // 发送初始调试信息
  delay(1000);  // 等待1秒确保所有模块初始化完成
  sendAllDebugInfo();

  // 初始化同一颗 ESP32 上的 MPPT 子系统；其独立配置区从 EEPROM 256 字节开始
  mpptSetup();

}

void loop() {
  mqttLoop();
  handleEspNowPeriodic();
  handleBluetoothControl();
  handleRainAction();
  handleCameraControl();
  ReadDataFromSensors();
  updateHeaterControl(utcTemperature, dhtTemperature, dhtHumidity);
  updateFanControl(dhtTemperature);
  reportMosfetRuntime(); 
  checkMosfetDelay();
  sendDataToMQTT();
  mpptLoop();
}







