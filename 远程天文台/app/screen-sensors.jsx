/* global React, Icon, NumRoll, Sparkline, BigChart */
// Sensors detail — 传感器历史曲线放在大屏；这是其细节展开页

const SensorsScreen = ({ data, mobile }) => {
  const [tab, setTab] = React.useState('temp');
  const series = {
    temp: [
      { name: 'UTC 主镜', color: 'var(--accent)', data: data.histUtcTemp },
      { name: 'DHT 环境', color: 'color-mix(in oklch, var(--accent) 55%, white)', data: data.histDhtTemp },
    ],
    humidity: [{ name: '相对湿度', color: 'color-mix(in oklch, var(--accent) 40%, #a78bfa)', data: data.histDhtHumidity }],
    power: [
      { name: '电压×6', color: 'var(--accent)', data: data.histVoltage.map(v => v * 6) },
      { name: '电流×24', color: '#FBBF24', data: data.histCurrent.map(v => v * 24) },
      { name: '功率', color: '#F87171', data: data.histPower },
    ],
  };
  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {!mobile ? (
        <div className="topbar">
          <h1>传感器 <span className="meta">原始遥测 · 30 sample 滑动窗口</span></h1>
          <div className="tabs">
            <button className={tab==='temp'?'on':''} onClick={()=>setTab('temp')}>温度</button>
            <button className={tab==='humidity'?'on':''} onClick={()=>setTab('humidity')}>湿度</button>
            <button className={tab==='power'?'on':''} onClick={()=>setTab('power')}>电源</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mtopbar">
            <div className="mt-title">传感器<small>遥测原始数据</small></div>
          </div>
          <div className="tabs" style={{ alignSelf: 'flex-start' }}>
            <button className={tab==='temp'?'on':''} onClick={()=>setTab('temp')}>温度</button>
            <button className={tab==='humidity'?'on':''} onClick={()=>setTab('humidity')}>湿度</button>
            <button className={tab==='power'?'on':''} onClick={()=>setTab('power')}>电源</button>
          </div>
        </>
      )}

      <div className="card">
        <BigChart series={series[tab]} height={260}/>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
          {series[tab].map(s => (
            <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 2, background: s.color }}/>{s.name}
            </span>
          ))}
        </div>
      </div>

      <div className={`col-3 ${mobile ? 'mobile' : ''}`}>
        <DetailCard icon="flame" title="UTC 温度" val={data.utcTemp} unit="°C" hist={data.histUtcTemp} sub="主镜 / 露水控制基准"/>
        <DetailCard icon="drop" title="DHT 湿度" val={data.dhtHumidity} unit="%" hist={data.histDhtHumidity} sub={`告警阈值 ${data.humidityThreshold}%`}/>
        <DetailCard icon="bolt" title="输出功率" val={data.power} unit="W" hist={data.histPower} sub="INA226 高侧采样"/>
        <DetailCard icon="flame" title="DHT 温度" val={data.dhtTemp} unit="°C" hist={data.histDhtTemp} sub={`温差阈值 ${data.tempDiffThreshold}°C`}/>
        <DetailCard icon="bolt" title="输出电压" val={data.voltage} unit="V" hist={data.histVoltage} sub="12V 主路"/>
        <DetailCard icon="drop" title="雨水模拟" val={data.rainAnalog} unit="" hist={Array.from({length:30},()=>1023-Math.random()*20)} sub={data.rainDetected ? '检测到水滴' : '干燥'} warn={data.rainDetected}/>
      </div>
    </div>
  );
};

const DetailCard = ({ icon, title, val, unit, hist, sub, warn }) => (
  <div className="card">
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 'var(--radius)', background: 'var(--bg-elev)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: warn ? 'var(--warning)' : 'var(--accent)' }}>
        <Icon name={icon} size={14}/>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
    </div>
    <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>
      <NumRoll value={val} decimals={typeof val === 'number' && val > 100 ? 0 : 1}/><span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 4, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>{unit}</span>
    </div>
    <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{sub}</div>
    <div style={{ marginTop: 12 }}><Sparkline data={hist} height={48}/></div>
  </div>
);

window.SensorsScreen = SensorsScreen;
