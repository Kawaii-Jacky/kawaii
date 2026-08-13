/* global React, Icon, Switch, NumRoll, Sparkline, Dome, BigChart, Terminal */
// Dashboard — 控制大屏（含传感器历史曲线）

const Dashboard = ({ data, set, mobile }) => {
  const [activeSeries, setActiveSeries] = React.useState('env');

  // chart series
  const envSeries = [
    { name: 'UTC 温度', color: 'var(--accent)', data: data.histUtcTemp },
    { name: 'DHT 温度', color: 'color-mix(in oklch, var(--accent) 60%, white)', data: data.histDhtTemp },
    { name: 'DHT 湿度', color: 'color-mix(in oklch, var(--accent) 40%, #b88aff)', data: data.histDhtHumidity },
  ];
  const powerSeries = [
    { name: '电压 V', color: 'var(--accent)', data: data.histVoltage.map(v => v * 6) },
    { name: '电流 A', color: '#FBBF24', data: data.histCurrent.map(v => v * 24) },
    { name: '功率 W', color: '#F87171', data: data.histPower },
  ];

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {!mobile && (
        <div className="topbar">
          <h1>
            控制大屏
            <span className="meta">DOME-01 · 苍穹台北 · {new Date().toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
          </h1>
          <div className="actions">
            <span className="chip ok"><span className="pulse"/>实时</span>
            <span className="chip acc"><Icon name="wifi" size={11}/> {data.btConnected ? 'WIFI · BLE' : 'WIFI'}</span>
            <button className="btn ghost"><Icon name="refresh" size={13}/>刷新</button>
            <button className="btn"><Icon name="download" size={13}/>导出</button>
          </div>
        </div>
      )}
      {mobile && (
        <div className="mtopbar">
          <div className="mt-title">
            控制大屏
            <small>DOME-01 · 苍穹台北</small>
          </div>
          <span className="chip ok"><span className="pulse"/>LIVE</span>
        </div>
      )}

      {/* HERO 行 — UTC 温度 + 三个关键状态 */}
      <div className={`hero-row ${mobile ? 'mobile' : ''}`}>
        <div className="hero-card" style={{ gridColumn: mobile ? '1 / -1' : 'auto' }}>
          <div className="label">
            <span className="pulse" style={{ color: 'var(--accent)' }}></span>
            UTC · 主镜温度
          </div>
          <div className="big">
            <NumRoll value={data.utcTemp} decimals={1}/><span className="unit">°C</span>
          </div>
          <div className="sub">环境 {data.dhtTemp.toFixed(1)}°C · 温差 {(data.dhtTemp - data.utcTemp).toFixed(1)}°C / 阈值 {data.tempDiffThreshold}°C</div>
          <div style={{ marginTop: 18 }}>
            <Sparkline data={data.histUtcTemp} height={42}/>
          </div>
        </div>
        <StatCard label="DHT 湿度" val={data.dhtHumidity} unit="%" decimals={1} hist={data.histDhtHumidity}
                  warn={data.dhtHumidity >= data.humidityThreshold}/>
        <StatCard label="输出功率" val={data.power} unit="W" decimals={1} hist={data.histPower}/>
        <StatCard label="雨水模拟" val={data.rainAnalog} unit="" decimals={0} hist={Array.from({length:30},()=>1023-Math.random()*20)}
                  warn={data.rainDetected}/>
      </div>

      {/* 中段：大图 + 圆顶 */}
      <div className={`col-2 ${mobile ? 'mobile' : ''}`}>
        <div className="card flat">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3>历史曲线 · 24h</h3>
            <div className="tabs">
              <button className={activeSeries === 'env' ? 'on' : ''} onClick={() => setActiveSeries('env')}>环境</button>
              <button className={activeSeries === 'pwr' ? 'on' : ''} onClick={() => setActiveSeries('pwr')}>电源</button>
            </div>
          </div>
          <BigChart series={activeSeries === 'env' ? envSeries : powerSeries}/>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
            {(activeSeries === 'env' ? envSeries : powerSeries).map(s => (
              <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 2, background: s.color }}/>{s.name}
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <h3>圆顶状态</h3>
            <span className={`chip ${data.domeOpen ? 'acc' : ''}`}>{data.domeOpen ? '开启' : '关闭'}</span>
          </div>
          <div className="dome-card">
            <Dome open={data.domeOpen}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                Motor · 步进 28BYJ
              </div>
              <div style={{ fontSize: 22, fontWeight: 500, marginTop: 6, letterSpacing: '-0.02em' }}>
                {data.domeOpen ? '采集中' : '已封顶'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                定时器 20:30 → 03:45
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="switch-row">
              <div className="label">
                圆顶开启
                <small>电机定时器总开关</small>
              </div>
              <Switch on={data.domeOpen} onChange={v => set('domeOpen', v)}/>
            </div>
            <div className="switch-row">
              <div className="label">
                自动关顶
                <small>雨水检测 / 计划结束</small>
              </div>
              <Switch on={data.motorAuto} onChange={v => set('motorAuto', v)}/>
            </div>
          </div>
        </div>
      </div>

      {/* 底部：四个控制卡 */}
      <div className="section-h">
        <h2>设备控制</h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>5 个执行器 · 自动逻辑就绪</span>
        <div className="line"/>
      </div>
      <div className={`col-3 ${mobile ? 'mobile' : ''}`} style={{ gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
        <ControlCard icon="flame" label="加热片" desc={`湿度 ≥ ${data.humidityThreshold}% 自动`} on={data.heaterOn} onChange={v => set('heaterOn', v)} accent="amber"/>
        <ControlCard icon="camera" label="摄像头电源" desc="ZWO ASI · 12V 通路" on={data.cameraOn} onChange={v => set('cameraOn', v)}/>
        <ControlCard icon="chip" label="MOSFET 通道" desc="副载荷开关" on={data.mosfetOn} onChange={v => set('mosfetOn', v)}/>
        <ControlCard icon="fan" label="主板风扇" desc={data.fanAuto ? `自动 / 阈值 ${data.fanTempThreshold}°C` : '手动'} on={data.fanOn} onChange={v => set('fanOn', v)}/>
      </div>

      {/* 实时日志 */}
      <div className={`col-2 ${mobile ? 'mobile' : ''}`} style={{ gridTemplateColumns: mobile ? '1fr' : '1fr 1fr' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>串口终端</h3>
            <span className="chip">{data.reportInterval}s 间隔</span>
          </div>
          <Terminal lines={[
            { t: '21:42:18', lv: 'info', msg: `UTC: ${data.utcTemp.toFixed(1)}°C  |  V: ${data.voltage.toFixed(2)}V  |  I: ${data.current.toFixed(2)}A` },
            { t: '21:42:18', lv: 'ok',   msg: 'Blynk 心跳 OK · RSSI -54dBm' },
            { t: '21:42:16', lv: 'info', msg: `DHT: ${data.dhtTemp.toFixed(1)}°C / ${data.dhtHumidity.toFixed(1)}% RH` },
            { t: '21:42:13', lv: 'ok',   msg: '加热片 ON  (湿度触发)' },
            { t: '21:42:08', lv: 'warn', msg: '雨水模拟量 接近阈值: 1023' },
            { t: '21:42:00', lv: 'info', msg: 'EEPROM commit 成功' },
          ]}/>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>电源 · INA226</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <MiniMetric label="电压" v={data.voltage} u="V" d={2}/>
            <MiniMetric label="电流" v={data.current} u="A" d={2}/>
            <MiniMetric label="功率" v={data.power} u="W" d={1}/>
          </div>
          <div style={{ marginTop: 16 }}>
            <Sparkline data={data.histVoltage} height={60}/>
          </div>
          <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'space-between' }}>
            <span>12V 主路 · 36W 容量</span>
            <span>负载 {Math.round(data.power / 36 * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, val, unit, decimals, hist, warn }) => (
  <div className="stat-card">
    <div className="label" style={warn ? { color: 'var(--warning)' } : {}}>
      {warn && <span className="pulse" style={{ color: 'var(--warning)' }}/>}
      {label}
    </div>
    <div className="val" style={warn ? { color: 'var(--warning)' } : {}}>
      <NumRoll value={val} decimals={decimals}/>{unit && <span className="unit">{unit}</span>}
    </div>
    <div className="spark"><Sparkline data={hist} height={32}/></div>
  </div>
);

const ControlCard = ({ icon, label, desc, on, onChange, accent }) => (
  <div className="card flat" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 'var(--radius)',
        background: on ? 'var(--accent-dim)' : 'var(--bg-elev)',
        border: `1px solid ${on ? 'color-mix(in oklch, var(--accent) 40%, transparent)' : 'var(--border)'}`,
        display: 'grid', placeItems: 'center',
        color: on ? 'var(--accent)' : 'var(--text-muted)',
        transition: 'all 200ms',
      }}>
        <Icon name={icon} size={16}/>
      </div>
      <Switch on={on} onChange={onChange}/>
    </div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{desc}</div>
    </div>
  </div>
);

const MiniMetric = ({ label, v, u, d }) => (
  <div>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 500, marginTop: 4, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
      <NumRoll value={v} decimals={d}/><span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 3, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>{u}</span>
    </div>
  </div>
);

window.Dashboard = Dashboard;
