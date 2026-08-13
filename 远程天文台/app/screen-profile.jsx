/* global React, Icon, Switch */
// Profile — 个人中心

const ProfileScreen = ({ data, set, theme, onThemeToggle, accent, onAccentChange, onLogout, mobile }) => {
  const devices = [
    { id: 'dome-01', name: '苍穹台北 · DOME-01', sub: 'ESP32-S3 · v2.4.1 · 在线', active: true },
    { id: 'dome-02', name: '玉龙雪山 · DOME-02', sub: 'ESP32-WROOM · v2.3.7 · 离线' },
    { id: 'dome-03', name: '阿里观测点 · DOME-03', sub: 'ESP32-S3 · v2.4.1 · 在线' },
  ];

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {!mobile ? (
        <div className="topbar"><h1>个人中心 <span className="meta">账户 · 设备 · 偏好</span></h1></div>
      ) : (
        <div className="mtopbar"><div className="mt-title">个人中心<small>账户与偏好</small></div></div>
      )}

      {/* 用户卡 */}
      <div className="card" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), color-mix(in oklch, var(--accent) 30%, #a78bfa))',
          display: 'grid', placeItems: 'center',
          fontSize: 22, fontWeight: 600, color: 'var(--bg)',
          fontFamily: 'var(--font-display)',
          boxShadow: '0 10px 30px color-mix(in oklch, var(--accent) 30%, transparent)',
        }}>陈</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>陈 · 天文爱好者</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>astro@cangqiong.io · 苍穹台北观测站台长</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <span className="chip acc"><Icon name="star" size={10}/>PRO</span>
            <span className="chip">注册 198 天</span>
            <span className="chip">3 台设备</span>
          </div>
        </div>
        <button className="btn ghost">编辑资料</button>
      </div>

      {/* 运行统计 */}
      <div className={`col-3 ${mobile ? 'mobile' : ''}`}>
        <StatBig label="累计观测时长" val="412.6" unit="h" trend="+18.2h 本月"/>
        <StatBig label="设备运行时长" val="86.4" unit="d" trend="DOME-01 不间断"/>
        <StatBig label="拍摄记录" val="1,284" unit="张" trend="本月 +132"/>
      </div>

      {/* 我的设备 */}
      <div className="section-h"><h2>我的设备</h2><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>切换以接管控制权</span><div className="line"/></div>
      <div className="col-3" style={{ gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)' }}>
        {devices.map(d => (
          <div key={d.id} className={`device-card ${d.active ? 'active' : ''}`}>
            <div className="pic"><Icon name="dome" size={20}/></div>
            <div className="info">
              <b>{d.name}</b>
              <small>{d.sub}</small>
            </div>
            {d.active && <span className="chip acc">在控</span>}
          </div>
        ))}
      </div>

      {/* 偏好 */}
      <div className="section-h"><h2>偏好</h2><div className="line"/></div>
      <div className="list-rows">
        <div className="list-row">
          <div className="lbl">外观<small>明暗主题切换</small></div>
          <div className="segmented">
            <button className={theme === 'dark' ? 'on' : ''} onClick={() => onThemeToggle('dark')}><Icon name="moon" size={11} style={{ verticalAlign: 'middle', marginRight: 4 }}/>深色</button>
            <button className={theme === 'light' ? 'on' : ''} onClick={() => onThemeToggle('light')}><Icon name="sun" size={11} style={{ verticalAlign: 'middle', marginRight: 4 }}/>浅色</button>
          </div>
        </div>
        <div className="list-row">
          <div className="lbl">主题色<small>影响高亮、按钮与图表强调色</small></div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { name: 'ice', c: '#6EE7F9' },
              { name: 'azure', c: '#4FB6FF' },
              { name: 'violet', c: '#A78BFA' },
              { name: 'amber', c: '#FBBF24' },
              { name: 'mint', c: '#5EEAD4' },
            ].map(o => (
              <button key={o.name}
                onClick={() => onAccentChange(o.c)}
                style={{
                  width: 26, height: 26, borderRadius: 6, padding: 0,
                  background: o.c,
                  border: accent === o.c ? '2px solid var(--text)' : '1px solid var(--border-strong)',
                  cursor: 'pointer',
                  boxShadow: accent === o.c ? `0 0 0 2px ${o.c}40` : 'none',
                }}
                aria-label={o.name}
              />
            ))}
          </div>
        </div>
        <div className="list-row">
          <div className="lbl">语言<small>界面与系统提示</small></div>
          <div className="segmented">
            <button className="on">中文</button>
            <button>EN</button>
          </div>
        </div>
        <div className="list-row">
          <div className="lbl">通知偏好<small>雨水告警 / 设备掉线 / OTA 可用</small></div>
          <Switch on={true} onChange={() => {}}/>
        </div>
      </div>

      <div className="list-rows">
        <div className="list-row">
          <div className="lbl">账号安全<small>修改密码 · 两步验证 · 登录设备</small></div>
          <button className="btn ghost">管理 <Icon name="chevron" size={12}/></button>
        </div>
        <div className="list-row" onClick={onLogout} style={{ cursor: 'pointer' }}>
          <div className="lbl" style={{ color: 'var(--danger)' }}>退出登录<small>断开 Blynk 会话</small></div>
          <button className="btn danger"><Icon name="logout" size={13}/>退出</button>
        </div>
      </div>
    </div>
  );
};

const StatBig = ({ label, val, unit, trend }) => (
  <div className="card">
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</div>
    <div style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 10, fontFamily: 'var(--font-display)' }}>
      {val}<span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 4, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>{unit}</span>
    </div>
    <div style={{ fontSize: 11.5, color: 'var(--accent)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{trend}</div>
  </div>
);

window.ProfileScreen = ProfileScreen;
