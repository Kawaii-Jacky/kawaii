/* global React, NumRoll, Terminal, Dome, Switch */
const Dashboard = ({ data, set, sendCommand, onNavigate, lang, setLang }) => {
  const states=data.devicesState||{}, env=states['esp32-001']?.telemetry||{}, mppt=states['mppt-001']?.telemetry||{}, ef=states['ef-001']?.telemetry||{};
  const hist=data.historyByDevice||{}, n=(v,d=0)=>Number(v??d)||0, b=(v,d=false)=>v==null?d:Boolean(v);
  const [notice,setNotice]=React.useState(null), noticeTimer=React.useRef(null);
  const send=async(d,c,a={})=>{
    const result=await sendCommand(d,c,a);
    const ok=result?.status==='sent'||result?.status==='ok'||Boolean(result?.id);
    setNotice({ok,text:ok?`${d} · ${c} 命令已发布`:`${d} · ${c} 发送失败：${result?.error||result?.detail||'未知错误'}`});
    clearTimeout(noticeTimer.current); noticeTimer.current=setTimeout(()=>setNotice(null),3200);
    return {...result,ok};
  };
  React.useEffect(()=>()=>clearTimeout(noticeTimer.current),[]);
  const [domeOpen,setDomeOpen]=React.useState(b(env.dome_open));
  React.useEffect(()=>{ if(env.dome_open!=null)setDomeOpen(Boolean(env.dome_open)); },[env.dome_open]);
  const onlineCount=['mppt-001','esp32-001','ef-001'].filter(id=>states[id]?.online).length;
  const [activeTab,setActiveTab]=React.useState('monitor'),[modal,setModal]=React.useState(null),[confirming,setConfirming]=React.useState(null);
  const confirmAction=(title,detail,action)=>setConfirming({title,detail,action});

  return <div className="page-enter console-dashboard">
    {notice&&<div className={`command-notice ${notice.ok?'ok':'error'}`} role="status"><i/>{notice.text}</div>}
    <ConsoleTop active={activeTab} setActive={setActiveTab} api={data.apiConnected} onlineCount={onlineCount} lang={lang} setLang={setLang} onNavigate={onNavigate}/>
    {activeTab==='monitor' ? <MonitorOverview data={data} env={env} mppt={mppt} ef={ef} states={states} hist={hist} n={n} b={b} domeOpen={domeOpen} setDomeOpen={setDomeOpen} send={send} lang={lang} openModal={setModal} confirmAction={confirmAction}/> : <main className={`device-columns console-detail detail-${activeTab}`}>
      {activeTab==='energy'&&
      <DevicePanel className="mppt-panel" title="MPPT 能源" subtitle="太阳能与电池管理" id="mppt-001" state={states['mppt-001']}>
        <MetricGrid cols={4} items={[
          ['输入电压',n(mppt.voltage_input),'V'],['输入电流',n(mppt.current_input),'A'],['输入功率',n(mppt.power_input),'W'],['电池',n(mppt.battery_percent),'%'],
          ['降压电压',n(mppt.buck_voltage),'V'],['降压电流',n(mppt.buck_current),'A'],['降压功率',n(mppt.buck_power),'W'],['效率',n(mppt.buck_efficiency),'%'],
          ['MOS 温度',n(mppt.temperature),'°C'],['PWM',n(mppt.pwm),''],['日发电',n(mppt.daily_energy),'Wh'],['总发电',n(mppt.total_energy),'Wh']
        ]}/>
        <Subhead text="运行控制"/>
        <DenseControls controls={[
          {k:'toggle',l:'强制风扇',v:b(mppt.fan),f:v=>send('mppt-001','fan',{state:v})},{k:'toggle',l:'自动风扇',v:b(mppt.enable_fan,true),f:v=>send('mppt-001','enable_fan',{state:v})},
          {k:'select',l:'算法',v:n(mppt.mode),o:[[0,'CC/CV'],[1,'MPPT']],f:v=>send('mppt-001','mode',{value:+v})},{k:'button',l:'读取诊断',f:()=>send('mppt-001','debug')}
        ]}/>
        <Subhead text="电池与散热参数"/>
        <DenseControls controls={[
          {k:'number',l:'截止电压',v:n(mppt.voltage_battery_min,10),min:8,max:20,step:.1,u:'V',f:v=>send('mppt-001','voltage_battery_min',{value:v})},
          {k:'number',l:'满电电压',v:n(mppt.voltage_battery_max,14.4),min:12,max:48,step:.1,u:'V',f:v=>send('mppt-001','voltage_battery_max',{value:v})},
          {k:'number',l:'最大电流',v:n(mppt.current_charging,2),min:.1,max:20,step:.1,u:'A',f:v=>send('mppt-001','current_charging',{value:v})},
          {k:'number',l:'风扇阈值',v:n(mppt.temperature_fan,60),min:20,max:80,step:1,u:'°C',f:v=>send('mppt-001','temperature_fan',{value:v})}
        ]}/>
        <HistoryPanel title="电池与能源历史" records={hist['mppt-001']||[]} defaultMetric="battery_percent" metrics={[
          ['battery_percent','电池电量','%'],['voltage_input','输入电压','V'],['current_input','输入电流','A'],['power_input','输入功率','W'],['buck_voltage','降压电压','V'],['buck_current','降压电流','A'],['buck_power','降压功率','W'],['buck_efficiency','效率','%'],['temperature','MOS 温度','°C'],['daily_energy','日发电','Wh']
        ]}/>
      </DevicePanel>}

      {activeTab==='environment'&&
      <DevicePanel className="env-panel" title="环境与观测" subtitle="气象、圆顶与 OnStep" id="esp32-001" state={states['esp32-001']}>
        <MetricGrid cols={4} items={[
          ['环境温度',n(env.dht_temperature,data.dhtTemp),'°C'],['环境湿度',n(env.dht_humidity,data.dhtHumidity),'%'],['传感器温度',n(env.utc_temperature,data.utcTemp),'°C'],['雨水',b(env.rain_detected)?'有水':'无水',''],
          ['输出电压',n(env.output_voltage),'V'],['输出电流',n(env.output_current),'A'],['输出功率',n(env.power_output),'W'],['雨水模拟',n(env.rain_analog),'']
        ]}/>
        <Subhead text="环境与供电"/>
        <DenseControls controls={[
          {k:'toggle',l:'ZWO 供电',v:b(env.mosfet),f:v=>send('esp32-001','mosfet',{state:v?1:0})},{k:'toggle',l:'相机供电',v:b(env.camera),f:v=>send('esp32-001','camera',{state:v})},
          {k:'toggle',l:'加热片',v:b(env.heater),f:v=>send('esp32-001','heater',{state:v})},{k:'toggle',l:'自动加热',v:b(env.heater_auto,true),f:v=>send('esp32-001','heater_mode',{enabled:v})},
          {k:'toggle',l:'环境风扇',v:b(env.fan),f:v=>send('esp32-001','fan',{state:v})},{k:'toggle',l:'自动风扇',v:b(env.fan_auto,true),f:v=>send('esp32-001','fan_mode',{enabled:v})},
          {k:'number',l:'风扇阈值',v:n(env.fan_threshold,40),min:10,max:80,step:1,u:'°C',f:v=>send('esp32-001','fan_threshold',{value:v})}
        ]}/>
        <Subhead text="圆顶与 OnStep"/>
        <div className="dome-module">
          <div className="dome-product"><Dome open={domeOpen}/><div><b>{env.dome_open==null?'位置未知':domeOpen?'圆顶已打开':'圆顶已关闭'}</b><small>电机 {env.motor_state??'停止'}</small><small>蓝牙 {b(env.bluetooth)?'已连接':'未连接'}</small></div></div>
          <div className="command-grid">{[
            ['关顶',()=>confirmAction('确认关闭天文台顶棚','执行前请确认望远镜已 PARK，顶棚运行路径内没有人员或设备。',()=>{setDomeOpen(false);return send('esp32-001','motor_reverse')})],['停止',()=>send('esp32-001','motor_stop')],['开顶',()=>confirmAction('确认打开天文台顶棚','请确认现场天气安全、顶棚锁止已解除，且运行路径内没有障碍物。',()=>{setDomeOpen(true);return send('esp32-001','motor_forward')})],
            ['SYNC',()=>send('esp32-001','onstep',{action:1})],['PARK',()=>send('esp32-001','onstep',{action:2})],['UNPARK',()=>send('esp32-001','onstep',{action:3})],
            ['HOME',()=>send('esp32-001','onstep',{action:4})],['SET HOME',()=>send('esp32-001','onstep',{action:5})],['SET PARK',()=>send('esp32-001','onstep',{action:6})]
          ].map(([l,f])=><button key={l} onClick={f}>{l}</button>)}</div>
        </div>
        <HistoryPanel title="环境趋势历史" records={hist['esp32-001']||[]} defaultMetric="dht_temperature" metrics={[
          ['dht_temperature','环境温度','°C'],['dht_humidity','环境湿度','%'],['utc_temperature','传感器温度','°C'],['output_voltage','输出电压','V'],['output_current','输出电流','A'],['power_output','输出功率','W'],['rain_analog','雨水模拟','']
        ]}/>
      </DevicePanel>}

      {activeTab==='flat'&&
      <DevicePanel className="ef-panel" title="电动平场板" subtitle="舵机、照明与防露" id="ef-001" state={states['ef-001']}>
        <MetricGrid cols={3} items={[["实际湿度",n(ef.humidity),'%'],['舵机角度',n(ef.angle),'°'],['LED 亮度',n(ef.brightness,60),'%']]}/>
        <Subhead text="平场板与灯光"/>
        <DenseControls single controls={[
          {k:'toggle',l:'平场板开合',v:b(ef.servo),f:v=>send('ef-001','servo',{state:v})},{k:'range',l:'开合角',v:n(ef.angle,90),min:0,max:300,u:'°',f:v=>send('ef-001','angle',{value:v})},
          {k:'toggle',l:'平场板 LED',v:b(ef.led),f:v=>send('ef-001','led',{state:v,brightness:n(ef.brightness,60)})},{k:'range',l:'LED 亮度',v:n(ef.brightness,60),min:0,max:100,u:'%',f:v=>send('ef-001','brightness',{value:v})}
        ]}/>
        <Subhead text="防露加热"/>
        <DenseControls single controls={[
          {k:'toggle',l:'加热带',v:b(ef.heater),f:v=>send('ef-001','heater',{state:v})},{k:'toggle',l:'自动加热',v:b(ef.heater_auto),f:v=>send('ef-001','heater_mode',{enabled:v})},
          {k:'range',l:'湿度阈值',v:n(ef.humi_threshold,70),min:0,max:100,u:'%',f:v=>send('ef-001','humi_threshold',{value:v})},{k:'range',l:'加热功率',v:n(ef.heater_power,50),min:0,max:100,u:'%',f:v=>send('ef-001','heater_power',{value:v})}
        ]}/>
        <Subhead text="设备终端"/>
        <CompactTerminal lines={data.logs} send={send}/>
      </DevicePanel>}
    </main>}
    {modal&&<DashboardModal type={modal} close={()=>setModal(null)} data={data} set={set} mppt={mppt} n={n} b={b} send={send} lang={lang}/>}
    {confirming&&<CriticalConfirm {...confirming} cancel={()=>setConfirming(null)} proceed={async()=>{await confirming.action();setConfirming(null)}}/>}
  </div>;
};

