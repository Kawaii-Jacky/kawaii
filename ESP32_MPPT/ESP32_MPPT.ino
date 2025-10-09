//====================================太阳能MPPT充电控制器=========================================//

//====================== ARDUINO LIBRARIES (ESP32 Compatible Libraries) ============================//
//请下载对应的库文件，并安装到Arduino IDE中
//esp_now:by Espressif Systems(1.0.6)
//INA226Lib:by Peter Buchegger(1.1.2)
//LiquidCrystal_I2C By:Frank de Brabander
//esp32 by Espressif Systems(1.0.6)
//============================================================================================= ====//
#include <EEPROM.h>            //系统参数 - EEPROM 库（作者：Arduino）
#include <Wire.h>              //系统参数 - WIRE 库（作者：Arduino）
#include <SPI.h>               //系统参数 - SPI 库（作者：Arduino）
#include <WiFi.h>              //系统参数 - WiFi 库（作者：Arduino）
#include <WiFiClient.h>        //系统参数 - WiFi 库（作者：Arduino）
#include <BlynkSimpleEsp32.h>  //系统参数 - 手机应用程序的 Blynk WiFi 库
#include <INA226.h>            //系统参数 - INA226 电流/电压传感器库 (peterus版本)
#include "esp_task_wdt.h"      //系统参数 - ESP32看门狗库
TaskHandle_t Core2;            //系统参数 - 用于 ESP32 双核操作
INA226 ina1;                   //系统参数 - INA226 输入电流/电压传感器
INA226 ina2;                   //系统参数 - INA226 输出电流/电压传感器

//========================================= Blynk 服务器配置 ==============================================//

//请根据自己的WIFI和Blynk服务器地址修改以下参数

#define WIFI_SSID "Kawaii-Fatty"                    // WiFi 网络名称
#define WIFI_PASSWORD "Czh040731"           // WiFi 密码
#define BLYNK_AUTH_TOKEN "010g89Iz_cGYyWqVxjsO8kdHhHW08dea"    // Blynk 身份验证令牌
#define BLYNK_SERVER "blynk.warmsake.top"                      // Blynk 服务器地址（默认：blynk.cloud）
#define BLYNK_PORT 8080                                        // Blynk 服务器端口（默认：80，自定义服务器：8080）

//========================================= GPIO 引脚定义 ==============================================//
// 系统硬件引脚配置，请根据实际硬件连接修改 //
#define backflow_MOSFET 27  //系统参数 -回流 MOSFET
#define buck_IN 33          //系统参数 - 降压 MOSFET 驱动器 PWM引脚
#define buck_EN 32          //系统参数 - 降压 MOSFET 驱动器使能引脚
#define LED 2               //系统参数 - LED指示灯 GPIO 引脚
#define FAN 16              //系统参数 -风扇 GPIO 引脚
#define INA1_ALERT 34       //系统参数 - INA226 输入传感器报警引脚
#define INA2_ALERT 35       //系统参数 - INA226 输出传感器报警引脚
#define TempSensor 39       //系统参数 - 温度传感器 GPIO 引脚


//========================================= 系统联网参数 ==============================================//
char
  ssid[] = WIFI_SSID,      //   用户参数 - 输入您的 WiFi SSID
  pass[] = WIFI_PASSWORD;  //   用户参数 - 输入您的 WiFi 密码

char
  auth[] = BLYNK_AUTH_TOKEN,     //   用户参数 - 输入 Blynk 身份验证令牌
  blynkServer[] = BLYNK_SERVER;  //   Blynk 服务器地址（默认：blynk.cloud）

uint16_t blynkPort = BLYNK_PORT;  //   Blynk 服务器端口（默认：80，自定义服务器：7070）

//========================================= 看门狗参数 ==============================================//
const unsigned long
  WATCHDOG_TIMEOUT = 30,        // 看门狗超时时间（30秒）
  WIFI_TIMEOUT = 10000,         // WiFi连接超时时间（10秒）
  BLYNK_TIMEOUT = 8000;        // Blynk连接超时时间（8秒）


