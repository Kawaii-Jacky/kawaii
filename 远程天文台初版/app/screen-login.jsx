/* global React, Icon */
const LoginScreen = ({ onLogin, lang='zh', credentials }) => {
  const [user,setUser]=React.useState(credentials?.user||'astro'),[pwd,setPwd]=React.useState(''),[showPwd,setShowPwd]=React.useState(false),[loading,setLoading]=React.useState(false),[error,setError]=React.useState('');
  const tr=(zh,en)=>lang==='zh'?zh:en;
  const submit=e=>{e?.preventDefault();setLoading(true);setError('');setTimeout(()=>{const ok=onLogin(user.trim(),pwd);setLoading(false);if(!ok)setError(tr('用户名或密码错误','Incorrect username or password'));},320)};
  return <div className="login-wrap console-login"><div className="login-galaxy"/><div className="login-galaxy two"/><div className="login-stars"/><form className="login-card" onSubmit={submit}>
    <div className="login-brand-r">R</div><small className="login-kicker">REMOTE OBSERVATORY / SECURE ACCESS</small><h2>{tr('登录远程天文台','Sign in to Remote Observatory')}</h2><p className="intro">{tr('验证账户后进入设备控制台','Authenticate to enter the device console')}</p>
    <label>{tr('用户名','Username')}</label><input className="field" value={user} onChange={e=>setUser(e.target.value)} autoComplete="username" aria-label={tr('用户名','Username')}/>
    <label>{tr('密码','Password')}</label><div className="password-field"><input className="field" type={showPwd?'text':'password'} value={pwd} onChange={e=>setPwd(e.target.value)} autoComplete="current-password" aria-label={tr('密码','Password')}/><button type="button" aria-label={tr('显示密码','Show password')} onClick={()=>setShowPwd(!showPwd)}><Icon name={showPwd?'eyeoff':'eye'}/></button></div>
    {error&&<div className="login-error" role="alert">{error}</div>}
    <button className="login-btn" type="submit" disabled={loading||!user.trim()||!pwd}>{loading?tr('验证中…','Authenticating…'):tr('进入控制台','Enter Console')}</button>
    <div className="login-foot"><span>{tr('默认账户：astro','Default account: astro')}</span><span>{tr('凭据可在个人中心修改','Credentials can be changed in Profile')}</span></div>
  </form></div>;
};
window.LoginScreen=LoginScreen;