const ConsoleTop=({active,setActive,api,onlineCount,lang,setLang,onNavigate})=>{
  const now=new Date();
  const tr=(zh,en)=>lang==='zh'?zh:en;
  return <header className="console-topbar">
    <div className="console-brand"><b>R</b><span>{tr('远程天文台','Remote Observatory')}</span><i/>{api?tr('在线','Live'):tr('离线','Offline')}</div>
    <nav><span className="console-page-title">{tr('观测监控大屏','Observatory Monitoring')}</span></nav>
    <div className="console-tools"><button className="lang-switch" onClick={()=>setLang(lang==='zh'?'en':'zh')}>{lang==='zh'?'EN':'中文'}</button><span>▣</span><time>{now.toLocaleDateString(lang==='zh'?'zh-CN':'en-US',{month:'short',day:'2-digit'})}</time><i/><time>{now.toLocaleTimeString(lang==='zh'?'zh-CN':'en-US',{hour:'2-digit',minute:'2-digit'})}</time><button aria-label={tr('通知','Notifications')}>♧</button><b role="button" tabIndex="0" aria-label={tr('个人中心','Profile')} onClick={()=>onNavigate('profile')} onKeyDown={e=>{if(e.key==='Enter')onNavigate('profile')}}>羊<small className={onlineCount?'on':''}/></b></div>
  </header>;
};