//========================================= MPPT数据结构体 ==============================================//
// MPPT数据结构体
typedef struct {
  float buckVoltage;    // 降压电压
  float buckCurrent;    // 降压电流
  float buckPower;      // 降压功率
} MpptData;

//========================================= 用户配置参数 ==============================================//
bool
  output_Mode = 1,           //   USER PARAMETER - 0 = PSU 模式, 1 = 充电器模式
  MPPT_Mode = 1,             //   USER PARAMETER - 启用 MPPT 算法，当禁用充电器时使用 CC-CV 算法
  disableFlashAutoLoad = 0,  //   USER PARAMETER - 强制 MPPT 不使用闪存保存的设置，启用此"1"默认为已编程的固件设置
  enableWiFi = 1,            //   USER PARAMETER - 启用 WiFi 连接
  enableFan = 1,             //   USER PARAMETER - 启用冷却风扇
  enableBluetooth = 1,       //   USER PARAMETER - 启用蓝牙连
  overrideFan = 0,           //   USER PARAMETER - 风扇手动控制（0=自动，1=手动开启）
  enableDynamicCooling = 0;  //   USER PARAMETER - 启用 PWM 冷却控制
int
  Sending_Interval = 5000,  // MPPT数据发送间隔(ms)，5秒发送一次
  serialTelemMode = 1,          //  USER PARAMETER - 选择串行遥测数据馈送（0 - 禁用串行，1 - 显示所有数据，2 - 显示基本，3 - 仅数字）
  pwmResolution = 11,           //  USER PARAMETER - PWM 位分辨率
  pwmFrequency = 39000,         //  USER PARAMETER - PWM 开关频率 - Hz（用于降压）
  temperatureFan = 60,          //  USER PARAMETER - 风扇开启的温度阈值
  temperatureMax = 90,          //  USER PARAMETER - 过热，超过时系统关闭（摄氏度）
  telemCounterReset = 0,        //  USER PARAMETER - 每隔一次重置 Telem 数据（0 = 从不，1 = 日，2 = 周，3 = 月，4 = 年）
  errorTimeLimit = 1000,        //  USER PARAMETER - 重置错误计数器的时间间隔（毫秒）
  errorCountLimit = 5,          //  USER PARAMETER - 最大错误数
  millisRoutineInterval = 250,  //  USER PARAMETER - 例程函数的时间间隔刷新率 (ms)
  millisSerialInterval = 1000,     //  USER PARAMETER - USB 串行数据馈送的时间间隔刷新率 (ms)
  // millisWiFiInterval = 1000,    //  USER PARAMETER - WiFi 遥测的时间间隔刷新率 (ms)
  backflowTriggerLimit = 5,     //  USER PARAMETER - 旁路控制连续触发次数限制
  backflowcheckInterval = 100,  //  USER PARAMETER - 旁路检查间隔(ms) - 100ms
  backflowresetInterval = 1000,  //  USER PARAMETER - 旁路重置检查间隔(ms) - 1秒重置
  baudRate = 115200,            //  用户参数 - USB 串行波特率 (bps)
  resetbutton = 0,
  newResetMode = 0;
float
  voltageBatteryMax = 14.400,  //   USER PARAMETER - 充电终止电压（电池充满时的目标电压 V）
  voltageBatteryMin = 10.0000,  //   USER PARAMETER - 电池空电压（电池放电终止电压 V）
  currentCharging = 2.0000,    //   USER PARAMETER - 最大充电电流（A - 输出）
  electricalPrice = 0.6500,   //   USER PARAMETER - 每千瓦时的输入电价（美元/千瓦时，欧元/千瓦时，比索/千瓦时）
  buckProtectVoltage = 0.5000,  //   USER PARAMETER - 输出保护电压（V）
  buckmaxfloatVoltage = 0.2500,  //   USER PARAMETER - 旁路控制Max浮动电压（V）
  buckminfloatVoltage = 0.5000,  //   USER PARAMETER - 旁路控制Min浮动电压（V）
  buckfloatVoltage = 0.5000;     //   USER PARAMETER - 旁路控制浮动电压（V）

