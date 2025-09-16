/*
 * 蓝牙控制模块（OnStep控制）
 * 功能：通过蓝牙连接OnStep设备，支持配对和回停放位命令
 * 改进：添加SSP认证回调、自动重连机制和专业防抖处理
 * 新增：获取系统时间并设置到OnStep设备
 * 简化：移除终端模式，只保留Blynk引脚控制功能
 * 
 * Blynk引脚功能：
 * V72 (BT_CONTROL_VPIN): OnStep控制分段开关
 *   - 0: 无操作
 *   - 1: 设置日期时间
 *   - 2: 回停放位
 *   - 3: 解除停放位
 *   - 4: 回零位
 * 
 * V75 (BT_POSITION_SET_VPIN): 位置设置分段开关
 *   - 0: 无操作
 *   - 1: 设置当前位置为零位
 *   - 2: 设置当前位置为停放位
 * 
 * V73 (BT_CONNECT_VPIN): 蓝牙连接开关
 * V74 (BT_DISCONNECT_VPIN): 蓝牙断开开关
 */

#include "settings.h"
#include "BluetoothSerial.h"
#include <BlynkSimpleEsp32.h>
#include <WiFi.h>
#include <time.h>

// ==================== 命令类型定义 ====================
#define CMD_NONE 0
#define CMD_PARK 1
#define CMD_UNPARK 2
#define CMD_SET_DATETIME 3
#define CMD_HOME 4
#define CMD_SET_HOME 5  // 设置当前位置为零位
#define CMD_SET_PARK 6  // 设置当前位置为停放位

// ==================== 蓝牙状态变量 ====================
// 注意：btConnected和btPairing已在主程序中定义，这里只声明为extern
extern bool btConnected;
extern bool btPairing;
bool CommandSent = false;  // 命令发送状态
int currentCommand = CMD_NONE;  // 当前命令类型

// ==================== 时间相关变量 ====================
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = TIMEZONE * 3600;  // 从settings.h获取时区
const int daylightOffset_sec = 0;

// ==================== 蓝牙控制功能函数 ====================

// SSP认证回调函数
void BTConfirmRequestCallback(uint32_t pin) {
  Serial.printf("配对请求 PIN: %d\n", pin);
  BT.confirmReply(true); // 自动确认配对
}

void BTAuthCompleteCallback(bool success) {
  if(success) {
    Serial.println("配对成功!");
    btConnected = true;
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙配对成功"));
  } else {
    Serial.println("配对失败!");
    btConnected = false;
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙配对失败"));
  }
}

// 初始化时间服务
void initTimeService() {

  // 配置时间
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  int retryCount = 0;
  while (!time(nullptr) && retryCount < 10) {
    Serial.println("等待时间同步...");
    delay(1000);
    retryCount++;
  }
  
  if (time(nullptr)) {
    Serial.println("时间同步成功");
    Blynk.virtualWrite(TERMINAL_VPIN, String("时间同步成功"));
  } else {
    Serial.println("时间同步失败");
    Blynk.virtualWrite(TERMINAL_VPIN, String("时间同步失败"));
  }
}

// 获取当前日期时间字符串
String getCurrentDateTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("获取本地时间失败");
    return "";
  }
  
  char dateTimeStr[64];
  strftime(dateTimeStr, sizeof(dateTimeStr), "%m/%d/%y %H:%M:%S", &timeinfo);
  return String(dateTimeStr);
}

// 获取日期字符串 (MM/DD/YY格式)
String getCurrentDate() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("获取本地时间失败");
    return "";
  }
  
  char dateStr[16];
  strftime(dateStr, sizeof(dateStr), "%m/%d/%y", &timeinfo);
  return String(dateStr);
}

// 获取时间字符串 (HH:MM:SS格式)
String getCurrentTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("获取本地时间失败");
    return "";
  }
  
  char timeStr[16];
  strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
  return String(timeStr);
}

