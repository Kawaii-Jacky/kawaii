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
    c.broker.address.uri=MPPT_MQTT_URI;c.credentials.client_id=MPPT_MQTT_CLIENT_ID;c.credentials.username=MPPT_MQTT_USERNAME;c.credentials.authentication.password=MPPT_MQTT_PASSWORD;c.session.keepalive=60;c.session.last_will.topic=MPPT_TOPIC_STATUS;c.session.last_will.msg="{\"status\":\"offline\"}";c.session.last_will.qos=MPPT_MQTT_QOS;c.session.last_will.retain=1;c.broker.verification.crt_bundle_attach=esp_crt_bundle_attach;
    mpptMqtt=esp_mqtt_client_init(&c);if(mpptMqtt){esp_mqtt_client_register_event(mpptMqtt,MQTT_EVENT_ANY,[](void*,esp_event_base_t,int32_t,void*d){mpptMqttEvent((esp_mqtt_event_handle_t)d);},nullptr);esp_mqtt_client_start(mpptMqtt);}
#else
    c.uri=MPPT_MQTT_URI;c.client_id=MPPT_MQTT_CLIENT_ID;c.username=MPPT_MQTT_USERNAME;c.password=MPPT_MQTT_PASSWORD;c.keepalive=60;c.lwt_topic=MPPT_TOPIC_STATUS;c.lwt_msg="{\"status\":\"offline\"}";c.lwt_qos=MPPT_MQTT_QOS;c.lwt_retain=1;c.crt_bundle_attach=esp_crt_bundle_attach;c.event_handle=mpptMqttEvent;mpptMqtt=esp_mqtt_client_init(&c);if(mpptMqtt)esp_mqtt_client_start(mpptMqtt);
#endif
  }
}

void mqttLoop(){setupWiFi();}

void Wireless_Telemetry(){
  static unsigned long last=0;if(!mpptMqttConnected||millis()-last<MPPT_MQTT_INTERVAL_MS)return;last=millis();
  char p[768];snprintf(p,sizeof(p),"{\"device\":\"mppt-001\",\"power_input\":%.3f,\"battery_percent\":%d,\"current_input\":%.3f,\"buck_current\":%.3f,\"buck_power\":%.3f,\"voltage_input\":%.3f,\"buck_voltage\":%.3f,\"temperature\":%d,\"pwm\":%d,\"fan\":%d,\"enable_fan\":%d,\"mode\":%d,\"daily_energy\":%.3f,\"total_energy\":%.3f,\"buck_efficiency\":%.2f,\"days_running\":%.3f,\"voltage_battery_min\":%.2f,\"voltage_battery_max\":%.2f,\"current_charging\":%.2f,\"temperature_fan\":%d}",powerInput,batteryPercent,currentInput,buckCurrent,buckPower,voltageInput,buckVoltage,temperature,PWM,fanStatus,enableFan,MPPT_Mode,dailyEnergy,totalEnergy,buckEfficiency,daysRunning,voltageBatteryMin,voltageBatteryMax,currentCharging,temperatureFan);
  mpptPublish(MPPT_TOPIC_TELEMETRY,p);
}

void sendDebugInfoToMqtt(){
  char p[384];snprintf(p,sizeof(p),"{\"type\":\"diagnostics\",\"errors\":%d,\"input_voltage\":%.3f,\"buck_voltage\":%.3f,\"temperature\":%d,\"pwm\":%d,\"voltage_battery_min\":%.2f,\"voltage_battery_max\":%.2f,\"current_charging\":%.2f,\"temperature_fan\":%d}",ERR,voltageInput,buckVoltage,temperature,PWM,voltageBatteryMin,voltageBatteryMax,currentCharging,temperatureFan);mpptPublish(MPPT_TOPIC_REPORTED,p);
}

