

void setupWiFi(){
  if(enableWiFi==1){
     // 连接WiFi网络
    WiFi.begin(ssid, pass); 

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("> WiFi连接成功!");
    } 

    Blynk.begin(auth, ssid, pass, blynkServer, blynkPort);

    if (Blynk.connect()) {
      Serial.println("> Blynk连接成功!");
      
      // 打印本机MAC地址
      uint8_t mac[6];
      WiFi.macAddress(mac);
      String macStr = String("MPPT板子MAC地址: ") + 
                      String(mac[0], HEX) + ":" + String(mac[1], HEX) + ":" + 
                      String(mac[2], HEX) + ":" + String(mac[3], HEX) + ":" + 
                      String(mac[4], HEX) + ":" + String(mac[5], HEX);
      Serial.println("> " + macStr);
      Blynk.virtualWrite(V0, macStr);
      
      WIFI = 1;
    }
    }

  else {
    Serial.println("> WiFi功能已禁用");
    WIFI = 0;
  }
  
}

void Wireless_Telemetry(){
  
  ////////// WIFI TELEMETRY ////////// 
  if(WIFI==1){
    int LED1, LED2, LED3, LED4;                      //声明 LED 亮度变量 
    if(buckEnable==1)      {LED1=1;}else{LED1=0;}  //电池充电状态
    if(batteryPercent>=99 ){LED2=1;}else{LED2=0;}  //满电状态
    if(batteryPercent<=10) {LED3=1;}else{LED3=0;}  //低电状态
    if(IUV==0)             {LED4=1;}else{LED4=0;}  //PV 输入存在状态

    Blynk.virtualWrite(1,powerInput); //输入功率
    Blynk.virtualWrite(7,buckPower); //降压功率
    Blynk.virtualWrite(2,batteryPercent); //电池百分比
    Blynk.virtualWrite(8,voltageInput); //光伏电压
    Blynk.virtualWrite(3,currentInput); //光伏电流
    Blynk.virtualWrite(9,buckVoltage); //降压电压
    Blynk.virtualWrite(5,buckCurrent); //降压电流
    Blynk.virtualWrite(12,temperature); //温度
    // Blynk.virtualWrite(8,Wh); //能量
    // Blynk.virtualWrite(9,energySavings); //能源节省
    Blynk.virtualWrite(13,LED1); //LED - 电池充电状态
    // Blynk.virtualWrite(11,LED2); //LED - 满电状态
    // Blynk.virtualWrite(12,LED3); //LED - 低电状态
    Blynk.virtualWrite(18,LED4); //LED - PV 存在状态
    Blynk.virtualWrite(11,String(voltageBatteryMin, 2)); //最小电池电压（读写）- 保留2位小数
    Blynk.virtualWrite(10,String(voltageBatteryMax, 2)); //最大电池电压（读写）- 保留2位小数
    Blynk.virtualWrite(19,String(currentCharging, 2)); //最大充电电流限制（读写）- 保留2位小数
    Blynk.virtualWrite(20,overrideFan); //风扇手动控制
    Blynk.virtualWrite(21,MPPT_Mode); //算法模式（0=CC-CV, 1=MPPT）（读写）
    Blynk.virtualWrite(22,temperatureFan); //风扇温度阈值（读写）- 范围30-80度
    Blynk.virtualWrite(14,buckEfficiency); //降压效率
    Blynk.virtualWrite(15,daysRunning); //运行天数
    Blynk.virtualWrite(23,dailyEnergy/1000); //日发电量（千瓦时）
    Blynk.virtualWrite(24,totalEnergy/1000); //总发电量（千瓦时）
    Blynk.virtualWrite(16,dailyEnergy); //日发电量（瓦特时）
    Blynk.virtualWrite(17,totalEnergy); //总发电量（瓦特时）
    Blynk.virtualWrite(29,output_Mode);
    Blynk.virtualWrite(25,newResetMode);
    Blynk.virtualWrite(26,resetbutton);
    Blynk.virtualWrite(30,Sending_Interval/1000); //发送间隔（秒）- 读写
    Blynk.virtualWrite(31,enableFan); //风扇自动控制开关
  }


} 
//====================================== Blynk 输入处理函数 =============================================//


