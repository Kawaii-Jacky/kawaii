
// 初始化DHT11
void initDHT11() {
  // DHT11实例已在全局变量中创建
  myDHT11.begin();  // 添加begin()方法调用
  Serial.println("DHT11 温湿度传感器初始化完成");
  
  // 初始化EEPROM并加载配置
  EEPROM.begin(32);
  heaterAutoMode = EEPROM.read(ADDR_HEATER_AUTO_MODE);
  humidityThreshold = EEPROM.readInt(ADDR_HUMIDITY_THRESHOLD);
  if (humidityThreshold < 0 || humidityThreshold > 100) humidityThreshold = 80;
  
  Serial.printf("DHT11 自动加热带: %s, 湿度阈值: %d%%\n", 
                heaterAutoMode ? "开启" : "关闭", humidityThreshold);
  
}

// ==================== 功能函数 ====================
void readDHT11Data() {
  // 单次读取，取消多次平均
  float temp = myDHT11.readTemperature();
  float humi = myDHT11.readHumidity();
  
  // 检查数据是否有效
  if (!isnan(temp) && !isnan(humi) && 
      temp >= -40.0 && temp <= 80.0 && 
      humi >= 0.0 && humi <= 100.0) {
    dhtTemperature = temp;
    dhtHumidity = humi;
    dht11DataValid = true;

    // Serial.printf("DHT11读取成功: 温度=%.1f°C, 湿度=%.1f%%\n", dhtTemperature, dhtHumidity);
  } else {
    dht11DataValid = false;
    Serial.printf("DHT11读取失败: 温度=%.1f, 湿度=%.1f\n", temp, humi);
  }

  // 更新全局变量
  dhtTemperature = dhtTemperature;
  dhtHumidity = dhtHumidity;
}

void sendDHT11DataToBlynk() {
  if (dht11DataValid) {
    // 格式化为保留一位小数
    String tempStr = String(dhtTemperature, 1);
    String humiStr = String(dhtHumidity, 1);
    
    Blynk.virtualWrite(DHT_TEMPERATURE_VPIN, tempStr);
    Blynk.virtualWrite(DHT_HUMIDITY_VPIN, humiStr);
  }
}

// ==================== EEPROM保存函数 ====================
void saveAutoHeaterToEEPROM(bool value) {
  EEPROM.write(ADDR_HEATER_AUTO_MODE, value);
  EEPROM.commit();
}

void saveHumiThresholdToEEPROM(int value) {
  EEPROM.writeInt(ADDR_HUMIDITY_THRESHOLD, value);
  EEPROM.commit();
}

// ==================== Blynk回调函数 ====================
// BLYNK_WRITE(DHT_TEMP_SET_VPIN) {
//   float tempSet = param.asFloat();
//   // 这里可以添加温度设置值的处理逻辑
//   // 例如：控制加热器或其他温度调节设备
//   Serial.printf("DHT11温度设置值: %.1f°C\n", tempSet);
// } 