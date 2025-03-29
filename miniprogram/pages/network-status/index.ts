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
    } as NetworkStatus,
    isRefreshing: false
  },

  onLoad() {
    this.initData();
  },

  initData() {
    // 初始化网络状态数据
    this.setData({
      networkStatus: {
        isConnected: true,
        signalStrength: 85,
        networkType: '4G',
        ipAddress: '192.168.1.100',
        dataUsage: {
          total: 10240, // 10GB
          used: 5120,   // 5GB
          remaining: 5120 // 5GB
        },
        lastUpdate: new Date().toLocaleString()
      }
    });
  },

  // 刷新网络状态
  refreshStatus() {
    this.setData({ isRefreshing: true });
    
    // 模拟网络请求
    setTimeout(() => {
      this.setData({
        networkStatus: {
          ...this.data.networkStatus,
          lastUpdate: new Date().toLocaleString()
        },
        isRefreshing: false
      });
    }, 1000);
  },

  // 格式化数据使用量
  formatDataUsage(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + 'GB';
    } else if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + 'MB';
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + 'KB';
    }
    return bytes + 'B';
  }
}); 