#ifndef __MQ2_H
#define __MQ2_H

#include "stm32f10x.h"                  // Device header
#include "adcx.h"
#include "delay.h"
#include "math.h"

#define MQ2		  GPIO_Pin_4
#define MQ2_PROT  GPIOA

#define CAL_PPM  10  // 校准环境中PPM值
#define RL	     10  // RL阻值
#define R0	     35  // R0阻值

#define SMOG_READ_TIMES	10	//定义烟雾传感器读取次数,读这么多次,然后取平均值

void MQ2_Init(void);
u16 MQ2_Average_Data(void);
float MQ2_Voltage_Data(void);
float Smog_GetPPM(void);

#endif
