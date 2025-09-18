
// ==================== 电压电流采样函数 ====================
// 初始化INA226
void initINA226() {
  Wire.begin();
  // 使用最新版INA226库的初始化方法
  ina226.begin();
  
  // 设置分流电阻和最大电流（这些参数在settings.h中定义）
  ina226.setMaxCurrentShunt(INA226_MAX_CURRENT, INA226_SHUNT_RESISTANCE);

}

void readOutputVoltageCurrent() {
  //清零输出传感器累加器
  float VSO = 0.0000;                              //清零输出电压累加器
  float CSO = 0.0000;                              //清零输出电流累加器

  //电压传感器 - 5次采样平均
  for(int i = 0; i < INA226_AVG_COUNT; i++) {
    float voltage = ina226.getBusVoltage();
    VSO = VSO + voltage;

  }
  outputVoltage = VSO / INA226_AVG_COUNT;          //计算平均输出电压

  //电流传感器 - 5次采样平均
  for(int i = 0; i < INA226_AVG_COUNT; i++) {
    float current = ina226.getCurrent();
    CSO = CSO + current;

  }
  outputCurrent = CSO / INA226_AVG_COUNT; //计算平均输出电流 (A)

  //功率计算 - 使用电压和电流计算，确保单位正确
  powerOutput = outputVoltage * outputCurrent; //输出功率 (W)


  //数据验证和限制
  if(outputVoltage <= 0) {
    outputCurrent = 0.0000;                  //如果输出电压小于等于0，则清零电流
    powerOutput = 0.0;                       //功率也清零
  }
  if(outputCurrent < 0) {
    outputCurrent = 0.0000;                  //如果输出电流小于0，则清零
    powerOutput = 0.0;                       //功率也清零
  }
  
  //功率合理性检查
  if(powerOutput > 1000.0) {                 //如果功率超过1000W，可能是计算错误
    powerOutput = outputVoltage * outputCurrent; //重新计算
    Serial.println("警告：功率值异常，已重新计算");
  }
}

// ==================== 数据发送到Blynk ====================
void sendINA226DataToBlynk() {
  //发送输出电压到Blynk虚拟引脚 V50
  Blynk.virtualWrite(OUTPUT_VOLTAGE_VPIN, outputVoltage);
  
  //发送输出电流到Blynk虚拟引脚 V51
  Blynk.virtualWrite(OUTPUT_CURRENT_VPIN, outputCurrent);
  
  //发送输出功率到Blynk虚拟引脚 V52
  Blynk.virtualWrite(OUTPUT_POWER_VPIN, powerOutput);
}


