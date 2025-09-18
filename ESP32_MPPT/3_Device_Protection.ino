void backflowControl(){                                                // PV 回流控制（输入 MOSFET
  
  if(output_Mode==0){bypassEnable=1;}                                  //PSU 模式：强制回流 MOSFET 打开
  else{                                                                //充电器模式：根据输入输出电压关系控制旁路
    unsigned long currentTime = millis();
    
    // 防误触发机制：每隔backflowcheckInterval ms检测一次
    if(currentTime - lastBackflowCheck >= backflowcheckInterval) {
      lastBackflowCheck = currentTime;
      
      // 情况1：初始化时检测 - buck未启用时
      if(!buckEnable && voltageInput<voltageBatteryMax+voltageDropout){
        bypassEnable = 0;                                              // 输入电压不足 - 关闭旁路
      }
      // 情况2：运行时检测 - buck启用时，PWM达到上限且输出电压无法达到目标电压
      else if(buckEnable && PWM>=pwmMaxLimited && buckVoltage<voltageBatteryMax-buckfloatVoltage){
          backflowTriggerCount++;                                        // 每次检测到异常都增加计数       
        } 
      else {                            
        bypassEnable = 1;                                              //打开旁路 MOSFET
      }
      
      // 防误触发时间重置机制：每隔backflowresetInterval ms重置一次计数
      static unsigned long lastResetTime = 0;
      if(currentTime - lastResetTime >= backflowresetInterval) {
        lastResetTime = currentTime;
        if(backflowTriggerCount >= backflowTriggerLimit) {
          bypassEnable = 0;                                            // 连续触发backflowTriggerLimit次后关闭旁路
          backflowTriggerCount = 0;                                    // 重置计数器
        }
        else{
          backflowTriggerCount = 0;                                    // 重置计数器
        }
      }
    }
  }
  digitalWrite(backflow_MOSFET,bypassEnable);                          //信号回流 MOSFET GPIO 引脚 
}



void Device_Protection(){
  //错误计数器复位
  currentRoutineMillis = millis();
  if(currentErrorMillis-prevErrorMillis>=errorTimeLimit){                                           //每 millisErrorInterval (ms) 运行例程
    prevErrorMillis = currentErrorMillis;                                                           //存储上一次
    if(errorCount<errorCountLimit){errorCount=0;}                                                   //如果在 x 毫秒前低于限制，则重置错误计数  
    else{}                                                                                          //添加：如果仍然存在太多错误，则睡眠和充电暂停
  } 
  //故障检测    
  ERR = 0;                                                                                          //重置本地错误计数器
  backflowControl();                                                                                //运行回流电流保护协议   
  
  // 记录保护触发前的状态
  static bool lastOTE = 0, lastIOC = 0, lastOOC = 0, lastOOV = 0, lastFLV = 0, lastIUV = 0, lastBNC = 0;
  
  if(temperature>temperatureMax)                           {OTE=1;ERR++;errorCount++;}else{OTE=0;}  //检测到系统过热
  if(currentInput>currentInAbsolute)                       {IOC=1;ERR++;errorCount++;}else{IOC=0;}  //输入电流已达到绝对极限
  if(buckCurrent>currentOutAbsolute)                     {OOC=1;ERR++;errorCount++;}else{OOC=0;}  //降压电流已达到绝对极限
if(buckVoltage>voltageBatteryMax+voltageBatteryThresh) {OOV=1;ERR++;errorCount++;}else{OOV=0;}  //降压电压已达到绝对极限
if(voltageInput<vInSystemMin&&buckVoltage<vInSystemMin){FLV=1;ERR++;errorCount++;}else{FLV=0;}  //系统电压极低（无法恢复运行）

  if(output_Mode==0){                                                                               //PSU MODE 特定保护协议
    REC = 0; BNC = 0;                                                                               //清除恢复和电池未连接布尔标识符
    // 只在buck禁用时检测IUV（初始化时检测）
    if(!buckEnable && voltageInput<voltageBatteryMax+voltageDropout){IUV=1;ERR++;errorCount++;}
    else if(buckEnable && PWM>=pwmMaxLimited && buckVoltage<voltageBatteryMax-buckProtectVoltage){IUV=1;ERR++;errorCount++;}
    else{IUV=0;}
  }
  else{                                                                                             //Charger MODE 特定保护协议
    backflowControl();                                                                              //启用回流电流检测和控制                           
    if(buckVoltage<vInSystemMin)                   {BNC=1;ERR++;errorCount++;}      else{BNC=0;}               //BNC - BATTERY NOT CONNECTED（仅适用于充电器模式，不在 MPPT 模式下不将 BNC 视为错误)
    
    // IUV检测：初始化时检测 + 运行时PWM上限保护
    if(!buckEnable && voltageInput<voltageBatteryMax+voltageDropout){
      IUV=1;ERR++;errorCount++;  // 初始化时检测
    }
    else if(buckEnable && PWM>=pwmMaxLimited && buckVoltage<voltageBatteryMax-buckProtectVoltage){
      IUV=1;ERR++;errorCount++;  // 运行时：PWM达到上限且输出电压无法达到目标电压
    }
    else{IUV=0;}
  } 
  
  // 检测保护触发并发送调试信息
  if((OTE && !lastOTE) || (IOC && !lastIOC) || (OOC && !lastOOC) || 
     (OOV && !lastOOV) || (FLV && !lastFLV) || (IUV && !lastIUV) || (BNC && !lastBNC)) {
    sendDebugInfoToBlynk();
  }
  
  // 更新上次状态
  lastOTE = OTE; lastIOC = IOC; lastOOC = OOC; lastOOV = OOV; 
  lastFLV = FLV; lastIUV = IUV; lastBNC = BNC;
}
