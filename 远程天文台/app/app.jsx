/* global React, ReactDOM, Icon, useLiveData,
   LoginScreen, Dashboard, SensorsScreen, AdvancedScreen, ProfileScreen */
// 远程天文台 · 主应用

const { useState, useEffect } = React;

const NAV_ITEMS = [
  { id: 'dashboard', label: '控制大屏', icon: 'dashboard', badge: 'LIVE' },
  { id: 'sensors',   label: '传感器',   icon: 'sensors' },
  { id: 'dome',      label: '圆顶',     icon: 'dome' },
  { id: 'power',     label: '电源',     icon: 'bolt' },
  { id: 'alerts',    label: '告警',     icon: 'alert', badge: '2' },
];
const NAV_ITEMS_BOTTOM = [
  { id: 'advanced', label: '高级设置', icon: 'settings' },
  { id: 'profile',  label: '个人中心', icon: 'user' },
];

function App({ variant }) {
  const startRoute = (() => {
    const h = window.location.hash.replace('#', '');
    if (['dashboard', 'sensors', 'advanced', 'profile'].includes(h)) return h;
    return 'login';
  })();
  const [route, setRoute] = useState(startRoute);     // login | dashboard | sensors | advanced | profile
  const [theme, setTheme] = useState('dark');
  const [accent, setAccent] = useState(variant === 'eclipse' ? '#6EE7F9' : '#4FB6FF');
  const [data, set] = useLiveData(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);

  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-dim',
      `color-mix(in oklch, ${accent} 18%, transparent)`);
  }, [accent]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (route === 'login') return <LoginScreen onLogin={() => setRoute('dashboard')}/>;

  const screen = (() => {
    if (route === 'dashboard' || route === 'dome' || route === 'power' || route === 'alerts')
      return <Dashboard data={data} set={set} mobile={isMobile}/>;
    if (route === 'sensors')  return <SensorsScreen data={data} mobile={isMobile}/>;
    if (route === 'advanced') return <AdvancedScreen data={data} set={set} mobile={isMobile}/>;
    if (route === 'profile')
      return <ProfileScreen
        data={data} set={set}
        theme={theme} onThemeToggle={setTheme}
        accent={accent} onAccentChange={setAccent}
        onLogout={() => setRoute('login')}
        mobile={isMobile}
      />;
    return null;
  })();

  return (
    <div className={`app-shell ${isMobile ? 'mobile' : ''}`}>
      {!isMobile && (
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="logo">⌖</div>
            <div>
              <div className="brand-name">远程天文台</div>
              <small className="brand-sub">v2.4.1 · ESP32</small>
            </div>
          </div>

          <div className="sidebar-section">观测</div>
          {NAV_ITEMS.map(it => (
            <NavItem key={it.id} item={it} active={route === it.id} onClick={() => setRoute(it.id === 'dome' || it.id === 'power' || it.id === 'alerts' ? 'dashboard' : it.id)}/>
          ))}

          <div className="sidebar-section">系统</div>
          {NAV_ITEMS_BOTTOM.map(it => (
            <NavItem key={it.id} item={it} active={route === it.id} onClick={() => setRoute(it.id)}/>
          ))}

          <div className="sidebar-footer" onClick={() => setRoute('profile')}>
            <div className="avatar">陈</div>
            <div className="who">
              astro
              <small>苍穹台北</small>
            </div>
          </div>
        </aside>
      )}

      <main className={`main ${isMobile ? 'mobile' : ''}`}>
        {screen}
      </main>

      {isMobile && (
        <nav className="bottom-nav">
          {[
            { id: 'dashboard', label: '大屏', icon: 'dashboard' },
            { id: 'sensors',   label: '传感器', icon: 'sensors' },
            { id: 'dome',      label: '圆顶',  icon: 'dome' },
            { id: 'advanced',  label: '设置',  icon: 'settings' },
            { id: 'profile',   label: '我的',  icon: 'user' },
          ].map(b => (
            <div key={b.id}
              className={`b-item ${route === b.id || (b.id === 'dashboard' && (route === 'dome' || route === 'power' || route === 'alerts')) ? 'active' : ''}`}
              onClick={() => setRoute(b.id === 'dome' ? 'dashboard' : b.id)}>
              <Icon name={b.icon}/>
              <span>{b.label}</span>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}

const NavItem = ({ item, active, onClick }) => (
  <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
    <Icon name={item.icon} size={15} className="nav-icon"/>
    <span>{item.label}</span>
    {item.badge && <span className="nav-badge">{item.badge}</span>}
  </div>
);

window.App = App;
