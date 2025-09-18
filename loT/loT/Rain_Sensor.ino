
// 初始化雨水传感器
void initRainSensor() {
    pinMode(RAIN_ANALOG_PIN, INPUT);
    pinMode(RAIN_DIGITAL_PIN, INPUT);
    
    // 配置ADC
    analogReadResolution(12);  // 设置ADC分辨率为12位
    analogSetAttenuation(ADC_11db);  // 设置ADC衰减为11dB，量程0-3.3V
    
    Serial.println("雨水传感器模块初始化完成");
}

// 读取雨水传感器数据
void readRainSensor() {
    // 读取模拟量
    rainAnalogValue = analogRead(RAIN_ANALOG_PIN);
    
    // 读取数字量
    rainDigitalState = (digitalRead(RAIN_DIGITAL_PIN) == LOW);  // LOW表示有水
    
    // 更新雨水检测状态
    rainDetected = rainDigitalState;
    
    // 发送数据到Blynk
    Blynk.virtualWrite(RAIN_ANALOG_VPIN, rainAnalogValue);
    Blynk.virtualWrite(RAIN_DIGITAL_VPIN, rainDetected ? 1 : 0);
}

// 获取雨水传感器状态
bool isRainDetected() {
    return rainDetected;
}

// 获取雨水传感器模拟量值
uint16_t getRainAnalogValue() {
    return rainAnalogValue;
}

// 获取雨水传感器数字量状态
bool getRainDigitalState() {
    return rainDigitalState;
}
