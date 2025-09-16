/*
 * 电动平场板控制代码
 * 
 * 功能特性:
 *  - 舵机控制 (IO4): 开关控制，开时旋转到设定角度，关时旋转0度
 *  - LED亮度控制 (IO21): 滑块控制，0-100% PWM输出
 *  - 加热带控制 (IO5): 开关控制，功率可调0-100% PWM输出
 *  - 舵机角度设置: 滑块控制，0-300度，记忆到EEPROM
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

//================================ 配置文件引用 =====================================//
#include "config.h"

//================================ ARDUINO LIBRARIES ===============================//
#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include <EEPROM.h>
#include <esp_now.h>

//====================================== 结构体定义 ===========================================//

// ESP-NOW配置结构体
typedef struct {
  bool autoHeater;
  int humiThreshold;
} EspNowConfig;

// ESP-NOW湿度数据结构体（接收来自IoT板子）
typedef struct {
  int humiThreshold; // 实际是接收到的湿度值
} EspNowHumiConfig;

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
// Servo flatFieldServo;  // 舵机对象 - 移除，使用硬件PWM
bool servoState = false;  // 舵机状态
bool ledState = false;    // LED开关状态
int ledBrightness = 50;   // LED亮度值 (0-100)
bool heaterState = false; // 加热带状态
int heaterPower = 50;   // 加热带功率值 (0-100)
int servoAngle = 300;     // 舵机开合角度 (0-300度)
int currentServoPosition = 0;  // 当前舵机位置 (0-300度)
int targetServoPosition = 0;   // 目标舵机位置 (0-300度)
bool servoMoving = false;      // 舵机是否正在移动
unsigned long lastServoMoveTime = 0;  // 上次舵机移动时间
bool autoHeater = true;   // 自动加热带开关
int humiThreshold = 70;   // 湿度阈值
int receivedHumidity = 0; // 接收到的实际湿度值
const int EEPROM_SIZE = 512;  // EEPROM大小

// PWM通道定义
const int SERVO_PWM_CHANNEL = 0;  // 舵机使用通道0 (定时器0)
const int LED_PWM_CHANNEL = 8;    // LED使用通道8 (定时器2)
const int HEATER_PWM_CHANNEL = 4; // 加热带使用通道4 (定时器1)

// ESP-NOW相关变量
// EF板子现在作为接收端，不需要存储目标MAC地址

//====================================== 函数声明 ===========================================//
void setupServo();
void setupPWM();
void controlServo(bool state);
void startServoMove(int targetAngle);
void updateServoMove();
void controlLED(int brightness);
void controlHeater(bool state);
void loadAngleFromEEPROM();
void saveAngleToEEPROM(int angle);
void loadBrightnessFromEEPROM();
void saveBrightnessToEEPROM(int brightness);
void loadAutoHeaterFromEEPROM();
void saveAutoHeaterToEEPROM(bool value);
void loadHumiThresholdFromEEPROM();
void saveHumiThresholdToEEPROM(int value);
void loadHeaterPowerFromEEPROM();
void saveHeaterPowerToEEPROM(int power);
void initEspNow();
void onEspNowRecv(const uint8_t *mac_addr, const uint8_t *data, int data_len);

//====================================== Blynk 输入处理函数 ===========================================//
// 舵机控制开关
BLYNK_WRITE(BLYNK_SERVO_SWITCH) {
  servoState = param.asInt();
  Serial.printf("> 舵机开关状态: %s\n", servoState ? "开启" : "关闭");
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "舵机开关: " + String(servoState ? "开启" : "关闭"));
  controlServo(servoState);
}

// LED开关控制
BLYNK_WRITE(BLYNK_LED_SWITCH) {
  ledState = param.asInt();
  Serial.printf("> LED开关状态: %s\n", ledState ? "开启" : "关闭");
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "LED开关: " + String(ledState ? "开启" : "关闭"));
  if (ledState) {
    controlLED(ledBrightness);
  } else {
    controlLED(0);
  }
}

// LED亮度设置滑块
BLYNK_WRITE(BLYNK_LED_BRIGHTNESS) {
  ledBrightness = param.asInt();
  Serial.printf("> LED亮度设置: %d%%\n", ledBrightness);
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "LED亮度: " + String(ledBrightness) + "%");
  saveBrightnessToEEPROM(ledBrightness);
  // 如果LED当前是开启状态，立即更新亮度
  if (ledState) {
    controlLED(ledBrightness);
  }
}

// 加热带控制开关
BLYNK_WRITE(BLYNK_HEATER_SWITCH) {
  heaterState = param.asInt();

  // 当用户手动操作开关时，我们暂时关闭自动模式以避免冲突
  if (autoHeater) {
    autoHeater = false;
    saveAutoHeaterToEEPROM(autoHeater); // 保存状态
    Blynk.virtualWrite(BLYNK_AUTO_HEATER_SWITCH, 0); // 同步UI
    Serial.println("> 用户手动控制，自动加热已关闭。");
    Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "手动控制，自动加热已关闭");
  }

  Serial.printf("> 加热带开关状态: %s\n", heaterState ? "开启" : "关闭");
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "加热带开关: " + String(heaterState ? "开启" : "关闭"));
  controlHeater(heaterState);
}

// 舵机角度控制滑块
BLYNK_WRITE(BLYNK_ANGLE_SLIDER) {
  servoAngle = param.asInt();
  Serial.printf("> 舵机角度设置: %d度\n", servoAngle);
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "舵机角度: " + String(servoAngle) + "度");
  saveAngleToEEPROM(servoAngle);

  // 修复逻辑错误：如果舵机当前是开启状态，立即更新到新角度
  if (servoState) {
    targetServoPosition = servoAngle;
    servoMoving = true;
    lastServoMoveTime = 0;  // 立即开始移动
    Serial.printf("> 舵机角度已更新，开始移动到: %d度\n", servoAngle);
  }
}

// 自动加热带开关控制
BLYNK_WRITE(BLYNK_AUTO_HEATER_SWITCH) {
  autoHeater = param.asInt();
  saveAutoHeaterToEEPROM(autoHeater);
  Serial.printf("> 自动加热带设置已更新: %s\n", autoHeater ? "开启" : "关闭");
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "自动加热带: " + String(autoHeater ? "开启" : "关闭"));
}

// 湿度阈值设置滑块
BLYNK_WRITE(BLYNK_HUMI_THRESHOLD) {
  humiThreshold = param.asInt();
  saveHumiThresholdToEEPROM(humiThreshold);
  Serial.printf("> 湿度阈值设置已更新: %d%%\n", humiThreshold);
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "湿度阈值: " + String(humiThreshold) + "%");
}

// 加热带功率设置滑块
BLYNK_WRITE(BLYNK_HEATER_POWER) {
  heaterPower = param.asInt();
  Serial.printf("> 加热带功率设置: %d%%\n", heaterPower);
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "加热带功率: " + String(heaterPower) + "%");
  saveHeaterPowerToEEPROM(heaterPower);
  // 如果加热带当前是开启状态，立即更新功率
  if (heaterState) {
    controlHeater(true);
  }
}

// 加热带PWM控制滑块 (V9虚拟引脚)
BLYNK_WRITE(BLYNK_HEATER_PWM_CONTROL) {
  int pwmValue = param.asInt();
  Serial.printf("> 加热带PWM控制: %d%%\n", pwmValue);
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "加热带PWM: " + String(pwmValue) + "%");
  
  // 直接控制PWM输出，不受开关状态限制
  if (pwmValue > 0) {
    // 将0-100的PWM值转换为0-255的PWM值
    int pwmOutput = map(pwmValue, 0, 100, 0, 255);
    ledcWrite(HEATER_PWM_CHANNEL, pwmOutput);
    Serial.printf("> 加热带PWM输出: %d (0-255范围)\n", pwmOutput);
  } else {
    // PWM为0时关闭输出
    ledcWrite(HEATER_PWM_CHANNEL, 0);
    Serial.println("> 加热带PWM输出已关闭");
  }
}

//====================================== 初始化函数 ===========================================//
void setup() {
  // 串行初始化
  Serial.begin(115200);
  Serial.println("> 电动平场板控制系统初始化");

  // 初始化EEPROM
  EEPROM.begin(EEPROM_SIZE);
  
  // 从EEPROM加载保存的设置
  loadAngleFromEEPROM();
  loadBrightnessFromEEPROM();
  loadAutoHeaterFromEEPROM();
  loadHumiThresholdFromEEPROM();
  loadHeaterPowerFromEEPROM();

  // GPIO 引脚初始化
  pinMode(LED_PIN, OUTPUT);
  pinMode(SIGNAL_LED_PIN, OUTPUT);  // 信号指示灯引脚初始化
  digitalWrite(SIGNAL_LED_PIN, HIGH);  // 信号指示灯常亮
  
  // 初始化舵机
  setupServo();
  
  // 初始化PWM
  setupPWM();
  
  // 初始化Blynk
  Blynk.begin(auth, ssid, pass, blynkServer, blynkPort);
  Serial.println("> Blynk服务器连接成功");

  // 打印本机MAC地址
  uint8_t mac[6];
  WiFi.macAddress(mac);
  String macStr = String("平场板MAC地址: ") + 
                  String(mac[0], HEX) + ":" + String(mac[1], HEX) + ":" + 
                  String(mac[2], HEX) + ":" + String(mac[3], HEX) + ":" + 
                  String(mac[4], HEX) + ":" + String(mac[5], HEX);
  Serial.println("> " + macStr);
  
  // 发送MAC地址到Blynk终端
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, macStr);
  
  // 初始化ESP-NOW
  initEspNow();
  
  // 显示系统状态信息
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "初始化完成");
  
}

//====================================== 主循环 ===========================================//
void loop() {
  Blynk.run();
  updateServoMove();  // 更新舵机移动状态
  delay(100);
}

//====================================== 舵机初始化 ===========================================//
void setupServo() {
  // 配置舵机PWM通道
  ledcSetup(SERVO_PWM_CHANNEL, 50, 16);  // 通道0，50Hz，16位分辨率
  ledcAttachPin(SERVO_PIN, SERVO_PWM_CHANNEL);

  // 初始化舵机到0度位置 (反向移动：0度对应最大PWM值)
  int initialPwmValue = map(0, 0, 300, 8197, 1639);  // 反向映射：0度->8197, 300度->1639
  ledcWrite(SERVO_PWM_CHANNEL, initialPwmValue);
  currentServoPosition = 0;
  targetServoPosition = 0;
  servoMoving = false;

  Serial.println("> 舵机初始化完成，当前位置: 0度 (反向移动模式，16位分辨率)");
}

//====================================== PWM初始化 ===========================================//
void setupPWM() {
  ledcSetup(LED_PWM_CHANNEL, 5000, 8);  // LED使用通道8，5kHz频率，8位分辨率，使用定时器2
  ledcAttachPin(LED_PIN, LED_PWM_CHANNEL);
  ledcWrite(LED_PWM_CHANNEL, 0);  // 初始亮度为0
  
  ledcSetup(HEATER_PWM_CHANNEL, 1000, 8);  // 加热带使用通道4，1kHz频率，8位分辨率，使用定时器1
  ledcAttachPin(HEATER_PIN, HEATER_PWM_CHANNEL);
  ledcWrite(HEATER_PWM_CHANNEL, 0);  // 初始功率为0
}

//====================================== 舵机控制函数 ===========================================//
void controlServo(bool state) {
  int targetAngle;

  if (state) {
    targetAngle = servoAngle;  // 开启时旋转到设定角度

  } else {
    targetAngle = 0;  // 关闭时旋转到0度
 
  }

  // 修复逻辑错误：正确更新位置跟踪，使用平滑移动
  targetServoPosition = targetAngle;
  servoMoving = true;
  lastServoMoveTime = 0;  // 立即开始移动

}

//====================================== 舵机移动更新函数 ===========================================//
void updateServoMove() {
  if (!servoMoving) return;

  unsigned long currentTime = millis();

  // 检查是否到了移动时间
  if (currentTime - lastServoMoveTime >= SERVO_STEP_DELAY) {
    // 计算与目标位置的距离
    int distanceToTarget = abs(targetServoPosition - currentServoPosition);

    // 如果距离目标位置足够接近（小于等于步长），直接移动到目标位置
    if (distanceToTarget <= SERVO_STEP_SIZE) {
      currentServoPosition = targetServoPosition;
      servoMoving = false;

      // 发送目标位置的PWM信号
      int pwmValue = map(currentServoPosition, 0, 300, 8197, 1639);
      ledcWrite(SERVO_PWM_CHANNEL, pwmValue);

      Serial.printf("> 舵机快速跳跃到目标位置: %d度\n", currentServoPosition);
      Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "舵机移动完成，位置: " + String(currentServoPosition) + "度");
      return;
    }

    int direction = (targetServoPosition > currentServoPosition) ? 1 : -1;

    // 计算下一步位置
    int nextPosition = currentServoPosition + direction * SERVO_STEP_SIZE;

    // 修复逻辑错误：正确处理边界情况
    if ((direction > 0 && nextPosition >= targetServoPosition) ||
        (direction < 0 && nextPosition <= targetServoPosition)) {
      nextPosition = targetServoPosition;
    }

    // 更新当前位置
    currentServoPosition = nextPosition;

    // 将角度转换为PWM值 (0-300度映射到8197-1639，对应500-2500us脉冲，16位分辨率，反向移动)
    int pwmValue = map(currentServoPosition, 0, 300, 8197, 1639);
    ledcWrite(SERVO_PWM_CHANNEL, pwmValue);

    // 更新移动时间
    lastServoMoveTime = currentTime;
  }
}

//====================================== LED控制函数 ===========================================//
void controlLED(int brightness) {
  if (ledState) {
    // 将0-100的亮度值转换为0-255的PWM值
    int pwmValue = map(brightness, 0, 100, 0, 255);
    ledcWrite(LED_PWM_CHANNEL, pwmValue);
  } else {
    // LED关闭
    ledcWrite(LED_PWM_CHANNEL, 0);
  }
}

//====================================== 加热带控制函数 ===========================================//
void controlHeater(bool state) {
  if (state) {
    // 将0-100的功率值转换为0-255的PWM值
    int pwmValue = map(heaterPower, 0, 100, 0, 255);
    ledcWrite(HEATER_PWM_CHANNEL, pwmValue);

  } else {
    // 加热带关闭
    ledcWrite(HEATER_PWM_CHANNEL, 0);

  }
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

void loadBrightnessFromEEPROM() {
  int savedBrightness = EEPROM.readInt(BRIGHTNESS_ADDRESS);
  // 检查读取的值是否在有效范围内
  if (savedBrightness >= 0 && savedBrightness <= 100) {
    ledBrightness = savedBrightness;
  } else {
    ledBrightness = 50; // 默认值
    saveBrightnessToEEPROM(ledBrightness);
  }
}

void saveBrightnessToEEPROM(int brightness) {
  EEPROM.writeInt(BRIGHTNESS_ADDRESS, brightness);
  EEPROM.commit();
}

//====================================== 自动加热带EEPROM操作函数 ===========================================//
void loadAutoHeaterFromEEPROM() {
  autoHeater = EEPROM.readInt(AUTO_HEATER_ADDRESS);
  // 检查读取的值是否有效
  if (autoHeater != 0 && autoHeater != 1) {
    autoHeater = true; // 默认值
    saveAutoHeaterToEEPROM(autoHeater);
  }
}


void saveAutoHeaterToEEPROM(bool value) {
  EEPROM.writeInt(AUTO_HEATER_ADDRESS, value);
  EEPROM.commit();
}

void loadHumiThresholdFromEEPROM() {
  humiThreshold = EEPROM.readInt(HUMI_THRESHOLD_ADDRESS);
  // 检查读取的值是否在有效范围内
  if (humiThreshold < 0 || humiThreshold > 100) {
    humiThreshold = 70; // 默认值
    saveHumiThresholdToEEPROM(humiThreshold);
  }
}

void saveHumiThresholdToEEPROM(int value) {
  EEPROM.writeInt(HUMI_THRESHOLD_ADDRESS, value);
  EEPROM.commit();
}

//====================================== 加热带功率EEPROM操作函数 ===========================================//
void loadHeaterPowerFromEEPROM() {
  heaterPower = EEPROM.readInt(HEATER_POWER_ADDRESS);
  // 检查读取的值是否在有效范围内
  if (heaterPower < 0 || heaterPower > 100) {
    heaterPower = 50; // 默认值
    saveHeaterPowerToEEPROM(heaterPower);
  }
}

void saveHeaterPowerToEEPROM(int power) {
  EEPROM.writeInt(HEATER_POWER_ADDRESS, power);
  EEPROM.commit();
}

//====================================== ESP-NOW操作函数 ===========================================//
void initEspNow() {
  // 设置WiFi模式为Station
  WiFi.mode(WIFI_STA);
  
  // 初始化ESP-NOW
  if (esp_now_init() == ESP_OK) {
    Serial.println("> ESP-NOW 初始化成功");
    // 注册接收回调函数
    esp_now_register_recv_cb(onEspNowRecv);
  } else {
    Serial.println("> ESP-NOW 初始化失败");
  }
}

// ESP-NOW接收回调函数
void onEspNowRecv(const uint8_t *mac_addr, const uint8_t *data, int data_len) {
  // 检查数据长度是否匹配
  if (data_len == sizeof(EspNowHumiConfig)) {
    EspNowHumiConfig *config = (EspNowHumiConfig*)data;
    
    // 更新接收到的湿度值
    receivedHumidity = config->humiThreshold;
    
    // 发送到Blynk显示
    Blynk.virtualWrite(BLYNK_RECEIVED_HUMIDITY, receivedHumidity);
    
   
    // 检查湿度值是否超过阈值，如果超过则自动开启加热带
    if (autoHeater && receivedHumidity > humiThreshold) {
      if (!heaterState) {
        heaterState = true;
        controlHeater(true);
        Blynk.virtualWrite(BLYNK_HEATER_SWITCH, 1);
        Serial.printf("> 湿度超过阈值(%d%% > %d%%)，自动开启加热带\n", receivedHumidity, humiThreshold);
        Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "湿度超过阈值，自动开启加热带");
      }
    } else if (autoHeater && receivedHumidity <= humiThreshold) {
      if (heaterState) {
        heaterState = false;
        controlHeater(false);
        Blynk.virtualWrite(BLYNK_HEATER_SWITCH, 0);
        Serial.printf("> 湿度低于阈值(%d%% <= %d%%)，自动关闭加热带\n", receivedHumidity, humiThreshold);
        Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "湿度低于阈值，自动关闭加热带");
      }
    }
  } else {
    Serial.printf("> 接收到无效数据，长度: %d\n", data_len);
  }
}

