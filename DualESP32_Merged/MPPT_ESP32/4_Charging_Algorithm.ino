// Closed-loop buck/MPPT controller.  Measurements are filtered and the
// perturbation step is adaptive so noise cannot drive PWM to a rail.
static unsigned long lastControlUpdate = 0;
static bool mpptSampleValid = false;
static float mpptPrevPower = 0.0f;
static float mpptPrevPanelVoltage = 0.0f;
static float mpptFilteredPower = 0.0f;
static float mpptFilteredVoltage = 0.0f;
static float mpptFilteredCurrent = 0.0f;

static void resetMPPT() {
  mpptSampleValid = false;
  mpptPrevPower = mpptPrevPanelVoltage = 0.0f;
  mpptFilteredPower = mpptFilteredVoltage = mpptFilteredCurrent = 0.0f;
}

void buck_Enable(){ buckEnable = 1; digitalWrite(buck_EN,HIGH); digitalWrite(LED,HIGH); }
void buck_Disable(){ buckEnable = 0; digitalWrite(buck_EN,LOW); digitalWrite(LED,LOW); PWM = 0; ledcWrite(pwmChannel,0); resetMPPT(); }

void predictivePWM(){
  if (!isfinite(voltageInput) || !isfinite(buckVoltage) || voltageInput <= 0.1f) { pwmMinLimited=0; return; }
  PWM_MinDC = voltageInput + voltageDropout;
  if (PWM_MinDC <= 0.1f || !isfinite(PWM_MinDC)) { pwmMinLimited=0; return; }
  float predicted = (pwmMinLimited_margin * pwmMax * (buckVoltage + buckminfloatVoltage)) /
                   (100.0f * PWM_MinDC);
  if (!isfinite(predicted)) predicted=0;
  pwmMinLimited=constrain((int)predicted,0,pwmMaxLimited);
}

static void applyPWM(){
  predictivePWM();
  const int floorPwm = (output_Mode==0) ? 0 : pwmMinLimited;
  PWM = constrain(PWM,floorPwm,pwmMaxLimited);
  ledcWrite(pwmChannel,PWM);
  buck_Enable();
}
static bool measurementsValid(){
  return isfinite(powerInput)&&isfinite(voltageInput)&&isfinite(buckVoltage)&&isfinite(currentInput)&&isfinite(buckCurrent)&&
         voltageInput>=0.0f&&voltageInput<=MPPT_MAX_INPUT_VOLTAGE&&buckVoltage>=0.0f&&buckVoltage<=MPPT_MAX_OUTPUT_VOLTAGE;
}
static void stepToward(int delta){
  const int maxStep = (MPPT_MAX_PWM_STEP_PER_UPDATE>0)?MPPT_MAX_PWM_STEP_PER_UPDATE:1;
  delta=constrain(delta,-maxStep,maxStep);
  PWM=constrain(PWM+delta,0,pwmMaxLimited);
}
static void runCCCV(){
  if (buckCurrent>currentCharging+0.05f) stepToward(-MPPT_PWM_STEP);
  else if (buckVoltage>voltageBatteryMax+MPPT_BATTERY_CV_DEADBAND_V) stepToward(-MPPT_PWM_STEP);
  else if (buckVoltage<voltageBatteryMax-MPPT_BATTERY_CV_DEADBAND_V) stepToward(MPPT_PWM_STEP);
}
static void runMPPT(){
  if (buckCurrent>currentCharging+0.05f || buckVoltage>=voltageBatteryMax+MPPT_BATTERY_CV_DEADBAND_V) { stepToward(-MPPT_PWM_STEP); return; }
  // First-order low-pass (alpha=0.25) suppresses INA226 conversion noise.
  if (!mpptSampleValid) {
    mpptFilteredPower=powerInput; mpptFilteredVoltage=voltageInput; mpptFilteredCurrent=currentInput;
    mpptPrevPower=powerInput; mpptPrevPanelVoltage=voltageInput; mpptSampleValid=true; return;
  }
  mpptFilteredPower += 0.25f*(powerInput-mpptFilteredPower);
  mpptFilteredVoltage += 0.25f*(voltageInput-mpptFilteredVoltage);
  mpptFilteredCurrent += 0.25f*(currentInput-mpptFilteredCurrent);
  const float dP=mpptFilteredPower-mpptPrevPower;
  const float dV=mpptFilteredVoltage-mpptPrevPanelVoltage;
  mpptPrevPower=mpptFilteredPower; mpptPrevPanelVoltage=mpptFilteredVoltage;
  // Irradiance/load transients invalidate the previous slope.
  if (fabsf(dP)>fmaxf(2.0f,0.35f*fmaxf(1.0f,mpptFilteredPower))) { resetMPPT(); return; }
  if (fabsf(dP)<MPPT_POWER_DEADBAND_W || fabsf(dV)<MPPT_PANEL_VOLTAGE_DEADBAND_V) return;
  // Large slope => coarse move; near the vertex => one-count trim.
  const int step=(fabsf(dP)>2.0f)?4:1;
  const bool powerImproved=dP>0.0f;
  const bool panelVoltageRose=dV>0.0f;
  const int direction=(powerImproved==panelVoltageRose)?-1:1;
  stepToward(direction*step);
}
void Charging_Algorithm(){
  const unsigned long now=millis();
  if (now-lastControlUpdate<MPPT_CONTROL_INTERVAL_MS) return;
  lastControlUpdate=now;
  if (ERR>0||chargingPause==1||!measurementsValid()) { buck_Disable(); return; }
  if (voltageInput<vInSystemMin+MPPT_MIN_INPUT_MARGIN_V||buckVoltage<vInSystemMin) { buck_Disable(); return; }
  if (REC==1) { REC=0; predictivePWM(); PWM=pwmMinLimited; resetMPPT(); }
  if (MPPT_Mode==0) runCCCV(); else runMPPT();
  applyPWM();
}
