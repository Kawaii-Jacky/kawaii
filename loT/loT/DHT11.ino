/*
 * DHT11.ino - DHT11温湿度传感器模块
 * 功能：读取DHT11温湿度数据，使用多采样平均提高精度
 * 使用Blynk虚拟引脚V40(温度)、V41(湿度)输出数据，V42接收温度设置值
 */
#include "settings.h"
#include <EEPROM.h>
#include <esp_now.h>

// ==================== 全局变量 ====================
// 注意：lastDHT11ReadTime已在主程序中定义，这里只声明为extern
bool autoHeater = true;
int humiThreshold = 70;

// EEPROM地址定义
#define IOT_AUTO_HEATER_ADDR   0   // 自动加热带开关EEPROM地址
#define IOT_HUMI_THRESHOLD_ADDR 4  // 湿度阈值EEPROM地址

// 加热带控制引脚
#define HEATER_PIN 5

// 初始化DHT11
void initDHT11() {
  // DHT11实例已在全局变量中创建
  myDHT11.begin();  // 添加begin()方法调用
  Serial.println("DHT11 温湿度传感器初始化完成");
  
  // 初始化EEPROM并加载配置
  EEPROM.begin(32);
  autoHeater = EEPROM.read(IOT_AUTO_HEATER_ADDR);
  humiThreshold = EEPROM.readInt(IOT_HUMI_THRESHOLD_ADDR);
  if (humiThreshold < 0 || humiThreshold > 100) humiThreshold = 70;
  
  Serial.printf("DHT11 自动加热带: %s, 湿度阈值: %d%%\n", 
                autoHeater ? "开启" : "关闭", humiThreshold);
  
}

// ==================== 功能函数 ====================
void readDHT11Data() {
  // 单次读取，取消多次平均
  float temp = myDHT11.readTemperature();
  float humi = myDHT11.readHumidity();
  
  // 检查数据是否有效
  if (!isnan(temp) && !isnan(humi) && 
      temp >= -40.0 && temp <= 80.0 && 
      humi >= 0.0 && humi <= 100.0) {
    dhtTemperature = temp;
    dhtHumidity = humi;
    dht11DataValid = true;

    // Serial.printf("DHT11读取成功: 温度=%.1f°C, 湿度=%.1f%%\n", dhtTemperature, dhtHumidity);
  } else {
    dht11DataValid = false;
    Serial.printf("DHT11读取失败: 温度=%.1f, 湿度=%.1f\n", temp, humi);
  }

  // 更新全局变量
  dhtTemperature = dhtTemperature;
  dhtHumidity = dhtHumidity;
}

void sendDHT11DataToBlynk() {
  if (dht11DataValid) {
    // 格式化为保留一位小数
    String tempStr = String(dhtTemperature, 1);
    String humiStr = String(dhtHumidity, 1);
    
    Blynk.virtualWrite(DHT_TEMPERATURE_VPIN, tempStr);
    Blynk.virtualWrite(DHT_HUMIDITY_VPIN, humiStr);
  }
}

// ==================== EEPROM保存函数 ====================
void saveAutoHeaterToEEPROM(bool value) {
  EEPROM.write(IOT_AUTO_HEATER_ADDR, value);
  EEPROM.commit();
}

void saveHumiThresholdToEEPROM(int value) {
  EEPROM.writeInt(IOT_HUMI_THRESHOLD_ADDR, value);
  EEPROM.commit();
}

// ==================== Blynk回调函数 ====================
// BLYNK_WRITE(DHT_TEMP_SET_VPIN) {
//   float tempSet = param.asFloat();
//   // 这里可以添加温度设置值的处理逻辑
//   // 例如：控制加热器或其他温度调节设备
//   Serial.printf("DHT11温度设置值: %.1f°C\n", tempSet);
// } 