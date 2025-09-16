/*
 * loT.ino - 远程天文台控制系统主程序
 * 功能：集成所有模块，实现远程天文台的自动化控制
 * 作者：H2O
 * 版本：1.0
 * 日期：2024
 */

#include "settings.h"
#include <BlynkSimpleEsp32.h>
#include <WiFi.h>
#include <time.h>
#include <EEPROM.h>
#include <DHT.h>
#include <INA226.h>
#include <BluetoothSerial.h>


// ==================== 全局变量定义 ====================

// 时间相关变量
unsigned long lastReadTime = 0;  // 上次传感器读取时间
unsigned long lastDHT11ReadTime = 0;  // 上次DHT11读取时间
unsigned long lastReportTime = 0;  // 上次上报数据的时间
unsigned long lastEmailTime = 0;  // 上次邮件发送时间

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

// 系统状态变量
bool motorState = false;      // 电机状态
bool mosfetState = false;     // MOSFET状态
bool heaterState = false;     // 加热片状态
bool cameraState = false;     // 摄像头状态
bool heaterAutoMode = true;   // 加热片自动模式
bool autoclose_motor = false; // 自动关顶开关
int buttonState = 0;          // MOSFET按钮状态

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

// 邮件队列相关变量
String emailQueue[EMAIL_QUEUE_SIZE]; // 邮件队列
int emailQueueHead = 0;              // 队列头
int emailQueueTail = 0;              // 队列尾
int emailQueueCount = 0;             // 队列中邮件数量
bool emailQueueFullFlag = false;  // 邮件队列是否已满

// 蓝牙相关变量
BluetoothSerial BT;
bool btConnected = false;
bool btPairing = false;

// 摄像头相关变量
unsigned long cameraStartTime = 0;
bool cameraPowered = false;

// 风扇控制相关变量
bool fanState = false;           // 风扇状态
bool fanAutoMode = true;         // 风扇自动模式
bool fanManualState = false;     // 风扇手动状态
uint8_t fanTempThreshold = 40;   // 风扇温度阈值（默认40度）

// 硬件对象实例
DHT myDHT11(DHT11_PIN, DHT11);
INA226 ina226(INA226_I2C_ADDRESS);



// 电机控制状态变量
bool motorForwardState = false;  // 正转状态
bool motorReverseState = false;  // 反转状态



// EEPROM地址定义
#define IOT_AUTO_HEATER_ADDR   0   // 自动加热带开关EEPROM地址
#define IOT_HUMI_THRESHOLD_ADDR 4  // 湿度阈值EEPROM地址
#define FAN_TEMP_THRESHOLD_ADDR 8  // 风扇温度阈值EEPROM地址
#define MAC_ADDRESSES_ADDR 1000  // MAC地址存储起始地址

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

// MAC地址存储结构（在MAC_Config.ino中定义）

// ========================================== 类型定义 ==========================================//
#define uchar unsigned char
#define uint unsigned int

// ================================================ 主程序 ==========================================//
void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  
  // 初始化EEPROM和读取设置
  initEEPROM();
  
  // 初始化Blynk连接
  Blynk.begin(BLYNK_AUTH_TOKEN, WIFI_SSID, WIFI_PASS, BLYNK_SERVER, BLYNK_PORT);
  
  Serial.println("=== 远程天文台控制系统启动 ===");
  Blynk.virtualWrite(TERMINAL_VPIN, String("=== 远程天文台控制系统启动 ==="));
  sendMessageToEmail("=== 远程天文台控制系统启动 ===");
  
  // 配置时间同步
  configTime(8 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println("时间同步已配置");
  Blynk.virtualWrite(TERMINAL_VPIN, String("时间同步已配置"));
  
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
  initEspNow();  // 初始化ESP-NOW通讯
  initMACConfig();  // 初始化MAC地址配置模块

  delay(1000);
}

// ================================================ Blynk连接状态回调 ==========================================//

// Blynk连接成功回调
BLYNK_CONNECTED() {
  Serial.println("=== Blynk连接成功 ===");
  Blynk.virtualWrite(TERMINAL_VPIN, String("=== Blynk连接成功 ==="));
  // 打印本机MAC地址
  uint8_t mac[6];
  WiFi.macAddress(mac);
  String macStr = String("IoT板子MAC地址: ") + 
                  String(mac[0], HEX) + ":" + String(mac[1], HEX) + ":" + 
                  String(mac[2], HEX) + ":" + String(mac[3], HEX) + ":" + 
                  String(mac[4], HEX) + ":" + String(mac[5], HEX);
  Serial.println(macStr);
  Blynk.virtualWrite(TERMINAL_VPIN, macStr);
  // 发送Blynk通知
  // Blynk.notify("远程天文台控制系统已上线");
  // 发送邮件通知
  // sendMessageToEmail("远程天文台控制系统已上线");
  
}


void loop() {
  Blynk.run();  // 运行Blynk主循环
  
  // 处理邮件发送序列
  processEmailSending();
  
  //蓝牙控制
  handleBluetoothControl();

  // 处理雨水传感器动作 - 下雨自动关顶
  handleRainAction();

  // 处理摄像头控制
  handleCameraControl();

  unsigned long currentTime = millis();
    
  // DHT11读取控制 - 每10秒读取一次
  if (currentTime - lastDHT11ReadTime >= READ_DHT11_INTERVAL) {
    readDHT11Data();//读取DHT11数据

    lastDHT11ReadTime = currentTime;
  }
  
  // 其他传感器读取控制 - 每5秒读取一次
  if (currentTime - lastReadTime >= SENSORS_READ_INTERVAL) {
    // 读取传感器数据
    readRainSensor();//读取雨水传感器数据
    readOutputVoltageCurrent();//读取输出电压和电流
    readUTCTemperature();//读取UTC温度 
    // printDataToSerial();//打印数据到串口
    sendCameraStatusToBlynk();//发送摄像头状态到Blynk
    
    lastReadTime = currentTime;
  }
  
  // 加热片控制
  updateHeaterControl(utcTemperature, dhtTemperature, dhtHumidity);//更新加热片控制
  
  // 风扇控制
  updateFanControl(dhtTemperature);//更新风扇控制
  
  // 上报MOSFET运行时间
  reportMosfetRuntime(); 
  
   // 检查MOSFET延时关闭功能
  checkMosfetDelay();
  
  // 发送传感器数据到Blynk
  sendDataToBlynk();
}

// ================================================ Blynk终端输入处理 ==========================================//







