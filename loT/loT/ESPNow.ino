
// ==================== ESP-NOW初始化函数 ====================
void initEspNow() {
  // 设置WiFi模式为Station
  WiFi.mode(WIFI_STA);
  
  // 打印本机MAC地址
  uint8_t mac[6];
  WiFi.macAddress(mac);
  Serial.printf("IoT板子MAC地址: %02X:%02X:%02X:%02X:%02X:%02X\n", 
                mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  
  // 初始化ESP-NOW
  if (esp_now_init() == ESP_OK) {
    Serial.println("ESP-NOW 初始化成功");
    
    // 添加平场板对等设备（使用动态MAC地址）
    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, flatFieldMac, 6);
    peerInfo.channel = 0;
    peerInfo.encrypt = false;
    esp_now_add_peer(&peerInfo);
    Serial.printf("ESP-NOW连接平场板MAC: %02X:%02X:%02X:%02X:%02X:%02X\n", 
                  flatFieldMac[0], flatFieldMac[1], flatFieldMac[2], 
                  flatFieldMac[3], flatFieldMac[4], flatFieldMac[5]);
    
    // 启动定时发送ESP-NOW数据
    espnowSendTicker.attach_ms(ESPNOW_SEND_INTERVAL, sendEspNowData); // 定时发送ESP-NOW数据
  } else {
    Serial.println("ESP-NOW 初始化失败");
  }
}

// 统一的ESP-NOW数据发送函数
void sendEspNowData() {
  // 发送湿度数据到平场板
  EspNowHumiConfig config;
  config.humiThreshold = (int)dhtHumidity; // 发送实际湿度值
  
  esp_err_t result1 = esp_now_send(flatFieldMac, (uint8_t*)&config, sizeof(config));
  if (result1 == ESP_OK) {
    Serial.printf("已通过ESP-NOW发送实际湿度值到平场板: %.1f%%\n", dhtHumidity);
  } else {
    Serial.println("ESP-NOW发送实际湿度值失败");
  }
  

}



// ==================== Blynk回调函数 ====================

// ESP-NOW数据发送间隔设置回调
BLYNK_WRITE(ESPNOW_SEND_INTERVAL_VPIN) {
  unsigned long newIntervalSeconds = param.asLong();
  if (newIntervalSeconds >= 1 && newIntervalSeconds <= 60) {  // 限制在1秒到60秒之间
    unsigned long newIntervalMs = newIntervalSeconds * 1000;  // 将秒转换为毫秒
    
    // 更新定时器间隔
    espnowSendTicker.detach();
    espnowSendTicker.attach_ms(newIntervalMs, sendEspNowData);
    
    Serial.printf("ESP-NOW数据发送间隔已更新为: %lu 秒 (%lu ms)\n", newIntervalSeconds, newIntervalMs);
    Blynk.virtualWrite(TERMINAL_VPIN, String("ESP-NOW数据发送间隔已更新为: ") + String(newIntervalSeconds) + " 秒");
  } else {
    Serial.println("ESP-NOW数据发送间隔设置无效，必须在1-60秒之间");
    Blynk.virtualWrite(TERMINAL_VPIN, String("ESP-NOW数据发送间隔设置无效，必须在1-60秒之间"));
    // 恢复当前值（显示秒数）
    Blynk.virtualWrite(ESPNOW_SEND_INTERVAL_VPIN, ESPNOW_SEND_INTERVAL / 1000);
  }
}

// Blynk终端输入处理回调
BLYNK_WRITE(TERMINAL_VPIN) {
  String input = param.asStr();
  if (input.length() > 0) {
    processTerminalCommand(input);
  }
}
