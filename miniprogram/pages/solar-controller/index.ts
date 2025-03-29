interface SolarData {
  inputVoltage: number;
  inputPower: number;
  isDaytime: boolean;
  batteryLevel: number;
  batteryVoltage: number;
  outputVoltage: number;
  outputCurrent: number;
  outputPower: number;
  totalGeneration: number;
  totalConsumption: number;
}

Page({
  data: {
    solarData: {
      inputVoltage: 0,
      inputPower: 0,
      isDaytime: false,
      batteryLevel: 0,
      batteryVoltage: 0,
      outputVoltage: 0,
      outputCurrent: 0,
      outputPower: 0,
      totalGeneration: 0,
      totalConsumption: 0
    } as SolarData,
    outputEnabled: false,
    timerEnabled: false,
    timerStart: '',
    timerEnd: ''
  },

  onLoad() {
    this.initData();
  },

  initData() {
    // 初始化太阳能数据
    this.setData({
      solarData: {
        inputVoltage: 24.5,
        inputPower: 150,
        isDaytime: true,
        batteryLevel: 85,
        batteryVoltage: 12.6,
        outputVoltage: 220,
        outputCurrent: 0.5,
        outputPower: 110,
        totalGeneration: 2500,
        totalConsumption: 1800
      }
    });
  },

  // 切换输出状态
  toggleOutput() {
    this.setData({
      outputEnabled: !this.data.outputEnabled
    });
  },

  // 设置定时器
  setTimer(e: any) {
    const { start, end } = e.detail;
    this.setData({
      timerEnabled: true,
      timerStart: start,
      timerEnd: end
    });
  },

  // 更新太阳能数据
  updateSolarData(e: any) {
    const newData = e.detail;
    this.setData({
      solarData: {
        ...this.data.solarData,
        ...newData
      }
    });
  }
}); 