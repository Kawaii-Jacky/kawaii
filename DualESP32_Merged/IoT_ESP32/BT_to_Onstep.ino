
// ==================== 蓝牙控制功能函数 ====================

// SSP认证回调函数
void BTConfirmRequestCallback(uint32_t pin) {
  Serial.printf("配对请求 PIN: %d\n", pin);
  BT.confirmReply(true); // 自动确认配对
}

void BTAuthCompleteCallback(bool success) {
  if(success) {
    Serial.println("配对成功!");
    btConnected = true;
  } else {
    Serial.println("配对失败!");
    btConnected = false;
  }
}

// 初始化时间服务
void initTimeService() {

  // 配置时间
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  int retryCount = 0;
  while (!time(nullptr) && retryCount < 10) {
    Serial.println("等待时间同步...");
    delay(1000);
    retryCount++;
  }
  
  if (time(nullptr)) {
    Serial.println("时间同步成功");
  } else {
    Serial.println("时间同步失败");
  }
}

// 获取当前日期时间字符串
String getCurrentDateTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("获取本地时间失败");
    return "";
  }
  
  char dateTimeStr[64];
  strftime(dateTimeStr, sizeof(dateTimeStr), "%m/%d/%y %H:%M:%S", &timeinfo);
  return String(dateTimeStr);
}

// 获取日期字符串 (MM/DD/YY格式)
String getCurrentDate() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("获取本地时间失败");
    return "";
  }
  
  char dateStr[16];
  strftime(dateStr, sizeof(dateStr), "%m/%d/%y", &timeinfo);
  return String(dateStr);
}

// 获取时间字符串 (HH:MM:SS格式)
String getCurrentTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("获取本地时间失败");
    return "";
  }
  
  char timeStr[16];
  strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
  return String(timeStr);
}

// 获取时区字符串
String getTimezoneString() {
  int tz = TIMEZONE;
  if (tz >= 0) {
    return String("+") + String(tz);
  } else {
    return String(tz);
  }
}

// 发送日期时间设置命令到OnStep
void sendDateTimeToOnStep() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无法发送命令");
    return;
  }
  
  // 获取当前日期时间
  String currentDate = getCurrentDate();
  String currentTime = getCurrentTime();
  String timezoneStr = getTimezoneString();
  
  if (currentDate.length() == 0 || currentTime.length() == 0) {
    Serial.println("获取时间失败，请检查网络连接");
    return;
  }
  
  // 发送日期命令 :SC[MM/DD/YY]#
  String dateCommand = ":SC" + currentDate + "#";
  BT.println(dateCommand);
  Serial.println("发送日期命令: " + dateCommand);
  delay(500);
  yield(); // 添加yield防止看门狗超时
  
  // 发送时间命令 :SL[HH:MM:SS]#
  String timeCommand = ":SL" + currentTime + "#";
  BT.println(timeCommand);
  Serial.println("发送时间命令: " + timeCommand);
  delay(500);
  yield(); // 添加yield防止看门狗超时
  
  // 发送时区命令 :SG[sHH]#
  String timezoneCommand = ":SG" + timezoneStr + "#";
  BT.println(timezoneCommand);
  Serial.println("发送时区命令: " + timezoneCommand);
  
  CommandSent = true;
  currentCommand = CMD_SET_DATETIME;
  
  Serial.println("日期时间设置命令发送完成");
}

// 初始化蓝牙模块
void initBluetooth() {

  // 注册认证回调
  BT.onConfirmRequest(BTConfirmRequestCallback);
  BT.onAuthComplete(BTAuthCompleteCallback);
  
  // 初始化蓝牙串口（主机模式）
  if (BT.begin("ESP32_OnStep", true)) {
    Serial.println("蓝牙初始化成功");

  } else {
    Serial.println("蓝牙初始化失败");
  }
}

// 断开蓝牙连接函数
void disconnectBluetooth() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无需断开");
    return;
  }
  
  BT.disconnect();
  btConnected = false;
  btPairing = false;
  CommandSent = false;
  currentCommand = CMD_NONE;  // 重置命令类型
  Serial.println("蓝牙连接已断开");
  // 更新连接开关状态为关闭
}

// 蓝牙配对函数
void pairBluetooth() {
  if (btPairing) {
    Serial.println("正在配对中，请稍候...");

    return;
  }
  
  btPairing = true;
  Serial.println("开始配对OnStep设备...");
  
  // 尝试连接OnStep，带超时机制
  unsigned long startTime = millis();
  while(!BT.connect(onstepMac) && (millis() - startTime < 15000)) {
    Serial.println("连接中...");
    delay(500);
    yield(); // 添加yield防止看门狗超时
  }
  
  if(BT.connected()) {
    Serial.println("连接成功!");
    btConnected = true;
    btPairing = false;
    // 更新连接开关状态为开启
  } else {
    Serial.println("连接超时!");
    btConnected = false;
    btPairing = false;
    // 更新连接开关状态为关闭
  }
}

// 回停放位函数
void sendParkCommand() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无法发送命令");
    return;
  }
  
  BT.println(":hP#");  // 发送回停放位命令
  Serial.println("回停放位命令已发送");
  CommandSent = true;
  currentCommand = CMD_PARK;  // 设置当前命令类型
}

