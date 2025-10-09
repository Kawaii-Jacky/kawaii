unsigned long prevReadSensorsMillis = 0;


void Read_Sensors(){//读取传感器  

  /////////// TEMPERATURE SENSOR /////////////
  if(sampleStoreTS<=avgCountTS){                               //TEMPERATURE SENSOR - Lite Averaging
    TS = TS + analogRead(TempSensor);
    sampleStoreTS++;   
  }
  else{
    TS = TS/sampleStoreTS;
    
    // 将ADC值转换为电压 (ESP32的ADC是12位的，所以是4095)
    float voltage = (TS * 3.3) / 4095.0;
    
    // 计算NTC电阻值 (使用分压公式)
    // 实际连接方式：3.3V ----[10K NTC]----+----[10K固定电阻]----GND
    // 电压 = 3.3 * (10K固定电阻) / (NTC电阻 + 10K固定电阻)
    // 所以 NTC电阻 = 10K * (3.3 - voltage) / voltage
    float ntcResistance = 10000.0 * (3.3 - voltage) / voltage;
    
    // 使用B值方程计算温度
    // 1/T = 1/T0 + (1/B) * ln(R/R0)
    // 其中 T0=298.15K(25°C), R0=10000Ω, B=3950
    float steinhart = log(ntcResistance / 10000.0) / 3950.0;
    steinhart += 1.0 / 298.15;
    steinhart = 1.0 / steinhart;
    
    // 转换为摄氏度
    temperature = steinhart - 273.15;
    
    // 检查温度是否在合理范围内
    if (temperature < -50.0 || temperature > 150.0) {
      // 如果温度异常，尝试反向计算
      ntcResistance = 10000.0 * (3.3 - voltage) / voltage;
      steinhart = log(ntcResistance / 10000.0) / 3950.0;
      steinhart += 1.0 / 298.15;
      steinhart = 1.0 / steinhart;
      temperature = steinhart - 273.15;
    
    }

    sampleStoreTS = 0;
    TS = 0;
  }
  
  /////////// VOLTAGE & CURRENT SENSORS /////////////
  VSI = 0.0000;      //清零输入电压 ;Voltage Input Sensor
  VSO = 0.0000;      //清零输出电压 ;Voltage Output Sensor
  CSI = 0.0000;      //清零输入电流 ;Current Input Sensor
  CSO = 0.0000;      //清零输出电流 ;Current Output Sensor

  //电压传感器 - 瞬时平均值
  for(int i = 0; i<avgCountVS; i++){
    VSI = VSI + ina1.readBusVoltage();
    VSO = VSO + ina2.readBusVoltage();
  }
  voltageInput  = (VSI/avgCountVS) * inVoltageDivRatio; //输入电压；inVoltageDivRatio 输入电压分压比
  buckVoltage = (VSO/avgCountVS) * outVoltageDivRatio; //降压电压；outVoltageDivRatio 降压电压分压比
  
  // 限制电压为0和正值
  voltageInput = constrain(voltageInput, 0.0, 100.0);  // 输入电压限制在0-100V
  buckVoltage = constrain(buckVoltage, 0.0, 100.0);    // 降压电压限制在0-100V

  //电流传感器 - 瞬时平均值
  for(int i = 0; i<avgCountCS; i++){
    CSI = CSI + ina1.readShuntCurrent();
    CSO = CSO + ina2.readShuntCurrent();
  }
  currentInput  = -CSI/avgCountCS; //输入电流（反向）
  buckCurrent = CSO/avgCountCS; //降压电流
  
  // 限制电流为0和正值
  currentInput = constrain(currentInput, 0.0, 50.0);   // 输入电流限制在0-50A
  buckCurrent = constrain(buckCurrent, 0.0, 50.0);     // 降压电流限制在0-50A


  // if(currentInput<0){currentInput=0.0000;} //如果输入电流小于0，则清零
  // if(buckVoltage<=0){buckCurrent = 0.0000;} //如果降压电压小于等于0，则清零

  //电源检测
  if(voltageInput<=3 && buckVoltage<=3){inputSource=0;}  //系统仅由 USB 端口供电
  else if(voltageInput>buckVoltage)    {inputSource=1;}  //系统由太阳能作为电源
  else if(voltageInput<buckVoltage)    {inputSource=2;}  //系统由电池作为电源
  
  //功率计算 - 使用 INA226 功率读数
  powerInput      = currentInput*voltageInput; //输入功率
  buckPower     = buckCurrent*buckVoltage; //降压功率
  outputDeviation = (buckVoltage/voltageBatteryMax)*100.000; //降压偏差

  //电池状态 - 电池百分比
  batteryPercent  = ((buckVoltage-voltageBatteryMin)/(voltageBatteryMax-voltageBatteryMin))*101; //电池百分比
  batteryPercent  = constrain(batteryPercent,0,100); //约束电池百分比

  //时间依赖传感器数据计算
  unsigned long currentReadSensorsMillis = millis();
  if(currentReadSensorsMillis-prevReadSensorsMillis>=millisRoutineInterval){
    prevReadSensorsMillis = currentReadSensorsMillis;
    Wh = Wh+(powerInput/(3600.000*(1000.000/millisRoutineInterval)));  //累积并计算能量收获 (3600s*(1000/interval))
    kWh = Wh/1000.000; //千瓦时
    MWh = Wh/1000000.000; //兆瓦时
   
    timeOn++;                                                          //增加时间计数器
  } 

  //其他数据
  secondsElapsed = millis()/1000;                                      //获取自启动和活动以来的时间（秒）
  energySavings  = electricalPrice*(Wh/1000.0000);                     //计算太阳能能源节省（电费率） 
    
}


