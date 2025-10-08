unsigned long prevSystemProcessesMillis = 0;

void System_Processes(){
  unsigned long currentSystemProcessesMillis = millis();
 
  //时间计算
  if(currentSystemProcessesMillis-prevSystemProcessesMillis>=millisRoutineInterval){                                           //每 millisRoutineInterval (ms) 运行例程
    prevSystemProcessesMillis = currentSystemProcessesMillis;                                                                   //存储上一次
    

    //能量计算
    if(powerInput>0 && buckEnable==1){                                                                       //只有当有输入功率且处于充电状态时才计算能量
      Wh = Wh + (powerInput/3600000.000*millisRoutineInterval);                                            //将功率转换为瓦特小时并累加
      kWh = Wh/1000.000;                                                                                        //转换为千瓦时
      MWh = kWh/1000.000;                                                                                       //转换为兆瓦时
      
      // 日发电量计算 - 当新值错误时保持上一次有效值
      float dailyEnergyIncrement = (powerInput/3600000.000*millisRoutineInterval);
      if(!isnan(dailyEnergyIncrement) && !isinf(dailyEnergyIncrement) && dailyEnergyIncrement >= 0) {
        dailyEnergy = dailyEnergy + dailyEnergyIncrement;//累加日发电量
      } else {
        // 新值错误时，保持上一次的dailyEnergy值不变
      }
      
      // 总发电量计算 - 当新值错误时保持上一次有效值
      float energyIncrement = (powerInput/3600000.000*millisRoutineInterval);
      if(!isnan(energyIncrement) && !isinf(energyIncrement) && energyIncrement >= 0) {
        totalEnergy = totalEnergy + energyIncrement;//累加总发电量
      } else {
        // 新值错误时，保持上一次的totalEnergy值不变
        // 这样可以避免错误值影响总发电量
      }
    }
    
    // 日发电量重置（每天0点重置）
    unsigned long currentDay = (millis() / 86400000); // 当前天数（毫秒转天）
    if(currentDay > (lastDayReset / 86400000)) {
      dailyEnergy = 0.0000; // 重置日发电量
      lastDayReset = millis(); // 更新重置时间戳
    }
    
    // 定期保存总发电量数据（每5分钟保存一次）
    static unsigned long lastSaveTime = 0;
    if(millis() - lastSaveTime >= 300000) { // 5分钟 = 300000毫秒
      EEPROM.put(100, totalEnergy);
      EEPROM.commit();
      lastSaveTime = millis();
    }
    
    //能源节约计算
    energySavings = kWh*electricalPrice;                                                                        //计算能源节约（法定货币）
    
    //电池百分比计算
    batteryPercent = ((buckVoltage-voltageBatteryMin)/(voltageBatteryMax-voltageBatteryMin))*100.000;        //计算电池百分比
    batteryPercent = constrain(batteryPercent,0,100);                                                          //限制在0-100%范围内

    //运行天数计算
    daysRunning = (millis()/86400000.000);                                                                      //计算运行天数
    
    //循环时间计算
    loopTimeStart = micros();                                                                                   //记录循环开始时间
    loopTimeEnd = micros();                                                                                     //记录循环结束时间
    loopTime = (loopTimeEnd-loopTimeStart)/1000.000;                                                            //计算循环时间（毫秒）

    //运行时间计算
    secondsElapsed = (millis()/1000.000);                                                                       //计算运行秒数
    
    //输出电压偏差计算
    outputDeviation = ((buckVoltage-voltageBatteryMax)/voltageBatteryMax)*100.000;                           //计算降压电压偏差百分比
    
    //降压效率计算
    if(powerInput>0 && buckEnable==1)  // 只有在有输入功率且处于充电状态时才计算效率
    {
       //重置BF累加器
       BF = 0.0000;
       
       //电流传感器 - 瞬时平均值
      for(int i = 0; i<avgCountBF; i++){
        float efficiency = (buckPower/powerInput)*100.000;
        BF = BF + efficiency;
     }
     buckEfficiency  = BF/avgCountBF; //降压效率
     buckEfficiency = constrain(buckEfficiency, 0.0, 100.0); //限制降压效率在0-100%范围内

     }
     else{
     buckEfficiency = 0.0000;  // 非充电状态或无输入功率时效率为0
    }

    //温度计算
    floatTemp = temperature;                                                                                    //温度变量转换

   
    // 记录上次风扇状态，用于检测状态变化
    static bool lastFanStatus = 0;
    
    if(overrideFan==1){
      fanStatus=1;
      digitalWrite(FAN,HIGH);
      if(lastFanStatus != fanStatus) {
        Serial.println("> 风扇手动开启");
        if(WIFI == 1 && Blynk.connected()) {
          Blynk.virtualWrite(V0, "风扇状态: 手动开启");
        }
      }
    }
    else if(enableFan==1 && temperature>temperatureFan){
      fanStatus=1;
      digitalWrite(FAN,HIGH);
      if(lastFanStatus != fanStatus) {
        Serial.println("> 风扇自动开启 - 温度: " + String(temperature,1) + "°C > " + String(temperatureFan) + "°C");
        if(WIFI == 1 && Blynk.connected()) {
          Blynk.virtualWrite(V0, "风扇状态: 自动开启 - 温度" + String(temperature,1) + "°C");
        }
      }
    }
    else{
      fanStatus=0;
      digitalWrite(FAN,LOW);
      if(lastFanStatus != fanStatus) {
        if(enableFan==0) {
          Serial.println("> 风扇已禁用");
          if(WIFI == 1 && Blynk.connected()) {
            Blynk.virtualWrite(V0, "风扇状态: 已禁用");
          }
        } else if(temperature<=temperatureFan) {
          Serial.println("> 风扇自动关闭 - 温度: " + String(temperature,1) + "°C <= " + String(temperatureFan) + "°C");
          if(WIFI == 1 && Blynk.connected()) {
            Blynk.virtualWrite(V0, "风扇状态: 自动关闭 - 温度" + String(temperature,1) + "°C");
          }
        }
      }
    }
    
    lastFanStatus = fanStatus;
  }

  ///////////// 自动数据重置  /////////////
  if(telemCounterReset==0){}                                           //从不重置
  else if(telemCounterReset==1 && daysRunning>1)  {resetVariables();}  //每日重置
  else if(telemCounterReset==2 && daysRunning>7)  {resetVariables();}  //每周重置
  else if(telemCounterReset==3 && daysRunning>30) {resetVariables();}  //每月重置
  else if(telemCounterReset==4 && daysRunning>365){resetVariables();}  //每年重置
  ///////////// LOW POWER MODE /////////////
  if(lowPowerMode==1){}   
  else{}      
}

