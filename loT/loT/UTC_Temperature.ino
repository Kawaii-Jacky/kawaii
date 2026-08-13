
// ==================== 功能函数 ====================
// 初始化UTC温度模块
void initUTCTemperature() {
  pinMode(UTC_ANALOG_PIN, INPUT);
  // pinMode(UTC_DIGITAL_PIN, INPUT);
  
  // 配置ADC
  analogReadResolution(12);  // 设置ADC分辨率为12位
  analogSetAttenuation(ADC_11db);  // 设置ADC衰减为11dB，量程0-3.3V
  
  Serial.println("UTC电阻温度模块初始化完成");
}

void readUTCTemperature() {
  // 单次读取，不使用平均采样
  int sample = analogRead(UTC_ANALOG_PIN);
  
  // 检查样本是否在合理范围内
  if (sample <= 0 || sample >= 4095) {
    utcDataValid = false;
    Serial.printf("UTC传感器读数异常: %d\n", sample);
    return;
  }
  
  // 计算温度
  utcTemperature = calculateTemperature(sample);
  
  // 检查温度是否在合理范围内
  if (utcTemperature >= -50.0 && utcTemperature <= 150.0) {
    utcDataValid = true;
  } else {
    utcDataValid = false;
    Serial.printf("UTC温度: %.1f°C (超出范围, ADC: %d)\n", utcTemperature, sample);
  }
}

float calculateTemperature(float analogValue) {
  if (!isfinite(analogValue) || UTC_ADC_RESOLUTION <= 0 || UTC_VCC <= 0.0f || UTC_R1 <= 0.0f || UTC_R0 <= 0.0f || UTC_B == 0.0f || UTC_T0 <= 0.0f) return NAN;
  // 将模拟值转换为电压 (ESP32的ADC是12位的，所以是4095)
  float voltage = (analogValue * UTC_VCC) / UTC_ADC_RESOLUTION;
  
  // 应用电压校正（补偿3.3V输入的影响）
  voltage = voltage * UTC_VOLTAGE_CORRECTION;
  if (!isfinite(voltage) || voltage <= 0.001f || voltage >= UTC_VCC - 0.001f) return NAN;
  
  // 计算热敏电阻阻值 (使用分压公式)
  float resistance = UTC_R1 * voltage / (UTC_VCC - voltage);
  if (!isfinite(resistance) || resistance <= 0.0f) return NAN;

  // 使用Steinhart-Hart方程计算温度
  // 1/T = 1/T0 + (1/B) * ln(R/R0)
  float steinhart = log(resistance / UTC_R0) / UTC_B;
  steinhart += 1.0 / UTC_T0;
  steinhart = 1.0 / steinhart;
  if (!isfinite(steinhart)) return NAN;
  
  // 转换为摄氏度
  float temperature = steinhart - 273.15;
  

  
  return temperature;
}

void sendUTCTemperatureToMQTT() {
  if (utcDataValid) {
    // 格式化为保留一位小数
    String tempStr = String(utcTemperature, 1);
  }
}

bool isUTCTemperatureValid() {
  return utcDataValid;
}