// Blynk 最大电池电压输入处理
BLYNK_WRITE(10) {
  float newVoltageMax = param.asFloat(); // 将字符串转换为浮点数
  // 范围验证：12-48V
  if(newVoltageMax > 12.0 && newVoltageMax <= 48.0) {
    voltageBatteryMax = newVoltageMax;
    Serial.printf("Blynk最大电池电压: voltageBatteryMax = %.2f\n", voltageBatteryMax);
    Blynk.virtualWrite(V0, "最大电池电压: " + String(voltageBatteryMax, 2) + "V");
    
    // 重新计算并保存PWM_MaxDC
    recalculateAndSavePWM_MaxDC();
    
    saveSettings(); // 保存设置到EEPROM
  } else {
    // 如果不在范围内，重置为默认值14.6V
    voltageBatteryMax = 14.6;
    Serial.printf("Blynk最大电池电压设置无效(%.2f)，重置为默认值14.6V\n", newVoltageMax);
    Blynk.virtualWrite(V0, "最大电池电压设置无效，重置为14.6V");
    
    // 重新计算并保存PWM_MaxDC
    recalculateAndSavePWM_MaxDC();
    
    saveSettings(); // 保存设置到EEPROM
    // 发送正确的值回Blynk
    Blynk.virtualWrite(10, String(voltageBatteryMax, 2));
  }
}


// Blynk 最小电池电压输入处理
BLYNK_WRITE(11) {
  float newVoltageMin = param.asFloat(); // 将字符串转换为浮点数
  // 范围验证：12-48V
  if(newVoltageMin >= 12.0 && newVoltageMin <= 48.0) {
    voltageBatteryMin = newVoltageMin;
    Serial.printf("Blynk最小电池电压: voltageBatteryMin = %.2f\n", voltageBatteryMin);
    Blynk.virtualWrite(V0, "最小电池电压: " + String(voltageBatteryMin, 2) + "V");
    saveSettings(); // 保存设置到EEPROM
  } else {
    // 如果不在范围内，重置为默认值10.0V
    voltageBatteryMin = 10.0;
    Serial.printf("Blynk最小电池电压设置无效(%.2f)，重置为默认值10.0V\n", newVoltageMin);
    Blynk.virtualWrite(V0, "最小电池电压设置无效，重置为10.0V");
    saveSettings(); // 保存设置到EEPROM
    // 发送正确的值回Blynk
    Blynk.virtualWrite(11, String(voltageBatteryMin, 2));
  }
}


// Blynk 充电电流输入处理
BLYNK_WRITE(19) {
  float newCurrent = param.asFloat(); // 将字符串转换为浮点数
  // 范围验证：0.1-20A
  if(newCurrent >= 0.1 && newCurrent <= 20.0) {
    currentCharging = newCurrent;
    Serial.printf("Blynk充电电流: currentCharging = %.2f\n", currentCharging);
    Blynk.virtualWrite(V0, "充电电流: " + String(currentCharging, 2) + "A");
    saveSettings(); // 保存设置到EEPROM
  } else {
    // 如果不在范围内，重置为默认值6.0A
    currentCharging = 2.0;
    Serial.printf("Blynk充电电流设置无效(%.2f)，重置为默认值2.0A\n", newCurrent);
    Blynk.virtualWrite(V0, "充电电流设置无效，重置为2.0A");
    saveSettings(); // 保存设置到EEPROM
    // 发送正确的值回Blynk
    Blynk.virtualWrite(19, String(currentCharging, 2));
  }
}

// Blynk 风扇控制输入处理

BLYNK_WRITE(20) {
  overrideFan = param.asInt();
  Serial.printf("Blynk风扇控制: overrideFan = %d\n", overrideFan);
  Blynk.virtualWrite(V0, "风扇控制: " + String(overrideFan == 1 ? "手动开启" : "自动模式"));
  saveSettings(); // 保存设置到EEPROM
}