const MonitorOverview=({data,env,mppt,ef,states,hist,n,b,domeOpen,setDomeOpen,send,lang,openModal,confirmAction})=>{
  const online=id=>Boolean(states[id]?.online), pct=Math.round(n(mppt.battery_percent)), temp=n(env.dht_temperature,data.dhtTemp), hum=n(env.dht_humidity,data.dhtHumidity), power=n(mppt.power_input), logs=data.logs?.slice(0,4)||[];
  const health=Math.round(([online('mppt-001'),online('esp32-001'),online('ef-001')].filter(Boolean).length/3)*100);
  const tr=(zh,en)=>lang==='zh'?zh:en;
  return <main className="reference-grid">
    <section className="reference-left">
      <GlassCard
        title={tr('MPPT 能源','MPPT Energy')}
        status={online('mppt-001')?tr('在线','Online'):tr('离线','Offline')}
        actions={[{label:tr('设置','Settings'),f:()=>openModal('mppt-settings')},{label:tr('详细','Details'),f:()=>openModal('mppt-details')}]}
      >
        <StatusRow icon="▰" title={tr('电池电量','Battery Level')} sub="SOC" value={`${pct}%`} on={online('mppt-001')}/>
        <StatusRow icon="ϟ" title={tr('光伏输入电流','PV Input Current')} sub="INA226 INPUT" value={`${n(mppt.current_input).toFixed(1)} A`} on={n(mppt.current_input)>0}/>
        <StatusRow icon="⌁" title={tr('BUCK 输出电流','Buck Output Current')} sub="INA226 BUCK" value={`${n(mppt.buck_current).toFixed(1)} A`} on={n(mppt.buck_current)>0}/>
      </GlassCard>
      <GlassCard title={tr('电动平场板','Flat Field')} status={online('ef-001')?tr('在线','Online'):tr('离线','Offline')} className="flat-overview-card">
        <div className="flat-overview-metrics"><label>{tr('湿度','Humidity')}<b>{n(ef.humidity).toFixed(1)}%</b></label><label>{tr('舵机角度','Servo Angle')}<b>{n(ef.angle).toFixed(0)}°</b></label><label>{tr('LED 输出','LED Output')}<b>{n(ef.brightness,60).toFixed(0)}%</b></label></div>
        <div className="flat-overview-states"><span><i className={b(ef.servo)?'on':''}/>{tr('平场板','Panel')} {b(ef.servo)?tr('打开','Open'):tr('关闭','Closed')}</span><span><i className={b(ef.led)?'on':''}/>LED {b(ef.led)?tr('开','On'):tr('关','Off')}</span><span><i className={b(ef.heater)?'on':''}/>{tr('加热','Heater')} {b(ef.heater)?tr('开','On'):tr('关','Off')}</span><span><i className={b(ef.heater_auto)?'on':''}/>{tr('自动','Auto')} {b(ef.heater_auto)?tr('开','On'):tr('关','Off')}</span></div>
      </GlassCard>
    </section>

    <section className="observatory-hero glass-card">
      <div className="hero-rulers left"/><div className="hero-rulers right"/>
      <div className="orbit one"/><div className="orbit two"/>
      <img src="assets/observatory-render.png" alt="远程天文台三维结构"/>
      <HeroCallout className="callout-a" title="Solar Input" detail="Power Output" value={`${power.toFixed(1)} W`}/>
      <HeroCallout className="callout-b" title="Battery" detail="State of Charge" value={`${pct}%`}/>
      <HeroCallout className="callout-c" title="Flat Field LED" detail="Brightness" value={`${n(ef.brightness,60).toFixed(0)}%`}/>
      <div className="hero-dots"><i/><i className="active"/><i/></div>
      <div className="hero-roof-controls"><button onClick={()=>confirmAction(tr('确认关闭天文台顶棚','Confirm roof closure'),tr('执行前请确认望远镜已 PARK，顶棚运行路径内没有人员或设备。','Make sure the mount is parked and the roof path is clear.'),()=>{setDomeOpen(false);return send('esp32-001','motor_reverse')})}>{tr('关顶','Close Roof')}</button><button onClick={()=>confirmAction(tr('确认打开天文台顶棚','Confirm roof opening'),tr('请确认现场天气安全、顶棚锁止已解除，且运行路径内没有障碍物。','Confirm safe weather, unlocked latches and a clear roof path.'),()=>{setDomeOpen(true);return send('esp32-001','motor_forward')})}>{tr('开顶','Open Roof')}</button></div>
    </section>

    <section className="reference-right">
      <GlassCard title={tr('天文观测','Observation')} status={online('esp32-001')?tr('活动','Active'):tr('待机','Standby')}>
        <div className="observation-stats compact"><label>{tr('蓝牙','Bluetooth')}<b>{b(env.bluetooth)?tr('已连接','Linked'):tr('离线','Offline')}</b></label><label>{tr('ZWO 供电','ZWO Power')}<b>{b(env.mosfet)?'ON':'OFF'}</b></label><label>{tr('剩余时间','Time Left')}<b>{formatRuntime(env.runtime_remaining??env.uptime_remaining)}</b></label></div>
        <div className="onstep-grid">{[['SYNC',1],['PARK',2],['UNPARK',3],['HOME',4],['SET HOME',5],['SET PARK',6]].map(([label,action])=><button key={label} onClick={()=>send('esp32-001','onstep',{action})}>{label}</button>)}</div>
        <div className="obs-power-toggle"><span>{tr('ZWO 设备供电','ZWO device power')}</span><div className="dense-controls"><DenseControl k="toggle" l="ZWO" v={b(env.mosfet)} f={v=>send('esp32-001','mosfet',{state:v?1:0})}/></div></div>
      </GlassCard>
      <GlassCard title={tr('环境','Environment')} status={online('esp32-001')?tr('良好','Good'):tr('离线','Offline')}>
        <EnvRow icon="♨" label={tr('环境温度','Air Temperature')} value={`${temp.toFixed(1)}°C`}/><EnvRow icon="◉" label={tr('环境湿度','Humidity')} value={`${hum.toFixed(1)}%`}/><EnvRow icon="☁" label={tr('雨水检测','Rain Detection')} value={b(env.rain_detected)?tr('有水','Wet'):tr('无水','Clear')}/><EnvRow icon="◇" label={tr('传感器温度','Probe Temperature')} value={`${n(env.utc_temperature,data.utcTemp).toFixed(1)}°C`}/><EnvRow icon="♨" label={tr('加热片状态','Heater State')} value={b(env.heater)?'ON':'OFF'}/>
      </GlassCard>
    </section>

    <section className="reference-bottom">
      <GlassCard title={tr('MPPT 历史','MPPT History')} className="multi-chart-card"><MultiHistoryWidget records={hist['mppt-001']||[]} lang={lang} series={[["battery_percent",tr('电池电量','Battery'),"%","#4fd18b"],["current_input",tr('输入电流','Input Current'),"A","#55a7ff"],["buck_current",tr('BUCK 电流','Buck Current'),"A","#f1b35c"]]}/></GlassCard>
      <GlassCard title={tr('设备终端','Device Terminal')} actions={[{label:tr('高级设置','Advanced'),f:()=>openModal('advanced')},{label:tr('查看全部','View All'),f:()=>openModal('terminal')}] } className="terminal-overview-card"><CompactTerminal lines={data.logs} send={send}/></GlassCard>
      <GlassCard title={tr('环境历史','Environment History')} className="multi-chart-card"><MultiHistoryWidget records={hist['esp32-001']||[]} lang={lang} series={[["dht_temperature",tr('环境温度','Air Temp'),"°C","#4fd18b"],["dht_humidity",tr('环境湿度','Humidity'),"%","#55a7ff"],["utc_temperature",tr('传感器温度','Probe Temp'),"°C","#f1b35c"],["heater",tr('加热片','Heater'),"","#e96f8e"]]}/></GlassCard>
    </section>
  </main>;
};
const GlassCard=({title,status,action,actions,className='',children})=>{const statusOff=/offline|standby|离线|待机|0\/3/i.test(status||'');return <article className={`glass-card ref-card ${className}`}><header><h2>{title}</h2>{status&&<span className={`ref-status ${statusOff?'off':''}`}><i/>{status}</span>}{action&&<button>{action}</button>}{actions&&<div className="ref-actions">{actions.map((a,i)=><button key={i} onClick={a.f}>{a.label}</button>)}</div>}</header>{children}</article>};
const StatusRow=({icon,title,sub,value,on})=><div className="status-row"><i className={on?'on':''}>{icon}</i><span>{title}<small className={on?'on':''}>{sub}</small></span><b>{value}</b></div>;
const EnvRow=({icon,label,value})=><div className="env-row"><i>{icon}</i><span>{label}</span><b>{value}</b></div>;
const HeroCallout=({className,title,detail,value})=><div className={`hero-callout ${className}`}><small>{title}</small><span>{detail}</span><b>{value}</b><i/></div>;
const formatRuntime=v=>{const s=Number(v);if(!Number.isFinite(s)||s<=0)return '--:--:--';const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`};

const CriticalConfirm=({title,detail,cancel,proceed})=>{
  const [busy,setBusy]=React.useState(false);
  const run=async()=>{setBusy(true);try{await proceed();}finally{setBusy(false)}};
  return <div className="critical-confirm-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)cancel()}}>
    <section className="critical-confirm" role="alertdialog" aria-modal="true" aria-labelledby="critical-confirm-title">
      <span className="critical-confirm-mark"><Icon name="alert" size={20}/></span>
      <small>SAFETY CHECK · 安全确认</small>
      <h2 id="critical-confirm-title">{title}</h2>
      <p>{detail}</p>
      <div><button onClick={cancel} disabled={busy}>取消</button><button className="danger" onClick={run} disabled={busy}>{busy?'正在发送…':'确认执行'}</button></div>
    </section>
  </div>;
};

const DashboardModal=({type,close,data,set,mppt,n,b,send,lang})=>{
  const tr=(zh,en)=>lang==='zh'?zh:en;
  const details=[['输入电压',n(mppt.voltage_input),'V'],['输入电流',n(mppt.current_input),'A'],['输入功率',n(mppt.power_input),'W'],['电池',n(mppt.battery_percent),'%'],['降压电压',n(mppt.buck_voltage),'V'],['降压电流',n(mppt.buck_current),'A'],['降压功率',n(mppt.buck_power),'W'],['效率',n(mppt.buck_efficiency),'%'],['MOS 温度',n(mppt.temperature),'°C'],['PWM',n(mppt.pwm),''],['日发电',n(mppt.daily_energy),'Wh'],['总发电',n(mppt.total_energy),'Wh']];
  if(type==='mppt-details')return <ConsoleModal title={tr('MPPT 全部信息','MPPT Full Details')} close={close}><div className="modal-metric-grid">{details.map(([l,v,u])=><div key={l}><small>{l}</small><b>{v.toFixed(v>=100?0:1)}<i>{u}</i></b></div>)}</div></ConsoleModal>;
  if(type==='mppt-settings')return <ConsoleModal title={tr('MPPT 设置','MPPT Settings')} close={close}><div className="modal-settings-columns"><section><h3>{tr('运行控制','Runtime Control')}</h3><DenseControls single controls={[{k:'toggle',l:'强制风扇',v:b(mppt.fan),f:v=>send('mppt-001','fan',{state:v})},{k:'toggle',l:'自动风扇',v:b(mppt.enable_fan,true),f:v=>send('mppt-001','enable_fan',{state:v})},{k:'select',l:'算法',v:n(mppt.mode),o:[[0,'CC/CV'],[1,'MPPT']],f:v=>send('mppt-001','mode',{value:+v})},{k:'button',l:'读取诊断',f:()=>send('mppt-001','debug')}]}/></section><section><h3>{tr('电池与散热参数','Battery & Thermal')}</h3><DenseControls single controls={[{k:'number',l:'截止电压',v:n(mppt.voltage_battery_min,10),min:8,max:20,step:.1,u:'V',f:v=>send('mppt-001','voltage_battery_min',{value:v})},{k:'number',l:'满电电压',v:n(mppt.voltage_battery_max,14.4),min:12,max:48,step:.1,u:'V',f:v=>send('mppt-001','voltage_battery_max',{value:v})},{k:'number',l:'最大电流',v:n(mppt.current_charging,2),min:.1,max:20,step:.1,u:'A',f:v=>send('mppt-001','current_charging',{value:v})},{k:'number',l:'风扇阈值',v:n(mppt.temperature_fan,60),min:20,max:80,step:1,u:'°C',f:v=>send('mppt-001','temperature_fan',{value:v})}]}/></section></div></ConsoleModal>;
  if(type==='advanced')return <ConsoleModal title={tr('高级设置','Advanced Settings')} close={close} wide><AdvancedSettingsPanel data={data} set={set} lang={lang}/></ConsoleModal>;
  return <ConsoleModal title={tr('全部终端信息','All Terminal Messages')} close={close} wide><div className="full-terminal"><Terminal lines={data.logs?.length?data.logs:[{t:'--:--',lv:'info',msg:tr('等待 MQTT 消息','Waiting for MQTT messages')}]}/></div></ConsoleModal>;
};
const ConsoleModal=({title,close,wide,children})=><div className="console-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className={`console-modal ${wide?'wide':''}`} role="dialog" aria-label={title}><header><h2>{title}</h2><button onClick={close} aria-label="关闭">×</button></header><div className="console-modal-body">{children}</div></section></div>;

const AdvancedSettingsPanel=({data,set,lang})=>{const tr=(zh,en)=>lang==='zh'?zh:en;return <div className="advanced-grid">
  <AdvancedGroup title={tr('遥测与告警','Telemetry & Alerts')}><AdvancedSlider label={tr('上报间隔','Report Interval')} min={1} max={300} val={data.reportInterval} unit="s" f={v=>set('reportInterval',v)}/><AdvancedSlider label={tr('湿度阈值','Humidity Threshold')} min={40} max={95} val={data.humidityThreshold} unit="%" f={v=>set('humidityThreshold',v)}/><AdvancedSlider label={tr('温差阈值','Temperature Delta')} min={1} max={10} val={data.tempDiffThreshold} unit="°C" f={v=>set('tempDiffThreshold',v)}/></AdvancedGroup>
  <AdvancedGroup title={tr('风扇与圆顶','Fan & Roof')}><div className="advanced-row"><span>{tr('自动风扇','Auto Fan')}</span><Switch on={data.fanAuto} onChange={v=>set('fanAuto',v)}/></div><AdvancedSlider label={tr('风扇启停温度','Fan Temperature')} min={20} max={60} val={data.fanTempThreshold} unit="°C" f={v=>set('fanTempThreshold',v)}/><div className="advanced-row"><span>{tr('雨水自动关顶','Auto-close on Rain')}</span><Switch on={data.motorAuto} onChange={v=>set('motorAuto',v)}/></div></AdvancedGroup>
  <AdvancedGroup title={tr('网络与串口','Network & Serial')}><div className="advanced-row"><span>Wi-Fi<small>ATLAS-5G · RSSI -54 dBm</small></span><b>ONLINE</b></div><div className="advanced-row"><span>Blynk Token<small>•••• •••• •••• ••3a8f</small></span><button>{tr('编辑','Edit')}</button></div><div className="advanced-row"><span>{tr('蓝牙串口','Bluetooth Serial')}</span><Switch on={data.btConnected} onChange={v=>set('btConnected',v)}/></div></AdvancedGroup>
  <AdvancedGroup title={tr('系统','System')}><div className="advanced-row"><span>{tr('固件版本','Firmware')}<small>v2.4.1 · ESP32-S3</small></span><b>{tr('已安装','Installed')}</b></div><div className="advanced-row"><span>{tr('调试输出','Debug Output')}</span><button>{tr('发送','Send')}</button></div><div className="advanced-row"><span>{tr('串口日志','Serial Log')}</span><button>{tr('导出','Export')}</button></div><div className="advanced-row danger"><span>{tr('恢复出厂','Factory Reset')}</span><button>{tr('重置 EEPROM','Reset EEPROM')}</button></div></AdvancedGroup>
</div>};
const AdvancedGroup=({title,children})=><section className="advanced-group"><h3>{title}</h3>{children}</section>;
const AdvancedSlider=({label,min,max,val,unit,f})=><label className="advanced-slider"><span>{label}</span><input type="range" min={min} max={max} value={val} onChange={e=>f(+e.target.value)}/><b>{val}{unit}</b></label>;

const MultiHistoryWidget=({records,series,lang})=>{
  const tr=(zh,en)=>lang==='zh'?zh:en,[open,setOpen]=React.useState(false),[days,setDays]=React.useState(7),[enabled,setEnabled]=React.useState(()=>series.map(s=>s[0])),[xMode,setXMode]=React.useState('datetime'),[rangeMode,setRangeMode]=React.useState('auto'),[yMin,setYMin]=React.useState(''),[yMax,setYMax]=React.useState('');
  const cutoff=Date.now()-days*86400000, rows=(records||[]).filter(r=>!r.ts||!Number.isFinite(Date.parse(r.ts))||Date.parse(r.ts)>=cutoff), active=series.filter(s=>enabled.includes(s[0]));
  return <div className="multi-history"><div className="chart-toolbar"><div className="chart-legend">{series.map(([key,label,u,color])=><button key={key} className={enabled.includes(key)?'on':''} onClick={()=>setEnabled(a=>a.includes(key)?a.filter(x=>x!==key):[...a,key])}><i style={{background:color}}/>{label}</button>)}</div><button className="chart-settings-button" onClick={()=>setOpen(!open)}>{tr('高级设置','Advanced')} ⚙</button></div><MultiHistoryChart rows={rows} series={active} xMode={xMode} fixedMin={rangeMode==='fixed'?+yMin:null} fixedMax={rangeMode==='fixed'?+yMax:null}/>{open&&<div className="multi-history-settings"><label>{tr('时间范围','Timeline')}<select value={days} onChange={e=>setDays(+e.target.value)}><option value="1">1 {tr('天','day')}</option><option value="3">3 {tr('天','days')}</option><option value="7">7 {tr('天','days')}</option><option value="14">14 {tr('天','days')}</option><option value="30">30 {tr('天','days')}</option></select></label><label>X {tr('轴','Axis')}<select value={xMode} onChange={e=>setXMode(e.target.value)}><option value="time">{tr('时间','Time')}</option><option value="date">{tr('日期','Date')}</option><option value="datetime">{tr('日期+时间','Date + Time')}</option></select></label><label>Y {tr('轴','Axis')}<select value={rangeMode} onChange={e=>setRangeMode(e.target.value)}><option value="auto">{tr('自动','Auto')}</option><option value="fixed">{tr('自定义','Custom')}</option></select></label>{rangeMode==='fixed'&&<div className="multi-range"><input type="number" placeholder={tr('最小','Min')} value={yMin} onChange={e=>setYMin(e.target.value)}/><input type="number" placeholder={tr('最大','Max')} value={yMax} onChange={e=>setYMax(e.target.value)}/></div>}</div>}</div>;
};
const MultiHistoryChart=({rows,series,xMode,fixedMin,fixedMax})=>{
  const value=(r,key)=>{const aliases={dht_temperature:['dht_temperature','dhtTemp'],dht_humidity:['dht_humidity','dhtHumidity','humidity'],utc_temperature:['utc_temperature','utcTemp'],battery_percent:['battery_percent','battery'],current_input:['current_input','input_current'],buck_current:['buck_current','output_current']};if(key==='heater')return r.heater?1:0;const keys=aliases[key]||[key];for(const k of keys){const v=Number(r[k]);if(Number.isFinite(v))return v}return 0};
  const w=420,h=118,pL=28,pR=8,pT=8,pB=18,vals=[];series.forEach(([key])=>rows.forEach(r=>vals.push(value(r,key))));const rawMin=vals.length?Math.min(...vals):0,rawMax=vals.length?Math.max(...vals):100,valid=Number.isFinite(fixedMin)&&Number.isFinite(fixedMax)&&fixedMax>fixedMin,min=valid?fixedMin:rawMin-(rawMax-rawMin||1)*.1,max=valid?fixedMax:rawMax+(rawMax-rawMin||1)*.1,range=max-min||1,fmt=ts=>{const d=ts?new Date(ts):null;if(!d||Number.isNaN(+d))return '--';if(xMode==='time')return d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});if(xMode==='date')return d.toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'});return `${d.toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'})} ${d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`};
  return <svg className="multi-history-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">{[0,.5,1].map(q=><g key={q}><line x1={pL} y1={pT+(h-pT-pB)*q} x2={w-pR} y2={pT+(h-pT-pB)*q}/><text x={pL-4} y={pT+(h-pT-pB)*q+3} textAnchor="end">{(max-range*q).toFixed(1)}</text></g>)}{series.map(([key,label,u,color])=>{const pts=rows.map((r,i)=>({ts:r.ts,v:value(r,key),i}));if(pts.length<2)return null;const xy=pts.map(p=>[pL+p.i*(w-pL-pR)/Math.max(1,rows.length-1),pT+(h-pT-pB)*(1-(p.v-min)/range)]),path=xy.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' ');return <path key={key} d={path} style={{stroke:color}}/>})}{rows.length>1&&[0,Math.floor((rows.length-1)/2),rows.length-1].map((idx,i)=><text className="x-label" key={i} x={pL+idx*(w-pL-pR)/(rows.length-1)} y={h-4} textAnchor={i===0?'start':i===2?'end':'middle'}>{fmt(rows[idx].ts)}</text>)}</svg>;
};

