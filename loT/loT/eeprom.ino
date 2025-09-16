// EEPROM地址定义

#define EEPROM_SIZE 512                // EEPROM大小
#define EEPROM_MAGIC_NUMBER 0         // EEPROM魔数
#define EEPROM_MAGIC_NUMBER_ADDR 4    // EEPROM魔数地址
#define IOT_AUTO_HEATER_ADDR   8      // 自动加热带开关地址
#define IOT_HUMI_THRESHOLD_ADDR 12   // 湿度阈值地址
#define FAN_TEMP_THRESHOLD_ADDR 16   // 风扇温度阈值地址
#define ADDR_BUTTON_STATE 20         // 按钮状态地址
#define ADDR_MOTOR_STATE 24          // 电机状态地址
#define ADDR_AUTOCLOSE_MOTOR 28      // 自动开关顶开关地址
#define ADDR_TEMP_DIFF_THRESHOLD 32  // 温度差值阈值地址
#define ADDR_HEATER_AUTO_MODE 36     // 加热片自动模式地址
#define ADDR_REPORT_INTERVAL 40      // 上报间隔地址
#define ADDR_TIMER_ENABLED 44        // 定时器总开关地址
#define ADDR_MOSFET_DELAY_ENABLED 48  // MOSFET延时关闭功能开关地址 
#define ADDR_MOSFET_DELAY_TIME 52    // MOSFET延时关闭时间地址


/*
 * 初始化EEPROM
 */
void initEEPROM() {
  Serial.println("初始化EEPROM...");
  EEPROM.begin(EEPROM_SIZE);
  
  // 检查EEPROM是否已初始化
  int magicNumber;
  EEPROM.get(EEPROM_MAGIC_NUMBER_ADDR, magicNumber);
  if (magicNumber != EEPROM_MAGIC_NUMBER) {
    Serial.println("EEPROM未初始化，恢复默认设置");
    Blynk.virtualWrite(TERMINAL_VPIN, String("EEPROM未初始化，恢复默认设置"));
    restoreDefaultSettings();
  } else {
    Serial.println("EEPROM已初始化，读取设置");
    Blynk.virtualWrite(TERMINAL_VPIN, String("EEPROM已初始化，读取设置"));
    loadSettingsFromEEPROM();
  }
}

/*
 * 保存设置到EEPROM
 */
void saveSettingsToEEPROM() {
  Serial.println("保存设置到EEPROM...");
  
  // 写入魔数
  EEPROM.put(EEPROM_MAGIC_NUMBER_ADDR, EEPROM_MAGIC_NUMBER);
  
  // 保存设置参数
  EEPROM.put(ADDR_BUTTON_STATE, buttonState);
  EEPROM.put(ADDR_MOTOR_STATE, motorState);
  EEPROM.put(ADDR_AUTOCLOSE_MOTOR, autoclose_motor);
  EEPROM.put(ADDR_HUMIDITY_THRESHOLD, humidityThreshold);
  EEPROM.put(ADDR_TEMP_DIFF_THRESHOLD, tempDiffThreshold);
  EEPROM.put(ADDR_HEATER_AUTO_MODE, heaterAutoMode);
  EEPROM.put(ADDR_REPORT_INTERVAL, reportInterval);
  EEPROM.put(ADDR_TIMER_ENABLED, timerEnabled);
  EEPROM.put(ADDR_MOSFET_DELAY_ENABLED, mosfetDelayEnabled);
  EEPROM.put(ADDR_MOSFET_DELAY_TIME, mosfetDelayTime);
  
  // 提交更改
  EEPROM.commit();
  Serial.println("设置已保存到EEPROM");
  printCurrentSettings();
}

/*
 * 从EEPROM读取设置
 */
void loadSettingsFromEEPROM() {
  Serial.println("从EEPROM读取设置...");
  Blynk.virtualWrite(TERMINAL_VPIN, String("从EEPROM读取设置..."));
  // 读取设置参数
  EEPROM.get(ADDR_BUTTON_STATE, buttonState);
  EEPROM.get(ADDR_MOTOR_STATE, motorState);
  EEPROM.get(ADDR_AUTOCLOSE_MOTOR, autoclose_motor);
  EEPROM.get(ADDR_HUMIDITY_THRESHOLD, humidityThreshold);
  EEPROM.get(ADDR_TEMP_DIFF_THRESHOLD, tempDiffThreshold);
  EEPROM.get(ADDR_HEATER_AUTO_MODE, heaterAutoMode);
  EEPROM.get(ADDR_REPORT_INTERVAL, reportInterval);//上报间隔
  EEPROM.get(ADDR_TIMER_ENABLED, timerEnabled);
  EEPROM.get(ADDR_MOSFET_DELAY_ENABLED, mosfetDelayEnabled);
  EEPROM.get(ADDR_MOSFET_DELAY_TIME, mosfetDelayTime);
  
  Serial.println("设置已从EEPROM读取");
  Blynk.virtualWrite(TERMINAL_VPIN, String("设置已从EEPROM读取"));
  printCurrentSettings();
}

