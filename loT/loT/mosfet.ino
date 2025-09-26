
// ==================== MOSFET控制功能函数 ====================


// 初始化MOSFET控制模块
void initMosfetControl() {
  pinMode(MOSFET_PIN, OUTPUT);
  digitalWrite(MOSFET_PIN, LOW); // 初始化输出状态为低电平
  
  // 重置延时开始时间（系统启动时重置）
  mosfetDelayStartTime = 0;
  
  Serial.println("MOSFET控制模块初始化完成");
  
  // 如果延时功能已启用，显示当前设置
  if (mosfetDelayEnabled) {
    unsigned long hours = mosfetDelayTime / 3600000UL;
    unsigned long minutes = (mosfetDelayTime % 3600000UL) / 60000UL;
    Serial.printf("延时关闭功能已启用，设置时间: %lu小时%lu分钟\n", hours, minutes);
  }
}

// 检查延时关闭功能
void checkMosfetDelay() {
  if (mosfetDelayEnabled && mosfetState && mosfetDelayStartTime > 0) {
    unsigned long currentTime = millis();
    if (currentTime - mosfetDelayStartTime >= mosfetDelayTime) {
      // 延时时间到，自动关闭MOSFET
      handleMosfetControl(0);
      mosfetDelayEnabled = false;
      mosfetDelayStartTime = 0;
      
      Serial.println("延时关闭：MOSFET已自动关闭");
      Blynk.virtualWrite(TERMINAL_VPIN, String("延时关闭：MOSFET已自动关闭"));
      Blynk.virtualWrite(MOSFET_DELAY_VPIN, 0); // 更新延时开关状态

    }
  }
}
// MOSFET控制回调函数
void handleMosfetControl(int buttonState) {
  // 调试输出到串口
  Serial.print("收到MOSFET控制命令: ");
  Serial.println(buttonState);
  
  if (buttonState == 1) {
    // 开启MOSFET
    mosfetState = true;
    digitalWrite(MOSFET_PIN, HIGH);
    mosfetStartTime = millis(); // 记录开始时间
    
    // 如果延时关闭功能已启用，记录延时开始时间
    if (mosfetDelayEnabled) {
      mosfetDelayStartTime = millis();
      Serial.printf("延时关闭已启用，将在 %lu 毫秒后自动关闭\n", mosfetDelayTime);
    }
    
    // 调试输出到串口
    Serial.println("MOSFET命令: 开启");
    Blynk.virtualWrite(TERMINAL_VPIN, String("MOSFET命令: 开启"));
    Blynk.virtualWrite(MOSFET_CONTROL_VPIN, 1); // 更新控制按钮状态

  } else {
    // 关闭MOSFET
    mosfetState = false;
    digitalWrite(MOSFET_PIN, LOW);
    mosfetStartTime = 0; // 重置开始时间
    
    // 关闭时清除延时关闭功能
    mosfetDelayEnabled = false;
    mosfetDelayStartTime = 0;
    
    // 调试输出到串口
    Serial.println("MOSFET命令: 关闭");
    Blynk.virtualWrite(TERMINAL_VPIN, String("MOSFET命令: 关闭"));
    Blynk.virtualWrite(MOSFET_CONTROL_VPIN, 0); // 更新控制按钮状态
    Blynk.virtualWrite(MOSFET_DELAY_VPIN, 0); // 更新延时开关状态
  
  }
}

// 上报MOSFET运行时间
void reportMosfetRuntime() {
  if (mosfetState && mosfetStartTime > 0) {
    // 计算运行时间（秒）
    unsigned long runTime = (millis() - mosfetStartTime) / 60000;
    Blynk.virtualWrite(MOSFET_RUNTIME_VPIN, runTime);
    // 调试输出到串口
    Serial.print("MOSFET运行时间: ");
    Serial.print(runTime);
    Serial.println(" 分钟");
  } else {
    // MOSFET关闭时显示0
    Blynk.virtualWrite(MOSFET_RUNTIME_VPIN, 0);
  }
}


// ==================== Blynk 回调函数 ====================

// MOSFET控制按钮回调
BLYNK_WRITE(MOSFET_CONTROL_VPIN) {
  handleMosfetControl(param.asInt());
  saveSettingsToEEPROM();
}

// MOSFET延时关闭开关回调
BLYNK_WRITE(MOSFET_DELAY_VPIN) {
  if (param.asInt() == 1) {
    // 启用延时关闭功能
    mosfetDelayEnabled = true;
    Serial.println("延时关闭功能已启用");
    Blynk.virtualWrite(TERMINAL_VPIN, String("延时关闭功能已启用，请设置延时时间"));
    
    // 如果MOSFET已开启，立即开始计时
    if (mosfetState) {
      mosfetDelayStartTime = millis();
      Serial.println("MOSFET已开启，延时计时开始");
    }
  } else {
    // 禁用延时关闭功能
    mosfetDelayEnabled = false;
    mosfetDelayStartTime = 0;
    Serial.println("延时关闭功能已禁用");
    Blynk.virtualWrite(TERMINAL_VPIN, String("延时关闭功能已禁用"));
  }
  saveSettingsToEEPROM();
}

// MOSFET延时时间设置回调（Time Input控件返回秒数）
BLYNK_WRITE(MOSFET_DELAY_TIME_VPIN) {
  // Time Input控件返回秒数
  long timeInSeconds = param[0].asLong();
  
  // 调试：打印原始输入
  Serial.print("收到延时输入（秒）: ");
  Serial.println(timeInSeconds);
  Blynk.virtualWrite(TERMINAL_VPIN, String("收到延时输入（秒）: ") + String(timeInSeconds));

  // 直接使用秒数作为延时时间（转换为毫秒）
  mosfetDelayTime = timeInSeconds * 1000UL;

  // 显示设置的时间
  int hours = timeInSeconds / 3600;
  int minutes = (timeInSeconds % 3600) / 60;
  Serial.printf("延时关闭时间设置: %02d:%02d (%d小时%d分钟)\n", hours, minutes, hours, minutes);
  Blynk.virtualWrite(TERMINAL_VPIN, String("延时关闭时间设置: ") + String(hours) + "小时" + String(minutes) + "分钟");

  // 如果延时功能已启用且MOSFET已开启，重新开始计时
  if (mosfetDelayEnabled && mosfetState) {
    mosfetDelayStartTime = millis();
    Serial.println("延时时间已更新，重新开始计时");
    Blynk.virtualWrite(TERMINAL_VPIN, String("延时时间已更新，重新开始计时"));
  }
}