// Blynk 算法切换输入处理
BLYNK_WRITE(21) {
  MPPT_Mode = param.asInt();
  Serial.printf("Blynk算法切换: MPPT_Mode = %d\n", MPPT_Mode);
  Blynk.virtualWrite(V0, "算法模式: " + String(MPPT_Mode == 1 ? "MPPT" : "CC-CV"));
  saveSettings(); // 保存设置到EEPROM
}



// Blynk 风扇温度阈值输入处理
BLYNK_WRITE(22) {
  int newTemp = param.asInt(); // 获取整数值
  // 范围验证：20-80度
  if(newTemp >= 20 && newTemp <= 80) {
    temperatureFan = newTemp;
    Serial.printf("Blynk风扇温度设置: temperatureFan = %d\n", temperatureFan);
    Blynk.virtualWrite(V0, "风扇温度阈值: " + String(temperatureFan) + "°C");
    saveSettings(); // 保存设置到EEPROM
  } else {
    // 如果不在范围内，重置为默认值60度
    temperatureFan = 60;
    Serial.printf("Blynk风扇温度设置无效(%d)，重置为默认值60度\n", newTemp);
    Blynk.virtualWrite(V0, "风扇温度设置无效，重置为60°C");
    saveSettings(); // 保存设置到EEPROM
    // 发送正确的值回Blynk
    Blynk.virtualWrite(22, temperatureFan);
  }
}
// Blynk 数据重置周期选择输入处理
BLYNK_WRITE(25) {
  int newResetMode = param.asInt(); // 获取switch选择的值（0-4）
  if(newResetMode >= 0 && newResetMode <= 4) {
    telemCounterReset = newResetMode;
    Serial.printf("Blynk数据重置周期选择: telemCounterReset = %d\n", telemCounterReset);
    Blynk.virtualWrite(V0, "数据重置周期: " + String(telemCounterReset));
    saveSettings(); // 保存设置到EEPROM
  } else {
    // 如果不在范围内，重置为0（从不重置）
    telemCounterReset = 0;
    Serial.printf("Blynk数据重置周期设置无效(%d)，重置为0\n", newResetMode);
    Blynk.virtualWrite(V0, "数据重置周期设置无效，重置为0");
    saveSettings();
    // 发送正确的值回Blynk
    Blynk.virtualWrite(25, telemCounterReset);
  }
}
// Blynk Flash Memory重置输入处理
BLYNK_WRITE(26) {
  int resetbutton = param.asInt();
  if (param.asInt() == 1) {
    factoryReset();
    Blynk.virtualWrite(V0, "Flash Memory已重置");
  }
}

BLYNK_WRITE(29) {
  output_Mode = param.asInt();
  Serial.printf("输出模式：%d\n", output_Mode);
  Blynk.virtualWrite(V0, "输出模式：" + String(output_Mode == 1 ? "充电器模式" : "负载模式"));
  saveSettings(); // 保存设置到EEPROM
}
// Blynk 发送间隔输入处理
BLYNK_WRITE(30) {
  int seconds = param.asInt();
  if(seconds >= 5 && seconds <= 60) {
    Sending_Interval = seconds * 1000;
    saveSettings();
    Blynk.virtualWrite(V0, "发送间隔已设置为: " + String(seconds) + "秒");
    Blynk.virtualWrite(V30, seconds);
  } else {
    Blynk.virtualWrite(V0, "发送间隔无效，范围5-60秒");
    Blynk.virtualWrite(V30, Sending_Interval/1000);
  }
}

// Blynk 风扇自动控制开关输入处理
BLYNK_WRITE(31) {
  enableFan = param.asInt();
  Serial.printf("Blynk风扇自动控制: enableFan = %d\n", enableFan);
  Blynk.virtualWrite(V0, "风扇自动控制: " + String(enableFan == 1 ? "启用" : "禁用"));
  saveSettings(); // 保存设置到EEPROM
}


// Blynk调试按钮回调函数
BLYNK_WRITE(32) {
  if(param.asInt() == 1) {  // 按钮按下时
    sendDebugInfoToBlynk();
  }
}