/*
 * 恢复默认设置
 */
void restoreDefaultSettings() {
  Serial.println("恢复默认设置...");
  Blynk.virtualWrite(TERMINAL_VPIN, String("恢复默认设置..."));
  
  // 设置默认值
  buttonState = 0;//mosfet按钮状态
  motorState = false;//电机状态
  autoclose_motor = false;//自动开关顶开关
  humidityThreshold = 70;//湿度阈值
  tempDiffThreshold = 5;//温度差值阈值
  heaterAutoMode = false;//加热片自动模式状态
  reportInterval = 60000;//上报间隔
  timerEnabled = false;//定时器总开关
  mosfetDelayEnabled = false;//MOSFET延时关闭功能开关
  mosfetDelayTime = 0;//MOSFET延时关闭时间
  // 保存到EEPROM
  saveSettingsToEEPROM();
  Serial.println("默认设置已恢复并保存");
  Blynk.virtualWrite(TERMINAL_VPIN, String("默认设置已恢复并保存"));
}

  // 恢复默认设置按钮回调
 BLYNK_WRITE(RESTORE_DEFAULT_VPIN) {
  if (param.asInt() == 1) {
    restoreDefaultSettings();
    Blynk.virtualWrite(TERMINAL_VPIN, String("已恢复默认设置"));
    printCurrentSettings();
  }
 }


/*
 * 打印当前设置
 */
void printCurrentSettings() {
  Serial.println("=== 当前系统设置 ===");
  Serial.printf("按钮状态: %d\n", buttonState);
  Serial.printf("电机状态: %s\n", motorState ? "开启" : "关闭");
  Serial.printf("自动开关顶开关: %s\n", autoclose_motor ? "开启" : "关闭");
  Serial.printf("湿度阈值: %d%%\n", humidityThreshold);
  Serial.printf("温度差值阈值: %d°C\n", tempDiffThreshold);
  Serial.printf("加热片自动模式: %s\n", heaterAutoMode ? "开启" : "关闭");
  Serial.printf("上报间隔: %d秒\n", reportInterval / 1000);
  Serial.printf("定时器总开关: %s\n", timerEnabled ? "开启" : "关闭");
  Serial.printf("MOSFET延时关闭功能: %s\n", mosfetDelayEnabled ? "开启" : "关闭");
  Serial.printf("MOSFET延时关闭时间: %lu毫秒\n", mosfetDelayTime);
  Serial.println("==================");
}

/*
 * 更新单个设置并保存
 */
void updateSetting(int address, int value) {
  EEPROM.put(address, value);
  EEPROM.commit();
  Serial.printf("设置已更新: 地址%d = %d\n", address, value);
}

void updateSetting(bool state, int type) {
  switch (type) {
    case 1: // 电机状态
      motorState = state;
      EEPROM.put(ADDR_MOTOR_STATE, motorState);
      break;
    case 2: // 自动开关顶开关
      autoclose_motor = state;
      EEPROM.put(ADDR_AUTOCLOSE_MOTOR, autoclose_motor);
      break;
    case 3: // 加热片自动模式
      heaterAutoMode = state;
      EEPROM.put(ADDR_HEATER_AUTO_MODE, heaterAutoMode);
      break;
    case 4: // 定时器总开关
      timerEnabled = state;
      EEPROM.put(ADDR_TIMER_ENABLED, timerEnabled);
      break;
    default:
      Serial.printf("未知的设置类型: %d\n", type);
      return;
  }
  EEPROM.commit();
  Serial.printf("设置已更新: 类型%d = %s\n", type, state ? "true" : "false");
}

void updateSetting(int address, bool value) {
  EEPROM.put(address, value);
  EEPROM.commit();
  Serial.printf("设置已更新: 地址%d = %s\n", address, value ? "true" : "false");
}

void updateSetting(int address, uint8_t value) {
  EEPROM.put(address, value);
  EEPROM.commit();
  Serial.printf("设置已更新: 地址%d = %d\n", address, value);
}

/*
 * 清除EEPROM数据
 */
void clearEEPROM() {
  Serial.println("清除EEPROM数据...");
  for (int i = 0; i < EEPROM_SIZE; i++) {
    EEPROM.write(i, 0);
  }
  EEPROM.commit();//提交更改
  Serial.println("EEPROM数据已清除");
} 