
// ==================== 功能函数 ====================
void initHeater() {
  pinMode(HEATER_PIN_1, OUTPUT);
  pinMode(HEATER_PIN_0, OUTPUT);
  digitalWrite(HEATER_PIN_1, LOW);  // 初始化关闭状态
  digitalWrite(HEATER_PIN_0, LOW);  // 初始化关闭状态
  heaterState = false;  // 确保状态变量为关闭
}

// ==================== 全局变量 ====================

//加热片状态设置
void setHeaterState(bool state) {
  if (state != heaterState) {
      if (state) {
        digitalWrite(HEATER_PIN_1, HIGH);  // 正极拉高
        digitalWrite(HEATER_PIN_0, LOW);   // 负极拉低
        // 加热片打开时发送通知到Blynk
        if (Blynk.connected()) {
          Blynk.virtualWrite(TERMINAL_VPIN, "加热片已打开");
        }
      } else {
        digitalWrite(HEATER_PIN_1, LOW);   // 正极拉低
        digitalWrite(HEATER_PIN_0, LOW);   // 负极保持低电平
        // 加热片关闭时发送通知到Blynk
        if (Blynk.connected()) {
          Blynk.virtualWrite(TERMINAL_VPIN, "加热片已关闭");
        }
      }
      heaterState = state;//加热片状态
  }
}

//加热片控制逻辑
void updateHeaterControl(float currentTemp, float dhtTemp, float humidity) {
  // 检查自动控制开关是否开启
  if (!heaterAutoMode) {
    return; // 自动控制关闭时，不执行自动控制逻辑
  }
  
  // 自动控制逻辑
  bool shouldHeat = false;
  
  // 湿度控制：只有当湿度大于阈值时，才考虑开启加热片
  if (humidity > humidityThreshold) {
    // 在湿度满足条件的情况下，根据温度差值决定是否开启
    if (currentTemp < (dhtTemp + tempDiffThreshold)) {
      shouldHeat = true;
    }
  }
  
  setHeaterState(shouldHeat);
}

// ==================== Blynk回调函数 ====================


BLYNK_WRITE(HEATER_HUMIDITY_SET_VPIN) {//湿度阈值设置
  humidityThreshold = param.asInt();
  saveSettingsToEEPROM();
  // 调试输出到串口
  Serial.printf("加热片湿度阈值: %d%%\n", humidityThreshold);
  Blynk.virtualWrite(TERMINAL_VPIN, String("加热片湿度阈值: ") + String(humidityThreshold) + "%");
}

BLYNK_WRITE(HEATER_TEMP_DIFF_SET_VPIN) {//温度差值设置
  tempDiffThreshold = param.asInt();
  saveSettingsToEEPROM();
  // 调试输出到串口
  Serial.printf("加热片温度差值: %d°C\n", tempDiffThreshold);
  Blynk.virtualWrite(TERMINAL_VPIN, String("加热片温度差值: ") + String(tempDiffThreshold) + "°C");
}

BLYNK_WRITE(HEATER_CONTROL_VPIN) {//自动控制开关 (0=手动, 1=自动)
  heaterAutoMode = param.asInt() == 1;
  saveSettingsToEEPROM();
  Serial.printf("加热片自动控制: %s\n", heaterAutoMode ? "开启" : "关闭");
  Blynk.virtualWrite(TERMINAL_VPIN, String("加热片自动控制: ") + (heaterAutoMode ? "开启" : "关闭"));

}
