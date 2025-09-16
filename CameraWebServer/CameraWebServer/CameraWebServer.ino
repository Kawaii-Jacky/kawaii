#include "esp_camera.h"
#include <WiFi.h>
#include "camera_config.h"
#include <BlynkSimpleEsp32.h>
#include <esp_sleep.h>
#include <esp_timer.h>

// 全局变量
bool clientConnected = false;
unsigned long lastClientActivity = 0;
esp_timer_handle_t sleepTimer = NULL;

//
// WARNING!!! PSRAM IC required for UXGA resolution and high JPEG quality
//            Ensure ESP32 Wrover Module or other board with PSRAM is selected
//            Partial images will be transmitted if image exceeds buffer size
//
//            You must select partition scheme from the board menu that has at least 3MB APP space.
//            Face Recognition is DISABLED for ESP32 and ESP32-S2, because it takes up from 15
//            seconds to process single frame. Face Detection is ENABLED if PSRAM is enabled as well

// ===================
// Select camera model
// ===================
//#define CAMERA_MODEL_WROVER_KIT // Has PSRAM
//#define CAMERA_MODEL_ESP_EYE  // Has PSRAM
//#define CAMERA_MODEL_ESP32S3_EYE // Has PSRAM
//#define CAMERA_MODEL_M5STACK_PSRAM // Has PSRAM
//#define CAMERA_MODEL_M5STACK_V2_PSRAM // M5Camera version B Has PSRAM
//#define CAMERA_MODEL_M5STACK_WIDE // Has PSRAM
//#define CAMERA_MODEL_M5STACK_ESP32CAM // No PSRAM
//#define CAMERA_MODEL_M5STACK_UNITCAM // No PSRAM
//#define CAMERA_MODEL_M5STACK_CAMS3_UNIT  // Has PSRAM
#define CAMERA_MODEL_AI_THINKER // Has PSRAM - 推荐用于OV5640
//#define CAMERA_MODEL_TTGO_T_JOURNAL // No PSRAM
//#define CAMERA_MODEL_XIAO_ESP32S3 // Has PSRAM
// ** Espressif Internal Boards **
//#define CAMERA_MODEL_ESP32_CAM_BOARD
//#define CAMERA_MODEL_ESP32S2_CAM_BOARD
//#define CAMERA_MODEL_ESP32S3_CAM_LCD
//#define CAMERA_MODEL_DFRobot_FireBeetle2_ESP32S3 // Has PSRAM
//#define CAMERA_MODEL_DFRobot_Romeo_ESP32S3 // Has PSRAM
#include "camera_pins.h"

// ===========================
// WiFi credentials from config
// ===========================
const char *ssid = CAMERA_WIFI_SSID;
const char *password = CAMERA_WIFI_PASS;

// 函数声明
void startCameraServer();
void setupLedFlash(int pin);
void enterDeepSleep();
void updateBlynkStatus();
void onClientConnect();
void onClientDisconnect();

// 深度睡眠定时器回调
void sleepTimerCallback(void* arg) {
  Serial.println("进入深度睡眠模式...");
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "设备进入深度睡眠模式");
  Blynk.virtualWrite(BLYNK_DEVICE_STATUS_VPIN, "睡眠");
  Blynk.disconnect();
  delay(1000);
  esp_deep_sleep_start();
}

// Blynk连接状态回调
BLYNK_CONNECTED() {
  Serial.println("Blynk已连接");
  updateBlynkStatus();
}

// Blynk断开连接回调
BLYNK_DISCONNECTED() {
  Serial.println("Blynk连接断开");
}

void startCameraServer();
void setupLedFlash(int pin);

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  Serial.setDebugOutput(true);
  Serial.println();

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAMESIZE_UXGA;
  config.pixel_format = PIXFORMAT_JPEG;  // for streaming
  //config.pixel_format = PIXFORMAT_RGB565; // for face detection/recognition
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  // if PSRAM IC present, init with UXGA resolution and higher JPEG quality
  //                      for larger pre-allocated frame buffer.
  if (config.pixel_format == PIXFORMAT_JPEG) {
    if (psramFound()) {
      config.jpeg_quality = 10;
      config.fb_count = 2;
      config.grab_mode = CAMERA_GRAB_LATEST;
    } else {
      // Limit the frame size when PSRAM is not available
      config.frame_size = FRAMESIZE_SVGA;
      config.fb_location = CAMERA_FB_IN_DRAM;
    }
  } else {
    // Best option for face detection/recognition
    config.frame_size = FRAMESIZE_240X240;
#if CONFIG_IDF_TARGET_ESP32S3
    config.fb_count = 2;
#endif
  }

#if defined(CAMERA_MODEL_ESP_EYE)
  pinMode(13, INPUT_PULLUP);
  pinMode(14, INPUT_PULLUP);