const DevicePanel=({title,subtitle,id,state={},className='',children})=><section className={`device-panel ${state.online?'online':''} ${className}`}><header><div><span className="panel-index">{id==='mppt-001'?'01':id==='esp32-001'?'02':'03'}</span><div><h2>{title}</h2><small>{subtitle} · {id}</small></div></div><span className={state.online?'on':''}><i/>{state.online?'在线':'离线'}<time>{state.lastSeen?new Date(state.lastSeen).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):''}</time></span></header>{children}</section>;
const MetricGrid=({items,cols})=><div className="dense-metrics" style={{gridTemplateColumns:`repeat(${cols},1fr)`}}>{items.map(([l,v,u])=><div key={l}><small>{l}</small><b>{typeof v==='number'?<NumRoll value={v} decimals={v>=100?0:1}/>:v}<i>{u}</i></b></div>)}</div>;
const Subhead=({text})=><h3 className="compact-subhead"><span>{text}</span></h3>;
const DenseControls=({controls,single})=><div className={`dense-controls ${single?'single':''}`}>{controls.map((c,i)=><DenseControl key={`${c.l}-${i}`} {...c}/>)}</div>;
const DenseControl=({k,l,v,f,o,min,max,step,u})=>{
  const [x,setX]=React.useState(v??0),[localOn,setLocalOn]=React.useState(Boolean(v)),[pending,setPending]=React.useState(false);
  React.useEffect(()=>setX(v??0),[v]); React.useEffect(()=>setLocalOn(Boolean(v)),[v]);
  if(k==='toggle')return <label><span>{l}</span><button className={`state-toggle ${localOn?'on':''} ${pending?'pending':''}`} disabled={pending} onClick={async()=>{const next=!localOn;setLocalOn(next);setPending(true);const r=await f(next);setPending(false);if(!r?.ok)setLocalOn(!next)}} aria-label={l} aria-pressed={localOn} title={pending?'正在发送命令':localOn?'点击关闭':'点击开启'}><i/><span>{pending?'…':localOn?'ON':'OFF'}</span></button></label>;
  if(k==='button')return <label><span>{l}</span><button onClick={async e=>{e.currentTarget.disabled=true;await f();e.currentTarget.disabled=false}}>执行</button></label>;
  if(k==='select')return <label><span>{l}</span><select value={v} onChange={e=>f(e.target.value)}>{o.map(([a,z])=><option value={a} key={a}>{z}</option>)}</select></label>;
  if(k==='number')return <label><span>{l}</span><em><input type="number" aria-label={`${l} ${u}`} value={x} min={min} max={max} step={step} onChange={e=>setX(e.target.value)} onBlur={()=>{const z=+x;if(Number.isFinite(z)&&z>=min&&z<=max)f(z)}}/><i>{u}</i></em></label>;
  return <label className="slider"><span>{l}<b>{x}{u}</b></span><input type="range" aria-label={`${l} ${x}${u}`} value={x} min={min} max={max} onChange={e=>setX(+e.target.value)} onMouseUp={()=>f(+x)} onTouchEnd={()=>f(+x)}/></label>
};

