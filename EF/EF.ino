#include "config.h"
#include <WiFi.h>
#include <EEPROM.h>
#include <esp_now.h>
#include <mqtt_client.h>
#include <esp_crt_bundle.h>
#include <esp_arduino_version.h>

typedef struct { int humiThreshold; } EspNowHumiConfig;
static esp_mqtt_client_handle_t mqttClient = nullptr;
static bool mqttConnected = false;
static unsigned long lastWifiAttempt = 0, lastTelemetry = 0;
static bool servoState=false, ledState=false, heaterState=false, autoHeater=true;
static int ledBrightness=50, heaterPower=50, servoAngle=300, currentServoPosition=0, targetServoPosition=0, humiThreshold=70, receivedHumidity=0;
static bool servoMoving=false; static unsigned long lastServoMoveTime=0;

static String esc(const String& s){String v=s;v.replace("\\","\\\\");v.replace("\"","\\\"");v.replace("\n","\\n");return v;}
static String jstr(const String& j,const char*k){String m=String("\"")+k+"\"";int p=j.indexOf(m),c=j.indexOf(':',p+m.length()),a=j.indexOf('"',c+1),b=j.indexOf('"',a+1);return(p<0||c<0||a<0||b<0)?String():j.substring(a+1,b);}
static long jnum(const String&j,const char*k,long d){String m=String("\"")+k+"\"";int p=j.indexOf(m),c=j.indexOf(':',p+m.length());if(p<0||c<0)return d;int e=j.indexOf(',',c+1);if(e<0)e=j.indexOf('}',c+1);String v=j.substring(c+1,e<0?j.length():e);v.trim();return v.toInt();}
static bool jbool(const String&j,const char*k,bool d){String m=String("\"")+k+"\"";int p=j.indexOf(m),c=j.indexOf(':',p+m.length());if(p<0||c<0)return d;String v=j.substring(c+1);v.trim();if(v.startsWith("true")||v.startsWith("1"))return true;if(v.startsWith("false")||v.startsWith("0"))return false;return d;}
static void report(const char*k,const String&v){if(!mqttConnected)return;String p=String("{\"key\":\"")+k+"\",\"value\":\""+esc(v)+"\"}";esp_mqtt_client_publish(mqttClient,MQTT_REPORTED,p.c_str(),p.length(),MQTT_QOS,0);}
static void report(const char*k,int v){if(!mqttConnected)return;String p=String("{\"key\":\"")+k+"\",\"value\":"+v+"}";esp_mqtt_client_publish(mqttClient,MQTT_REPORTED,p.c_str(),p.length(),MQTT_QOS,0);}

void controlLED(int b){ledBrightness=constrain(b,0,100);ledcWrite(8,ledState?map(ledBrightness,0,100,0,255):0);}
void controlHeater(bool s){heaterState=s;ledcWrite(4,s?map(heaterPower,0,100,0,255):0);report("heater",s?1:0);}
void controlServo(bool s){servoState=s;targetServoPosition=s?servoAngle:0;servoMoving=true;lastServoMoveTime=0;}
void updateServoMove(){if(!servoMoving||millis()-lastServoMoveTime<SERVO_STEP_DELAY)return;int d=abs(targetServoPosition-currentServoPosition);if(d<=SERVO_STEP_SIZE){currentServoPosition=targetServoPosition;servoMoving=false;}else currentServoPosition+=(targetServoPosition>currentServoPosition?1:-1)*SERVO_STEP_SIZE;ledcWrite(0,map(currentServoPosition,0,300,8197,1639));lastServoMoveTime=millis();}