#endif

  // camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  sensor_t *s = esp_camera_sensor_get();
  
  // 打印摄像头传感器信息
  Serial.printf("Camera sensor PID: 0x%04X\n", s->id.PID);
  Serial.printf("Camera sensor VER: 0x%04X\n", s->id.VER);
  
  // OV5640特殊处理
  if (s->id.PID == OV5640_PID) {
    Serial.println("检测到OV5640摄像头传感器");
    s->set_vflip(s, 1);        // 垂直翻转
    s->set_hmirror(s, 1);      // 水平镜像
    s->set_brightness(s, 1);   // 提高亮度
    s->set_saturation(s, -2);  // 降低饱和度
    s->set_contrast(s, 1);     // 提高对比度
    s->set_whitebal(s, 1);     // 启用自动白平衡
    s->set_awb_gain(s, 1);     // 启用自动白平衡增益
    s->set_wb_mode(s, 0);      // 自动白平衡模式
    s->set_exposure_ctrl(s, 1); // 启用自动曝光
    s->set_aec2(s, 1);         // 启用自动曝光控制
    s->set_gain_ctrl(s, 1);    // 启用自动增益控制
    s->set_agc_gain(s, 0);     // 自动增益
    s->set_gainceiling(s, (gainceiling_t)6); // 增益上限
    s->set_bpc(s, 1);          // 启用坏点校正
    s->set_wpc(s, 1);          // 启用白点校正
    s->set_raw_gma(s, 1);      // 启用伽马校正
    s->set_lenc(s, 1);         // 启用镜头校正
    s->set_quality(s, 10);     // 设置JPEG质量
    s->set_framesize(s, FRAMESIZE_SVGA); // 初始设置为SVGA
  }
  // OV3660特殊处理
  else if (s->id.PID == OV3660_PID) {
    Serial.println("检测到OV3660摄像头传感器");
    s->set_vflip(s, 1);        // flip it back
    s->set_brightness(s, 1);   // up the brightness just a bit
    s->set_saturation(s, -2);  // lower the saturation
  }
  // OV2640特殊处理
  else if (s->id.PID == OV2640_PID) {
    Serial.println("检测到OV2640摄像头传感器");
    s->set_vflip(s, 1);
    s->set_hmirror(s, 1);
  }
  else {
    Serial.printf("未知摄像头传感器: 0x%04X\n", s->id.PID);
  }
  
  // drop down frame size for higher initial frame rate
  if (config.pixel_format == PIXFORMAT_JPEG) {
    s->set_framesize(s, FRAMESIZE_QVGA);
  }

#if defined(CAMERA_MODEL_M5STACK_WIDE) || defined(CAMERA_MODEL_M5STACK_ESP32CAM)
  s->set_vflip(s, 1);
  s->set_hmirror(s, 1);
#endif

#if defined(CAMERA_MODEL_ESP32S3_EYE)
  s->set_vflip(s, 1);
#endif

// Setup LED FLash if LED pin is defined in camera_pins.h
#if defined(LED_GPIO_NUM)
  setupLedFlash(LED_GPIO_NUM);
#endif

  WiFi.begin(ssid, password);
  WiFi.setSleep(false);

  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");

  // 初始化Blynk
  Blynk.config(BLYNK_AUTH_TOKEN, BLYNK_SERVER, BLYNK_PORT);
  Blynk.connect(MY_BLYNK_TIMEOUT);
  
  // 创建深度睡眠定时器
  esp_timer_create_args_t timer_args = {
    .callback = &sleepTimerCallback,
    .name = "sleep_timer"
  };
  esp_timer_create(&timer_args, &sleepTimer);

  startCameraServer();

  Serial.print("Camera Ready! Use 'http://");
  Serial.print(WiFi.localIP());
  Serial.println("' to connect");
  
  // 更新Blynk状态
  updateBlynkStatus();
}

void loop() {
  Blynk.run();
  
  // 检查客户端连接状态
  if (clientConnected) {
    unsigned long currentTime = millis();
    if (currentTime - lastClientActivity > DEEP_SLEEP_TIMEOUT) {
      Serial.println("客户端超时，准备进入深度睡眠...");
      clientConnected = false;
      esp_timer_start_once(sleepTimer, 5000000); // 5秒后进入睡眠
    }
  }
  
  delay(1000);
}

// 更新Blynk状态信息
void updateBlynkStatus() {
  if (Blynk.connected()) {
    // 显示IP地址
    Blynk.virtualWrite(BLYNK_IP_DISPLAY_VPIN, WiFi.localIP().toString());
    
    // 显示WiFi信号强度
    int rssi = WiFi.RSSI();
    Blynk.virtualWrite(BLYNK_WIFI_RSSI_VPIN, rssi);
    
    // 显示设备状态
    String status = clientConnected ? "活跃" : "待机";
    Blynk.virtualWrite(BLYNK_DEVICE_STATUS_VPIN, status);
    
    // 发送状态信息到终端
    String terminalMsg = "设备状态: " + status + " | IP: " + WiFi.localIP().toString() + " | RSSI: " + String(rssi) + "dBm";
    Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, terminalMsg);
  }
}

// 客户端连接回调
void onClientConnect() {
  clientConnected = true;
  lastClientActivity = millis();
  
  // 取消深度睡眠定时器
  if (sleepTimer != NULL) {
    esp_timer_stop(sleepTimer);
  }
  
  Serial.println("客户端已连接");
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "客户端已连接");
  updateBlynkStatus();
}

// 客户端断开连接回调
void onClientDisconnect() {
  clientConnected = false;
  Serial.println("客户端已断开连接");
  Blynk.virtualWrite(BLYNK_TERMINAL_VPIN, "客户端已断开连接");
  
  // 启动深度睡眠定时器
  if (sleepTimer != NULL) {
    esp_timer_start_once(sleepTimer, DEEP_SLEEP_TIMEOUT * 1000);
  }
  
  updateBlynkStatus();
}
