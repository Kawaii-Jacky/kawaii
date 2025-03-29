interface Device {
  id: number;
  name: string;
  status: boolean;
  location: string;
  brightness?: number;
  position?: number;
  batteryLevel?: number;
  outputPower?: number;
  signalStrength?: number;
  ipAddress?: string;
}

interface PageData {
  type: string;
  title: string;
  devices: Device[];
}

interface MockData {
  [key: string]: Device[];
}

Page({
  data: {
    type: '',
    title: '',
    devices: []
  } as PageData,

  onLoad(options: any) {
    if (options.type) {
      this.setData({
        type: options.type,
        title: this.getTitleByType(options.type)
      });
      this.loadDeviceData();
    }
  },

  backToMain() {
    this.setData({
      type: '',
      title: '',
      devices: []
    });
  },

  getTitleByType(type: string): string {
    const titles: { [key: string]: string } = {
      'lights': '灯光控制',
      'motors': '电机控制',
      'solar': '太阳能控制',
      'network': '网络状态'
    };
    return titles[type] || '设备详情';
  },

  navigateToCategory(e: any) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: `/pages/device-detail/index?type=${type}`
    });
  },

  loadDeviceData() {
    // 模拟从服务器获取设备数据
    const mockData: MockData = {
      lights: [
        { id: 1, name: '客厅灯', status: true, brightness: 80, location: '客厅' },
        { id: 2, name: '卧室灯', status: false, brightness: 60, location: '主卧' }
      ],
      motors: [
        { id: 1, name: '客厅窗帘', status: true, position: 50, location: '客厅' },
        { id: 2, name: '阳台窗帘', status: false, position: 0, location: '阳台' }
      ],
      solar: [
        { id: 1, name: '太阳能控制器', status: true, batteryLevel: 85, outputPower: 1200, location: '屋顶' }
      ],
      network: [
        { id: 1, name: '主路由器', status: true, signalStrength: 95, ipAddress: '192.168.1.1', location: '客厅' }
      ]
    };

    this.setData({
      devices: mockData[this.data.type] || []
    });
  },

  toggleDevice(e: any) {
    const deviceId = e.currentTarget.dataset.id;
    const devices = this.data.devices.map(device => {
      if (device.id === deviceId) {
        return { ...device, status: !device.status };
      }
      return device;
    });

    this.setData({ devices });
  },

  updateBrightness(e: any) {
    const deviceId = e.currentTarget.dataset.id;
    const value = parseInt(e.detail.value);
    if (isNaN(value) || value < 0 || value > 100) return;

    const devices = this.data.devices.map(device => {
      if (device.id === deviceId) {
        return { ...device, brightness: value };
      }
      return device;
    });

    this.setData({ devices });
  },

  adjustBrightness(e: any) {
    const deviceId = e.currentTarget.dataset.id;
    const brightness = e.detail.value;
    const devices = this.data.devices.map(device => {
      if (device.id === deviceId) {
        return { ...device, brightness };
      }
      return device;
    });

    this.setData({ devices });
  },

  adjustPosition(e: any) {
    const deviceId = e.currentTarget.dataset.id;
    const position = e.detail.value;
    const devices = this.data.devices.map(device => {
      if (device.id === deviceId) {
        return { ...device, position };
      }
      return device;
    });

    this.setData({ devices });
  }
}); 