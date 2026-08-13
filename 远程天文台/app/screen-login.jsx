/* global React, Icon */
// Login screen — 全屏星空 + 中央卡

const { useState: useStateLogin } = React;

const LoginScreen = ({ onLogin }) => {
  const [user, setUser] = useStateLogin('astro');
  const [pwd, setPwd] = useStateLogin('••••••••');
  const [showPwd, setShowPwd] = useStateLogin(false);
  const [loading, setLoading] = useStateLogin(false);
  const submit = (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setTimeout(() => {setLoading(false);onLogin();}, 700);
  };
  return (
    <div className="login-wrap">
      <div className="login-galaxy"></div>
      <div className="login-galaxy two"></div>
      <div className="login-stars"></div>
      <form className="login-card" onSubmit={submit}>
        <div className="lcap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a14 14 0 0 1 0 18" />
            <path d="M3 12h18" />
          </svg>
        </div>
        <h2 style={{ textAlign: "center" }}>欢迎回到 远程天文台</h2>
        <p className="intro" style={{ textAlign: "center" }}>连接你的 ESP32 控制盒，开始今晚的观测。</p>

        <label style={{ textAlign: "left" }}>用户名</label>
        <input className="field" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />

        <label>密码</label>
        <div style={{ position: 'relative' }}>
          <input
            className="field"
            type={showPwd ? 'text' : 'password'}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoComplete="current-password"
            style={{ paddingRight: 40 }} />
          
          <button
            type="button"
            onClick={() => setShowPwd((s) => !s)}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
              padding: 6, display: 'inline-flex'
            }}>
            
            <Icon name={showPwd ? 'eyeoff' : 'eye'} />
          </button>
        </div>

        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? '连接中…' : <>进入控制台 <Icon name="arrow" size={14} /></>}
        </button>
        <div className="login-foot">
          <span>无账号？<a href="#">申请注册</a></span>
          <a href="#">忘记密码</a>
        </div>
      </form>
    </div>);

};

window.LoginScreen = LoginScreen;