void checkConfig(INA226 &ina)
{
  Serial.print("Mode:                  ");//INA226 模式
  switch (ina.getMode())
  {
    case INA226_MODE_POWER_DOWN:      Serial.println("Power-Down"); break;//关机
    case INA226_MODE_SHUNT_TRIG:      Serial.println("Shunt Voltage, Triggered"); break;//触发
    case INA226_MODE_BUS_TRIG:        Serial.println("Bus Voltage, Triggered"); break;//触发
    case INA226_MODE_SHUNT_BUS_TRIG:  Serial.println("Shunt and Bus, Triggered"); break;//触发
    case INA226_MODE_ADC_OFF:         Serial.println("ADC Off"); break;//ADC 关
    case INA226_MODE_SHUNT_CONT:      Serial.println("Shunt Voltage, Continuous"); break;//连续
    case INA226_MODE_BUS_CONT:        Serial.println("Bus Voltage, Continuous"); break;//连续
    case INA226_MODE_SHUNT_BUS_CONT:  Serial.println("Shunt and Bus, Continuous"); break;//连续
    default: Serial.println("unknown");
  }

  Serial.print("Samples average:       ");
  switch (ina.getAverages())
  {
    case INA226_AVERAGES_1:           Serial.println("1 sample"); break;
    case INA226_AVERAGES_4:           Serial.println("4 samples"); break;
    case INA226_AVERAGES_16:          Serial.println("16 samples"); break;
    case INA226_AVERAGES_64:          Serial.println("64 samples"); break;
    case INA226_AVERAGES_128:         Serial.println("128 samples"); break;
    case INA226_AVERAGES_256:         Serial.println("256 samples"); break;
    case INA226_AVERAGES_512:         Serial.println("512 samples"); break;
    case INA226_AVERAGES_1024:        Serial.println("1024 samples"); break;
    default: Serial.println("unknown");
  }

  Serial.print("Bus conversion time:   ");
  switch (ina.getBusConversionTime())
  {
    case INA226_BUS_CONV_TIME_140US:  Serial.println("140uS"); break;
    case INA226_BUS_CONV_TIME_204US:  Serial.println("204uS"); break;
    case INA226_BUS_CONV_TIME_332US:  Serial.println("332uS"); break;
    case INA226_BUS_CONV_TIME_588US:  Serial.println("588uS"); break;
    case INA226_BUS_CONV_TIME_1100US: Serial.println("1.100ms"); break;
    case INA226_BUS_CONV_TIME_2116US: Serial.println("2.116ms"); break;
    case INA226_BUS_CONV_TIME_4156US: Serial.println("4.156ms"); break;
    case INA226_BUS_CONV_TIME_8244US: Serial.println("8.244ms"); break;
    default: Serial.println("unknown");
  }

  Serial.print("Shunt conversion time: ");
  switch (ina.getShuntConversionTime())
  {
    case INA226_SHUNT_CONV_TIME_140US:  Serial.println("140uS"); break;
    case INA226_SHUNT_CONV_TIME_204US:  Serial.println("204uS"); break;
    case INA226_SHUNT_CONV_TIME_332US:  Serial.println("332uS"); break;
    case INA226_SHUNT_CONV_TIME_588US:  Serial.println("588uS"); break;
    case INA226_SHUNT_CONV_TIME_1100US: Serial.println("1.100ms"); break;
    case INA226_SHUNT_CONV_TIME_2116US: Serial.println("2.116ms"); break;
    case INA226_SHUNT_CONV_TIME_4156US: Serial.println("4.156ms"); break;
    case INA226_SHUNT_CONV_TIME_8244US: Serial.println("8.244ms"); break;
    default: Serial.println("unknown");
  }

  Serial.print("Max possible current:  ");
  Serial.print(ina.getMaxPossibleCurrent());
  Serial.println(" A");

  Serial.print("Max current:           ");
  Serial.print(ina.getMaxCurrent());
  Serial.println(" A");

  Serial.print("Max shunt voltage:     ");
  Serial.print(ina.getMaxShuntVoltage());
  Serial.println(" V");

  Serial.print("Max power:             ");
  Serial.print(ina.getMaxPower());
  Serial.println(" W");
}

void resetVariables(){//重置变量
  secondsElapsed = 0;
  energySavings  = 0; 
  daysRunning    = 0; 
  timeOn         = 0; 
}
