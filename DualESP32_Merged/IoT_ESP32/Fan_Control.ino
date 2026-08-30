
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
}

// 控制风扇开关
void setFanState(bool state) {
  fanState = state;
  
  if (state) {
    // 开启风扇：正极高电平，负极低电平
    digitalWrite(FAN_POSITIVE_PIN, HIGH);
    digitalWrite(FAN_NEGATIVE_PIN, LOW);
    Serial.println("风扇已开启");
  } else {
    // 关闭风扇：两个引脚都设为低电平
    digitalWrite(FAN_POSITIVE_PIN, LOW);
    digitalWrite(FAN_NEGATIVE_PIN, LOW);
    Serial.println("风扇已关闭");
  }
  mqttPublishState("fan", fanState ? 1 : 0);
}

// 风扇自动控制逻辑
void updateFanControl(float temperature) {
  if (fanAutoMode) {
    // 自动模式：根据温度阈值控制风扇
    if (temperature >= fanTempThreshold && !fanState) {
      setFanState(true);
      Serial.println("温度达到阈值，自动开启风扇");
    } else if (temperature < fanTempThreshold && fanState) {
      setFanState(false);
      Serial.println("温度低于阈值，自动关闭风扇");
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
  
}