//================================== 校准参数 =======================================//
//可以调整以下参数以设计您自己的 MPPT 充电控制器。只修改 //
//如果你知道你在做什么，下面的值。以下值已针对 //
// TechBuilder (Angelo S. Casimiro) 设计的 MPPT 充电控制器 //
//=================================================================================================//
int
  avgCountVS = 5,    //  校准参数 - 电压传感器平均采样计数（推荐：5）
  avgCountCS = 10,   //  校准参数 - 电流传感器平均采样计数（增加到10，提高稳定性）
  avgCountTS = 500,  //  校准参数 - 温度传感器平均采样计数
  avgCountBF = 5;    //  校准参数 - 降压效率平均采样计数（推荐：5）
float
  inVoltageDivRatio = 3.0000,     //  校准参数 - 输入分压器传感器比率（INA226直接测量，通常为1.0）
  outVoltageDivRatio = 3.0000,    //  校准参数 - 输出分压器传感器比率（INA226直接测量，通常为1.0）
  vOutSystemMax = 80.0000,        //  校准参数 - 最大输入电压
  cOutSystemMax = 50.0000,        //  校准参数 - 最大输出电压
  ntcResistance = 10000.00,       //  校准参数 - NTC 温度传感器的电阻。如果您使用 10k NTC，请更改为 10000.00
  voltageDropout = 1.0000,        //  校准参数 - 降压稳压器的压降电压（由于最大占空比限制而存在 DOV）
  voltageBatteryThresh = 1.5000,  //  校准参数 - 达到此电压时断电（输出 V）
  currentInAbsolute = 31.0000,    //  校准参数 - 系统可以处理的最大输入电流（A - 输入）
  currentOutAbsolute = 50.0000,   //  校准参数 - 系统可以处理的最大输出电流（A - 输入）
  pwmMinLimited_margin = 99.5000;          //  校准参数 - 预测 PWM 的最小工作占空比 (%)
float
  PWM_MaxDC = 0.0000,             //  系统参数 - 最大工作占空比 (%) 通过公式动态计算
  PWM_MinDC = 0.0000,             //  系统参数 - 最小工作占空比 (%) 通过公式动态计算
  efficiencyRate = 1.0000,        //  校准参数 - 理论降压效率（十进制百分比）
  currentMidPoint = 0.0000,       //  校准参数 - 电流传感器中点 (V) - INA226自动处理
  currentSens = 0.0000,           //  校准参数 - 电流传感器灵敏度 (V/A) - INA226自动处理
  currentSensV = 0.0330,          //  校准参数 - 电流传感器灵敏度 (mV/A) - INA226自动处理
  vInSystemMin = 8.000;           //  校准参数 - 系统识别最低电压

//===================================== 系统参数 =========================================//
//不要更改本节中的参数值。下面的值是系统使用的变量 //
//进程。更改值可能会损坏 MPPT 硬件。请保持原样！然而， //
//您可以访问这些变量来获取您的模组所需的数据。//
//=================================================================================================//
bool
  buckEnable = 0,        // SYSTEM PARAMETER - 降压启用状态
  fanStatus = 0,         // SYSTEM PARAMETER - 风扇活动状态（1 = 开，0 = 关）
  bypassEnable = 0,      // SYSTEM PARAMETER -
  chargingPause = 0,     // SYSTEM PARAMETER -
  lowPowerMode = 0,      // SYSTEM PARAMETER -
  flashMemLoad = 0,      // SYSTEM PARAMETER -
  confirmationMenu = 0,  // SYSTEM PARAMETER -
  WIFI = 0,              // SYSTEM PARAMETER -
  BNC = 0,               // SYSTEM PARAMETER -
  REC = 0,               // SYSTEM PARAMETER -
  FLV = 0,               // SYSTEM PARAMETER -
  IUV = 0,               // SYSTEM PARAMETER -
  IOV = 0,               // SYSTEM PARAMETER -
  IOC = 0,               // SYSTEM PARAMETER -
  OUV = 0,               // SYSTEM PARAMETER -
  OOV = 0,               // SYSTEM PARAMETER -
  OOC = 0,               // SYSTEM PARAMETER -
  OTE = 0;               // SYSTEM PARAMETER -