// 获取时区字符串
String getTimezoneString() {
  int tz = TIMEZONE;
  if (tz >= 0) {
    return String("+") + String(tz);
  } else {
    return String(tz);
  }
}

// 发送日期时间设置命令到OnStep
void sendDateTimeToOnStep() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无法发送命令");
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无法发送命令"));
    return;
  }
  
  // 获取当前日期时间
  String currentDate = getCurrentDate();
  String currentTime = getCurrentTime();
  String timezoneStr = getTimezoneString();
  
  if (currentDate.length() == 0 || currentTime.length() == 0) {
    Serial.println("获取时间失败，请检查网络连接");
    Blynk.virtualWrite(TERMINAL_VPIN, String("获取时间失败，请检查网络连接"));
    return;
  }
  
  // 发送日期命令 :SC[MM/DD/YY]#
  String dateCommand = ":SC" + currentDate + "#";
  BT.println(dateCommand);
  Serial.println("发送日期命令: " + dateCommand);
  // Blynk.virtualWrite(TERMINAL_VPIN, String("发送日期命令: " + dateCommand));
  delay(500);
  yield(); // 添加yield防止看门狗超时
  
  // 发送时间命令 :SL[HH:MM:SS]#
  String timeCommand = ":SL" + currentTime + "#";
  BT.println(timeCommand);
  Serial.println("发送时间命令: " + timeCommand);
  // Blynk.virtualWrite(TERMINAL_VPIN, String("发送时间命令: " + timeCommand));
  delay(500);
  yield(); // 添加yield防止看门狗超时
  
  // 发送时区命令 :SG[sHH]#
  String timezoneCommand = ":SG" + timezoneStr + "#";
  BT.println(timezoneCommand);
  Serial.println("发送时区命令: " + timezoneCommand);
  // Blynk.virtualWrite(TERMINAL_VPIN, String("发送时区命令: " + timezoneCommand));
  
  CommandSent = true;
  currentCommand = CMD_SET_DATETIME;
  
  Serial.println("日期时间设置命令发送完成");
  Blynk.virtualWrite(TERMINAL_VPIN, String("日期时间设置命令发送完成"));
}

// 初始化蓝牙模块
void initBluetooth() {
  Serial.println("初始化蓝牙模块...");
  Blynk.virtualWrite(TERMINAL_VPIN, String("初始化蓝牙模块..."));
  
  // 注册认证回调
  BT.onConfirmRequest(BTConfirmRequestCallback);
  BT.onAuthComplete(BTAuthCompleteCallback);
  
  // 初始化蓝牙串口（主机模式）
  if (BT.begin("ESP32_OnStep", true)) {
    Serial.println("蓝牙初始化成功");
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙初始化成功"));
  } else {
    Serial.println("蓝牙初始化失败");
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙初始化失败"));
  }
}

// 断开蓝牙连接函数
void disconnectBluetooth() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无需断开");
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无需断开"));
    return;
  }
  
  BT.disconnect();
  btConnected = false;
  btPairing = false;
  CommandSent = false;
  currentCommand = CMD_NONE;  // 重置命令类型
  Serial.println("蓝牙连接已断开");
  Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙连接已主动断开"));
  // 更新连接开关状态为关闭
  Blynk.virtualWrite(BT_CONNECT_VPIN, 0);
}

