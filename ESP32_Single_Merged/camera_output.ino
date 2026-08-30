
// ==================== 摄像头控制功能函数 ====================

// 初始化摄像头控制模块
void initCameraControl() {
  Serial.println("初始化摄像头控制模块...");
  
  // 设置摄像头电源控制引脚为输出模式
  pinMode(CAMERA_POWER_PIN, OUTPUT);
  digitalWrite(CAMERA_POWER_PIN, LOW);  // 初始状态为关闭
  
  // 根据摄像头类型输出初始化信息
  #ifdef HIKVISION_CAMERA
    Serial.println("摄像头类型: 海康摄像头 - 支持RTSP流传输");
  #elif defined(XIAOMI_CAMERA)
    Serial.println("摄像头类型: 小米摄像头 - 仅支持电源控制");
  #else
    Serial.println("警告: 未选择摄像头类型，请在settings.h中选择HIKVISION_CAMERA或XIAOMI_CAMERA");
  #endif
  
  Serial.println("摄像头控制模块初始化完成");
  
  // 设置默认自动关闭时间显示（分钟）
}

// 设置摄像头电源状态
void setCameraPower(bool state) {
  if (cameraPowerState == state) {
    // 状态没有变化，无需操作
    return;
  }
  
  if (state) {
    // 开启摄像头电源
    digitalWrite(CAMERA_POWER_PIN, HIGH);
    cameraPowerState = true;
    cameraPowerStartTime = millis();
    cameraStartupComplete = false;  // 重置启动完成标志
    Serial.println("摄像头电源已开启");
    
    #ifdef HIKVISION_CAMERA
      // 海康摄像头：设置RTSP流
      setupRTSPStream();
    #elif defined(XIAOMI_CAMERA)
      // 小米摄像头：仅发送状态信息，不设置RTSP流
      Serial.println("小米摄像头已启动，使用小米平台查看视频流");
    #endif
    
  } else {
    // 关闭摄像头电源
    digitalWrite(CAMERA_POWER_PIN, LOW);
    cameraPowerState = false;
    cameraStartupComplete = false;  // 重置启动完成标志
    Serial.println("摄像头电源已关闭");
    
    #ifdef HIKVISION_CAMERA
      // 海康摄像头：清除RTSP流
      clearRTSPStream();
    #elif defined(XIAOMI_CAMERA)
      // 小米摄像头：仅发送状态信息
      Serial.println("小米摄像头已关闭");
    #endif
  }
  mqttPublishState("camera", cameraPowerState ? 1 : 0);
}

#ifdef HIKVISION_CAMERA
void setupRTSPStream() {
  Serial.println("设置RTSP流...");
  
  
  Serial.println("RTSP流设置完成");
}

// 清除RTSP流（仅海康摄像头使用）
void clearRTSPStream() {
  Serial.println("清除RTSP流...");
  
  // 清除RTSP URL
  
  Serial.println("RTSP流已清除");
}
#endif

// 获取摄像头电源状态
bool getCameraPowerState() {
  return cameraPowerState;
}

// 获取摄像头运行时间（秒）
unsigned long getCameraRuntime() {
  if (!cameraPowerState) {
    return 0;
  }
  return (millis() - cameraPowerStartTime) / 1000;
}

void sendCameraStatusToMQTT() {
  if (!cameraPowerState) {
    // 摄像头关闭时，发送0到运行时间引脚
    return;
  }
  
  unsigned long runtime = getCameraRuntime();
  // 计算运行时间占设定时间的百分比
  unsigned long maxRuntime = cameraAutoOffTime / 1000; // 转换为秒
  if (maxRuntime == 0) return;
  if (runtime > maxRuntime) runtime = maxRuntime;
  unsigned long percentage = (runtime * 100) / maxRuntime;
  
  // 确保百分比不超过100%
  if (percentage > 100) {
    percentage = 100;
  }
  
  mqttPublishState("camera_runtime_percent", percentage);
}


// 处理摄像头控制
void handleCameraControl() {
  // 检查摄像头启动延迟
  if (cameraPowerState && !cameraStartupComplete) {
    unsigned long currentTime = millis();
    if (currentTime - cameraPowerStartTime >= cameraStartupDelay) {
      cameraStartupComplete = true;
      Serial.println("摄像头启动延迟完成");
    }
  }
  
  // 检查是否需要自动关闭摄像头
  if (cameraPowerState) {
    unsigned long currentRuntime = millis() - cameraPowerStartTime;
    
    // 如果运行时间超过设定时间，自动关闭
    if (currentRuntime >= cameraAutoOffTime) {
      unsigned long autoOffMinutes = cameraAutoOffTime / 60000;
      Serial.printf("摄像头运行时间已达%lu分钟，自动关闭\n", autoOffMinutes);
      setCameraPower(false);
      return;
    }
  }
}



// 摄像头电源控制按钮回调

// 摄像头自动关闭时间设置回调

// ==================== 辅助函数 ====================
// 检查摄像头是否开启
bool isCameraPowered() {
  return cameraPowerState;
}

// 获取摄像头运行时间
unsigned long getCameraRunTime() {
  if (!cameraPowerState) {
    return 0;
  }
  return (millis() - cameraPowerStartTime) / 1000;
}


