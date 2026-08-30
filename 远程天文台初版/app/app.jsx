/* global React, Icon, useApiLiveData, LoginScreen, Dashboard, AdvancedScreen, ProfileScreen */
const { useState, useEffect } = React;

const NAV_ITEMS = [
  { id: 'dashboard', label: '观测控制大屏', icon: 'dashboard', badge: 'LIVE' }
];
const NAV_BOTTOM = [
  { id: 'advanced', label: '高级设置', icon: 'settings' },
  { id: 'profile', label: '个人中心', icon: 'user' }
];
const readStored = (key, fallback) => { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (_) { return fallback; } };

function App({ variant }) {
  const hash = window.location.hash.slice(1);
  const validRoutes = [...NAV_ITEMS, ...NAV_BOTTOM].map(item => item.id);
  const [route, setRoute] = useState(validRoutes.includes(hash) ? hash : 'login');
  const [theme, setTheme] = useState(() => readStored('astroy.theme', 'dark'));
  const [accent, setAccent] = useState(() => readStored('astroy.accent', variant === 'eclipse' ? '#27E58A' : '#4FB6FF'));
  const [lang, setLang] = useState(() => readStored('astroy.lang', 'zh'));
  const [fontSize, setFontSize] = useState(() => readStored('astroy.fontSize', 'normal'));
  const [notifications, setNotifications] = useState(() => readStored('astroy.notifications', {deviceOffline:true,rainAlert:true,capturePush:false,email:false}));
  const [credentials, setCredentials] = useState(() => readStored('astroy.credentials', {user:'astro',password:'astro1234'}));
  const [security, setSecurity] = useState(() => readStored('astroy.security', {twoFactor:false,otherSessions:true}));
  const [data, set, sendCommand] = useApiLiveData(true);
  const [mobile, setMobile] = useState(window.innerWidth < 700);

  useEffect(() => {
    const update = () => setMobile(window.innerWidth < 700);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font-size', fontSize);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem('astroy.theme', JSON.stringify(theme));
    localStorage.setItem('astroy.accent', JSON.stringify(accent));
    localStorage.setItem('astroy.lang', JSON.stringify(lang));
    localStorage.setItem('astroy.fontSize', JSON.stringify(fontSize));
    localStorage.setItem('astroy.notifications', JSON.stringify(notifications));
    localStorage.setItem('astroy.credentials', JSON.stringify(credentials));
    localStorage.setItem('astroy.security', JSON.stringify(security));
  }, [accent, theme, lang, fontSize, notifications, credentials, security]);
  useEffect(() => {
    if (route !== 'login') window.location.hash = route;
  }, [route]);

  if (route === 'login') return <LoginScreen lang={lang} credentials={credentials} onLogin={(user,pwd) => { const ok=user===credentials.user&&pwd===credentials.password; if(ok)setRoute('dashboard'); return ok; }}/>;

  const prefs = {lang,setLang,fontSize,setFontSize,notifications,setNotifications,security,setSecurity,credentials,setCredentials};
  const props = { data, set, sendCommand, mobile, ...prefs };
  const screens = {
    dashboard: <Dashboard {...props} onNavigate={setRoute}/>,
    advanced: <AdvancedScreen {...props} onBack={()=>setRoute('dashboard')}/>,
    profile: <ProfileScreen {...props} theme={theme} onThemeToggle={setTheme} accent={accent} onAccentChange={setAccent} onLogout={() => setRoute('login')} onBack={()=>setRoute('dashboard')}/>
  };

  return <div className={`app-shell ${mobile ? 'mobile' : ''} ${['dashboard','profile','advanced'].includes(route) ? 'console-shell' : ''}`}>
    {!mobile && !['dashboard','profile','advanced'].includes(route) && <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo">◉</div>
        <div><div className="brand-name">远程天文台</div><small className="brand-sub">3 × ESP32 · MQTT</small></div>
      </div>
      <div className="sidebar-section">设备与观测</div>
      {NAV_ITEMS.map(item => <NavItem key={item.id} item={item} active={route === item.id} onClick={() => setRoute(item.id)}/>)}
      <div className="sidebar-section">系统</div>
      {NAV_BOTTOM.map(item => <NavItem key={item.id} item={item} active={route === item.id} onClick={() => setRoute(item.id)}/>)}
      <div className="sidebar-footer" onClick={() => setRoute('profile')}>
        <div className="avatar">A</div><div className="who">astro<small>Astroy Observatory</small></div>
      </div>
    </aside>}
    <main className={`main ${mobile ? 'mobile' : ''}`}>{screens[route] || screens.dashboard}</main>
    {mobile && route !== 'dashboard' && <nav className="bottom-nav">{[
      { id: 'dashboard', label: '观测大屏', icon: 'dashboard' },
      { id: 'advanced', label: '设置', icon: 'settings' },
      { id: 'profile', label: '我的', icon: 'user' }
    ].map(item => <div key={item.id} className={`b-item ${route === item.id ? 'active' : ''}`} onClick={() => setRoute(item.id)}><Icon name={item.icon}/><span>{item.label}</span></div>)}</nav>}
  </div>;
}

const NavItem = ({ item, active, onClick }) => <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
  <Icon name={item.icon} size={15} className="nav-icon"/><span>{item.label}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}
</div>;
window.App = App;
