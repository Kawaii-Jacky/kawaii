interface Light {
  id: number;
  name: string;
  status: boolean;
  brightness: number;
}

interface Motor {
  id: number;
  name: string;
  status: boolean;
  position: number;
}

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

interface NetworkStatus {
  isConnected: boolean;
  signalStrength: number;
  networkType: string;
  ipAddress: string;
  dataUsage: {
    total: number;
    used: number;
    remaining: number;
  };
  lastUpdate: string;
}

Page({
  data: {
    lights: [] as Light[],
    motors: [] as Motor[],
    temperature: 0,
    humidity: 0,
    powerInput: 0,
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
    networkStatus: {
      isConnected: false,
      signalStrength: 0,
      networkType: '',
      ipAddress: '',
      dataUsage: {
        total: 0,
        used: 0,
        remaining: 0
      },
      lastUpdate: ''
    } as NetworkStatus
  },

  onLoad() {
    this.initData();
  },

  initData() {
    // 初始化设备数据
    this.setData({
      lights: [
        { id: 1, name: '客厅灯', status: false, brightness: 100 },
        { id: 2, name: '卧室灯', status: false, brightness: 100 }
      ],
      motors: [
        { id: 1, name: '窗帘电机', status: false, position: 0 }
      ],
      temperature: 25,
      humidity: 60,
      powerInput: 220,
      solarData: {
        inputVoltage: 24.5,
        inputPower: 150,
        isDaytime: true,
        batteryLevel: 85,
        batteryVoltage: 12.6,
        outputVoltage: 220,
        outputCurrent: 0.5,
        outputPower: 150,
        totalGeneration: 2500,
        totalConsumption: 1800
      },
      networkStatus: {
        isConnected: true,
        signalStrength: 85,
        networkType: '4G',
        ipAddress: '192.168.1.100',
        dataUsage: {
          total: 10240,
          used: 5120,
          remaining: 5120
        },
        lastUpdate: new Date().toLocaleString()
      }
    });
  },

  // 控制灯光
  toggleLight(e: any) {
    const { id } = e.currentTarget.dataset;
    const lights = this.data.lights.map(light => {
      if (light.id === id) {
        return { ...light, status: !light.status };
      }
      return light;
    });
    this.setData({ lights });
  },

  // 控制电机
  toggleMotor(e: any) {
    const { id } = e.currentTarget.dataset;
    const motors = this.data.motors.map(motor => {
      if (motor.id === id) {
        return { ...motor, status: !motor.status };
      }
      return motor;
    });
    this.setData({ motors });
  },

  // 导航到详情页
  navigateToDetail(e: any) {
    const { type } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/device-detail/index?type=${type}`
    });
  },

  // 显示设备目录
  showDirectory() {
    wx.showActionSheet({
      itemList: ['灯光设备', '电机设备', '太阳能设备', '网络设备'],
      success: (res) => {
        const types = ['lights', 'motors', 'solar', 'network'];
        this.navigateToDetail({ currentTarget: { dataset: { type: types[res.tapIndex] } } });
      }
    });
  }
}); 