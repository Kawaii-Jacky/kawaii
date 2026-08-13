/* global React */
// 远程天文台 · 基础组件

const { useState, useEffect, useRef, useMemo } = React;

// ---------- Switch ----------
const Switch = ({ on, onChange, disabled }) => (
  <div
    className={`switch ${on ? 'on' : ''}`}
    onClick={() => !disabled && onChange && onChange(!on)}
    role="switch"
    aria-checked={on}
  />
);

// ---------- Animated number ----------
const NumRoll = ({ value, decimals = 1, unit }) => {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    const from = prev.current;
    const to = value;
    const start = performance.now();
    const dur = 600;
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(from + (to - from) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className="num-roll">
      {shown.toFixed(decimals)}
      {unit && <span className="unit">{unit}</span>}
    </span>
  );
};

// ---------- Sparkline ----------
const Sparkline = ({ data, height = 36, color }) => {
  const w = 200; // viewBox width
  const h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return [x, y];
  });
  const linePath = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const fillPath = `${linePath} L${w},${h} L0,${h} Z`;
  const last = pts[pts.length - 1];
  const style = color ? { stroke: color, color } : {};
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={style}>
      <path className="fill" d={fillPath} style={color ? { fill: color } : {}}/>
      <path className="line" d={linePath} style={style}/>
      <circle className="last" cx={last[0]} cy={last[1]} r="2" style={color ? { fill: color } : {}}/>
    </svg>
  );
};

// ---------- Dome SVG ----------
const Dome = ({ open }) => (
  <svg className={`dome-svg ${open ? 'open' : ''}`} viewBox="0 0 180 130">
    <line className="ground" x1="10" y1="115" x2="170" y2="115"/>
    {/* scope visible when open */}
    <g className="scope">
      <line x1="90" y1="100" x2="90" y2="55"/>
      <line x1="80" y1="65" x2="100" y2="65"/>
      <circle cx="90" cy="50" r="6" fill="none" strokeWidth="2"/>
    </g>
    {/* shell - two halves */}
    <path className="slot-flap-l" d="M 30 100 A 60 60 0 0 1 90 40 L 90 100 Z"/>
    <path className="slot-flap-r" d="M 90 40 A 60 60 0 0 1 150 100 L 90 100 Z"/>
    <line x1="30" y1="100" x2="150" y2="100" stroke="var(--border-strong)" strokeWidth="1.5"/>
  </svg>
);