// 蓝牙配对函数
void pairBluetooth() {
  if (btPairing) {
    Serial.println("正在配对中，请稍候...");

    return;
  }
  
  btPairing = true;
  Serial.println("开始配对OnStep设备...");
  Blynk.virtualWrite(TERMINAL_VPIN, String("开始配对OnStep设备..."));
  
  // 尝试连接OnStep，带超时机制
  unsigned long startTime = millis();
  while(!BT.connect(onstepMac) && (millis() - startTime < 15000)) {
    Serial.println("连接中...");
    Blynk.virtualWrite(TERMINAL_VPIN, String("连接中..."));
    delay(500);
    yield(); // 添加yield防止看门狗超时
  }
  
  if(BT.connected()) {
    Serial.println("连接成功!");
    btConnected = true;
    btPairing = false;
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙连接成功"));
    // 更新连接开关状态为开启
    Blynk.virtualWrite(BT_CONNECT_VPIN, 1);
  } else {
    Serial.println("连接超时!");
    btConnected = false;
    btPairing = false;
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙连接超时"));
    // 更新连接开关状态为关闭
    Blynk.virtualWrite(BT_CONNECT_VPIN, 0);
  }
}

// 回停放位函数
void sendParkCommand() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无法发送命令");
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无法发送命令"));
    return;
  }
  
  BT.println(":hP#");  // 发送回停放位命令
  Serial.println("回停放位命令已发送");
  Blynk.virtualWrite(TERMINAL_VPIN, String("回停放位命令已发送"));
  CommandSent = true;
  currentCommand = CMD_PARK;  // 设置当前命令类型
}

// 解除停放位函数
void sendUnparkCommand() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无法发送命令");
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无法发送命令"));
    return;
  }
  
  BT.println(":hR#");  // 发送解除停放位命令
  Serial.println("解除停放位命令已发送");
  Blynk.virtualWrite(TERMINAL_VPIN, String("解除停放位命令已发送"));
  CommandSent = true;
  currentCommand = CMD_UNPARK;  // 设置当前命令类型
}

// 回零位函数
void sendHomeCommand() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无法发送命令");
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无法发送命令"));
    return;
  }
  
  BT.println(":hC#");  // 发送回零位命令
  Serial.println("回零位命令已发送");
  Blynk.virtualWrite(TERMINAL_VPIN, String("回零位命令已发送"));
  CommandSent = true;
  currentCommand = CMD_HOME;  // 设置当前命令类型
}

// 设置当前位置为零位函数
void setCurrentPositionAsHome() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无法发送命令");
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无法发送命令"));
    return;
  }
  
  BT.println(":hF#");  // 发送设置当前位置为零位命令
  Serial.println("设置当前位置为零位命令已发送");
  Blynk.virtualWrite(TERMINAL_VPIN, String("设置当前位置为零位命令已发送"));
  CommandSent = true;
  currentCommand = CMD_SET_HOME;  // 设置当前命令类型
}

// 设置当前位置为停放位函数
void setCurrentPositionAsPark() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无法发送命令");
    Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无法发送命令"));
    return;
  }
  
  BT.println(":hQ#");  // 发送设置当前位置为停放位命令
  Serial.println("设置当前位置为停放位命令已发送");
  Blynk.virtualWrite(TERMINAL_VPIN, String("设置当前位置为停放位命令已发送"));
  CommandSent = true;
  currentCommand = CMD_SET_PARK;  // 设置当前命令类型
}

