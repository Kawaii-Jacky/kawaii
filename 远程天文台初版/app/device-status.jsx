/* global React, Icon */
const DEVICE_META = {
  'mppt-001': { title:'MPPT 电源', desc:'太阳能输入 · 降压 · 电池充电', icon:'bolt', color:'#FBBF24' },
  'esp32-001': { title:'loT 环境控制', desc:'环境 · 雨水 · 风扇 · 加热 · 相机 · 电机', icon:'sensors', color:'#6EE7F9' },
  'ef-001': { title:'电动平场板', desc:'ESP-NOW 湿度 · 舵机 · LED · 加热', icon:'dome', color:'#A78BFA' }
};
const DeviceStatus = ({ data }) => <div className="col-3" style={{gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))'}}>{Object.entries(DEVICE_META).map(([id,m])=>{const s=data.devicesState?.[id]||{}; return <div className="card flat" key={id} style={{borderColor:s.online?m.color:'var(--border)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{display:'flex',gap:10,alignItems:'center'}}><Icon name={m.icon} size={18}/><div><div style={{fontWeight:600}}>{m.title}</div><small style={{color:'var(--text-dim)'}}>{id}</small></div></div><span className={`chip ${s.online?'ok':''}`}><span className="pulse"/>{s.online?'在线':'离线'}</span></div><div style={{fontSize:11,color:'var(--text-muted)',marginTop:10}}>{m.desc}</div><div style={{fontSize:10,color:'var(--text-dim)',marginTop:8,fontFamily:'var(--font-mono)'}}>{s.lastSeen?`最后消息 ${new Date(s.lastSeen).toLocaleTimeString()}`:'等待 status / telemetry'}</div></div>})}</div>;
window.DeviceStatus = DeviceStatus;
