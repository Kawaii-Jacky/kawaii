/*
 * Scripts.ino - 雨水自动关顶模块
 * 功能：检测雨水并自动关闭顶盖
 */

#include "settings.h"

// 外部变量声明
extern bool rainDetected;  // 雨水检测状态

// 雨水动作处理相关变量
bool rainActionTriggered = false;  // 雨水动作是否已触发
unsigned long lastRainCheckTime = 0;  // 上次雨水检查时间
const unsigned long RAIN_CHECK_INTERVAL = 5000;  // 雨水检查间隔（5秒）

/**
 * 处理雨水传感器动作 - 下雨自动关顶
 * 在主循环中调用，检查雨水状态并执行相应动作
 */
void handleRainAction() {
  unsigned long currentTime = millis();
  
  // 每5秒检查一次雨水状态
  if (currentTime - lastRainCheckTime >= RAIN_CHECK_INTERVAL) {
    lastRainCheckTime = currentTime;
    
    // 检查是否检测到雨水
    if (rainDetected && !rainActionTriggered) {
      // 检测到雨水，触发关顶动作
      triggerRainCloseAction();
    } else if (!rainDetected && rainActionTriggered) {
      // 雨水停止，重置触发标志
      rainActionTriggered = false;
      Serial.println("雨水停止，重置雨水动作标志");
      Blynk.virtualWrite(TERMINAL_VPIN, String("雨水停止，重置雨水动作标志"));
    }
  }
}

/**
 * 触发雨水关顶动作
 * 发送反转点动命令关闭顶盖
 */
void triggerRainCloseAction() {
  Serial.println("检测到雨水，自动触发关顶动作");
  Blynk.virtualWrite(TERMINAL_VPIN, String("检测到雨水，自动触发关顶动作"));
  
  // 发送正转点动命令（关顶）
  motorForward();
  
  // 设置触发标志，防止重复触发
  rainActionTriggered = true;
  
  Serial.println("雨水关顶命令已发送");
  Blynk.virtualWrite(TERMINAL_VPIN, String("雨水关顶命令已发送"));
}