// 蓝牙控制处理函数
void handleBluetoothControl() {
  // 连接状态监测与自动重连（添加5秒超时）
  static unsigned long lastReconnectTime = 0;
  const unsigned long RECONNECT_TIMEOUT = 5000; // 5秒超时
  
  if (!BT.connected() && btConnected) {
    unsigned long currentTime = millis();
    
    // 检查是否超过重连超时时间
    if (currentTime - lastReconnectTime >= RECONNECT_TIMEOUT) {
      btConnected = false;
      Serial.println("蓝牙连接断开，尝试重连...");
      Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙连接断开，尝试重连..."));
      
      // 尝试重连
      if(BT.connect(onstepMac)) {
        btConnected = true;
        Serial.println("重连成功!");
        Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙重连成功"));
        // 更新连接开关状态为开启
        Blynk.virtualWrite(BT_CONNECT_VPIN, 1);
      } else {
        Serial.println("重连失败!");
        Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙重连失败"));
        // 更新连接开关状态为关闭
        Blynk.virtualWrite(BT_CONNECT_VPIN, 0);
      }
      
      // 更新重连时间
      lastReconnectTime = currentTime;
      delay(2000); // 重连间隔
    }
  } else if (!BT.connected() && !btConnected) {
    // 蓝牙未连接且之前也未连接，不输出信息避免重复
    // 这里不输出任何信息，避免频繁的"断开"提示
  }

  // 监听回复
  if (CommandSent && BT.available()) {
    String response = BT.readStringUntil('\n');
    response.trim();
    if(response.length() > 0) {
      Serial.print("收到回复: ");
      Serial.println(response);
      Blynk.virtualWrite(TERMINAL_VPIN, String("收到回复: " + response));
      
      // 根据命令类型处理回复
      if (currentCommand == CMD_PARK) {
        // 处理回停放位回复
        if (response == "0") {
          Serial.println("回停放位无效");
          Blynk.virtualWrite(TERMINAL_VPIN, String("回停放位无效"));
        } else if (response == "1") {
          Serial.println("回停放位成功");
          Blynk.virtualWrite(TERMINAL_VPIN, String("回停放位成功"));
        } else {
          Serial.print("未知回复: ");
          Serial.println(response);
          Blynk.virtualWrite(TERMINAL_VPIN, String("未知回复: " + response));
        }
      } else if (currentCommand == CMD_UNPARK) {
        // 处理解除停放位回复
        if (response == "0") {
          Serial.println("解除停放位失败");
          Blynk.virtualWrite(TERMINAL_VPIN, String("解除停放位失败"));
        } else if (response == "1") {
          Serial.println("已解除停放");
          Blynk.virtualWrite(TERMINAL_VPIN, String("已解除停放"));
        } else {
          Serial.print("未知回复: ");
          Serial.println(response);
          Blynk.virtualWrite(TERMINAL_VPIN, String("未知回复: " + response));
        }
      } else if (currentCommand == CMD_SET_DATETIME) {
        // 处理日期时间设置回复
        if (response == "0") {
          Serial.println("日期时间设置失败");
          Blynk.virtualWrite(TERMINAL_VPIN, String("日期时间设置失败"));
        } else if (response == "1") {
          Serial.println("日期时间设置成功");
          Blynk.virtualWrite(TERMINAL_VPIN, String("日期时间设置成功"));
        } else {
          Serial.print("日期时间设置回复: ");
          Serial.println(response);
          Blynk.virtualWrite(TERMINAL_VPIN, String("日期时间设置回复: " + response));
        }
      } else if (currentCommand == CMD_HOME) {
        // 处理回零位回复
        if (response == "0") {
          Serial.println("回零位失败");
          Blynk.virtualWrite(TERMINAL_VPIN, String("回零位失败"));
        } else if (response == "1") {
          Serial.println("回零位成功");
          Blynk.virtualWrite(TERMINAL_VPIN, String("回零位成功"));
        } else {
          Serial.print("回零位回复: ");
          Serial.println(response);
          Blynk.virtualWrite(TERMINAL_VPIN, String("回零位回复: " + response));
        }
      } else if (currentCommand == CMD_SET_HOME) {
        // 处理设置当前位置为零位回复
        if (response == "0") {
          Serial.println("设置当前位置为零位失败");
          Blynk.virtualWrite(TERMINAL_VPIN, String("设置当前位置为零位失败"));
        } else if (response == "1") {
          Serial.println("设置当前位置为零位成功");
          Blynk.virtualWrite(TERMINAL_VPIN, String("设置当前位置为零位成功"));
        } else {
          Serial.print("设置零位回复: ");
          Serial.println(response);
          Blynk.virtualWrite(TERMINAL_VPIN, String("设置零位回复: " + response));
        }
      } else if (currentCommand == CMD_SET_PARK) {
        // 处理设置当前位置为停放位回复
        if (response == "0") {
          Serial.println("设置当前位置为停放位失败");
          Blynk.virtualWrite(TERMINAL_VPIN, String("设置当前位置为停放位失败"));
        } else if (response == "1") {
          Serial.println("设置当前位置为停放位成功");
          Blynk.virtualWrite(TERMINAL_VPIN, String("设置当前位置为停放位成功"));
        } else {
          Serial.print("设置停放位回复: ");
          Serial.println(response);
          Blynk.virtualWrite(TERMINAL_VPIN, String("设置停放位回复: " + response));
        }
      }
      CommandSent = false;
      currentCommand = CMD_NONE;  // 重置命令类型
    
    }
  }
}


