void buck_Enable(){                                                                  //启用 MPPT 降压转换器
  buckEnable = 1;
  digitalWrite(buck_EN,HIGH);
  digitalWrite(LED,HIGH);
}
void buck_Disable(){                                                                 //禁用 MPPT 降压转换器
  buckEnable = 0; 
  digitalWrite(buck_EN,LOW);
  digitalWrite(LED,LOW);
  PWM = 0;
}   
void predictivePWM(){                                                                //预测PWM 算法 
  if(voltageInput<=0){pwmMinLimited=0;}                                                       ///当电压输入为零时防止不确定答案
  else{
    PWM_MinDC = voltageInput + voltageDropout;
    
    pwmMinLimited =(pwmMinLimited_margin*pwmMax*(buckVoltage + buckminfloatVoltage))/(100.00*PWM_MinDC);}              //计算预测 PWM 下限 并存储在变量中：buckVoltage must >= 实际电池电压，而初始化的时候buckvoltage = 实际电池电压； 所以保持了下限，防止当pwm减小的时候，pwmMinLimited随之下降而可能出现循环，使得pwm无线减小；

  pwmMinLimited = constrain(pwmMinLimited,0,pwmMaxLimited);
}   

void PWM_Modulation(){
  if(output_Mode==0){PWM = constrain(PWM,0,pwmMaxLimited);}                          //PSU MODE PWM = PWM OVERFLOW PROTECTION（将下限限制为 0%，上限限制为最大允许占空比）
  else{
    predictivePWM();                                                                 //运行和计算预测 pwm 下限
    PWM = constrain(PWM,pwmMinLimited,pwmMaxLimited);                                         //CHARGER MODE PWM - 将下限限制为 pwmMinLimited，上限限制为最大允许占空比）                                     
  } 
  ledcWrite(pwmChannel,PWM);                                                         //设置 PWM 占空比并在启用降压时写入 GPIO
  buck_Enable();                                                                     //开启 MPPT 降压 (IR2104)
}
     


void Charging_Algorithm(){
  if(ERR>0||chargingPause==1){buck_Disable();}                                       //当出现错误或充电暂停用于暂停覆盖时关闭 MPPT 降压
  else{
    if(REC==1){                                                                      // IUV RECOVERY - (仅对充电模式有效)
      REC=0;                                                                         //重置 IUV 恢复布尔标识符
      buck_Disable();                                                                //在 pwmMinLimited 初始化之前禁用降压
      Serial.println("> Solar Panel Detected");                                      //显示串口信息
      Serial.print("> Computing For Predictive PWM ");                               //显示串口信息
      for(int i = 0; i<40; i++){Serial.print(".");delay(30);}                        //For loop "loading... 效果
      Serial.println("");                                                            //在串行上显示下一行的换行符  
      Read_Sensors();
      predictivePWM();
      PWM = pwmMinLimited; 
    }  
    else{                                                                            //NO ERROR PRESENT - 继续电源转换
      /////////////////////// CC-CV BUCK PSU ALGORITHM ////////////////////////////// 
      if(MPPT_Mode==0){                                                              // CC-CV PSU 模式
        // 先计算pwmMinLimited
        predictivePWM();
        
        else if(buckCurrent>currentCharging) {
          PWM--;
        }                            //电流高于 → 降低占空比
        else if(buckVoltage>voltageBatteryMax){
          PWM--;
        }                             //电压高于 → 降低占空比
        else if(buckVoltage<voltageBatteryMax){
          PWM++;
        }                             //当降压电压低于充电电压时增加占空比（pwmMinLimited自动限制上限）
        else{}                                                                       //当达到设定的输出电压时什么都不做 
        PWM_Modulation();                                                            //将 PWM 信号设置为 Buck PWM GPIO       
      }     
        ///////////////////////  MPPT & CC-CV 充电算法 ///////////////////////  
      else{                                                                                                                                                         
        // 先计算pwmMinLimited
        predictivePWM();
        
        else if(buckCurrent>currentCharging){
          PWM--;
        }                                 //电流高于 → 降低占空比
        else if(buckVoltage>voltageBatteryMax){
          PWM--;
        }                         //电压高于 → 降低占空比  
        else{                                                                          //MPPT 算法
          // 定义阈值，避免抖动
          float powerThreshold = 0.1;    // 功率阈值 0.1W
          float voltageThreshold = 0.1;  // 电压阈值 0.1V
          
          float powerDiff = powerInput - powerInputPrev;
          float voltageDiff = voltageInput - voltageInputPrev;
          
          // 只有当变化超过阈值时才进行调整
          if(abs(powerDiff) >= powerThreshold || abs(voltageDiff) >= voltageThreshold) {
            if(powerDiff > powerThreshold && voltageDiff > voltageThreshold) {
              PWM--;
            } //  ↑P ↑V ; →MPP //D--
            else if(powerDiff > powerThreshold && voltageDiff < -voltageThreshold){
              PWM++;
            } //  ↑P ↓V ; MPP← //D++ 
            else if(powerDiff < -powerThreshold && voltageDiff > voltageThreshold){
              PWM++;
            } //  ↓P ↑V ; MPP→ //D++ 
            else if(powerDiff < -powerThreshold && voltageDiff < -voltageThreshold){
              PWM--;
            } //  ↓P ↓V ; ←MPP  //D--
            else{ }// 如果变化在阈值内，保持PWM不变
          }
          
          powerInputPrev   = powerInput;                                               //  存储以前记录的功率
          voltageInputPrev = voltageInput;                                             //存储先前记录的电压        
        }   
        PWM_Modulation();                                                              //将 PWM 信号设置为 Buck PWM GPIO                                                                     
      }  
    }
  }
}

