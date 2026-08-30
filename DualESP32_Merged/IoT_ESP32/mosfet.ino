
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
  
  }
  mqttPublishState("mosfet", mosfetState ? 1 : 0);
}

// 上报MOSFET运行时间
void reportMosfetRuntime() {
  if (mosfetState && mosfetStartTime > 0) {
    // 计算运行时间（秒）
    unsigned long runTime = (millis() - mosfetStartTime) / 60000;
    // 调试输出到串口
    Serial.print("MOSFET运行时间: ");
    Serial.print(runTime);
    Serial.println(" 分钟");
  } else {
    // MOSFET关闭时显示0
  }
}



// MOSFET控制按钮回调

// MOSFET延时关闭开关回调

// MOSFET延时时间设置回调（Time Input控件返回秒数）