static bool mpptJsonNumber(const char* json,const char* key,float& value){
  char token[48];snprintf(token,sizeof(token),"\"%s\"",key);const char* p=strstr(json,token);if(!p)return false;
  p=strchr(p+strlen(token),':');if(!p)return false;p++;while(*p==' '||*p=='\t')p++;
  char* end=nullptr;value=strtof(p,&end);return end!=p&&isfinite(value);
}
static bool mpptJsonBool(const char* json,const char* key,bool& value){
  char token[48];snprintf(token,sizeof(token),"\"%s\"",key);const char* p=strstr(json,token);if(!p)return false;
  p=strchr(p+strlen(token),':');if(!p)return false;p++;while(*p==' '||*p=='\t')p++;
  if(strncmp(p,"true",4)==0||*p=='1'){value=true;return true;}if(strncmp(p,"false",5)==0||*p=='0'){value=false;return true;}return false;
}
static bool mpptJsonString(const char* json,const char* key,char* value,size_t size){
  char token[48];snprintf(token,sizeof(token),"\"%s\"",key);const char* p=strstr(json,token);if(!p)return false;
  p=strchr(p+strlen(token),':');if(!p)return false;p++;while(*p==' '||*p=='\t')p++;if(*p!='\"')return false;p++;
  const char* end=strchr(p,'\"');if(!end)return false;size_t n=(size_t)(end-p);if(n>=size)n=size-1;memcpy(value,p,n);value[n]=0;return true;
}
static void mpptPublishAck(const char* command,bool ok,const char* error=nullptr){
  char id[80];if(!mpptJsonString(command,"id",id,sizeof(id)))return;char name[40]="";mpptJsonString(command,"command",name,sizeof(name));
  char p[384];if(ok)snprintf(p,sizeof(p),"{\"schema\":1,\"device\":\"mppt-001\",\"id\":\"%s\",\"command\":\"%s\",\"ok\":true}",id,name);
  else snprintf(p,sizeof(p),"{\"schema\":1,\"device\":\"mppt-001\",\"id\":\"%s\",\"command\":\"%s\",\"ok\":false,\"error\":\"%s\"}",id,name,error?error:"command rejected");
  mpptPublish(MPPT_TOPIC_REPORTED,p);
}
static void mpptReportSetting(const char* key,float value,bool ok,const char* error=nullptr){
  char p[256];if(ok)snprintf(p,sizeof(p),"{\"type\":\"setting\",\"key\":\"%s\",\"value\":%.3f,\"ok\":true}",key,value);
  else snprintf(p,sizeof(p),"{\"type\":\"setting\",\"key\":\"%s\",\"value\":%.3f,\"ok\":false,\"error\":\"%s\"}",key,value,error?error:"invalid value");
  mpptPublish(MPPT_TOPIC_REPORTED,p);
}

void mpptHandleCommand(const char* command){
  bool changed=false,b=false,recognized=false,ok=true;float v=0;const char* error=nullptr;
  if(mpptJsonBool(command,"fan",b)){recognized=true;overrideFan=b;changed=true;mpptReportSetting("fan",overrideFan,true);}
  if(mpptJsonNumber(command,"mode",v)){recognized=true;MPPT_Mode=(v>=0.5f)?1:0;changed=true;mpptReportSetting("mode",MPPT_Mode,true);}
  if(mpptJsonBool(command,"enable_fan",b)){recognized=true;enableFan=b;changed=true;mpptReportSetting("enable_fan",enableFan,true);}
  if(mpptJsonNumber(command,"voltage_battery_min",v)){
    recognized=true;
    if(v>=8.0f&&v<=20.0f&&v<=voltageBatteryMax-0.5f){voltageBatteryMin=v;changed=true;mpptReportSetting("voltage_battery_min",v,true);}
    else {ok=false;error="invalid battery minimum";mpptReportSetting("voltage_battery_min",v,false,"range 8-20V and at least 0.5V below full voltage");}
  }
  if(mpptJsonNumber(command,"voltage_battery_max",v)){
    recognized=true;
    if(v>=12.0f&&v<=48.0f&&v>=voltageBatteryMin+0.5f){voltageBatteryMax=v;recalculateAndSavePWM_MaxDC();changed=true;mpptReportSetting("voltage_battery_max",v,true);}
    else {ok=false;error="invalid battery maximum";mpptReportSetting("voltage_battery_max",v,false,"range 12-48V and at least 0.5V above cutoff voltage");}
  }
  if(mpptJsonNumber(command,"current_charging",v)){
    recognized=true;
    if(v>=0.1f&&v<=20.0f){currentCharging=v;changed=true;mpptReportSetting("current_charging",v,true);}
    else {ok=false;error="invalid charging current";mpptReportSetting("current_charging",v,false,"range 0.1-20A");}
  }
  if(mpptJsonNumber(command,"temperature_fan",v)){
    recognized=true;
    int t=(int)lroundf(v);if(t>=20&&t<=80){temperatureFan=t;changed=true;mpptReportSetting("temperature_fan",temperatureFan,true);}
    else {ok=false;error="invalid fan temperature";mpptReportSetting("temperature_fan",v,false,"range 20-80C");}
  }
  char commandName[40]="";mpptJsonString(command,"command",commandName,sizeof(commandName));
  if(strcmp(commandName,"debug")==0){recognized=true;sendDebugInfoToMqtt();}
  else if(strcmp(commandName,"terminal")==0){recognized=true;sendDebugInfoToMqtt();}
  if(changed)saveSettings();
  if(!recognized){ok=false;error="unsupported command";}
  mpptPublishAck(command,ok,error);
}
