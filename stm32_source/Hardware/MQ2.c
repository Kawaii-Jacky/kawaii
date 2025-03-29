#include "mq2.h"

/**
  * @brief  MQ2初始化程序
  * @param  无
  * @retval 无
  */
void MQ2_Init(void)
{

	RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);	//开启GPIOA的时钟
	
	//PA4 作为模拟通道输入引脚 
	GPIO_InitTypeDef GPIO_InitStructure;
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AIN;
	GPIO_InitStructure.GPIO_Pin = MQ2;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(MQ2_PROT, &GPIO_InitStructure);
}

/**
  * @brief  MQ2 ADC数据读取
  * @param  无
  * @retval 返回转换后的MQ2模拟信号数值
  */
uint32_t MQ2_ADC_Read(void)
{
	//设置指定ADC的规则组通道，采样时间
	return ADC_GetValue(ADC_Channel_4, ADC_SampleTime_55Cycles5);
}

/**
  * @brief  获取MQ2模拟信号平均值
  * @param  无
  * @retval 返回算出的MQ2模拟信号平均值
  */
u16 MQ2_Average_Data(void)
{
	u16 temp_val=0;
	u8 t;
	for(t=0;t<SMOG_READ_TIMES;t++)	//#define SMOG_READ_TIMES	10	定义烟雾传感器读取次数,读这么多次,然后取平均值
 
	{
		temp_val+=MQ2_ADC_Read();	//读取ADC值
		Delay_ms(5);
	}
	temp_val/=SMOG_READ_TIMES;//得到平均值
    return (u16)temp_val;//返回算出的ADC平均值
}

/**
  * @brief  获取MQ2的电压数值
  * @param  无
  * @retval 返回算出的MQ2电压数值
  */
float MQ2_Voltage_Data(void)
{
	u16 adc_value = 0;//这是从MQ-2传感器模块电压输出的ADC转换中获得的原始数字值，该值的范围为0到4095，将模拟电压表示为数字值
	float voltage = 0;//MQ-2传感器模块的电压输出
	
	adc_value = MQ2_Average_Data();
	Delay_ms(5);
	
    voltage  = (3.3f/4096.f)*(adc_value);
	
	return voltage;
}

/*********************
// 传感器校准函数，根据当前环境PPM值与测得的RS电压值，反推出R0值。
// 在空气中运行过后测出R0为35
float MQ2_PPM_Calibration()
{
	float RS = 0;
	float R0 = 0;
	RS = (3.3f - Smog_Get_Vol()) / Smog_Get_Vol() * RL;//RL	10  // RL阻值
	R0 = RS / pow(CAL_PPM / 98.322, 1 / -1.458f);//CAL_PPM  10  // 校准环境中PPM值
	return R0;
}
**********************/

/**
  * @brief  获取MQ2的PPM数值
  * @param  无
  * @retval 返回算出的MQ2 PPM数值
  */
float Smog_GetPPM(void)	//该算法得出的ppm数值会达到上万，由于显示不方便故暂不使用。
{
//	float RS = (3.3f - MQ2_Voltage_Data()) / MQ2_Voltage_Data() * RL;
//	float ppm = 98.322f * pow(RS/R0, -1.458f);
	float ppm = MQ2_Voltage_Data() * 100;
	return  ppm;
}

