// Browser PAC: the specified Chinese services connect directly; everything else uses PROXY.
// Change this one value when your local proxy address or port changes.
var LOCAL_PROXY = "PROXY 127.0.0.1:10090";

var DIRECT_DOMAINS = [
  // Bilibili
  "bilibili.com", "bilibili.tv", "bilibili.cn", "b23.tv",
  "biliapi.com", "biliapi.net", "biliimg.com", "bilivideo.com", "bilivideo.cn",
  "bilicdn1.com", "bilicdn2.com", "hdslb.com", "biligame.com", "biligame.net",
  "bilicomics.com", "bilicomics.net", "biliintl.com", "bilintl.com",
  // Douyin and its media/CDN domains
  "douyin.com", "douyinvod.com", "douyinpic.com", "douyincdn.com", "amemv.com",
  "snssdk.com", "ixigua.com", "toutiao.com", "toutiaoimg.com", "toutiaovod.com",
  "bytedance.com", "bytedance.net", "bytecdn.cn", "byteimg.com", "ibyteimg.com", "bytegoofy.com",
  // Xiaohongshu
  "xiaohongshu.com", "xiaohongshu.net", "xhscdn.com",
  // Huya
  "huya.com", "huyatv.com", "huyalive.com", "huyaimg.com", "duowan.com", "dwstatic.com",
  // Douyu
  "douyu.com", "douyu.tv", "douyucdn.cn", "douyucdn.com", "douyuscdn.com"
];

function isDirectDomain(host) {
  host = host.toLowerCase();

  for (var i = 0; i < DIRECT_DOMAINS.length; i++) {
    var domain = DIRECT_DOMAINS[i];
    // shExpMatch is supported consistently by Chromium, Firefox, and Windows PAC.
    if (shExpMatch(host, domain) || shExpMatch(host, "*." + domain)) {
      return true;
    }
  }

  return false;
}

function FindProxyForURL(url, host) {
  // Local addresses remain reachable even if the proxy is unavailable.
  if (isPlainHostName(host) || isInNet(host, "127.0.0.0", "255.0.0.0") ||
      isInNet(host, "10.0.0.0", "255.0.0.0") ||
      isInNet(host, "172.16.0.0", "255.240.0.0") ||
      isInNet(host, "192.168.0.0", "255.255.0.0")) {
    return "DIRECT";
  }

  if (isDirectDomain(host)) {
    return "DIRECT";
  }

  return LOCAL_PROXY;
}
