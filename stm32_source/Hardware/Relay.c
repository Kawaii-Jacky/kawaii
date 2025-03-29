#include "relay.h"


void Relay_Init(void)
{
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB, ENABLE);
	
	GPIO_InitTypeDef GPIO_InitStructure;
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;
	GPIO_InitStructure.GPIO_Pin = Relay1 | Relay2;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(Relay_PROT, &GPIO_InitStructure);
	
}

void Relay_ON(u8 num)
{
	if(num == 1)
	{
		GPIO_SetBits(GPIOB, Relay1);		
	}
	else if(num == 2)
	{
		GPIO_SetBits(GPIOB, Relay2);		
	}
}

void Relay_OFF(u8 num)
{
	
	if(num == 1)
	{
		GPIO_ResetBits(GPIOB, Relay1);		
	}
	else if(num == 2)
	{
		GPIO_ResetBits(GPIOB, Relay2);		
	}	
}


