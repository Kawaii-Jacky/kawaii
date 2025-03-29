#include "tim2.h"                  // Device header

u8 Window_Flag_lock = 0;
u8 Buzzer_Flag_lock = 0;

void Timer2_Init(u16 Prescaler, u16 Period)	//0-65535
{
	RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM2, ENABLE);
	
	TIM_TimeBaseInitTypeDef TIM_TimeBaseInitStructure;
	TIM_TimeBaseInitStructure.TIM_ClockDivision = TIM_CKD_DIV1;
	TIM_TimeBaseInitStructure.TIM_CounterMode = TIM_CounterMode_Up;
	TIM_TimeBaseInitStructure.TIM_Period = Period;
	TIM_TimeBaseInitStructure.TIM_Prescaler = Prescaler;
	TIM_TimeBaseInitStructure.TIM_RepetitionCounter = 0;
	
	TIM_TimeBaseInit(TIM2, &TIM_TimeBaseInitStructure);
	
	TIM_ITConfig(TIM2, TIM_IT_Update, ENABLE);
	
	
	NVIC_InitTypeDef NVIC_InitStructure;
	NVIC_InitStructure.NVIC_IRQChannel = TIM2_IRQn;
	NVIC_InitStructure.NVIC_IRQChannelCmd = ENABLE;
	NVIC_InitStructure.NVIC_IRQChannelPreemptionPriority = 1;
	NVIC_InitStructure.NVIC_IRQChannelSubPriority = 2;
	NVIC_Init(&NVIC_InitStructure);
	
	TIM_Cmd(TIM2, ENABLE);
}

void TIM2_IRQHandler(void)	//2ms定时中断
{
	if (TIM_GetITStatus(TIM2, TIM_IT_Update) != RESET ) 
	{
		Key_scan();	//按键扫描函数

		//判断按键1是否被触发
		if(KeyNum == 1 && Menu == 1)
		{
			KeyNum = 0;
			Menu = 2;
		}
		
		//系统进入自动模式时运行
		if(Model_Flag)
		{
			//判断当前温度和烟雾是否大于阈值
			if((Temp_value < Temp) || (Smog_value < ppm))	
			{
				Relay_ON(1);	//开启风扇		
			}
			else
			{
				Relay_OFF(1);	//关闭风扇	
			}

			//判断当前湿度是否低于阈值
			if(Humi_value > Humi)	
			{
				Relay_ON(2);	//开启加湿器		
			}
			else
			{
				Relay_OFF(2);	//关闭加湿器	
			}

			//判断当前PM2.5是否高于阈值
			if((PM25_value < pm25) && (Window_Flag_lock == 0))	
			{
				Window_Flag_ON = 1;	//打开窗户
				Window_Flag_lock = 1;
			}
			else if((PM25_value > pm25) && (Window_Flag_lock == 1))
			{
				Window_Flag_OFF = 1;	//打开窗户
				Window_Flag_lock = 0;				
			}
			
			//蜂鸣器总开关
			if((Temp_value < Temp) || (Humi_value > Humi) || (Smog_value < ppm) || (PM25_value < pm25))
			{
				Buzzer_ON();
			}
			else
			{
				Buzzer_OFF();	
			}
		}
		
		//机智云配网按键，可以重新进行配网。	
		if((KeyNum == 44) && (Menu == 1)) 
		{
			KeyNum = 0;
			gizwitsSetMode(2);
			Buzzer_ON();
			Delay_ms(300);
			Buzzer_OFF();

		}

		TIM_ClearITPendingBit(TIM2, TIM_IT_Update);		
	}
}