int
  inputSource = 0,     // SYSTEM PARAMETER - 0 = MPPT 没有电源，1 = MPPT 使用太阳能作为电源，2 = MPPT 使用电池作为电源
  avgStoreTS = 0,      // SYSTEM PARAMETER - 温度传感器使用非侵入式平均，这是用于平均平均的累加器
  temperature = 0,     // SYSTEM PARAMETER -
  sampleStoreTS = 0,   // SYSTEM PARAMETER - TS AVG 第 n 个样本
  pwmMax = 0,          // SYSTEM PARAMETER -
  pwmMaxLimited = 0,   // SYSTEM PARAMETER -
  PWM = 0,             // SYSTEM PARAMETER -
  pwmMinLimited = 0,            // SYSTEM PARAMETER -
  pwmChannel = 0,      // SYSTEM PARAMETER -
  batteryPercent = 0,  // SYSTEM PARAMETER -
  PPWM = 0,            // SYSTEM PARAMETER - 预测PWM值
  errorCount = 0,      // SYSTEM PARAMETER -
  menuPage = 0,        // SYSTEM PARAMETER -
  subMenuPage = 0,     // SYSTEM PARAMETER -
  ERR = 0,             // SYSTEM PARAMETER -
  backflowTriggerCount = 0,  // SYSTEM PARAMETER - 旁路控制防误触发计数器
  conv1 = 0,           // SYSTEM PARAMETER -
  conv2 = 0,           // SYSTEM PARAMETER -
  intTemp = 0;         // SYSTEM PARAMETER -
float
  BF = 0.0000,               // SYSTEM PARAMETER - 降压效率平均值
  VSI = 0.0000,               // SYSTEM PARAMETER - 原始输入电压传感器 ADC 电压
  VSO = 0.0000,               // SYSTEM PARAMETER - 原始输出电压传感器 ADC 电压
  CSI = 0.0000,               // SYSTEM PARAMETER - 原始电流传感器 ADC 电压
  CSO = 0.0000,               // SYSTEM PARAMETER - 原始输出电流传感器 ADC 电压
  CSI_converted = 0.0000,     // SYSTEM PARAMETER - 实际电流传感器 ADC 电压
  CSO_converted = 0.0000,     // SYSTEM PARAMETER - 实际输出电流传感器 ADC 电压CSI
  TS = 0.0000,                // SYSTEM PARAMETER - 原始温度传感器 ADC 值
  powerInput = 0.0000,        // SYSTEM PARAMETER - 输入功率（太阳能）以瓦特为单位
  powerInputPrev = 0.0000,    // SYSTEM PARAMETER - 先前存储的 MPPT 算法的输入功率变量（瓦特）
  buckPower = 0.0000,         // SYSTEM PARAMETER - 降压功率（电池或充电功率，以瓦特为单位）
  energySavings = 0.0000,     // SYSTEM PARAMETER - 法定货币（比索、美元、欧元等）的能源节约
  voltageInput = 0.0000,      // SYSTEM PARAMETER - 输入电压（太阳能电压）
  voltageInputPrev = 0.0000,  // SYSTEM PARAMETER - 先前存储的 MPPT 算法的输入电压变量
  buckVoltage = 0.0000,       // SYSTEM PARAMETER - 降压电压（电池电压）
  currentInput = 0.0000,      // SYSTEM PARAMETER - 输入电流（电池或充电电压）
  buckCurrent = 0.0000,       // SYSTEM PARAMETER - 降压电流（电池或充电电流，以安培为单位）
  TSlog = 0.0000,             // SYSTEM PARAMETER -  NTC 热敏电阻热感应代码的一部分
  daysRunning = 0.0000,       // SYSTEM PARAMETER - 存储 MPPT 设备自上次通电以来运行的总天数
  Wh = 0.0000,                // SYSTEM PARAMETER - 存储收集到的累积能量（瓦特小时）
  kWh = 0.0000,               // SYSTEM PARAMETER - 存储收集到的累积能量（千瓦时）
  MWh = 0.0000,               // SYSTEM PARAMETER - 存储收集到的累积能量（兆瓦时）
  dailyEnergy = 0.0000,       // SYSTEM PARAMETER - 日发电量（瓦特小时）
  totalEnergy = 0.0000,       // SYSTEM PARAMETER - 总发电量（瓦特小时）
  loopTime = 0.0000,          // SYSTEM PARAMETER -
  outputDeviation = 0.0000,   // SYSTEM PARAMETER - 输出电压偏差 (%)
  buckEfficiency = 0.0000,    // SYSTEM PARAMETER - 测量降压转换器功率转换效率（仅适用于我的双电流传感器版本）
  floatTemp = 0.0000,
  vOutSystemMin = 0.0000;  //  CALIB PARAMETER -
