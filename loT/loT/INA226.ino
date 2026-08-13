
// ==================== 电压电流采样函数 ====================
// 初始化INA226
void initINA226() {
  Wire.begin();
  // 使用最新版INA226库的初始化方法
  if (!ina226.begin(INA226_I2C_ADDRESS)) {
    Serial.println("INA226 初始化失败");
    return;
  }
  
  // 设置分流电阻和最大电流（这些参数在settings.h中定义）
  ina226.configure(INA226_AVERAGES_16, INA226_BUS_CONV_TIME_1100US, INA226_SHUNT_CONV_TIME_1100US, INA226_MODE_SHUNT_BUS_CONT);
  ina226.calibrate(INA226_SHUNT_RESISTANCE, INA226_MAX_CURRENT);

}

void readOutputVoltageCurrent() {
  const int sampleCount = (INA226_AVG_COUNT > 0) ? INA226_AVG_COUNT : 1;
  //清零输出传感器累加器
  float VSO = 0.0000;                              //清零输出电压累加器
  float CSO = 0.0000;                              //清零输出电流累加器

  //电压传感器 - 5次采样平均
  for(int i = 0; i < sampleCount; i++) {
    float voltage = ina226.readBusVoltage();
    VSO = VSO + voltage;

  }
  outputVoltage = VSO / sampleCount;          //计算平均输出电压

  //电流传感器 - 5次采样平均
  for(int i = 0; i < sampleCount; i++) {
    float current = ina226.readShuntCurrent();
    CSO = CSO + current;

  }
  outputCurrent = CSO / sampleCount; //计算平均输出电流 (A)

  //功率计算 - 使用电压和电流计算，确保单位正确
  if (!isfinite(outputVoltage) || !isfinite(outputCurrent)) {
    outputVoltage = outputCurrent = powerOutput = 0.0f;
    return;
  }
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

void sendINA226DataToMQTT() {
  
  
}



