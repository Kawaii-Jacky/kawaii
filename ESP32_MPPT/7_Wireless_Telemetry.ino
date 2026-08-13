esp_mqtt_client_handle_t mpptMqtt = nullptr;
volatile bool mpptMqttConnected = false;
static unsigned long mpptLastWifiAttempt = 0;

static esp_err_t mpptMqttEvent(esp_mqtt_event_handle_t e){
  if(e->event_id==MQTT_EVENT_CONNECTED){mpptMqttConnected=true;WIFI=1;esp_mqtt_client_subscribe(e->client,MPPT_TOPIC_COMMAND,MPPT_MQTT_QOS);esp_mqtt_client_publish(e->client,MPPT_TOPIC_STATUS,"{\"status\":\"online\"}",0,MPPT_MQTT_QOS,1);}
  else if(e->event_id==MQTT_EVENT_DISCONNECTED){mpptMqttConnected=false;WIFI=0;}
  else if(e->event_id==MQTT_EVENT_DATA){ if(e->topic_len==(int)strlen(MPPT_TOPIC_COMMAND) && strncmp(e->topic,MPPT_TOPIC_COMMAND,e->topic_len)==0){ char command[256]; int n=e->data_len<(int)sizeof(command)-1?e->data_len:(int)sizeof(command)-1; memcpy(command,e->data,n); command[n]=0; mpptHandleCommand(command); }}
  return ESP_OK;
}

static void mpptPublish(const char* topic,const char* payload){if(mpptMqttConnected)esp_mqtt_client_publish(mpptMqtt,topic,payload,0,MPPT_MQTT_QOS,0);}

void setupWiFi(){
  if(!enableWiFi){WIFI=0;return;}
  if(WiFi.status()!=WL_CONNECTED && millis()-mpptLastWifiAttempt>=MPPT_WIFI_RETRY_MS){mpptLastWifiAttempt=millis();WiFi.mode(WIFI_STA);WiFi.begin(MPPT_WIFI_SSID,MPPT_WIFI_PASSWORD);}
  if(WiFi.status()==WL_CONNECTED && mpptMqtt==nullptr){
    esp_mqtt_client_config_t c={};
#if ESP_ARDUINO_VERSION_MAJOR >= 3
    c.broker.address.uri=MPPT_MQTT_URI;c.credentials.client_id=MPPT_MQTT_CLIENT_ID;c.credentials.username=MPPT_MQTT_USERNAME;c.credentials.authentication.password=MPPT_MQTT_PASSWORD;c.session.keepalive=60;c.broker.verification.crt_bundle_attach=esp_crt_bundle_attach;
    mpptMqtt=esp_mqtt_client_init(&c);if(mpptMqtt){esp_mqtt_client_register_event(mpptMqtt,MQTT_EVENT_ANY,[](void*,esp_event_base_t,int32_t,void*d){mpptMqttEvent((esp_mqtt_event_handle_t)d);},nullptr);esp_mqtt_client_start(mpptMqtt);}
#else
    c.uri=MPPT_MQTT_URI;c.client_id=MPPT_MQTT_CLIENT_ID;c.username=MPPT_MQTT_USERNAME;c.password=MPPT_MQTT_PASSWORD;c.keepalive=60;c.crt_bundle_attach=esp_crt_bundle_attach;c.event_handle=mpptMqttEvent;mpptMqtt=esp_mqtt_client_init(&c);if(mpptMqtt)esp_mqtt_client_start(mpptMqtt);
#endif
  }
}

void mqttLoop(){setupWiFi();}

void Wireless_Telemetry(){
  static unsigned long last=0;if(!mpptMqttConnected||millis()-last<MPPT_MQTT_INTERVAL_MS)return;last=millis();
  char p[768];snprintf(p,sizeof(p),"{\"device\":\"mppt-001\",\"power_input\":%.3f,\"battery_percent\":%d,\"current_input\":%.3f,\"buck_current\":%.3f,\"buck_power\":%.3f,\"voltage_input\":%.3f,\"buck_voltage\":%.3f,\"temperature\":%d,\"pwm\":%d,\"fan\":%d,\"mode\":%d,\"daily_energy\":%.3f,\"total_energy\":%.3f}",powerInput,batteryPercent,currentInput,buckCurrent,buckPower,voltageInput,buckVoltage,temperature,PWM,fanStatus,MPPT_Mode,dailyEnergy,totalEnergy);
  mpptPublish(MPPT_TOPIC_TELEMETRY,p);
}

void sendDebugInfoToMqtt(){
  char p[256];snprintf(p,sizeof(p),"{\"errors\":%d,\"input_voltage\":%.3f,\"buck_voltage\":%.3f,\"temperature\":%d,\"pwm\":%d}",ERR,voltageInput,buckVoltage,temperature,PWM);mpptPublish(MPPT_TOPIC_REPORTED,p);
}

void mpptHandleCommand(const char* command){
  if(strstr(command,"\"fan\"")) overrideFan=(strstr(command,"true")!=nullptr||strstr(command,":1")!=nullptr);
  if(strstr(command,"\"mode\"")) MPPT_Mode=(strstr(command,":1")!=nullptr);
  if(strstr(command,"\"enable_fan\"")) enableFan=(strstr(command,"true")!=nullptr||strstr(command,":1")!=nullptr);
  if(strstr(command,"\"debug\"")) sendDebugInfoToMqtt();
  saveSettings();
}
