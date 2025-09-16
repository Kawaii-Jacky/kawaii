/*
 * 电动平场板控制代码
 * 
 * 功能特性:
 *  - 舵机控制 (IO4): 开关控制，开时旋转270度，关时旋转0度
 *  - LED亮度控制 (IO21): 滑块控制，0-100% PWM输出
 *  - 加热带控制 (IO5): 开关控制
 *  - Blynk远程控制
 *  - WiFi连接
 * 
 * 硬件要求:
 *  - ESP32 开发板
 *  - 舵机 (连接到IO4)
 *  - LED灯 (连接到IO21)
 *  - 加热带 (连接到IO5)
 * 
 * 使用说明:
 * 1. 修改WiFi和Blynk配置参数
 * 2. 根据实际硬件连接修改引脚定义
 * 3. 编译并上传到ESP32
 * 4. 使用Blynk应用程序进行远程控制

 */

//================================ 配置参数=====================================//

#define WIFI_SSID "Kawaii-Fatty"                    // WiFi 网络名称
#define WIFI_PASSWORD "Czh040731"           // WiFi 密码
#define BLYNK_AUTH_TOKEN "3LnRVfUhILu2Puxul1R3UAgHZQSb_puT"    // Blynk 身份验证令牌
#define BLYNK_SERVER "blynk.warmsake.top"                      // Blynk 服务器地址（默认：blynk.cloud）
#define BLYNK_PORT 8080                                        // Blynk 服务器端口（默认：80，自定义服务器：8080）

//================================ ARDUINO LIBRARIES ===============================//

#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include <ESP32Servo.h>
#include <EEPROM.h>

//====================================== GPIO 引脚定义 ===========================================//
#define SERVO_PIN 4    // 舵机控制引脚
#define LED_PIN 21     // LED控制引脚
#define HEATER_PIN 5   // 加热带控制引脚

//========================================= WiFi SSID ==============================================//
char
  ssid[] = WIFI_SSID,      // WiFi SSID
  pass[] = WIFI_PASSWORD;  // WiFi 密码

//========================================= Blynk 服务器配置 ==============================================//
char
  auth[] = BLYNK_AUTH_TOKEN,     // Blynk 身份验证令牌
  blynkServer[] = BLYNK_SERVER;  // Blynk 服务器地址

uint16_t blynkPort = BLYNK_PORT;  // Blynk 服务器端口

//====================================== 系统变量 ==========================================//
Servo flatFieldServo;  // 舵机对象
bool servoState = false;  // 舵机状态
int ledBrightness = 0;    // LED亮度值 (0-100)
bool heaterState = false; // 加热带状态
int servoAngle = 300;     // 舵机开合角度 (0-300度)
const int EEPROM_SIZE = 512;  // EEPROM大小
const int ANGLE_ADDRESS = 0;  // 角度存储地址

//====================================== 函数声明 ===========================================//
void setupServo();
void setupPWM();
void controlServo(bool state);
void controlLED(int brightness);
void controlHeater(bool state);
void loadAngleFromEEPROM();
void saveAngleToEEPROM(int angle);

//====================================== Blynk 输入处理函数 ===========================================//
// 舵机控制开关 (V1)
BLYNK_WRITE(V1) {
  servoState = param.asInt();
  controlServo(servoState);
}

// LED亮度控制滑块 (V2)
BLYNK_WRITE(V2) {
  ledBrightness = param.asInt();
  controlLED(ledBrightness);
}

// 加热带控制开关 (V3)
BLYNK_WRITE(V3) {
  heaterState = param.asInt();
  controlHeater(heaterState);
}

// 舵机角度控制滑块 (V4)
BLYNK_WRITE(V4) {
  servoAngle = param.asInt();
  saveAngleToEEPROM(servoAngle);
  // 如果舵机当前是开启状态，立即更新到新角度
  if (servoState) {
    flatFieldServo.write(servoAngle);
  }
}

//====================================== 初始化函数 ===========================================//
void setup() {
  // 串行初始化
  Serial.begin(115200);
  Serial.println("> 电动平场板控制系统初始化");

  // 初始化EEPROM
  EEPROM.begin(EEPROM_SIZE);
  
  // 从EEPROM加载保存的角度
  loadAngleFromEEPROM();

  // GPIO 引脚初始化
  pinMode(LED_PIN, OUTPUT);
  pinMode(HEATER_PIN, OUTPUT);
  
  // 初始化舵机
  setupServo();
  
  // 初始化PWM
  setupPWM();
  
  // 初始化Blynk
  Blynk.begin(auth, ssid, pass, blynkServer, blynkPort);
  
  Serial.println("> 系统初始化完成");
}

//====================================== 主循环 ===========================================//
void loop() {
  Blynk.run();
  delay(100);
}

//====================================== 舵机初始化 ===========================================//
void setupServo() {
  ESP32PWM::allocateTimer(0);//分配定时器0
  flatFieldServo.setPeriodHertz(50);//设置舵机周期为50Hz
  flatFieldServo.attach(SERVO_PIN, 500, 2500);//设置舵机引脚为SERVO_PIN，最小脉冲为500us，最大脉冲为2500us
  flatFieldServo.write(0);  // 初始位置为0度
}

//====================================== PWM初始化 ===========================================//
void setupPWM() {
  ledcSetup(0, 5000, 8);  // 通道0，5kHz频率，8位分辨率
  ledcAttachPin(LED_PIN, 0);
  ledcWrite(0, 0);  // 初始亮度为0
}

//====================================== 舵机控制函数 ===========================================//
void controlServo(bool state) {
  if (state) {
    flatFieldServo.write(servoAngle);  // 开启时旋转到保存的角度
  } else {
    flatFieldServo.write(0);    // 关闭时旋转到0度
  }
}

//====================================== LED控制函数 ===========================================//
void controlLED(int brightness) {
  // 将0-100的亮度值转换为0-255的PWM值
  int pwmValue = map(brightness, 0, 100, 0, 255);
  ledcWrite(0, pwmValue);
}

//====================================== 加热带控制函数 ===========================================//
void controlHeater(bool state) {
  digitalWrite(HEATER_PIN, state ? HIGH : LOW);
}

//====================================== EEPROM操作函数 ===========================================//
void loadAngleFromEEPROM() {
  int savedAngle = EEPROM.readInt(ANGLE_ADDRESS);
  // 检查读取的值是否在有效范围内
  if (savedAngle >= 0 && savedAngle <= 300) {
    servoAngle = savedAngle;
  } else {
    servoAngle = 300; // 默认值
    saveAngleToEEPROM(servoAngle);
  }
}

void saveAngleToEEPROM(int angle) {
  EEPROM.writeInt(ANGLE_ADDRESS, angle);
  EEPROM.commit();
} 