static void ack(const String&id,const String&c,bool ok,const String&error=String()){if(!mqttConnected||id.isEmpty())return;String p=String("{\"schema\":1,\"device\":\"ef-001\",\"id\":\"")+esc(id)+"\",\"command\":\""+esc(c)+"\",\"ok\":"+(ok?"true":"false");if(error.length())p+=String(",\"error\":\"")+esc(error)+"\"";p+="}";esp_mqtt_client_publish(mqttClient,MQTT_REPORTED,p.c_str(),p.length(),MQTT_QOS,0);}
static void command(const String&j){String c=jstr(j,"command"),error;bool ok=true;if(c=="servo"){long angle=jnum(j,"angle",servoAngle);if(angle<0||angle>300){ok=false;error="angle out of range";}else{servoAngle=angle;controlServo(jbool(j,"state",false));}}else if(c=="led"){ledState=jbool(j,"state",false);controlLED(jnum(j,"brightness",ledBrightness));}else if(c=="brightness"){ledBrightness=jnum(j,"value",ledBrightness);controlLED(ledBrightness);EEPROM.writeInt(BRIGHTNESS_ADDRESS,ledBrightness);EEPROM.commit();}else if(c=="heater"){autoHeater=false;controlHeater(jbool(j,"state",false));}else if(c=="heater_mode"){autoHeater=jbool(j,"enabled",autoHeater);EEPROM.writeInt(AUTO_HEATER_ADDRESS,autoHeater);EEPROM.commit();}else if(c=="humi_threshold"){humiThreshold=constrain(jnum(j,"value",humiThreshold),0,100);EEPROM.writeInt(HUMI_THRESHOLD_ADDRESS,humiThreshold);EEPROM.commit();}else if(c=="angle"){servoAngle=constrain(jnum(j,"value",servoAngle),0,300);controlServo(servoState);}else if(c=="heater_power"){heaterPower=constrain(jnum(j,"value",heaterPower),0,100);EEPROM.writeInt(HEATER_POWER_ADDRESS,heaterPower);EEPROM.commit();controlHeater(heaterState);}else if(c=="debug"||c=="terminal"){report("humidity",receivedHumidity);report("servo",servoState?1:0);}else{ok=false;error="unsupported command";}if(ok)report("last_command",c);ack(jstr(j,"id"),c,ok,error);}

