#include "gp2y1014au.h"

/**
  * @brief  GP2Y初始化程序
  * @param  无
  * @retval 无
  */
void GP2Y_Init(void)
{
	//开启GPIOA时钟
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);	
	
	//PA0 作为脉冲输出引脚
	GPIO_InitTypeDef GPIO_InitStructure;
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;
	GPIO_InitStructure.GPIO_Pin = GP2Y_LED;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GP2Y_LED_PROT, &GPIO_InitStructure);
	GP2Y_LED_High;
	
	//PA1作为模拟通道输入引脚 
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AIN;	
	GPIO_InitStructure.GPIO_Pin = GP2Y_VO;
	GPIO_Init(GP2Y_VO_PROT, &GPIO_InitStructure);
}

/**
  * @brief  GP2Y ADC数据读取
  * @param  无
  * @retval 返回转换后的GP2Y模拟信号数值
  */
uint32_t GP2Y_ADC_Read(void)
{
	//设置指定ADC的规则组通道，采样时间
	return ADC_GetValue(ADC_Channel_1, ADC_SampleTime_239Cycles5);
}

/**
  * @brief  GP2Y ug/m3数据读取
  * @param  无
  * @retval 返回转换后的ug/m3数据
  */
u16 Get_GP2Y_PM25(void)
{
	uint16_t ADCVal;
	int dustVal = 0;
	float Voltage;

	GP2Y_LED_High;	//置1  开启内部LED
	Delay_us(280); 	// 开启LED后的280us的等待时间
	ADCVal = GP2Y_ADC_Read();  //PA1 采样，读取AD值
	Delay_us(19);			  //延时19us，因为这里AD采样的周期为239.5，所以AD转换一次需耗时21us，19加21再加280刚好是320us
	GP2Y_LED_Low;	//置0  关闭内部LED
	Delay_us(9680);			//需要脉宽比0.32ms/10ms的PWM信号驱动传感器中的LED
	
	Voltage = 3.3f * ADCVal / 4096.f * 2; //获得AO输出口的电压值
	
	dustVal = (0.17*Voltage-0.1)*1000;  //乘以1000单位换成ug/m3//
//	dustVal = 170*(Voltage/100)-0.1;

	if (dustVal < 0)
		dustVal = 0;            //限位//

	if (dustVal>500)        
		dustVal=500;

	return dustVal;
}


/**
  * @brief  平均值滤波法
  * @param  无
  * @retval 返回滤波后的数据
  */
u16 Get_PM25_Average_Data(void)
{
	u16 temp_val=0;
	u8 t;
	for(t=0;t<PM25_READ_TIMES;t++)	//#define PM25_READ_TIMES	20	定义读取次数,读这么多次,然后取平均值
 
	{
		temp_val+=Get_GP2Y_PM25();	//读取ADC值
		Delay_ms(5);
	}
	temp_val/=PM25_READ_TIMES;//得到平均值
    return (u16)temp_val;//返回算出的ADC平均值
}