void factoryReset(){
  // 首先完全清除EEPROM区域（地址0-200）
  for(int i = 0; i < 200; i++) {
    EEPROM.write(i, 0xFF);  // 写入0xFF来清除数据
  }
  EEPROM.commit();
  
  // 然后写入默认值
  EEPROM.write(0,1);  //存储: 充电算法（1 = MPPT 模式）
  EEPROM.write(2,1);  //存储: 输出模式（1 = 充电器模式）
  // 使用EEPROM.put()存储浮点数，与新的存储方式一致
  float defaultVoltageMax = 14.6;
  float defaultVoltageMin = 10.0;
  float defaultCurrent = 2.0;  // 改为2.0A，与主程序默认值一
  EEPROM.put(3, defaultVoltageMax);    // 存储最大电池电压（浮点数，地址3）
  EEPROM.put(7, defaultVoltageMin);    // 存储最小电池电压（浮点数，地址7）
  EEPROM.put(30, defaultCurrent);      // 存储充电电流（浮点数，地址30）
  // 存储发送间隔默认值（5秒 = 5000毫秒）
  EEPROM.put(20, 5000);                // 存储发送间隔（毫秒）
  EEPROM.write(25,1); //存储: 启用自动加载（默认开启，新地址25）
  EEPROM.write(13,1); //存储: 风扇启用 (Bool)
  EEPROM.write(14,60); //存储: 风扇温度（整数）
  EEPROM.write(15,90); //存储: 关机温度（整数）
  EEPROM.write(16,1); //存储: 启用 WiFi（布尔值）
  EEPROM.write(18,0); //存储: 风扇手动控制（默认值：0 = 自动模式）
  EEPROM.commit();
  loadSettings();
}

