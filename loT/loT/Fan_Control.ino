
// ========================================== 风扇控制函数 ==========================================

// 初始化风扇控制
void initFanControl() {
  // 设置风扇控制引脚为输出模式
  pinMode(FAN_POSITIVE_PIN, OUTPUT);
  pinMode(FAN_NEGATIVE_PIN, OUTPUT);
  
  // 初始状态：风扇关闭
  digitalWrite(FAN_POSITIVE_PIN, LOW);
  digitalWrite(FAN_NEGATIVE_PIN, LOW);
  
  // 从EEPROM读取风扇温度阈值
  fanTempThreshold = EEPROM.read(FAN_TEMP_THRESHOLD_ADDR);
  
  // 验证阈值范围，如果超出范围则使用默认值
  if (fanTempThreshold < 20 || fanTempThreshold > 60) {
    fanTempThreshold = 40;  // 默认40度
    EEPROM.write(FAN_TEMP_THRESHOLD_ADDR, fanTempThreshold);
    EEPROM.commit();
  }
  
  Serial.println("风扇控制模块初始化完成");
  Serial.println("风扇温度阈值: " + String(fanTempThreshold) + "°C");
  Blynk.virtualWrite(TERMINAL_VPIN, "风扇控制模块初始化完成");
  Blynk.virtualWrite(TERMINAL_VPIN, "风扇温度阈值: " + String(fanTempThreshold) + "°C");
}

// 控制风扇开关
void setFanState(bool state) {
  fanState = state;
  
  if (state) {
    // 开启风扇：正极高电平，负极低电平
    digitalWrite(FAN_POSITIVE_PIN, HIGH);
    digitalWrite(FAN_NEGATIVE_PIN, LOW);
    Serial.println("风扇已开启");
    Blynk.virtualWrite(TERMINAL_VPIN, "风扇已开启");
  } else {
    // 关闭风扇：两个引脚都设为低电平
    digitalWrite(FAN_POSITIVE_PIN, LOW);
    digitalWrite(FAN_NEGATIVE_PIN, LOW);
    Serial.println("风扇已关闭");
    Blynk.virtualWrite(TERMINAL_VPIN, "风扇已关闭");
  }
  
  // 更新Blynk状态显示
  Blynk.virtualWrite(FAN_STATUS_VPIN, fanState ? 1 : 0);
}

// 风扇自动控制逻辑
void updateFanControl(float temperature) {
  if (fanAutoMode) {
    // 自动模式：根据温度阈值控制风扇
    if (temperature >= fanTempThreshold && !fanState) {
      setFanState(true);
      Serial.println("温度达到阈值，自动开启风扇");
      Blynk.virtualWrite(TERMINAL_VPIN, "温度达到阈值，自动开启风扇");
    } else if (temperature < fanTempThreshold && fanState) {
      setFanState(false);
      Serial.println("温度低于阈值，自动关闭风扇");
      Blynk.virtualWrite(TERMINAL_VPIN, "温度低于阈值，自动关闭风扇");
    }
  } else {
    // 手动模式：根据手动开关状态控制风扇
    if (fanManualState != fanState) {
      setFanState(fanManualState);
    }
  }
}

// 设置风扇温度阈值
void setFanTempThreshold(uint8_t threshold) {
  // 限制阈值范围
  if (threshold < 20) threshold = 20;
  if (threshold > 60) threshold = 60;
  
  fanTempThreshold = threshold;
  
  // 保存到EEPROM
  EEPROM.write(FAN_TEMP_THRESHOLD_ADDR, fanTempThreshold);
  EEPROM.commit();
  
  Serial.println("风扇温度阈值已设置为: " + String(fanTempThreshold) + "°C");
  Blynk.virtualWrite(TERMINAL_VPIN, "风扇温度阈值已设置为: " + String(fanTempThreshold) + "°C");
  
  // 更新Blynk显示
  Blynk.virtualWrite(FAN_TEMP_THRESHOLD_VPIN, fanTempThreshold);
}

// 获取风扇状态信息
String getFanStatusInfo() {
  String status = "风扇状态: ";
  status += fanState ? "开启" : "关闭";
  status += " | 模式: ";
  status += fanAutoMode ? "自动" : "手动";
  status += " | 温度阈值: ";
  status += String(fanTempThreshold) + "°C";
  return status;
}

// ========================================== Blynk虚拟引脚处理函数 ==========================================

// 风扇控制模式切换 (V83)
BLYNK_WRITE(FAN_CONTROL_VPIN) {
  int mode = param.asInt();
  fanAutoMode = (mode == 1);
  
  Serial.println("风扇控制模式切换为: " + String(fanAutoMode ? "自动" : "手动"));
  Blynk.virtualWrite(TERMINAL_VPIN, "风扇控制模式切换为: " + String(fanAutoMode ? "自动" : "手动"));
  
  // 更新Blynk显示
  Blynk.virtualWrite(FAN_CONTROL_VPIN, fanAutoMode ? 1 : 0);
}

// 风扇手动控制开关 (V84)
BLYNK_WRITE(FAN_MANUAL_VPIN) {
  int state = param.asInt();
  fanManualState = (state == 1);
  
  if (!fanAutoMode) {
    setFanState(fanManualState);
    Serial.println("风扇手动控制: " + String(fanManualState ? "开启" : "关闭"));
    Blynk.virtualWrite(TERMINAL_VPIN, "风扇手动控制: " + String(fanManualState ? "开启" : "关闭"));
  }
  
  // 更新Blynk显示
  Blynk.virtualWrite(FAN_MANUAL_VPIN, fanManualState ? 1 : 0);
}

// 风扇温度阈值设置 (V85)
BLYNK_WRITE(FAN_TEMP_THRESHOLD_VPIN) {
  int threshold = param.asInt();
  setFanTempThreshold(threshold);
}

