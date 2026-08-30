// Periodic MQTT telemetry and serial diagnostics.
bool shouldReportData() {
  unsigned long now = millis();
  if (now - lastReportTime >= reportInterval) { lastReportTime = now; return true; }
  return false;
}

void sendDataToMQTT() { if (shouldReportData()) publishTelemetry(); }

void printDataToSerial() {
  Serial.printf("UTC=%.1fC INA226=%.2fV %.2fA %.2fW DHT=%.1fC %.1f%% rain=%s heater=%s fan=%s mosfet=%s camera=%s\n",
    utcTemperature, outputVoltage, outputCurrent, powerOutput, dhtTemperature, dhtHumidity,
    rainDetected ? "yes" : "no", heaterState ? "on" : "off", fanState ? "on" : "off",
    mosfetState ? "on" : "off", cameraPowerState ? "on" : "off");
}

void sendAllDebugInfo() {
  String info = "report=" + String(reportInterval / 1000) + "s;heater_auto=" + String(heaterAutoMode ? "1" : "0");
  info += ";humidity_threshold=" + String(humidityThreshold) + ";temp_diff=" + String(tempDiffThreshold);
  info += ";fan_auto=" + String(fanAutoMode ? "1" : "0") + ";fan_threshold=" + String(fanTempThreshold);
  info += ";rain=" + String(rainDetected ? "1" : "0") + ";dht=" + String(dhtTemperature, 1) + "/" + String(dhtHumidity, 1);
  Serial.println(info);
  mqttPublishState("debug", info);
}

void ReadDataFromSensors() {
  unsigned long now = millis();
  if (now - lastDHT11ReadTime >= READ_DHT11_INTERVAL) { readDHT11Data(); lastDHT11ReadTime = now; }
  if (now - lastReadTime >= SENSORS_READ_INTERVAL) {
    readRainSensor(); readOutputVoltageCurrent(); readUTCTemperature(); lastReadTime = now;
  }
}