//================= EEPROM数据检查函数 =====================//
void checkSettings() {
  bool settingsValid = true;
  String errorMsg = "";

  // 检查voltageBatteryMax (12-48V)
  if(isnan(voltageBatteryMax) || isinf(voltageBatteryMax) || voltageBatteryMax < 12.0 || voltageBatteryMax > 48.0) {
    voltageBatteryMax = 14.6;  // 默认值
    settingsValid = false;
    errorMsg += "voltageBatteryMax ";
  }
  
  // 检查voltageBatteryMin (8-20V)
  if(isnan(voltageBatteryMin) || isinf(voltageBatteryMin) || voltageBatteryMin < 8.0 || voltageBatteryMin > 20.0) {
    voltageBatteryMin = 10.0;  // 默认值
    settingsValid = false;
    errorMsg += "voltageBatteryMin ";
  }
  
  // 检查currentCharging (0.1-20A)
  if(isnan(currentCharging) || isinf(currentCharging) || currentCharging < 0.1 || currentCharging > 20.0) {
    currentCharging = 2.0;  // 默认值
    settingsValid = false;
    errorMsg += "currentCharging ";
  }
  
  // 检查Sending_Interval (5000-60000ms)
  if(Sending_Interval < 5000 || Sending_Interval > 60000) {
    Sending_Interval = 5000;  // 默认值
    settingsValid = false;
    errorMsg += "Sending_Interval ";
  }
  
  // 检查PWM_MaxDC (85-97%)
  if(isnan(PWM_MaxDC) || isinf(PWM_MaxDC) || PWM_MaxDC < 85.0 || PWM_MaxDC > 97.0) {
    PWM_MaxDC = 97.0;  // 默认值
    settingsValid = false;
    errorMsg += "PWM_MaxDC ";
  }
  
  // 检查pwmMaxLimited (1740-1986，基于pwmResolution=11和PWM_MaxDC=85-97%)
  if(isnan(pwmMaxLimited) || isinf(pwmMaxLimited) || pwmMaxLimited < 1740 || pwmMaxLimited > 1986) {
    pwmMaxLimited = (PWM_MaxDC * pwmMax) / 100.000;  // 重新计算
    settingsValid = false;
    errorMsg += "pwmMaxLimited ";
  }
  

  // 检查totalEnergy (>=0)
  if(isnan(totalEnergy) || isinf(totalEnergy) || totalEnergy < 0) {
    totalEnergy = 0.0;  // 默认值
    settingsValid = false;
    errorMsg += "totalEnergy ";
  }
  
  // 输出检查结果
  if(!settingsValid) {
    Serial.println("> EEPROM数据检查失败，以下参数已重置为默认值: " + errorMsg);
  } else {
    Serial.println("> EEPROM数据检查通过，所有参数有效");
  }
}