#if ESP_ARDUINO_VERSION_MAJOR >= 3
static void mqttEvent(void*,esp_event_base_t,int32_t,void*d){auto*e=(esp_mqtt_event_handle_t)d;if(e->event_id==MQTT_EVENT_CONNECTED){mqttConnected=true;esp_mqtt_client_subscribe(e->client,MQTT_COMMAND,MQTT_QOS);esp_mqtt_client_publish(e->client,MQTT_STATUS,"{\"status\":\"online\"}",0,MQTT_QOS,1);}else if(e->event_id==MQTT_EVENT_DISCONNECTED)mqttConnected=false;else if(e->event_id==MQTT_EVENT_DATA){String t(e->topic,e->topic_len);if(t==MQTT_COMMAND)command(String(e->data,e->data_len));}}
static void startMqtt(){if(mqttClient||WiFi.status()!=WL_CONNECTED)return;esp_mqtt_client_config_t c={};c.broker.address.uri=MQTT_URI;c.credentials.client_id=MQTT_CLIENT_ID;c.credentials.username=MQTT_USERNAME;c.credentials.authentication.password=MQTT_PASSWORD;c.session.keepalive=60;c.session.last_will.topic=MQTT_STATUS;c.session.last_will.msg="{\"status\":\"offline\"}";c.session.last_will.qos=MQTT_QOS;c.session.last_will.retain=1;c.broker.verification.crt_bundle_attach=esp_crt_bundle_attach;mqttClient=esp_mqtt_client_init(&c);if(mqttClient){esp_mqtt_client_register_event(mqttClient,MQTT_EVENT_ANY,mqttEvent,nullptr);esp_mqtt_client_start(mqttClient);}}
#else
static esp_err_t mqttEvent(esp_mqtt_event_handle_t e){if(e->event_id==MQTT_EVENT_CONNECTED){mqttConnected=true;esp_mqtt_client_subscribe(e->client,MQTT_COMMAND,MQTT_QOS);esp_mqtt_client_publish(e->client,MQTT_STATUS,"{\"status\":\"online\"}",0,MQTT_QOS,1);}else if(e->event_id==MQTT_EVENT_DISCONNECTED)mqttConnected=false;else if(e->event_id==MQTT_EVENT_DATA){String t(e->topic,e->topic_len);if(t==MQTT_COMMAND)command(String(e->data,e->data_len));}return ESP_OK;}
static void startMqtt(){if(mqttClient||WiFi.status()!=WL_CONNECTED)return;esp_mqtt_client_config_t c={};c.uri=MQTT_URI;c.client_id=MQTT_CLIENT_ID;c.username=MQTT_USERNAME;c.password=MQTT_PASSWORD;c.keepalive=60;c.lwt_topic=MQTT_STATUS;c.lwt_msg="{\"status\":\"offline\"}";c.lwt_qos=MQTT_QOS;c.lwt_retain=1;c.crt_bundle_attach=esp_crt_bundle_attach;c.event_handle=mqttEvent;mqttClient=esp_mqtt_client_init(&c);if(mqttClient)esp_mqtt_client_start(mqttClient);}
#endif
static void net(){if(WiFi.status()!=WL_CONNECTED){if(millis()-lastWifiAttempt<10000)return;lastWifiAttempt=millis();WiFi.mode(WIFI_STA);WiFi.begin(WIFI_SSID,WIFI_PASSWORD);}else startMqtt();}
static void telemetry(){
  if(!mqttConnected||millis()-lastTelemetry<MQTT_INTERVAL_MS)return;
  lastTelemetry=millis();
  String p="{\"device\":\"ef-001\",\"humidity\":"+String(receivedHumidity)
    +",\"servo\":"+String(servoState?"true":"false")+",\"servoMoving\":"+String(servoMoving?"true":"false")
    +",\"led\":"+String(ledState?"true":"false")+",\"heater\":"+String(heaterState?"true":"false")
    +",\"heater_mode\":"+String(autoHeater?"true":"false")+",\"angle\":"+String(currentServoPosition)
    +",\"maxAngle\":"+String(servoAngle)+",\"brightness\":"+String(ledBrightness)
    +",\"humi_threshold\":"+String(humiThreshold)+",\"heater_power\":"+String(heaterPower)+"}";
  esp_mqtt_client_publish(mqttClient,MQTT_TELEMETRY,p.c_str(),p.length(),MQTT_QOS,0);
}

void onEspNowRecv(const uint8_t*,const uint8_t*d,int n){if(n!=sizeof(EspNowHumiConfig))return;memcpy(&receivedHumidity,d,sizeof(receivedHumidity));if(autoHeater)controlHeater(receivedHumidity>humiThreshold);report("humidity",receivedHumidity);}
void initEspNow(){WiFi.mode(WIFI_STA);if(esp_now_init()==ESP_OK)esp_now_register_recv_cb(onEspNowRecv);}
void setup(){Serial.begin(115200);EEPROM.begin(EEPROM_SIZE);servoAngle=EEPROM.readInt(ANGLE_ADDRESS);if(servoAngle<0||servoAngle>300)servoAngle=300;ledBrightness=EEPROM.readInt(BRIGHTNESS_ADDRESS);if(ledBrightness<0||ledBrightness>100)ledBrightness=50;autoHeater=EEPROM.readInt(AUTO_HEATER_ADDRESS)!=0;humiThreshold=EEPROM.readInt(HUMI_THRESHOLD_ADDRESS);if(humiThreshold<0||humiThreshold>100)humiThreshold=70;heaterPower=EEPROM.readInt(HEATER_POWER_ADDRESS);if(heaterPower<0||heaterPower>100)heaterPower=50;pinMode(LED_PIN,OUTPUT);pinMode(SIGNAL_LED_PIN,OUTPUT);ledcSetup(0,50,16);ledcAttachPin(SERVO_PIN,0);ledcSetup(8,5000,8);ledcAttachPin(LED_PIN,8);ledcSetup(4,1000,8);ledcAttachPin(HEATER_PIN,4);controlServo(false);controlLED(ledBrightness);controlHeater(false);initEspNow();net();}
void loop(){net();updateServoMove();telemetry();delay(10);}
