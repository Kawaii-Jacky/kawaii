#ifndef	__ADCX_H
#define __ADCX_H

#include "stm32f10x.h"                  // Device header

void ADCX_Init(void);
u16 ADC_GetValue(uint8_t ADC_Channel,uint8_t ADC_SampleTime);
	
#endif
