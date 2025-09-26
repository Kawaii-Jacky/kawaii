void Onboard_Telemetry(){    

  /////////////////////// USB串口数据遥测 ////////////////////////   
  // 0 - 禁用串口
  // 1 - 显示全部数据
  // 2 - 显示关键数据
  // 3 - 仅显示数值 

  currentSerialMillis = millis();
  if(currentSerialMillis-prevSerialMillis>=millisSerialInterval){   //每隔millisSerialInterval毫秒运行一次
    prevSerialMillis = currentSerialMillis;                         //存储上次时间

    if(serialTelemMode==0){}
    else if(serialTelemMode==1){                                    // 1 - 显示全部数据                           
      Serial.print(" ERR:");   Serial.print(ERR);//错误计数
      Serial.print(" FLV:");   Serial.print(FLV);//系统电压过低
      Serial.print(" BNC:");   Serial.print(BNC);//电池未连接
      Serial.print(" IUV:");   Serial.print(IUV);//输入电压过低
      Serial.print(" IOC:");   Serial.print(IOC);//输入电流过大
      Serial.print(" OOV:");   Serial.print(OOV);//输出电压过大
      Serial.print(" OOC:");   Serial.print(OOC);//输出电流过大
      Serial.print(" OTE:");   Serial.print(OTE);//过热
      Serial.print(" REC:");   Serial.print(REC);//输入电压过低恢复
      Serial.print(" MPPTA:"); Serial.print(MPPT_Mode);//MPPT模式
      Serial.print(" CM:");    Serial.print(output_Mode);   //充电模式
      
      Serial.print(" ");  //空格
      Serial.print(" BYP:");   Serial.print(bypassEnable);//旁路
      Serial.print(" EN:");    Serial.print(buckEnable);//降压使能
      Serial.print(" FAN:");   Serial.print(fanStatus);//风扇状态
      Serial.print(" WiFi:");  Serial.print(WIFI);//WiFi状态
      Serial.print(" ");  
      Serial.print(" PI:");    Serial.print(powerInput,3);//输入功率
      Serial.print(" PWM:");   Serial.print(PWM);//PWM
      Serial.print(" pwmMinLimited:");  Serial.print(pwmMinLimited);//预测PWM
      Serial.print(" MaxDC:"); Serial.print(PWM_MaxDC,1);//最大占空比
      Serial.print(" MaxLim:");Serial.print(pwmMaxLimited);//PWM最大限制
      Serial.print(" VI:");    Serial.print(voltageInput,3);//输入电压
      Serial.print(" BV:");    Serial.print(buckVoltage,3);//降压电压
      Serial.print(" CI:");    Serial.print(currentInput,3);//输入电流
      Serial.print(" BC:");    Serial.print(buckCurrent,3);//降压电流
      Serial.print(" Wh:");    Serial.print(Wh,3);//Wh
      Serial.print(" Temp:");  Serial.print(temperature,1);//温度
      Serial.print(" "); 
      Serial.print(" VSI:");   Serial.print(VSI,3);//INA226输入电压原始
      Serial.print(" VSO:");   Serial.print(VSO,3);//INA226输出电压原始
      Serial.print(" CSI:");   Serial.print(CSI,3);//INA226输入电流原始
      Serial.print(" CSO:");   Serial.print(CSO,3);//INA226输出电流原始
      Serial.print(" VO%Dev:");Serial.print(outputDeviation,1);//输出电压偏差
      Serial.print(" SOC:");   Serial.print(batteryPercent);//电池电量
      Serial.print(" T:");     Serial.print(secondsElapsed); 
      Serial.print(" LoopT:"); Serial.print(loopTime,3);Serial.print("ms");
      
      // 新增：日发电和总发电数据显示
      Serial.print(" Daily:"); Serial.print(dailyEnergy/1000,3); Serial.print("kWh");
      Serial.print(" Total:"); Serial.print(totalEnergy/1000,3); Serial.print("kWh");
      
      Serial.println("");    
    }
    else if(serialTelemMode==2){ // 2 - 显示关键数据
      Serial.print(" PI:");    Serial.print(powerInput,3); 
      Serial.print(" PWM:");   Serial.print(PWM); 
      Serial.print(" pwmMinLimited:");  Serial.print(pwmMinLimited); 
      Serial.print(" VI:");    Serial.print(voltageInput,3); 
      Serial.print(" BV:");    Serial.print(buckVoltage,3); 
      Serial.print(" CI:");    Serial.print(currentInput,3); 
      Serial.print(" BC:");    Serial.print(buckCurrent,3); 
      Serial.print(" Wh:");    Serial.print(Wh,3); 
      Serial.print(" Temp:");  Serial.print(temperature,1);  
      Serial.print(" EN:");    Serial.print(buckEnable);
      Serial.print(" FAN:");   Serial.print(fanStatus);   
      Serial.print(" SOC:");   Serial.print(batteryPercent);Serial.print("%"); 
      Serial.print(" T:");     Serial.print(secondsElapsed); 
      Serial.print(" LoopT:"); Serial.print(loopTime,3);Serial.print("ms");
      
      // 新增：日发电和总发电数据显示
      Serial.print(" Daily:"); Serial.print(dailyEnergy/1000,3); Serial.print("kWh");
      Serial.print(" Total:"); Serial.print(totalEnergy/1000,3); Serial.print("kWh");
      
      Serial.println("");    
    }  
    else if(serialTelemMode==3){ // 3 - 仅显示数值 
      Serial.print(" ");       Serial.print(powerInput,3); 
      Serial.print(" ");       Serial.print(voltageInput,3); 
      Serial.print(" ");       Serial.print(buckVoltage,3); 
      Serial.print(" ");       Serial.print(currentInput,3); 
      Serial.print(" ");       Serial.print(buckCurrent,3);   
      Serial.print(" ");       Serial.print(Wh,3); 
      Serial.print(" ");       Serial.print(temperature,1);  
      Serial.print(" ");       Serial.print(buckEnable);
      Serial.print(" ");       Serial.print(fanStatus);   
      Serial.print(" ");       Serial.print(batteryPercent);
      Serial.print(" ");       Serial.print(secondsElapsed); 
      Serial.print(" ");       Serial.print(loopTime,3);
      
      // 新增：日发电和总发电数据显示
      Serial.print(" ");       Serial.print(dailyEnergy/1000,3);
      Serial.print(" ");       Serial.print(totalEnergy/1000,3);
      
      Serial.print(" ");       Serial.println("");    
    }  

  } 
}


