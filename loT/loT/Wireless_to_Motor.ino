
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



// 电机控制按钮0：正转自锁

// 电机控制按钮1：反转自锁


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
