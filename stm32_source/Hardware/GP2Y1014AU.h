#ifndef __GP2Y1014AU_
#define	__GP2Y1014AU_

#include "stm32f10x.h"                  // Device header
#include "delay.h"
#include "adcx.h"

#define GP2Y_LED		GPIO_Pin_0
#define GP2Y_VO			GPIO_Pin_1

#define GP2Y_LED_PROT	GPIOA
#define GP2Y_VO_PROT	GPIOA

#define GP2Y_LED_High	GPIO_SetBits(GP2Y_LED_PROT,GP2Y_LED);
#define GP2Y_LED_Low	GPIO_ResetBits(GP2Y_LED_PROT,GP2Y_LED);

#define PM25_READ_TIMES 14


void GP2Y_Init(void);
u16 Get_GP2Y_PM25(void);
u16 Get_PM25_MedianAverage_Data(void);
u16 Get_PM25_Average_Data(void);

#endif

