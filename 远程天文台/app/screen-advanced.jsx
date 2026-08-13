/* global React, Icon, Switch */
// Advanced Settings — 上报间隔、阈值、风扇模式、自动关顶、Wi-Fi、OTA、EEPROM、调试

const AdvancedScreen = ({ data, set, mobile }) => {
  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {!mobile ? (
        <div className="topbar">
          <h1>高级设置 <span className="meta">系统级配置 · 写入 EEPROM</span></h1>
          <div className="actions">
            <span className="chip ok"><span className="pulse"/>已同步</span>
            <button className="btn"><Icon name="download" size={13}/>导出配置</button>
          </div>
        </div>
      ) : (
        <div className="mtopbar"><div className="mt-title">高级设置<small>系统配置</small></div></div>
      )}

      <div className="section-h"><h2>遥测与告警</h2><div className="line"/></div>
      <div className="list-rows">
        <SliderRow label="上报间隔" desc="1–300 秒 · 写入 EEPROM" min={1} max={300} step={1}
                   val={data.reportInterval} unit="s"
                   onChange={v => set('reportInterval', v)}/>
        <SliderRow label="湿度阈值" desc="超过该值自动启用加热片" min={40} max={95} step={1}
                   val={data.humidityThreshold} unit="%"
                   onChange={v => set('humidityThreshold', v)}/>
        <SliderRow label="温度差阈值" desc="DHT 与 UTC 差 · 加热片启动条件" min={1} max={10} step={1}
                   val={data.tempDiffThreshold} unit="°C"
                   onChange={v => set('tempDiffThreshold', v)}/>
      </div>

      <div className="section-h"><h2>风扇 · 温控</h2><div className="line"/></div>
      <div className="list-rows">
        <div className="list-row">
          <div className="lbl">运行模式<small>自动 = 超过阈值启动 · 手动 = 直接控制</small></div>
          <div className="segmented">
            <button className={data.fanAuto ? 'on' : ''} onClick={() => set('fanAuto', true)}>自动</button>
            <button className={!data.fanAuto ? 'on' : ''} onClick={() => set('fanAuto', false)}>手动</button>
          </div>
        </div>
        <SliderRow label="风扇启停温度" desc="ESP32 板载温度 · 摄氏度" min={20} max={60} step={1}
                   val={data.fanTempThreshold} unit="°C"
                   onChange={v => set('fanTempThreshold', v)} disabled={!data.fanAuto}/>
        <div className="list-row">
          <div className="lbl">圆顶自动关顶<small>雨水触发或定时器到点</small></div>
          <Switch on={data.motorAuto} onChange={v => set('motorAuto', v)}/>
        </div>
      </div>

      <div className="section-h"><h2>网络</h2><div className="line"/></div>
      <div className="list-rows">
        <div className="list-row">
          <div className="lbl">Wi-Fi · 已连接<small>SSID · ATLAS-5G &nbsp;·&nbsp; RSSI -54 dBm</small></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="chip ok"><Icon name="wifi" size={10}/>online</span>
            <button className="btn ghost">切换</button>
          </div>
        </div>
        <div className="list-row">
          <div className="lbl">Blynk Token<small style={{ fontFamily: 'var(--font-mono)' }}>•••• •••• •••• ••3a8f</small></div>
          <button className="btn ghost">编辑</button>
        </div>
        <div className="list-row">
          <div className="lbl">蓝牙串口<small>HC-05 · {data.btConnected ? '已连接' : '未连接'}</small></div>
          <Switch on={data.btConnected} onChange={v => set('btConnected', v)}/>
        </div>
      </div>

      <div className="section-h"><h2>系统</h2><div className="line"/></div>
      <div className="list-rows">
        <div className="list-row">
          <div className="lbl">固件版本<small style={{ fontFamily: 'var(--font-mono)' }}>v2.4.1 · build 2024.05.18 · ESP32-S3</small></div>
          <button className="btn primary">检查 OTA</button>
        </div>
        <div className="list-row">
          <div className="lbl">调试输出<small>把当前所有遥测打印到串口与终端</small></div>
          <button className="btn"><Icon name="bolt" size={13}/>立即发送</button>
        </div>
        <div className="list-row">
          <div className="lbl">串口数据导出<small>导出最近 24h 串口日志（.csv）</small></div>
          <button className="btn"><Icon name="download" size={13}/>导出</button>
        </div>
        <div className="list-row">
          <div className="lbl" style={{ color: 'var(--danger)' }}>恢复出厂<small>清空 EEPROM 中所有阈值与配置</small></div>
          <button className="btn danger">重置 EEPROM</button>
        </div>
      </div>
    </div>
  );
};

const SliderRow = ({ label, desc, min, max, step, val, unit, onChange, disabled }) => (
  <div className="list-row" style={disabled ? { opacity: 0.5 } : {}}>
    <div className="lbl" style={{ flex: '0 0 220px' }}>{label}<small>{desc}</small></div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, maxWidth: 460 }}>
      <input type="range" className="slider" min={min} max={max} step={step}
             value={val} disabled={disabled}
             onChange={e => onChange(Number(e.target.value))}/>
      <span className="slider-val">{val}{unit}</span>
    </div>
  </div>
);

window.AdvancedScreen = AdvancedScreen;