// ---------- Big chart (multi-series area) ----------
const BigChart = ({ series, height = 220, yLabel }) => {
  // series: [{name, color, data: number[]}]
  const w = 800;
  const h = height;
  const padL = 36, padR = 12, padT = 12, padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const n = series[0].data.length;
  const allVals = series.flatMap(s => s.data);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = (max - min) || 1;
  const stepX = innerW / (n - 1);
  const yGrid = 4;
  return (
    <div className="bigchart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <g className="grid">
          {Array.from({ length: yGrid + 1 }).map((_, i) => {
            const y = padT + (innerH / yGrid) * i;
            return <line key={i} x1={padL} y1={y} x2={w - padR} y2={y}/>;
          })}
        </g>
        <g className="axis">
          {Array.from({ length: yGrid + 1 }).map((_, i) => {
            const y = padT + (innerH / yGrid) * i;
            const v = max - (range / yGrid) * i;
            return <text key={i} x={padL - 6} y={y + 3} textAnchor="end">{v.toFixed(0)}</text>;
          })}
          {Array.from({ length: 7 }).map((_, i) => {
            const x = padL + (innerW / 6) * i;
            const hr = 24 - (6 - i) * 4;
            return <text key={i} x={x} y={h - 6} textAnchor="middle">{String(hr).padStart(2, '0')}:00</text>;
          })}
        </g>
        {series.map((s) => {
          const pts = s.data.map((v, i) => {
            const x = padL + i * stepX;
            const y = padT + innerH - ((v - min) / range) * innerH;
            return [x, y];
          });
          const lp = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
          const fp = `${lp} L${pts[pts.length-1][0]},${padT + innerH} L${pts[0][0]},${padT + innerH} Z`;
          return (
            <g key={s.name}>
              <path className="series-fill" d={fp} fill={s.color}/>
              <path className="series-line" d={lp} stroke={s.color}/>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ---------- Live terminal ----------
const Terminal = ({ lines }) => (
  <div className="terminal">
    {lines.map((l, i) => (
      <div key={i} className="line">
        <span className="ts">{l.t}</span>
        <span className={`lv-${l.lv}`}>[{l.lv.toUpperCase()}]</span>
        <span> {l.msg}</span>
      </div>
    ))}
  </div>
);

// ---------- Mock data hook ----------
function useLiveData(running = true) {
  const [data, setData] = useState(() => ({
    utcTemp: 12.4,
    dhtTemp: 14.2,
    dhtHumidity: 62.3,
    voltage: 12.06,
    current: 2.34,
    power: 28.2,
    rainAnalog: 1023,
    rainDetected: false,
    heaterOn: true,
    cameraOn: true,
    mosfetOn: true,
    btConnected: true,
    fanOn: false,
    fanAuto: true,
    fanTempThreshold: 35,
    domeOpen: true,
    motorAuto: true,
    humidityThreshold: 80,
    tempDiffThreshold: 3,
    reportInterval: 5,
    // history (last 30 points)
    histUtcTemp: Array.from({ length: 30 }, (_, i) => 12 + Math.sin(i / 3) * 0.8 + Math.random() * 0.3),
    histDhtHumidity: Array.from({ length: 30 }, (_, i) => 60 + Math.cos(i / 4) * 4 + Math.random() * 1.5),
    histVoltage: Array.from({ length: 30 }, () => 12 + (Math.random() - 0.5) * 0.4),
    histPower: Array.from({ length: 30 }, (_, i) => 28 + Math.sin(i / 2) * 4 + Math.random() * 2),
    histCurrent: Array.from({ length: 30 }, () => 2.3 + (Math.random() - 0.5) * 0.5),
    histDhtTemp: Array.from({ length: 30 }, (_, i) => 14 + Math.sin(i / 3) * 1.2 + Math.random() * 0.4),
  }));
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setData(d => ({
        ...d,
        utcTemp: clamp(d.utcTemp + (Math.random() - 0.5) * 0.3, 8, 18),
        dhtTemp: clamp(d.dhtTemp + (Math.random() - 0.5) * 0.25, 10, 22),
        dhtHumidity: clamp(d.dhtHumidity + (Math.random() - 0.5) * 1.2, 30, 90),
        voltage: clamp(d.voltage + (Math.random() - 0.5) * 0.08, 11.6, 12.6),
        current: clamp(d.current + (Math.random() - 0.5) * 0.12, 1.5, 3.5),
        power: clamp(d.power + (Math.random() - 0.5) * 1.6, 18, 42),
        rainAnalog: Math.floor(1023 - Math.random() * 20),
        histUtcTemp: shiftPush(d.histUtcTemp, clamp(d.utcTemp + (Math.random() - 0.5) * 0.3, 8, 18)),
        histDhtHumidity: shiftPush(d.histDhtHumidity, clamp(d.dhtHumidity + (Math.random() - 0.5) * 1.2, 30, 90)),
        histVoltage: shiftPush(d.histVoltage, clamp(d.voltage + (Math.random() - 0.5) * 0.08, 11.6, 12.6)),
        histPower: shiftPush(d.histPower, clamp(d.power + (Math.random() - 0.5) * 1.6, 18, 42)),
        histCurrent: shiftPush(d.histCurrent, clamp(d.current + (Math.random() - 0.5) * 0.12, 1.5, 3.5)),
        histDhtTemp: shiftPush(d.histDhtTemp, clamp(d.dhtTemp + (Math.random() - 0.5) * 0.25, 10, 22)),
      }));
    }, 1800);
    return () => clearInterval(id);
  }, [running]);
  const set = (k, v) => setData(d => ({ ...d, [k]: typeof v === 'function' ? v(d[k]) : v }));
  return [data, set];
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function shiftPush(arr, v) { return [...arr.slice(1), v]; }

window.Switch = Switch;
window.NumRoll = NumRoll;
window.Sparkline = Sparkline;
window.Dome = Dome;
window.BigChart = BigChart;
window.Terminal = Terminal;
window.useLiveData = useLiveData;
