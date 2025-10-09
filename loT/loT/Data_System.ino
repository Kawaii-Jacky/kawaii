

// ==================== 数据发送和调试函数 ====================

// 检查是否需要上报数据
bool shouldReportData() {
  unsigned long currentTime = millis();
  if (currentTime - lastReportTime >= reportInterval) {
    lastReportTime = currentTime;
    return true;
  }
  return false;
}

// 发送数据到Blynk
void sendDataToBlynk() {
    if (shouldReportData()) {
        
        // 发送传感器数据到Blynk
        sendUTCTemperatureToBlynk();  // 使用UTC模块的专用发送函数
        Blynk.virtualWrite(DHT_TEMPERATURE_VPIN, String(dhtTemperature, 1));
        Blynk.virtualWrite(DHT_HUMIDITY_VPIN, String(dhtHumidity, 1));
        Blynk.virtualWrite(OUTPUT_VOLTAGE_VPIN, String(outputVoltage, 2));
        Blynk.virtualWrite(OUTPUT_CURRENT_VPIN, String(outputCurrent, 2));
        Blynk.virtualWrite(OUTPUT_POWER_VPIN, String(powerOutput, 2));
        Blynk.virtualWrite(RAIN_ANALOG_VPIN, rainAnalogValue);
        Blynk.virtualWrite(RAIN_DIGITAL_VPIN, rainDetected ? 1 : 0);
        
        // 发送状态信息
        Blynk.virtualWrite(HEATER_MANUAL_VPIN, heaterState ? 1 : 0);
        
        // 发送摄像头状态
        Blynk.virtualWrite(CAMERA_POWER_VPIN, cameraPowerState ? 1 : 0);
        
        // 发送MOSFET状态
        Blynk.virtualWrite(MOSFET_CONTROL_VPIN, mosfetState ? 1 : 0);
        
        // 发送蓝牙连接状态
        Blynk.virtualWrite(BT_CONNECT_VPIN, btConnected ? 1 : 0);
        
        // 发送风扇状态
        Blynk.virtualWrite(FAN_STATUS_VPIN, fanState ? 1 : 0);
        Blynk.virtualWrite(FAN_CONTROL_VPIN, fanAutoMode ? 1 : 0);
        Blynk.virtualWrite(FAN_MANUAL_VPIN, fanManualState ? 1 : 0);
        Blynk.virtualWrite(FAN_TEMP_THRESHOLD_VPIN, fanTempThreshold);
             
        // // 发送定时器信息
        // if (timerEnabled) {
        //     Blynk.virtualWrite(TERMINAL_VPIN, String("定时器: ") + timerInfo);
        // }
    }
}

// ==================== Blynk 回调函数 ====================

// 上报间隔设置回调（支持秒输入）
BLYNK_WRITE(REPORT_INTERVAL_VPIN) {
    unsigned long newIntervalSeconds = param.asLong();
    if (newIntervalSeconds >= 1 && newIntervalSeconds <= 300) {  // 限制在1秒到5分钟之间
        reportInterval = newIntervalSeconds * 1000;  // 将秒转换为毫秒
        
        // 保存到EEPROM
        EEPROM.put(ADDR_REPORT_INTERVAL, reportInterval);
        EEPROM.commit();
        
        Serial.printf("上报间隔已更新为: %lu 秒 (%lu ms) 并保存到EEPROM\n", newIntervalSeconds, reportInterval);
        Blynk.virtualWrite(TERMINAL_VPIN, String("上报间隔已更新为: ") + String(newIntervalSeconds) + " 秒，已保存到EEPROM");
    } else {
        Serial.println("上报间隔设置无效，必须在1-300秒之间");
        Blynk.virtualWrite(TERMINAL_VPIN, String("上报间隔设置无效，必须在1-300秒之间"));
        // 恢复当前值（显示秒数）
        Blynk.virtualWrite(REPORT_INTERVAL_VPIN, reportInterval / 1000);
    }
}

// 调试输出按钮回调
BLYNK_WRITE(DEBUG_OUTPUT_VPIN) {
    if (param.asInt() == 1) {  // 按钮按下时
        sendAllDebugInfo();
        Serial.println("调试信息已发送");
        Blynk.virtualWrite(TERMINAL_VPIN, "调试信息已发送");
    }
}

// ==================== 调试输出函数 ====================