// 发送调试信息到Blynk终端
void sendDebugInfoToBlynk() {
  if(WIFI == 1 && Blynk.connected()) {
    String debugInfo = "";
    debugInfo += " ERR:" + String(ERR);   //错误计数
    debugInfo += " FLV:" + String(FLV);   //系统电压过低
    debugInfo += " BNC:" + String(BNC);   //电池未连接
    debugInfo += " IUV:" + String(IUV);   //输入电压过低
    debugInfo += " IOC:" + String(IOC);   //输入电流过大
    debugInfo += " OOV:" + String(OOV);   //输出电压过大
    debugInfo += " OOC:" + String(OOC);   //输出电流过大
    debugInfo += " OTE:" + String(OTE);   //过热
    debugInfo += " REC:" + String(REC);   //输入电压过低恢复
    debugInfo += " MPPTA:" + String(MPPT_Mode); //MPPT模式
    debugInfo += " CM:" + String(output_Mode);   //充电模式
    
    debugInfo += " ";  //空格
    debugInfo += " BYP:" + String(bypassEnable);   //旁路
    debugInfo += " EN:" + String(buckEnable);    //降压使能
    debugInfo += " FAN:" + String(fanStatus);   //风扇状态
    debugInfo += " WiFi:" + String(WIFI);  //WiFi状态
    debugInfo += " ";  
    debugInfo += " PI:" + String(powerInput,3);    //输入功率
    debugInfo += " PWM:" + String(PWM);   //PWM
    debugInfo += " pwmMinLimited:" + String(pwmMinLimited);  //预测PWM
    debugInfo += " MaxDC:" + String(PWM_MaxDC,1); //最大占空比
    debugInfo += " MaxLim:" + String(pwmMaxLimited); //PWM最大限制
    debugInfo += " VI:" + String(voltageInput,3);    //输入电压
    debugInfo += " BV:" + String(buckVoltage,3);    //降压电压
    debugInfo += " CI:" + String(currentInput,3);    //输入电流
    debugInfo += " BC:" + String(buckCurrent,3);    //降压电流
    debugInfo += " Wh:" + String(Wh,3);    //Wh
    debugInfo += " Temp:" + String(temperature,1);  //温度
    debugInfo += " "; 
    debugInfo += " VSI:" + String(VSI,3);   //INA226输入电压原始
    debugInfo += " VSO:" + String(VSO,3);   //INA226输出电压原始
    debugInfo += " CSI:" + String(CSI,3);   //INA226输入电流原始
    debugInfo += " CSO:" + String(CSO,3);   //INA226输出电流原始
    debugInfo += " VO%Dev:" + String(outputDeviation,1); //输出电压偏差
    debugInfo += " SOC:" + String(batteryPercent); //电池电量
    debugInfo += " T:" + String(secondsElapsed); 
    debugInfo += " LoopT:" + String(loopTime,3) + "ms";
    debugInfo += " Daily:" + String(dailyEnergy/1000,3) + "kWh";
    debugInfo += " Total:" + String(totalEnergy/1000,3) + "kWh";
    Blynk.virtualWrite(V0, debugInfo);
  }
}