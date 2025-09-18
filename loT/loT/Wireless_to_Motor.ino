
// 电机控制初始化函数
void initMotorControl() {
    pinMode(MOTOR_FORWARD_PIN, OUTPUT);
    pinMode(MOTOR_REVERSE_PIN, OUTPUT);
    digitalWrite(MOTOR_FORWARD_PIN, LOW);
    digitalWrite(MOTOR_REVERSE_PIN, LOW);
    Serial.println("电机控制模块初始化完成");
}

// 电机正转(关顶)
void motorForward() {
    digitalWrite(MOTOR_FORWARD_PIN, HIGH);
    digitalWrite(MOTOR_REVERSE_PIN, LOW);
    motorForwardState = true;
    motorReverseState = false;
}

// 电机反转(开顶)
void motorReverse() {
    digitalWrite(MOTOR_FORWARD_PIN, LOW);
    digitalWrite(MOTOR_REVERSE_PIN, HIGH);
    motorForwardState = false;
    motorReverseState = true;
    }


// ==================== Blynk回调函数 ====================

// 电机控制按钮0：正转自锁
BLYNK_WRITE(MOTOR_BUTTON0_VPIN) {
    if (param.asInt() == 1) {
        // 开启正转自锁
        motorForward();
        Blynk.virtualWrite(TERMINAL_VPIN, "电机正转");
    } else {
        // 关闭正转自锁
        digitalWrite(MOTOR_FORWARD_PIN, LOW);
        digitalWrite(MOTOR_REVERSE_PIN, LOW);
        motorForwardState = false;
        motorReverseState = false;
     
    }
}

// 电机控制按钮1：反转自锁
BLYNK_WRITE(MOTOR_BUTTON1_VPIN) {
    if (param.asInt() == 1) {
        // 开启反转自锁
        motorReverse();
        Blynk.virtualWrite(TERMINAL_VPIN, "电机反转");
    } else {
        // 关闭反转自锁
        digitalWrite(MOTOR_FORWARD_PIN, LOW);
        digitalWrite(MOTOR_REVERSE_PIN, LOW);
        motorForwardState = false;
        motorReverseState = false;

    }
}


// ==================== 状态查询函数 ====================

// 获取电机正转状态
bool isMotorForward() {
    return motorForwardState;
}

// 获取电机反转状态
bool isMotorReverse() {
    return motorReverseState;
}

// 获取电机运行状态
bool isMotorRunning() {
    return motorForwardState || motorReverseState;
}