const HistoryPanel=({title,records,metrics,defaultMetric})=>{
  const [open,setOpen]=React.useState(false),[days,setDays]=React.useState(7),[metric,setMetric]=React.useState(defaultMetric),[xMode,setXMode]=React.useState('datetime'),[rangeMode,setRangeMode]=React.useState('auto'),[yMin,setYMin]=React.useState(''),[yMax,setYMax]=React.useState('');
  const meta=metrics.find(x=>x[0]===metric)||metrics[0], cutoff=Date.now()-days*86400000;
  const points=(records||[]).map(r=>({ts:r.ts||r.timestamp,v:Number(r[metric])})).filter(p=>Number.isFinite(p.v)&&(!p.ts||!Number.isFinite(Date.parse(p.ts))||Date.parse(p.ts)>=cutoff));
  return <div className="history-panel">
    <div className="history-heading"><span><b>{title}</b><small>{meta[1]} · 最近 {days} 天</small></span><button className={open?'active':''} onClick={()=>setOpen(!open)} aria-label={`${title}设置`}>设置 ⚙</button></div>
    <HistoryChart points={points} unit={meta[2]} xMode={xMode} fixedMin={rangeMode==='fixed'?Number(yMin):null} fixedMax={rangeMode==='fixed'?Number(yMax):null}/>
    {open&&<div className="history-settings" role="dialog" aria-label={`${title}图表设置`}>
      <header><b>图表设置</b><button onClick={()=>setOpen(false)}>×</button></header>
      <label>时间范围<select value={days} onChange={e=>setDays(+e.target.value)}><option value="1">最近 1 天</option><option value="3">最近 3 天</option><option value="7">最近 7 天</option><option value="14">最近 14 天</option><option value="30">最近 30 天</option></select></label>
      <label>显示数据<select value={metric} onChange={e=>setMetric(e.target.value)}>{metrics.map(([k,l,u])=><option key={k} value={k}>{l}{u?` (${u})`:''}</option>)}</select></label>
      <label>X 轴<select value={xMode} onChange={e=>setXMode(e.target.value)}><option value="time">时间</option><option value="date">日期</option><option value="datetime">日期 + 时间</option></select></label>
      <label>Y 轴范围<select value={rangeMode} onChange={e=>setRangeMode(e.target.value)}><option value="auto">自动范围</option><option value="fixed">自定义范围</option></select></label>
      {rangeMode==='fixed'&&<div className="range-inputs"><input type="number" placeholder="最小值" value={yMin} onChange={e=>setYMin(e.target.value)}/><span>—</span><input type="number" placeholder="最大值" value={yMax} onChange={e=>setYMax(e.target.value)}/></div>}
    </div>}
  </div>;
};
const HistoryChart=({points,unit,xMode,fixedMin,fixedMax})=>{
  if(points.length<2)return <div className="history-empty"><i/><span>等待历史数据</span></div>;
  const w=360,h=82,pL=32,pR=8,pT=7,pB=18,vals=points.map(p=>p.v),rawMin=Math.min(...vals),rawMax=Math.max(...vals),validFixed=Number.isFinite(fixedMin)&&Number.isFinite(fixedMax)&&fixedMax>fixedMin,min=validFixed?fixedMin:rawMin-(rawMax-rawMin||1)*.12,max=validFixed?fixedMax:rawMax+(rawMax-rawMin||1)*.12,range=max-min||1;
  const pts=points.map((p,i)=>[pL+i*(w-pL-pR)/(points.length-1),pT+(h-pT-pB)*(1-(p.v-min)/range)]),path=pts.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' '),fill=`${path} L${pts[pts.length-1][0]},${h-pB} L${pts[0][0]},${h-pB} Z`,fmt=ts=>{const d=ts?new Date(ts):null;if(!d||Number.isNaN(+d))return '--';if(xMode==='time')return d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});if(xMode==='date')return d.toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'});return `${d.toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'})} ${d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`};
  return <svg className="history-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">{[0,.5,1].map((q,i)=><g key={q}><line x1={pL} y1={pT+(h-pT-pB)*q} x2={w-pR} y2={pT+(h-pT-pB)*q}/><text x={pL-4} y={pT+(h-pT-pB)*q+3} textAnchor="end">{(max-range*q).toFixed(1)}{i===0?unit:''}</text></g>)}<path className="chart-fill" d={fill}/><path className="chart-line" d={path}/>{[0,Math.floor((points.length-1)/2),points.length-1].map((idx,i)=><text className="x-label" key={i} x={pts[idx][0]} y={h-4} textAnchor={i===0?'start':i===2?'end':'middle'}>{fmt(points[idx].ts)}</text>)}<circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.5"/></svg>;
};

const CompactTerminal=({lines,send})=>{const [v,setV]=React.useState(''),[target,setTarget]=React.useState('esp32-001');return <div className="compact-terminal"><Terminal lines={lines?.length?lines.slice(0,3):[{t:'--:--',lv:'info',msg:'等待 MQTT 消息'}]}/><div><select value={target} onChange={e=>setTarget(e.target.value)} aria-label="终端目标设备"><option value="esp32-001">IoT 环境</option><option value="mppt-001">MPPT 电源</option><option value="ef-001">电动平场板</option></select><input value={v} onChange={e=>setV(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&v.trim()){send(target,'terminal',{value:v.trim()});setV('')}}} placeholder={`发往 ${target} 的终端命令`}/><button onClick={()=>{if(v.trim()){send(target,'terminal',{value:v.trim()});setV('')}}}>发送</button></div></div>};
window.AdvancedSettingsPanel=AdvancedSettingsPanel;
window.Dashboard=Dashboard;
