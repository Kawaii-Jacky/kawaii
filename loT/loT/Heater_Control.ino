void initHeater() {
  pinMode(HEATER_PIN_1, OUTPUT);
  pinMode(HEATER_PIN_0, OUTPUT);
  digitalWrite(HEATER_PIN_1, LOW);
  digitalWrite(HEATER_PIN_0, LOW);
  heaterState = false;
}

void setHeaterState(bool state) {
  if (state == heaterState) return;
  digitalWrite(HEATER_PIN_1, state ? HIGH : LOW);
  digitalWrite(HEATER_PIN_0, LOW);
  heaterState = state;
  mqttPublishState("heater", state ? 1 : 0);
}

void updateHeaterControl(float currentTemp, float dhtTemp, float humidity) {
  if (!heaterAutoMode) return;
  bool shouldHeat = humidity > humidityThreshold && currentTemp < (dhtTemp + tempDiffThreshold);
  setHeaterState(shouldHeat);
}
