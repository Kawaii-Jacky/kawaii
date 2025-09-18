
// ==================== MAC地址解析函数 ====================

// 解析MAC地址字符串
bool parseMACAddress(const String& macStr, uint8_t* macArray) {
  // 移除所有空格和冒号
  String cleanMac = macStr;
  cleanMac.replace(" ", "");
  cleanMac.replace(":", "");
  
  // 检查长度（应该是12个字符，如：781C3CA2D016）
  if (cleanMac.length() != 12) {
    return false;
  }
  
  // 验证是否都是十六进制字符
  for (int i = 0; i < 12; i++) {
    char c = cleanMac.charAt(i);
    if (!((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f'))) {
      return false;
    }
  }
  
  // 解析MAC地址
  for (int i = 0; i < 6; i++) {
    String byteStr = cleanMac.substring(i * 2, i * 2 + 2);
    macArray[i] = strtol(byteStr.c_str(), NULL, 16);
  }
  
  return true;
}

// 将MAC地址数组转换为字符串
String macArrayToString(const uint8_t* macArray) {
  String result = "";
  for (int i = 0; i < 6; i++) {
    if (i > 0) result += ":";
    if (macArray[i] < 0x10) result += "0";
    result += String(macArray[i], HEX);
  }
  return result;
}

// ==================== EEPROM操作函数 ====================

// 保存MAC地址到EEPROM
void saveMACAddressesToEEPROM() {
  EEPROM.put(MAC_ADDRESSES_ADDR, macAddresses);
  EEPROM.commit();
}

// 从EEPROM加载MAC地址
void loadMACAddressesFromEEPROM() {
  EEPROM.get(MAC_ADDRESSES_ADDR, macAddresses);
  
  // 简单验证：检查第一个字节是否为0或0xFF
  if (macAddresses.onstepMac[0] == 0 || macAddresses.onstepMac[0] == 0xFF) {
    // 设置默认MAC地址
    uint8_t defaultOnstepMac[] = {0x78, 0x1C, 0x3C, 0xA2, 0xD0, 0x16};
    uint8_t defaultFlatFieldMac[] = {0x6C, 0xC8, 0x40, 0x56, 0xAF, 0x70};
    uint8_t defaultMpptMac[] = {0x68, 0x25, 0xDD, 0x2E, 0xBA, 0x60};
    
    memcpy(macAddresses.onstepMac, defaultOnstepMac, 6);
    memcpy(macAddresses.flatFieldMac, defaultFlatFieldMac, 6);
    memcpy(macAddresses.mpptMac, defaultMpptMac, 6);
    
    // 保存默认值到EEPROM
    saveMACAddressesToEEPROM();
  }
}

// ==================== MAC地址设置函数 ====================

// 设置OnStep MAC地址
bool setOnStepMAC(const String& macStr) {
  if (parseMACAddress(macStr, macAddresses.onstepMac)) {
    // 更新全局变量
    memcpy(onstepMac, macAddresses.onstepMac, 6);
    saveMACAddressesToEEPROM();
    return true;
  } else {
    Blynk.virtualWrite(TERMINAL_VPIN, "格式无效");
    return false;
  }
}

// 设置平场板MAC地址
bool setFlatFieldMAC(const String& macStr) {
  if (parseMACAddress(macStr, macAddresses.flatFieldMac)) {
    // 更新全局变量
    memcpy(flatFieldMac, macAddresses.flatFieldMac, 6);
    saveMACAddressesToEEPROM();
    return true;
  } else {
    Blynk.virtualWrite(TERMINAL_VPIN, "格式无效");
    return false;
  }
}

// 设置MPPT MAC地址
bool setMPPTMAC(const String& macStr) {
  if (parseMACAddress(macStr, macAddresses.mpptMac)) {
    // 更新全局变量
    memcpy(mpptMac, macAddresses.mpptMac, 6);
    saveMACAddressesToEEPROM();
    return true;
  } else {
    Blynk.virtualWrite(TERMINAL_VPIN, "格式无效");
    return false;
  }
}

// ==================== 显示MAC地址函数 ====================

// 显示所有MAC地址
void displayAllMACAddresses() {
  String message = "O:" + macArrayToString(macAddresses.onstepMac) + "\n";
  message += "E:" + macArrayToString(macAddresses.flatFieldMac) + "\n";
  message += "M:" + macArrayToString(macAddresses.mpptMac);
  
  Blynk.virtualWrite(TERMINAL_VPIN, message);
}

// ==================== Blynk终端命令处理 ====================

// 处理Blynk终端输入的命令
void processTerminalCommand(const String& command) {
  String cmd = command;
  cmd.trim();
  cmd.toUpperCase();
  
  if (cmd.startsWith("O ")) {
    // 设置OnStep MAC地址
    String macStr = cmd.substring(2); // 移除"O "
    setOnStepMAC(macStr);
  }
  else if (cmd.startsWith("E ")) {
    // 设置平场板MAC地址
    String macStr = cmd.substring(2); // 移除"E "
    setFlatFieldMAC(macStr);
  }
  else if (cmd.startsWith("M ")) {
    // 设置MPPT MAC地址
    String macStr = cmd.substring(2); // 移除"M "
    setMPPTMAC(macStr);
  }
  else if (cmd == "SHOW" || cmd == "S") {
    // 显示所有MAC地址
    displayAllMACAddresses();
  }
  else if (cmd == "HELP" || cmd == "H") {
    // 显示帮助信息
    String helpMsg = "MAC地址配置命令:\n";
    helpMsg += "O XX:XX:XX:XX:XX:XX - 设置OnStep MAC地址\n";
    helpMsg += "E XX:XX:XX:XX:XX:XX - 设置平场板MAC地址\n";
    helpMsg += "M XX:XX:XX:XX:XX:XX - 设置MPPT MAC地址\n";
    helpMsg += "SHOW - 显示所有MAC地址\n";
    helpMsg += "HELP - 显示此帮助信息";
    
    Blynk.virtualWrite(TERMINAL_VPIN, helpMsg);
  }
  else {
    // 未知命令
    String errorMsg = "未知命令: " + command + "\n";
    errorMsg += "输入 'HELP' 查看可用命令";
    
    Blynk.virtualWrite(TERMINAL_VPIN, errorMsg);
  }
}

// ==================== 初始化函数 ====================

// 初始化MAC地址配置模块
void initMACConfig() {
  loadMACAddressesFromEEPROM();
  
  // 同步全局变量
  memcpy(onstepMac, macAddresses.onstepMac, 6);
  memcpy(flatFieldMac, macAddresses.flatFieldMac, 6);
  memcpy(mpptMac, macAddresses.mpptMac, 6);
}

// ==================== Blynk终端输入回调 ====================

// Blynk终端输入处理（需要在主程序中添加）
// BLYNK_WRITE(TERMINAL_VPIN) {
//   String input = param.asStr();
//   processTerminalCommand(input);
// }
