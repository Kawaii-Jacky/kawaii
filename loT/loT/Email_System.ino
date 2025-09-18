
// ==================== 邮件发送函数 ====================

// 发送消息到邮箱
void sendMessageToEmail(String message) {
    // 检查消息长度
    int messageLength = message.length();
    if (messageLength > EMAIL_MAX_LENGTH) {
        Serial.printf("警告：邮件内容超过%d字符限制，当前长度：%d字符\n", EMAIL_MAX_LENGTH, messageLength);
        
        // 截断消息到最大长度
        message = message.substring(0, EMAIL_MAX_LENGTH);
    } else {
        Serial.printf("邮件内容长度检查通过：%d字符\n", messageLength);
    }
    
    // 将邮件添加到队列，确保不会忽略任何邮件请求
    if (addToEmailQueue(message)) {
        
        // 显示详细的发送状态
        if (!isEmailSending) {
            Serial.println("邮件队列已就绪，等待发送...");
        } else {
            Serial.printf("邮件已排队，当前正在发送第%d次，剩余%d次\n", emailSendCount + 1, EMAIL_SEND_TOTAL - emailSendCount);
        }
        
        // 显示队列中的邮件内容（如果队列不为空）
        if (emailQueueCount > 1) {
            Serial.printf("队列中总共有%d封邮件等待发送\n", emailQueueCount);
        }
    } else {
        Serial.printf("队列状态：%d/%d 已满\n", emailQueueCount, EMAIL_QUEUE_SIZE);
    }
}

// 处理邮件发送序列
void processEmailSending() {
    unsigned long currentTime = millis();
    
    // 如果当前没有在发送邮件，从队列中获取新邮件
    if (!isEmailSending && !isEmailQueueEmpty()) {
        currentEmailMessage = removeFromEmailQueue();
        isEmailSending = true;
        emailSendCount = 0;
        lastEmailSendTime = currentTime; // 记录开始时间，立即发送第一封邮件
        Serial.printf("开始发送队列中的邮件，剩余队列长度：%d\n", emailQueueCount);
    }
    
    // 即使正在发送邮件，也要显示队列状态（如果有新邮件），但限制频率
    if (isEmailSending && !isEmailQueueEmpty()) {
        if (currentTime - lastQueueStatusTime >= QUEUE_STATUS_INTERVAL) {
            Serial.printf("正在发送邮件，队列中还有%d封邮件等待发送\n", emailQueueCount);
            lastQueueStatusTime = currentTime;
        }
    }
    
    if (!isEmailSending) {
        return;
    }
    
    // 检查是否到达发送时间间隔
    if (currentTime - lastEmailSendTime >= EMAIL_SEND_INTERVAL) {
        // 构建带数字的邮件主题
        String emailSubject = "远程天文台控制系统通知" + String(emailSendCount + 1);
        
        // 发送邮件
        Blynk.email(EMAIL_ADDRESS, emailSubject, currentEmailMessage);
        emailSendCount++;
        
        Serial.printf("邮件已发送到邮箱 (第%d次): %s\n", emailSendCount, currentEmailMessage.c_str());
        Serial.printf("邮件主题: %s\n", emailSubject.c_str());
        Serial.printf("发送时间: %lu ms\n", currentTime);
        
        // 更新发送时间，确保下次发送有完整间隔
        lastEmailSendTime = currentTime;
        
        // 检查是否完成所有发送
        if (emailSendCount >= EMAIL_SEND_TOTAL) {
            isEmailSending = false;
            Serial.printf("邮件发送完成，共发送%d次\n", EMAIL_SEND_TOTAL);
            
            // 打印队列状态
            printEmailQueueStatus();
            
            // 如果队列中还有邮件，等待一个完整的发送间隔后再开始发送下一封
            if (!isEmailQueueEmpty()) {
                Serial.printf("队列中还有邮件，等待%d秒后发送下一封...\n", EMAIL_SEND_INTERVAL / 1000);
                // 不重置lastEmailSendTime，让下一封邮件等待完整间隔
            }
        } else {
            // 显示下次发送时间
            unsigned long nextSendTime = lastEmailSendTime + EMAIL_SEND_INTERVAL;
            Serial.printf("下次发送时间：%lu ms (第%d次)\n", nextSendTime, emailSendCount + 1);
        }
    }
}

// ==================== 邮件队列操作函数 ====================

// 添加邮件到队列
bool addToEmailQueue(String message) {
    if (isEmailQueueFull()) {
        return false; // 队列已满
    }
    
    emailQueue[emailQueueTail] = message;
    emailQueueTail = (emailQueueTail + 1) % EMAIL_QUEUE_SIZE;
    emailQueueCount++;
    
    if (emailQueueCount >= EMAIL_QUEUE_SIZE) {
        emailQueueFullFlag = true;
    }
    
    return true;
}

// ==================== 辅助函数 ====================
// 检查邮件队列是否为空
bool isEmailQueueEmpty() {
    return emailQueueCount == 0;
}

// 检查邮件队列是否已满
bool isEmailQueueFull() {
    return emailQueueCount >= EMAIL_QUEUE_SIZE;
}

// 从队列中移除邮件
String removeFromEmailQueue() {
    if (isEmailQueueEmpty()) {
        return "";
    }
    String message = emailQueue[emailQueueHead];
    emailQueueHead = (emailQueueHead + 1) % EMAIL_QUEUE_SIZE;
    emailQueueCount--;
    emailQueueFullFlag = false;
    return message;
}

// 打印邮件队列状态
void printEmailQueueStatus() {
    Serial.printf("邮件队列状态: %d/%d\n", emailQueueCount, EMAIL_QUEUE_SIZE);
    if (emailQueueCount > 0) {
        Serial.printf("队列头: %d, 队列尾: %d\n", emailQueueHead, emailQueueTail);
    }
}