unsigned long
  currentErrorMillis = 0,    //SYSTEM PARAMETER -
  currentButtonMillis = 0,   //SYSTEM PARAMETER -
  currentSerialMillis = 0,   //SYSTEM PARAMETER -
  currentRoutineMillis = 0,  //SYSTEM PARAMETER -
  currentWiFiMillis = 0,     //SYSTEM PARAMETER -
  currentMenuSetMillis = 0,  //SYSTEM PARAMETER -
  prevButtonMillis = 0,      //SYSTEM PARAMETER -
  prevSerialMillis = 0,      //SYSTEM PARAMETER -
  prevRoutineMillis = 0,     //SYSTEM PARAMETER -
  prevErrorMillis = 0,       //SYSTEM PARAMETER -
  prevWiFiMillis = 0,        //SYSTEM PARAMETER -
  timeOn = 0,                //SYSTEM PARAMETER -
  loopTimeStart = 0,         //SYSTEM PARAMETER - 用于循环循环秒表，记录循环开始时间
  loopTimeEnd = 0,           //SYSTEM PARAMETER - 用于循环循环秒表，记录循环结束时间
  secondsElapsed = 0,        //SYSTEM PARAMETER -
  lastDayReset = 0,          //SYSTEM PARAMETER - 上次日发电重置时间戳
  lastBackflowCheck = 0,     //SYSTEM PARAMETER - 旁路控制上次检查时间
  lastCore0Heartbeat = 0,    //SYSTEM PARAMETER - CORE0心跳时间
  lastCore1Heartbeat = 0;    //SYSTEM PARAMETER - CORE1心跳时间

//====================================== 主程序 =============================================//
// The codes below contain all the system processes for the MPPT firmware. Most of them are called //
// from the 8 .ino tabs. The codes are too long, Arduino tabs helped me a lot in organizing them.  //
// The firmware runs on two cores of the Arduino ESP32 as seen on the two separate pairs of void   //
// setups and loops. The xTaskCreatePinnedToCore() freeRTOS function allows you to access the      //
// unused ESP32 core through Arduino. Yes it does multicore processes simultaneously!              //
//=================================================================================================//