// 解除停放位函数
void sendUnparkCommand() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无法发送命令");
    return;
  }
  
  BT.println(":hR#");  // 发送解除停放位命令
  Serial.println("解除停放位命令已发送");
  CommandSent = true;
  currentCommand = CMD_UNPARK;  // 设置当前命令类型
}

// 回零位函数
void sendHomeCommand() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无法发送命令");
    return;
  }
  
  BT.println(":hC#");  // 发送回零位命令
  Serial.println("回零位命令已发送");
  CommandSent = true;
  currentCommand = CMD_HOME;  // 设置当前命令类型
}

// 设置当前位置为零位函数
void setCurrentPositionAsHome() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无法发送命令");
    return;
  }
  
  BT.println(":hF#");  // 发送设置当前位置为零位命令
  Serial.println("设置当前位置为零位命令已发送");
  CommandSent = true;
  currentCommand = CMD_SET_HOME;  // 设置当前命令类型
}

// 设置当前位置为停放位函数
void setCurrentPositionAsPark() {
  if (!btConnected) {
    Serial.println("蓝牙未连接，无法发送命令");
    return;
  }
  
  BT.println(":hQ#");  // 发送设置当前位置为停放位命令
  Serial.println("设置当前位置为停放位命令已发送");
  CommandSent = true;
  currentCommand = CMD_SET_PARK;  // 设置当前命令类型
}

// 蓝牙控制处理函数
void handleBluetoothControl() {
  // 连接状态监测与自动重连（添加5秒超时）
  static unsigned long lastReconnectTime = 0;
  
  if (!BT.connected() && btConnected) {
    unsigned long currentTime = millis();
    
    // 检查是否超过重连超时时间
    if (currentTime - lastReconnectTime >= RECONNECT_TIMEOUT) {
      btConnected = false;
      Serial.println("蓝牙连接断开，尝试重连...");
      
      // 尝试重连
      if(BT.connect(onstepMac)) {
        btConnected = true;
        Serial.println("重连成功!");
        // 更新连接开关状态为开启
      } else {
        Serial.println("重连失败!");
        // 更新连接开关状态为关闭
      }
      
      // 更新重连时间
      lastReconnectTime = currentTime;
      delay(2000); // 重连间隔
    }
  } else if (!BT.connected() && !btConnected) {
    // 蓝牙未连接且之前也未连接，不输出信息避免重复
    // 这里不输出任何信息，避免频繁的"断开"提示
  }

  // 监听回复
  if (CommandSent && BT.available()) {
    String response = BT.readStringUntil('\n');
    response.trim();
    if(response.length() > 0) {
      Serial.print("收到回复: ");
      Serial.println(response);
      
      // 根据命令类型处理回复
      if (currentCommand == CMD_PARK) {
        // 处理回停放位回复
        if (response == "0") {
          Serial.println("回停放位无效");
        } else if (response == "1") {
          Serial.println("回停放位成功");
        } else {
          Serial.print("未知回复: ");
          Serial.println(response);
        }
      } else if (currentCommand == CMD_UNPARK) {
        // 处理解除停放位回复
        if (response == "0") {
          Serial.println("解除停放位失败");
        } else if (response == "1") {
          Serial.println("已解除停放");
        } else {
          Serial.print("未知回复: ");
          Serial.println(response);
        }
      } else if (currentCommand == CMD_SET_DATETIME) {
        // 处理日期时间设置回复
        if (response == "0") {
          Serial.println("日期时间设置失败");
        } else if (response == "1") {
          Serial.println("日期时间设置成功");
        } else {
          Serial.print("日期时间设置回复: ");
          Serial.println(response);
        }
      } else if (currentCommand == CMD_HOME) {
        // 处理回零位回复
        if (response == "0") {
          Serial.println("回零位失败");
        } else if (response == "1") {
          Serial.println("回零位成功");
        } else {
          Serial.print("回零位回复: ");
          Serial.println(response);
        }
      } else if (currentCommand == CMD_SET_HOME) {
        // 处理设置当前位置为零位回复
        if (response == "0") {
          Serial.println("设置当前位置为零位失败");
        } else if (response == "1") {
          Serial.println("设置当前位置为零位成功");
        } else {
          Serial.print("设置零位回复: ");
          Serial.println(response);
        }
      } else if (currentCommand == CMD_SET_PARK) {
        // 处理设置当前位置为停放位回复
        if (response == "0") {
          Serial.println("设置当前位置为停放位失败");
        } else if (response == "1") {
          Serial.println("设置当前位置为停放位成功");
        } else {
          Serial.print("设置停放位回复: ");
          Serial.println(response);
        }
      }
      CommandSent = false;
      currentCommand = CMD_NONE;  // 重置命令类型
    
    }
  }
}



// OnStep控制分段开关回调 - 整合所有功能

// 蓝牙连接开关回调

// 蓝牙断开开关回调

// 位置设置分段开关回调

// ==================== 辅助函数 ====================
// 检查蓝牙连接状态
bool isBluetoothConnected() {
    return btConnected;
}
