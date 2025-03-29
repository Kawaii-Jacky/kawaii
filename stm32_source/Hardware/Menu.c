#include "menu.h"

u8 Humi,Temp;
u16 pm25,ppm;

void Menu1(void)
{

	//显示“温度：  C”
	OLED_ShowChinese(1,1,0);
	OLED_ShowChinese(1,2,5);
	OLED_ShowChar(1,5,':');
	OLED_ShowChar(1,8,'C');
	
	//显示“湿度:   %”
	OLED_ShowChinese(1,5,1);
	OLED_ShowChinese(1,6,5);
	OLED_ShowChar(1,13,':');	
	OLED_ShowChar(1,16,'%');
	
	//显示“烟雾：”
	OLED_ShowChinese(2,1,2);
	OLED_ShowChinese(2,2,3);
	OLED_ShowChar(2,5,':');
	OLED_ShowString(2,12,"ppm");

	//显示“PM2.5：”
	OLED_ShowString(3,1,"PM2.5:");
	OLED_ShowString(3,12,"ug/m3");
	
	//显示“模式：”
	OLED_ShowChinese(4,1,6);
	OLED_ShowChinese(4,2,7);
	OLED_ShowChar(4,5,':');
	
	//显示 DHT11温湿度数据
	DHT11_Read_Data(&Humi,&Temp);
	OLED_ShowNum(1,6,Temp,2);
	OLED_ShowNum(1,14,Humi,2);
	
	//显示 烟雾PPM数据
	ppm = Smog_GetPPM();
	OLED_ShowNum(2,8,ppm,3);
	
	//显示 PM2.5数据
	pm25 = Get_PM25_Average_Data();
	OLED_ShowNum(3,8,pm25,3);
	
	if(Model_Flag == 0)
	{
		//显示 “手动模式”
		OLED_ShowChinese(4,4,10);
	    OLED_ShowChinese(4,5,11);
		OLED_ShowChinese(4,6,6);
		OLED_ShowChinese(4,7,7);
	}
	else
	{
		//显示 “自动模式”
		OLED_ShowChinese(4,4,8);
	    OLED_ShowChinese(4,5,9);
		OLED_ShowChinese(4,6,6);
		OLED_ShowChinese(4,7,7);
	}
		
}



void Menu2(void)
{

	//温度阈值
	OLED_ShowChinese(1,2,0);
	OLED_ShowChinese(1,3,5);
	OLED_ShowChinese(1,4,14);
	OLED_ShowChinese(1,5,15);	
	OLED_ShowChar(1,11,':');
	
	//湿度阈值
	OLED_ShowChinese(2,2,1);
	OLED_ShowChinese(2,3,5);
	OLED_ShowChinese(2,4,14);
	OLED_ShowChinese(2,5,15);
	OLED_ShowChar(2,11,':');

	//烟雾阈值
	OLED_ShowChinese(3,2,2);
	OLED_ShowChinese(3,3,3);
	OLED_ShowChinese(3,4,14);
	OLED_ShowChinese(3,5,15);
	OLED_ShowChar(3,11,':');

	//PM2.5阈值
	OLED_ShowString(4,3,"PM25");
	OLED_ShowChinese(4,4,14);
	OLED_ShowChinese(4,5,15);
	OLED_ShowChar(4,11,':');
}

void OLED_Option(u8 num)
{
	switch(num)
	{
		case 1:	
			OLED_ShowChar(2,1,' ');
			OLED_ShowChar(3,1,' ');
			OLED_ShowChar(4,1,' ');
			OLED_ShowChar(1,1,'>');
			break;
		case 2:	
			OLED_ShowChar(1,1,' ');
			OLED_ShowChar(3,1,' ');
			OLED_ShowChar(4,1,' ');
			OLED_ShowChar(2,1,'>');
			break;
		case 3:	
			OLED_ShowChar(1,1,' ');
			OLED_ShowChar(2,1,' ');
			OLED_ShowChar(4,1,' ');
			OLED_ShowChar(3,1,'>');
			break;
		case 4:	
			OLED_ShowChar(1,1,' ');
			OLED_ShowChar(2,1,' ');
			OLED_ShowChar(3,1,' ');
			OLED_ShowChar(4,1,'>');
			break;
		default: break;
	}
}