//================= CORE0: SETUP (DUAL CORE MODE) =====================//
void coreTwo(void* pvParameters) {
  // 在Core0中初始化看门狗
  esp_task_wdt_init(WATCHDOG_TIMEOUT, true);  // 30秒超时，启用恐慌处理
  esp_task_wdt_add(NULL);                      // 添加当前任务到看门狗
  Serial.println("> Core0 Watchdog Initialized");

  setupWiFi();  //TAB#7 - WiFi Initialization

  //================= CORE0: LOOP (DUAL CORE MODE) ======================//
  while (1) {
    // 喂看门狗
    esp_task_wdt_reset();
    
    // 更新CORE0心跳
    lastCore0Heartbeat = millis();
    
    // 频繁调用Blynk.run()以确保输入响应及时
    // 定期重置看门狗
    static unsigned long lastCore0WatchdogReset = 0;
    if (millis() - lastCore0WatchdogReset > 5000) {  // 每5秒重置一次看门狗
      esp_task_wdt_reset();
      lastCore0WatchdogReset = millis();
    }
    
    // 调用Blynk.run()处理网络通信
    if (WIFI == 1) {
      Blynk.run();
    }
    
    // 发送遥测数据
    static unsigned long lastTelemetryTime = 0;
    if (millis() - lastTelemetryTime > Sending_Interval) {
      Wireless_Telemetry();
      lastTelemetryTime = millis();
    }

    // 添加小延迟避免占用过多CPU
    delay(50);
    delay(50);
  }
}

//================== CORE1: SETUP (DUAL CORE MODE) ====================//
void setup() {

  //串行初始化
  Serial.begin(baudRate);                  //Set serial baud rate
  Serial.println("> Serial Initialized");  //Startup message
  
  // 初始化看门狗定时器（30秒超时）
  esp_task_wdt_init(30, true);
  Serial.println("> Watchdog Initialized (30s timeout)");

  // GPIO 引脚初始化
  pinMode(backflow_MOSFET, OUTPUT);
  pinMode(buck_EN, OUTPUT);
  pinMode(LED, OUTPUT);
  pinMode(FAN, OUTPUT);
  pinMode(TempSensor, INPUT);
  pinMode(INA1_ALERT, INPUT);
  pinMode(INA2_ALERT, INPUT);

  //PWM INITIALIZATION
  ledcSetup(pwmChannel, pwmFrequency, pwmResolution);  //Set PWM Parameters
  ledcAttachPin(buck_IN, pwmChannel);                  //Set pin as PWM
  ledcWrite(pwmChannel, PWM);                          //Write PWM value at startup (duty = 0)
  pwmMax = pow(2, pwmResolution) - 1;                  //Get PWM Max Bit Ceiling
  

  // Initialize INA226 input sensor
  if (!ina1.begin()) {
    Serial.println("Failed to initialize INA226 input sensor");
  }

  //配置 INA226：使用标准INA226库的API
  ina1.configure(INA226_AVERAGES_256, INA226_BUS_CONV_TIME_588US, INA226_SHUNT_CONV_TIME_588US, INA226_MODE_SHUNT_BUS_CONT);
  ina1.calibrate(0.002, 40);

  // Initialize INA226 output sensor
  if (!ina2.begin(0x41)) {
    Serial.println("Failed to initialize INA226 output sensor");
  }

  // Configure INA226 using standard library API
  ina2.configure(INA226_AVERAGES_256, INA226_BUS_CONV_TIME_588US, INA226_SHUNT_CONV_TIME_588US, INA226_MODE_SHUNT_BUS_CONT);
  ina2.calibrate(0.002, 40);

  //GPIO INITIALIZATION；初始化进行disable，进行输入开路电压检测保护IUV
  buck_Disable();

  //ENABLE DUAL CORE MULTITASKING
  xTaskCreatePinnedToCore(coreTwo, "coreTwo", 10000, NULL, 0, &Core2, 0);

  //INITIALIZE AND LIOAD FLASH MEMORY DATA
  EEPROM.begin(512);

  initializeFlashAutoload();                              //Load stored settings from flash memory

}
//================== CORE1: LOOP (DUAL CORE MODE) ======================//
void loop() {
  // 喂看门狗
  esp_task_wdt_reset();
  
  // 更新CORE1心跳
  lastCore1Heartbeat = millis();

Read_Sensors();        //读取传感器
Device_Protection();   //故障检测算法
System_Processes();    //系统进程
Charging_Algorithm();  //电池充电算法
Onboard_Telemetry();   //板载遥测（USB & 串行遥测）

}