void loadSettings(){ 
  MPPT_Mode          = EEPROM.read(0);                       // 加载保存的充电模式设置
  output_Mode        = EEPROM.read(2);                       // 加载保存的输出模式设置
  // 使用EEPROM.get()读取浮点数，确保数据类型正确
  EEPROM.get(3, voltageBatteryMax);                          // 加载保存的最大电池电压设置（地址3）
  EEPROM.get(7, voltageBatteryMin);                          // 加载保存的最低电池电压设置（地址7）
  EEPROM.get(30, currentCharging);                           // 加载保存的充电电流设置（地址30）
  EEPROM.get(20, Sending_Interval);                          // 加载发送间隔
  EEPROM.get(108, PWM_MaxDC);                                // 加载保存的PWM_MaxDC设置（地址108）
  EEPROM.get(112, pwmMaxLimited);                            // 加载保存的pwmMaxLimited设置（地址112）

  // 加载基本设置
  enableFan          = EEPROM.read(13);                      // 加载保存的风扇启用设置
  temperatureFan     = EEPROM.read(14);                      // 加载保存的风扇温度设置
  temperatureMax     = EEPROM.read(15);                      // 加载保存的关机温度设置
  enableWiFi         = EEPROM.read(16);                      // 加载保存的 WiFi 启用设置  
  flashMemLoad       = EEPROM.read(25);                      // 加载保存的闪存自动加载功能（新地址25）
  overrideFan        = EEPROM.read(18);                      // 加载保存的风扇手动控制设置
  telemCounterReset  = EEPROM.read(19);                      // 加载保存的数据重置周期
  
  // 加载发电量数据
  EEPROM.get(100, totalEnergy);                              // 加载总发电量
  EEPROM.get(104, lastDayReset);                             // 加载上次日重置时间戳
  
  // 调用检查函数验证所有加载的数据
  checkSettings();
  
}

void saveSettings(){
  // 保存前先检查数据有效性
  checkSettings();
  
  EEPROM.write(0,MPPT_Mode);           //存储：算法 
  EEPROM.write(2,output_Mode);         //存储：输出模式（地址2）
  // 使用EEPROM.put()存储浮点数，确保数据类型正确
  EEPROM.put(3, voltageBatteryMax);    // 存储最大电池电压（浮点数，地址3）
  EEPROM.put(7, voltageBatteryMin);    // 存储最小电池电压（浮点数，地址7）
  EEPROM.put(30, currentCharging);     // 存储充电电流（浮点数，地址30）
  EEPROM.put(20, Sending_Interval);    // 保存发送间隔
  
  EEPROM.write(13,enableFan);          //风扇启用
  EEPROM.write(14,temperatureFan);     //风扇温度
  EEPROM.write(15,temperatureMax);     //关机温度
  EEPROM.write(16,enableWiFi);         //启用 WiFi
//EEPROM.write(17,flashMemLoad);       //启用自动加载（必须排除批量保存，酌情取消注释）
  EEPROM.write(18,overrideFan);        //存储：风扇手动控制
  EEPROM.write(19,telemCounterReset);  //存储：数据重置周期
  
  // 保存发电量数据
  EEPROM.put(100, totalEnergy);                              // 保存总发电量
  EEPROM.put(104, lastDayReset);                             // 保存上次日重置时间戳
  
  // 保存PWM_MaxDC设置（地址108）
  EEPROM.put(108, PWM_MaxDC);
  // 保存pwmMaxLimited设置（地址112）
  EEPROM.put(112, pwmMaxLimited);
  
  EEPROM.commit();                     //将设置更改保存到闪存
}
void saveAutoloadSettings(){
  EEPROM.write(25,flashMemLoad);       //STORE: 启用自动加载（使用地址25，与loadSettings一致）
  EEPROM.commit();                     //将设置更改保存到闪存
}
void initializeFlashAutoload(){
  if(disableFlashAutoLoad==0){
    flashMemLoad = EEPROM.read(25);       //加载保存的自动加载（新地址25）
    if(flashMemLoad==1){loadSettings();}  //从闪存加载存储的设置
  } 
}

void recalculateAndSavePWM_MaxDC(){
  // 重新计算PWM_MaxDC
  PWM_MaxDC = (voltageBatteryMax / (voltageBatteryMax + voltageDropout)) * 100.0;
  PWM_MaxDC = constrain(PWM_MaxDC, 85.0, 97.0); // 限制在85-97%范围内
  
  // 重新计算pwmMaxLimited
  pwmMaxLimited = (PWM_MaxDC * pwmMax) / 100.0;
  
  // 保存到EEPROM
  EEPROM.put(108, PWM_MaxDC);
  EEPROM.put(112, pwmMaxLimited);
  EEPROM.commit();
}