void printDataToSerial() {        // 调试输出到串口
        
        Serial.println("=== 传感器数据 ===");
        Serial.printf("UTC温度: %.1f°C\n", utcTemperature);
        Serial.printf("INA226电压: %.1fV\n", outputVoltage);
        Serial.printf("INA226电流: %.1fA\n", outputCurrent);
        Serial.printf("INA226功率: %.1fW\n", powerOutput);
        Serial.printf("蓝牙状态: %s\n", btConnected ? "连接" : "断开");
        Serial.printf("电机定时器时间设置: %s\n", timerInfo.c_str());
        Serial.printf("电机定时器总开关: %s\n", motorState ? "开启" : "关闭");
        Serial.printf("DHT温度: %.1f°C\n", dhtTemperature);
        Serial.printf("DHT湿度: %.1f%%\n", dhtHumidity);
        Serial.printf("加热片状态: %s\n", heaterState ? "开启" : "关闭");
        Serial.printf("控制模式: %s\n", heaterAutoMode ? "自动" : "手动");
        Serial.printf("湿度阈值: %d%%\n", humidityThreshold);
        Serial.printf("温度差值: %d°C\n", tempDiffThreshold);
        Serial.printf("雨水传感器: %s\n", rainDetected ? "有水" : "无水");
        Serial.printf("雨水模拟量: %u\n", rainAnalogValue);
        Serial.printf("圆顶状态: %s\n", motorState ? "开启" : "关闭");
        Serial.printf("自动开关顶开关: %s\n", autoclose_motor ? "开启" : "关闭");
        Serial.printf("MOSFET状态: %s\n", mosfetState ? "开启" : "关闭");
        Serial.printf("上报间隔: %lu 秒 (%lu ms)\n", reportInterval / 1000, reportInterval);
        Serial.printf("摄像头状态: %s\n", cameraPowerState ? "开启" : "关闭");
        Serial.println("=================");
}

// 发送所有调试信息到串口和Blynk
void sendAllDebugInfo() {
    String debugInfo = "";
    
    // 系统设置信息
    debugInfo += "上报时间设置：" + String(reportInterval / 1000) + "s；";
    debugInfo += "加热片自动控制：" + String(heaterAutoMode ? "开启" : "关闭") + "；";
    debugInfo += "加热片湿度阈值：" + String(humidityThreshold) + "%；";
    debugInfo += "加热片温度差值：" + String(tempDiffThreshold) + "°C；";
    debugInfo += "风扇自动控制：" + String(fanAutoMode ? "开启" : "关闭") + "；";
    debugInfo += "风扇温度阈值：" + String(fanTempThreshold) + "°C；";
    debugInfo += "自动关顶开关：" + String(autoclose_motor ? "开启" : "关闭") + "；";
    
    // 当前状态信息
    debugInfo += "加热片状态：" + String(heaterState ? "开启" : "关闭") + "；";
    debugInfo += "风扇状态：" + String(fanState ? "开启" : "关闭") + "；";
    debugInfo += "MOSFET状态：" + String(mosfetState ? "开启" : "关闭") + "；";
    debugInfo += "摄像头状态：" + String(cameraPowerState ? "开启" : "关闭") + "；";
    debugInfo += "蓝牙状态：" + String(btConnected ? "连接" : "断开") + "；";
    debugInfo += "雨水检测：" + String(rainDetected ? "有水" : "无水") + "；";
    
    // 传感器数据
    debugInfo += "UTC温度：" + String(utcTemperature, 1) + "°C；";
    debugInfo += "DHT温度：" + String(dhtTemperature, 1) + "°C；";
    debugInfo += "DHT湿度：" + String(dhtHumidity, 1) + "%；";
    debugInfo += "输出电压：" + String(outputVoltage, 2) + "V；";
    debugInfo += "输出电流：" + String(outputCurrent, 2) + "A；";
    debugInfo += "输出功率：" + String(powerOutput, 2) + "W；";
    
    // 发送到串口
    Serial.println("=== 系统调试信息 ===");
    Serial.println(debugInfo);
    Serial.println("==================");
    
    // 发送到Blynk终端
    if (Blynk.connected()) {
        Blynk.virtualWrite(TERMINAL_VPIN, "=== 系统调试信息 ===");
        Blynk.virtualWrite(TERMINAL_VPIN, debugInfo);
    }
}

void ReadDataFromSensors() {

    unsigned long currentTime = millis();  
    if (currentTime - lastDHT11ReadTime >= READ_DHT11_INTERVAL) {
      readDHT11Data();//读取DHT11数据
      lastDHT11ReadTime = currentTime;
    }
    if (currentTime - lastReadTime >= SENSORS_READ_INTERVAL) {
      // 读取传感器数据
      readRainSensor();//读取雨水传感器数据
      readOutputVoltageCurrent();//读取输出电压和电流
      readUTCTemperature();//读取UTC温度 
      // printDataToSerial();//打印数据到串口
      sendCameraStatusToBlynk();//发送摄像头状态到Blynk
      lastReadTime = currentTime;
    }
}