// ==================== Blynk 回调函数 ====================

// OnStep控制分段开关回调 - 整合所有功能
BLYNK_WRITE(BT_CONTROL_VPIN) {
  int command = param.asInt();
  
  switch(command) {
    case 0:
      // 无操作
      break;
      
    case 1:
      // 设置日期时间
      if (btConnected) {
        sendDateTimeToOnStep();
      } else {
        Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无法设置日期时间"));
      }
      break;
      
    case 2:
      // 回停放位 (Park)
      if (btConnected) {
        sendParkCommand();
      } else {
        Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无法执行回停放位"));
      }
      break;
      
    case 3:
      // 解除停放位 (Unpark)
      if (btConnected) {
        sendUnparkCommand();
      } else {
        Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无法执行解除停放位"));
      }
      break;
      
    case 4:
      // 回零位 (Home)
      if (btConnected) {
        sendHomeCommand();
      } else {
        Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无法执行回零位"));
      }
      break;
      
    default:
      Blynk.virtualWrite(TERMINAL_VPIN, String("未知命令: " + String(command)));
      break;
  }
  
  // 执行完命令后，将分段开关重置为0
  Blynk.virtualWrite(BT_CONTROL_VPIN, 0);
}

// 蓝牙连接开关回调
BLYNK_WRITE(BT_CONNECT_VPIN) {
  if (param.asInt() == 1) {
    if (!btConnected && !btPairing) {
      pairBluetooth();
    } else if (btConnected) {
      Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙已连接，无需重复连接"));
    } else if (btPairing) {
      Blynk.virtualWrite(TERMINAL_VPIN, String("正在配对中，请稍候..."));
    }
    // 不自动重置开关，保持当前状态
  } else {
    // 用户手动关闭蓝牙连接
    if (btConnected) {
      disconnectBluetooth();
    }
  }
}

// 蓝牙断开开关回调
BLYNK_WRITE(BT_DISCONNECT_VPIN) {
  if (param.asInt() == 1) {
    if (btConnected) {
      disconnectBluetooth();
    } else {
      Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无需断开"));
    }
    // 执行完命令后，将开关重置为0
    Blynk.virtualWrite(BT_DISCONNECT_VPIN, 0);
  }
}

// 位置设置分段开关回调
BLYNK_WRITE(BT_POSITION_SET_VPIN) {
  int command = param.asInt();
  
  switch(command) {
    case 0:
      // 无操作
      break;
      
    case 1:
      // 设置当前位置为零位
      if (btConnected) {
        setCurrentPositionAsHome();
      } else {
        Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无法设置当前位置为零位"));
      }
      break;
      
    case 2:
      // 设置当前位置为停放位
      if (btConnected) {
        setCurrentPositionAsPark();
      } else {
        Blynk.virtualWrite(TERMINAL_VPIN, String("蓝牙未连接，无法设置当前位置为停放位"));
      }
      break;
      
    default:
      Blynk.virtualWrite(TERMINAL_VPIN, String("未知位置设置命令: " + String(command)));
      break;
  }
  
  // 执行完命令后，将分段开关重置为0
  Blynk.virtualWrite(BT_POSITION_SET_VPIN, 0);
}

// ==================== 辅助函数 ====================
// 检查蓝牙连接状态
bool isBluetoothConnected() {
    return btConnected;
}
