#include "stm32f10x.h"                  // Device header
#include "gizwits_product.h"
#include "oled.h"
#include "menu.h"
#include "dht11.h"
#include "motor.h"
#include "key.h"
#include "buzzer.h"
#include "flash.h"
#include "usart.h"
#include "sys.h"
#include "relay.h"
#include "tim3.h"
#include "tim2.h"
#include "iwdg.h"
#include "mq2.h"
#include "gp2y1014au.h"

#define FLASH_START_ADDR	0x0801f000	//写入的起始地址

u8 Menu = 1;	//菜单变量

u8 Model_Flag;	//系统模式标志位
u8 Window_Flag_ON = 0;	//开窗标志位
u8 Window_Flag_OFF = 0;	//关窗标志位

u8 Temp_value,Humi_value;	//温度阈值和湿度阈值
u16 Smog_value,PM25_value;	//烟雾阈值和PM2.5阈值
u8 old_Temp_value,old_Humi_value;	//旧的烟雾阈值和PM2.5阈值
u16 old_Smog_value,old_PM25_value;	//旧的烟雾阈值和PM2.5阈值

u8 value_Option_Num = 1;	//阈值调节界面位置选择变量


int main(void)
{
	NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
	OLED_Init();
	ADCX_Init();
	GP2Y_Init();
	MQ2_Init();
	DHT11_UserConfig();
	MOTOR_UserConfig();
	Key_Init();
	Relay_Init();
	Buzzer_Init();
	
	Temp_value = FLASH_R(FLASH_START_ADDR);	//从指定页的地址读FLASH
	Humi_value = FLASH_R(FLASH_START_ADDR+2);	//从指定页的地址读FLASH
	Smog_value = FLASH_R(FLASH_START_ADDR+4);	//从指定页的地址读FLASH
	PM25_value = FLASH_R(FLASH_START_ADDR+6);	//从指定页的地址读FLASH
	
	Timer2_Init(9,14398);
	uart2_init(9600);
	uart1_init(115200);
	
	GENERAL_TIM_Init();
	userInit();		//完成机智云初始赋值
	gizwitsInit();	//开辟一个环形缓冲区
	
	IWDG_Init();	//初始化看门狗
	
	while (1)
	{
		IWDG_ReloadCounter(); //重新加载计数值 喂狗

		switch(Menu)
		{
			case 1:	
				Menu1();
			
				if(Window_Flag_ON == 1)
				{
					MOTOR_Direction_Angle(1,0,180,1);
					MOTOR_STOP();
					Window_Flag_ON = 0;
				}
				if(Window_Flag_OFF == 1)
				{
					MOTOR_Direction_Angle(0,0,180,1);
					MOTOR_STOP();
					Window_Flag_OFF = 0;
				}
				break;
			case 2: 
					OLED_Clear();
					Menu2();
					Menu = 3;
			
					//用于判断阈值数据有没有被更改
					old_Temp_value = Temp_value;
					old_Humi_value = Humi_value;
					old_Smog_value = Smog_value;
					old_PM25_value = PM25_value;
					break;
			case 3: 
				//显示传感器阈值
				OLED_ShowNum(1,13,Temp_value,2);
				OLED_ShowNum(2,13,Humi_value,2);
				OLED_ShowNum(3,13,Smog_value,4);
				OLED_ShowNum(4,13,PM25_value,4);

				//进行阈值选择
				if(KeyNum == 1)
				{
					KeyNum = 0;
					value_Option_Num++;
					if(value_Option_Num > 4)
					{
						value_Option_Num = 1;
					}
				}
				//显示选择标识符“>”
				OLED_Option(value_Option_Num);
				
				//检测阈值数值的调节
				switch(value_Option_Num)
				{
					case 1: 
						if(KeyNum == 3)
						{
							KeyNum = 0;
							Temp_value++;
							if(Temp_value >= 100)
							{
								Temp_value = 1;
							}
						}
						if(KeyNum == 4)
						{
							KeyNum = 0;
							Temp_value--;
							if(Temp_value >= 100)
							{
								Temp_value = 99;
							}
						}
						break;
					case 2: 
						if(KeyNum == 3)
						{
							KeyNum = 0;
							Humi_value++;
							if(Humi_value >= 100)
							{
								Humi_value = 1;
							}
						}
						if(KeyNum == 4)
						{
							KeyNum = 0;
							Humi_value--;
							if(Humi_value >= 100)
							{
								Humi_value = 99;
							}
						}
						break;
					case 3: 
						if(KeyNum == 3)
						{
							KeyNum = 0;
							Smog_value++;
							if(Smog_value >= 331)
							{
								Smog_value = 1;
							}
						}
						if(KeyNum == 4)
						{
							KeyNum = 0;
							Smog_value--;
							if(Smog_value >= 331)
							{
								Smog_value = 330;
							}
						}
						break;
					case 4: 
						if(KeyNum == 3)
						{
							KeyNum = 0;
							PM25_value++;
							if(PM25_value >= 501)
							{
								PM25_value = 1;
							}
						}
						if(KeyNum == 4)
						{
							KeyNum = 0;
							PM25_value--;
							if(PM25_value >= 501)
							{
								PM25_value = 500;
							}									
						}
						break;
				}
				
				//退出阈值设置界面
				if(KeyNum == 2)
				{
					KeyNum = 0;
					
					//当阈值数据被更改后，才会写入FLASH中
					if((old_Temp_value != Temp_value) || (old_Humi_value != Humi_value) || (old_Smog_value != Smog_value) || (old_PM25_value != PM25_value))
					{
						//写入传感器阈值数据
						FLASH_W(FLASH_START_ADDR,Temp_value,Humi_value,Smog_value,PM25_value);				
					}
					
					Menu = 1;	//回到主菜单
					OLED_Clear();	//清屏
				}
				break;			
		}
	
		userHandle();	//更新机智云数据点变量存储的值
		gizwitsHandle((dataPoint_t *)&currentDataPoint);	//数据上传至机智云					
	}


}

 
