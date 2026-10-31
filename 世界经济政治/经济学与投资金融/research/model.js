/* ============================================================
 * 本科 / 硕士 / 博士 三条路线 · 实物期权-生命周期蒙特卡洛模型
 * 同一份代码：node 端生成论文表格，浏览器端驱动交互模型
 * 时间单位：年；货币单位：万元（2026 年不变价，实际值）
 * ============================================================ */
(function (root) {
'use strict';

/* ---------- 随机数（可复现） ---------- */
function rng(seed) {
  let a = seed >>> 0;
  const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let spare = null;
  const n = () => { if (spare !== null) { const s = spare; spare = null; return s; }
    let x, y, r; do { x = 2 * u() - 1; y = 2 * u() - 1; r = x * x + y * y; } while (r >= 1 || r === 0);
    const f = Math.sqrt(-2 * Math.log(r) / r); spare = y * f; return x * f; };
  const pois = (lam) => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= u(); } while (p > L); return k - 1; };
  return { u, n, pois };
}

/* ---------- 全局参数 ---------- */
const GLOBAL = {
  ageStart: 18,          // 本科入学
  ageDecide: 22,         // 本科毕业 = 决策时点 t=0（临床 23）
  ageRetire: 63,         // 渐进式延迟退休后男性法定年龄（女性 55/58 另做敏感性）
  r: 0.05,               // 个人实际折现率（基准）
  gamma: 2,              // CRRA 相对风险厌恶
  eta: 0.5,              // Frisch 劳动供给弹性（劳动负效用曲率 1+1/eta = 3）
  wRef: 7.0,             // 参照年收入（万元）：2025 届本科 6435 元/月 × 12 × 0.9 取整，用于标定劳动负效用
  hRef: 40,              // 法定标准工时
  living: 2.0,           // 在读年生活费（万元/年）
  ugTuition: 0.6,        // 本科学费（万元/年）
  ugHours: 42,           // 本科周学习时长
  prestige: 0.0,         // 文化惯性：学历名望红利（万元/年·等价），0 = 纯货币模型
  ageCap: 35,            // 制度年龄门槛（考公/大厂/青基）
  agePenalty: 0.03,      // 超过 30 岁初次进入市场的年龄折价/岁
  pAdmitM: 0.40,         // 考研/推免上岸概率（报名/录取约 3.1:1，取中上水平考生）
  sel: 0.40              // 学历起薪比中由选择效应（能力自选择）解释的对数份额；因果溢价 = (w_d/w_B)^(1−sel)
};

/* ---------- 七行业参数（详见论文 §4 校准表） ----------
 * w: 应届月收入（元），按学历 B/M/D
 * g: Mincer 经验曲线 log w = b1·x − b2·x²
 * mu/sig: 行业工资指数实际漂移/波动；lam/J: 政策-周期跳跃强度/幅度（对数）
 * sz: 个体能力-匹配离散度（对数标准差）
 * h35/l35: 35 岁后职业冲击年风险斜率 / 冲击后永久工资损失
 * H: 工作周时长（B/M/D），kap: 强度系数
 * entry: 入职摩擦 u=期望待业月数, m=降维/错配概率, pen=错配工资折价
 * M/D: 在读参数；P: 博士劳动市场
 */
const IND = {
  AI:    { name: 'AI 人工智能', short:'AI', w:{B:7500,M:16000,D:28000}, g:{b1:.100,b2:.0021}, mu:.015, sig:.20, lam:.12, J:-.15, sz:.42,
           h35:.0025, l35:.25, H:{B:54,M:54,D:52}, kap:1.10,
           entry:{B:{u:4.0,m:.50,pen:.30}, M:{u:3.0,m:.30,pen:.25}, D:{u:2.5,m:.15,pen:.20}},
           M:{n:2.5, tui:2.0, sti:1.4, H:52, kap:1.05}, D:{n:5, delay:[.60,.22,.10,.08], pc:.90, tui:1.0, sti:4.5, H:58, kap:1.15},
           P:{acad:.30, pd:2, wpd:28, pT:.45, wFac:30, Vind:10000, Uphd:8000} },
  BIO:   { name: '生物（生命科学/生物医药研发）', short:'生物', w:{B:5200,M:9000,D:20000}, g:{b1:.070,b2:.0014}, mu:.010, sig:.15, lam:.08, J:-.12, sz:.28,
           h35:.0015, l35:.25, H:{B:46,M:48,D:50}, kap:1.05,
           entry:{B:{u:5.0,m:.60,pen:.25}, M:{u:4.0,m:.40,pen:.20}, D:{u:4.0,m:.30,pen:.20}},
           M:{n:3, tui:0.8, sti:1.3, H:54, kap:1.10}, D:{n:5, delay:[.45,.30,.15,.10], pc:.88, tui:1.0, sti:3.8, H:62, kap:1.20},
           P:{acad:.55, pd:3, wpd:18, pT:.40, wFac:20, Vind:6000, Uphd:15000} },
  CLIN:  { name: '临床医学', short:'临床', w:{B:7000,M:9500,D:13000}, g:{b1:.070,b2:.0013}, mu:.010, sig:.06, lam:.06, J:-.08, sz:.22,
           h35:.0004, l35:.15, H:{B:55,M:56,D:58}, kap:1.25,
           entry:{B:{u:2.0,m:.40,pen:.25}, M:{u:2.0,m:.20,pen:.15}, D:{u:2.0,m:.10,pen:.10}},
           M:{n:3, tui:1.0, sti:1.5, H:64, kap:1.30}, D:{n:6, delay:[.80,.12,.05,.03], pc:.92, tui:1.0, sti:2.5, H:64, kap:1.30},
           P:{acad:0, pd:0, wpd:0, pT:.50, wFac:25, Vind:10000, Uphd:12000},
           clin:{bUG:5, gp:3, wGP:4.5} },
  BASIC: { name: '基础医学', short:'基础医学', w:{B:5500,M:8000,D:15000}, g:{b1:.065,b2:.0013}, mu:.010, sig:.06, lam:.04, J:-.06, sz:.22,
           h35:.0008, l35:.20, H:{B:46,M:48,D:52}, kap:1.05,
           entry:{B:{u:5.0,m:.65,pen:.25}, M:{u:4.0,m:.40,pen:.20}, D:{u:4.0,m:.30,pen:.20}},
           M:{n:3, tui:0.8, sti:1.3, H:54, kap:1.10}, D:{n:5, delay:[.75,.15,.06,.04], pc:.90, tui:1.0, sti:3.5, H:60, kap:1.18},
           P:{acad:.60, pd:3, wpd:16, pT:.40, wFac:18, Vind:2000, Uphd:5000} },
  EE:    { name: '电子电力（芯片/电气）', short:'电子电力', w:{B:7500,M:14000,D:22000}, g:{b1:.075,b2:.0015}, mu:.015, sig:.10, lam:.06, J:-.10, sz:.25,
           h35:.0010, l35:.20, H:{B:49,M:50,D:50}, kap:1.00,
           entry:{B:{u:3.0,m:.25,pen:.20}, M:{u:2.5,m:.20,pen:.15}, D:{u:3.0,m:.15,pen:.15}},
           M:{n:2.5, tui:2.0, sti:1.4, H:52, kap:1.05}, D:{n:5, delay:[.60,.22,.10,.08], pc:.90, tui:1.0, sti:4.0, H:58, kap:1.12},
           P:{acad:.30, pd:2, wpd:25, pT:.45, wFac:25, Vind:9000, Uphd:9000} },
  NET:   { name: '互联网（软件/计算机）', short:'互联网', w:{B:7300,M:13000,D:20000}, g:{b1:.095,b2:.0019}, mu:.000, sig:.15, lam:.12, J:-.15, sz:.38,
           h35:.0030, l35:.30, H:{B:52,M:52,D:50}, kap:1.10,
           entry:{B:{u:4.5,m:.45,pen:.30}, M:{u:3.5,m:.35,pen:.25}, D:{u:3.0,m:.30,pen:.20}},
           M:{n:2.5, tui:2.0, sti:1.4, H:52, kap:1.05}, D:{n:5, delay:[.60,.22,.10,.08], pc:.90, tui:1.0, sti:4.0, H:58, kap:1.12},
           P:{acad:.30, pd:2, wpd:28, pT:.45, wFac:30, Vind:4000, Uphd:6000} },
  FIN:   { name: '金融', short:'金融', w:{B:6500,M:12000,D:16000}, g:{b1:.090,b2:.0018}, mu:-.010, sig:.12, lam:.10, J:-.12, sz:.38,
           h35:.0030, l35:.30, H:{B:50,M:52,D:50}, kap:1.10,
           entry:{B:{u:4.5,m:.55,pen:.30}, M:{u:4.0,m:.40,pen:.25}, D:{u:4.0,m:.35,pen:.20}},
           M:{n:2, tui:5.0, sti:0.6, H:48, kap:1.05}, D:{n:5, delay:[.73,.17,.06,.04], pc:.90, tui:1.0, sti:3.0, H:56, kap:1.10},
           P:{acad:.50, pd:2, wpd:22, pT:.45, wFac:25, Vind:1500, Uphd:3000} }
};
const IND_KEYS = ['AI', 'BIO', 'CLIN', 'BASIC', 'EE', 'NET', 'FIN'];

/* ---------- 辅助 ---------- */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function wDeg(p, deg, G) {              // 因果口径的学历起薪（万元/年）
  const rB = p.w.B * 12 / 1e4; if (deg === 'B') return rB;
  return rB * Math.pow(p.w[deg] / p.w.B, 1 - G.sel);
}
function profile(p, x) { return Math.exp(p.g.b1 * x - p.g.b2 * x * x); }
function effortCost(Heff, G) {          // 货币化劳动负效用（万元/年）
  // u = y − φ·H^(1+1/η)/(1+1/η)，φ 标定使 H=hRef 时边际负效用 = 参照时薪
  const k = 1 + 1 / G.eta;
  return (G.wRef / k) * Math.pow(Heff / G.hRef, k);
}
function pMatchPhD(P, scale) {           // 匹配函数 M = A·U^α·V^(1−α)，α = 0.5，A = 0.85（匹配效率）
  const theta = (P.Vind * (scale || 1)) / P.Uphd;  // 市场紧度 V/U
  return clamp(0.85 * Math.pow(theta, 0.5), 0, 0.97);
}

/* ---------- 单路径模拟 ----------
 * route: 'B' | 'M' | 'D'
 * opt: { lateM:θ (B 路线在行业下行时回炉读研的阈值，null=无期权),
 *        toD:z* (M 路线毕业时转博阈值，null=无),
 *        exitD:k (D 路线第 2 年进展信号退出阈值，null=无退出权) }
 * 返回逐年数组（从 18 岁到 62 岁）
 */
function simPath(key, route, G, R, opt, scen) {
  const p = IND[key];
  const A0 = G.ageStart, AR = G.ageRetire, T = AR - A0;
  const inc = new Float64Array(T), hrs = new Float64Array(T), kap = new Float64Array(T), stage = new Int8Array(T);
  // stage: 0 本科 1 硕士在读 2 博士在读 3 规培 4 博后 5 工作 6 待业/冲击 7 教职
  const mu = p.mu + ((scen.dmu && scen.dmu[key]) || 0);
  const sig = p.sig * (scen.sigMul || 1);
  const lam = p.lam * (scen.lamMul || 1);
  const z = R.n() * p.sz;                       // 个体能力/匹配（对数）
  const zs = z / p.sz;                          // 标准化能力
  const ab = Math.exp(z - p.sz * p.sz / 2);     // 均值归一的能力乘子
  // 行业工资指数：对数随机游走 + 复合泊松跳跃（政策/周期冲击），自 22 岁起
  const lx = new Float64Array(T + 1);
  for (let t = 1; t <= T; t++) {
    const age = A0 + t;
    lx[t] = age <= G.ageDecide ? 0 : lx[t - 1] + (mu - sig * sig / 2) + sig * R.n() + p.J * R.pois(lam);
  }
  const X = (age) => Math.exp(lx[clamp(age - A0, 0, T)]);
  const isClin = !!p.clin;
  const pAdmit = scen.pAdmitM != null ? scen.pAdmitM : G.pAdmitM;

  let a = A0, degree = 'B', shocked = false, acad = false;
  let wStart = 0, entryMult = 1, career = 0, aEntry = 0, lostFirst = 0;

  function put(st, y, H, k) { if (a >= AR) return; const i = a - A0; inc[i] = y; hrs[i] = H; kap[i] = k; stage[i] = st; a++; }
  function study(n, s, st) { for (let k = 0; k < n && a < AR; k++) put(st, s.sti - s.tui - G.living, s.H, s.kap); }

  function enter(deg, wageOverride) {          // 入职：摩擦 + 错配 + 年龄折价
    const e = p.entry[deg];
    const hz = 1 / (1 + e.u * (scen.uMul || 1));     // 月度找到工作概率（几何分布，期望待业 = u 月）
    let months = 0; while (R.u() > hz && months < 24) months++;
    const mis = R.u() < clamp(e.m * (scen.mMul || 1), 0, .95);
    entryMult = mis ? 1 - e.pen : 1;
    wStart = (wageOverride != null ? wageOverride : wDeg(p, deg, G)) * X(a) * ab;
    wStart *= Math.pow(1 - G.agePenalty, Math.max(0, a - 30));
    career = 0; aEntry = a;
    // 待业超过 12 个月的部分直接占用整年
    while (months >= 12 && a < AR) { put(6, 0, 25, 1.1); months -= 12; }
    lostFirst = months / 12;
  }
  function work(untilAge) {
    for (; a < untilAge && a < AR;) {
      if (!shocked && !acad && a >= G.ageCap) {
        const hz = p.h35 * Math.min(10, a - G.ageCap + 1) * (scen.h35Mul || 1);
        if (R.u() < hz) { shocked = true;
          const w = wStart * profile(p, career) * (1 - p.l35);
          put(6, 0.5 * w, 30, 1.1); career++; continue; }
      }
      const mm = career < 3 ? entryMult : entryMult + (1 - entryMult) * Math.min(1, (career - 2) / 5); // 错配随年资修复
      let w = wStart * profile(p, career) * mm * (shocked ? 1 - p.l35 : 1);
      if (!acad) w *= Math.pow(X(a) / X(aEntry), 0.5);   // 在职工资对行业指数弹性 ψ = 0.5
      if (career === 0) w *= (1 - lostFirst);
      w += G.prestige * (degree === 'D' ? 1 : degree === 'M' ? 0.4 : 0);
      const fade = a >= 45 ? Math.max(0.85, 1 - 0.01 * (a - 44)) : 1;
      put(acad ? 7 : 5, w, (acad ? 58 : p.H[degree]) * fade, acad ? 1.10 : p.kap);
      career++;
    }
  }
  function workB_withLateM() {                 // 美式期权：工作 2–7 年内若行业指数跌破 θ，回炉读研
    const tStop = Math.min(AR, a + 7); let tries = 0;
    while (a < tStop) {
      if (a >= aEntry + 2 && tries < 2 && X(a) / X(aEntry) < opt.lateM) {
        tries++;                                    // 在职备考：至多两次，录取率与应届相同；备考年 +10h/周、收入 −5%
        const i = a - A0; work(a + 1); inc[i] *= 0.95; hrs[i] += 10;
        if (R.u() < pAdmit) { study(p.M.n, p.M, 1); degree = 'M'; enter('M'); work(AR); return; }
        continue;
      }
      work(a + 1);
    }
    work(AR);
  }

  /* ---- 本科阶段（沉没，但计入累计曲线） ---- */
  const ugY = isClin ? p.clin.bUG : 4;
  for (let k = 0; k < ugY; k++) put(0, -(G.ugTuition + G.living), isClin ? 50 : G.ugHours, 1.0);
  const GP = isClin ? { sti: p.clin.wGP, tui: 0, H: 66, kap: 1.30 } : null;

  if (route === 'B') {
    if (isClin) study(p.clin.gp, GP, 3);
    enter('B');
    if (opt.lateM != null && !isClin) workB_withLateM(); else work(AR);
  } else if (route === 'M') {
    if (R.u() > pAdmit) {                      // 未上岸：耗 1 年备考，回到 B
      put(6, -G.living * 0.5, 50, 1.15);
      if (isClin) study(p.clin.gp, GP, 3);
      enter('B'); work(AR);
    } else {
      study(p.M.n, p.M, isClin ? 3 : 1); degree = 'M';
      if (opt.toD != null && zs > opt.toD) phd(true); else { enter('M'); work(AR); }
    }
  } else {
    phd(false);
  }
  for (; a < AR; a++) { inc[a - A0] = 0; stage[a - A0] = 6; }
  return { inc, hrs, kap, stage, ab, degree };

  function phd(fromM) {
    const d = p.D;
    const nNom = fromM ? (isClin ? 3 : 4) : d.n;   // 硕士后读博：申请-考核制名义 4 年（临床 3 年）
    let delay = 0, cum = 0; const ru = R.u();
    for (let k = 0; k < d.delay.length; k++) { cum += d.delay[k]; if (ru > cum) delay = k + 1; }
    const nTot = nNom + delay;
    const pc = 1 / (1 + Math.exp(-(Math.log(d.pc / (1 - d.pc)) + 1.2 * zs)));
    const finish = R.u() < pc;
    if (opt.exitD != null) {                    // 看跌期权：第 2 年依据含噪进展信号退出，按硕士毕业
      study(2, d, 2);
      const signal = (finish ? 0.8 : -0.8) + 0.8 * R.n();
      if (signal < opt.exitD) { if (!fromM) study(1, p.M, 1); degree = 'M'; enter('M'); work(AR); return; }
      study(nTot - 2, d, 2);
    } else study(nTot, d, 2);
    if (!finish) { degree = fromM ? 'M' : 'B'; enter(degree); work(AR); return; }   // 结业：仅持原学历
    degree = 'D';
    const P = p.P;
    const acadP = scen.acadShare != null ? scen.acadShare : P.acad;
    if (acadP > 0 && R.u() < acadP) {         // 学术轨：博后 → 预聘 → 非升即走
      study(P.pd, { sti: P.wpd, tui: 0, H: 58, kap: 1.15 }, 4);
      const pT = clamp(P.pT * (scen.acadMul != null ? scen.acadMul : 1) * (1 + 0.3 * zs), 0.02, 0.95);
      if (R.u() < pT) {
        acad = true; wStart = P.wFac * Math.pow(wDeg(p, 'D', G) / (p.w.D * 12 / 1e4), 1) * ab; entryMult = 1; career = 0; aEntry = a; lostFirst = 0;
        work(Math.min(AR, a + 6));
        const pass = R.u() < clamp((0.60 + 0.2 * zs) * (scen.passMul || 1), 0.05, 0.95);
        if (!pass && a < AR) { acad = false; enter('D'); wStart *= 0.85; }
        work(AR); return;
      }
    }
    const pm = pMatchPhD(P, (scen.Vmul && scen.Vmul[key]) || 1);
    if (R.u() > pm) { enter('M', wDeg(p, 'M', G) * 0.95); } else enter('D');
    work(AR);
  }
}

/* ---------- 路线评估 ---------- */
function evalRoute(key, route, cfg) {
  const G = Object.assign({}, GLOBAL, cfg.G || {});
  const N = cfg.N || 4000, seed = cfg.seed || 20261013;
  const opt = cfg.opt || {}, scen = cfg.scen || {};
  const R = rng(seed + (route === 'B' ? 1 : route === 'M' ? 2 : 3) * 7919 + IND_KEYS.indexOf(key) * 104729);
  const A0 = G.ageStart, T = G.ageRetire - A0, t0 = (IND[key].clin ? IND[key].clin.bUG : 4);
  const meanInc = new Float64Array(T), meanH = new Float64Array(T), meanHe = new Float64Array(T);
  const cumAll = []; const pv = new Float64Array(N), wel = new Float64Array(N), ce = new Float64Array(N);
  let life = 0, lifeHe = 0, lifeInc = 0;
  const qs = [];
  for (let n = 0; n < N; n++) {
    const s = simPath(key, route, G, R, opt, scen);
    let v = 0, wv = 0, cu = 0, uu = 0; const cum = new Float64Array(T);
    for (let i = 0; i < T; i++) {
      const y = s.inc[i], He = s.hrs[i] * s.kap[i];
      meanInc[i] += y / N; meanH[i] += s.hrs[i] / N; meanHe[i] += He / N;
      cu += y; cum[i] = cu;
      if (i >= t0) {
        const df = Math.pow(1 + G.r, -(i - t0));
        v += y * df;
        const net = y - effortCost(He, G);
        wv += net * df;
        // CRRA 效用（消费≈收入，下限 1.2 万元/年 兜底）
        const c = Math.max(1.2, y);
        uu += df * (Math.pow(c, 1 - G.gamma) / (1 - G.gamma));
        life += s.hrs[i] * 52 / N; lifeHe += He * 52 / N; lifeInc += y / N;
      }
    }
    pv[n] = v; wel[n] = wv; ce[n] = uu;
    if (n < 400) cumAll.push(cum);
  }
  const sorted = Array.from(pv).sort((x, y) => x - y);
  const q = (p) => sorted[Math.floor(p * (N - 1))];
  const mean = pv.reduce((s, x) => s + x, 0) / N;
  const sd = Math.sqrt(pv.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (N - 1));
  const meanW = wel.reduce((s, x) => s + x, 0) / N;
  // 确定性等价：反解 Σdf·u(c) 的均值
  let annu = 0; for (let i = t0; i < T; i++) annu += Math.pow(1 + G.r, -(i - t0));
  const EU = ce.reduce((s, x) => s + x, 0) / N;
  const cEq = Math.pow(EU / annu * (1 - G.gamma), 1 / (1 - G.gamma)); // 等价年收入
  // 累计收入分位（从 18 岁起，名义未折现）
  const cumQ = (p) => { const out = new Float64Array(T); for (let i = 0; i < T; i++) { const col = cumAll.map(c => c[i]).sort((x, y) => x - y); out[i] = col[Math.floor(p * (col.length - 1))]; } return out; };
  return {
    key, route, N, mean, sd, se: sd / Math.sqrt(N), p10: q(.10), p50: q(.5), p90: q(.9), p05: q(.05),
    welfare: meanW, cEq: cEq * annu, cEqAnnual: cEq,
    lifeHours: life, lifeHoursEff: lifeHe, lifeIncome: lifeInc,
    hourlyEff: lifeInc * 10000 / lifeHe, hourly: lifeInc * 10000 / life,
    meanInc: Array.from(meanInc), meanH: Array.from(meanH), meanHe: Array.from(meanHe),
    cumP50: Array.from(cumQ(.5)), cumP10: Array.from(cumQ(.1)), cumP90: Array.from(cumQ(.9)),
    pv: pv
  };
}

/* ---------- 期权价值：参数化最优停时（Garcia 2003 式下界） ---------- */
function optionValues(key, cfg) {
  const base = (route, opt) => evalRoute(key, route, Object.assign({}, cfg, { opt }));
  const res = {};
  // B 路线：回炉读研美式期权
  const B0 = base('B', {});
  let bestB = { v: B0.mean, th: null };
  if (!IND[key].clin) for (const th of [0.70, 0.85, 1.00, 99]) { const r = base('B', { lateM: th }); if (r.mean > bestB.v) bestB = { v: r.mean, th }; }
  res.B = { static: B0.mean, withOpt: bestB.v, OV: bestB.v - B0.mean, th: bestB.th };
  // M 路线：转博复合期权
  const M0 = base('M', {});
  let bestM = { v: M0.mean, th: null };
  for (const th of [0.5, 1.0, 1.5]) { const r = base('M', { toD: th }); if (r.mean > bestM.v) bestM = { v: r.mean, th }; }
  res.M = { static: M0.mean, withOpt: bestM.v, OV: bestM.v - M0.mean, th: bestM.th };
  // D 路线：退出看跌期权
  const D0 = base('D', {});
  let bestD = { v: D0.mean, th: null };
  for (const th of [-1.0, -0.5, 0.0, 0.3]) { const r = base('D', { exitD: th }); if (r.mean > bestD.v) bestD = { v: r.mean, th }; }
  res.D = { static: D0.mean, withOpt: bestD.v, OV: bestD.v - D0.mean, th: bestD.th };
  // 学术轨"彩票"：全部冲教职 vs 全部去业界（同一套随机数）
  const sc = cfg.scen || {};
  const DA = evalRoute(key, 'D', Object.assign({}, cfg, { opt: { exitD: bestD.th }, scen: Object.assign({}, sc, { acadShare: 1 }) }));
  const DI = evalRoute(key, 'D', Object.assign({}, cfg, { opt: { exitD: bestD.th }, scen: Object.assign({}, sc, { acadShare: 0 }) }));
  res.acad = { allAcad: DA.mean, allInd: DI.mean, allAcadW: DA.welfare, allIndW: DI.welfare, p10A: DA.p10, p10I: DI.p10 };
  res.D.OVchoice = Math.max(DA.mean, DI.mean) - bestD.v;
  return res;
}

/* ---------- Dixit–Pindyck 等待阈值（闭式） ----------
 * 投资价值 V 服从 GBM(α, σ)，红利率 δ = r − α；投资成本 I 不可逆
 * β1 = ½ − (r−δ)/σ² + √[((r−δ)/σ² − ½)² + 2r/σ²]，最优阈值 V* = β1/(β1−1)·I
 */
function dixitPindyck(r, delta, sigma) {
  const s2 = sigma * sigma, a = 0.5 - (r - delta) / s2;
  const b1 = a + Math.sqrt(a * a + 2 * r / s2);
  return { beta: b1, mult: b1 / (b1 - 1) };
}
/* ---------- Black–Scholes / Merton 跳跃扩散：教育看涨期权 ---------- */
function ncdf(x) { const t = 1 / (1 + 0.2316419 * Math.abs(x)); const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; }
function bsCall(S, K, r, s, T) { if (T <= 0) return Math.max(S - K, 0);
  const d1 = (Math.log(S / K) + (r + s * s / 2) * T) / (s * Math.sqrt(T)), d2 = d1 - s * Math.sqrt(T);
  return { C: S * ncdf(d1) - K * Math.exp(-r * T) * ncdf(d2), d1, d2, delta: ncdf(d1), vega: S * Math.sqrt(T) * 0.3989423 * Math.exp(-d1 * d1 / 2) }; }
function mertonCall(S, K, r, s, T, lam, J, dJ) { // 对数跳跃 ~ N(J, dJ²)
  const k = Math.exp(J + dJ * dJ / 2) - 1; let C = 0, fact = 1;
  for (let n = 0; n < 30; n++) { if (n > 0) fact *= n;
    const sn = Math.sqrt(s * s + n * dJ * dJ / T), rn = r - lam * k + n * Math.log(1 + k) / T;
    const w = Math.exp(-lam * (1 + k) * T) * Math.pow(lam * (1 + k) * T, n) / fact;
    const c = bsCall(S, K, rn, sn, T); C += w * (typeof c === 'number' ? c : c.C); }
  return C;
}

/* ---------- 人口-教职供需模块 ----------
 * births: {年份: 万人}；返回 2026–2050 年 18 岁人口、在校规模指数、教职新增需求、博士毕业供给
 */
function academicMarket(births, cfg) {
  const out = [];
  const F0 = cfg.faculty0, ratio0 = cfg.studentsPerFaculty, retireRate = cfg.retireRate;
  const ger = (y) => Math.min(cfg.gerMax, cfg.ger0 + cfg.gerSlope * (y - 2025));
  const stud = (y) => { let s = 0; for (let k = 18; k <= 21; k++) s += (births[y - k] || 0) * 0.985; return s * ger(y); };
  const S0 = stud(2025);
  let Fprev = F0;
  for (let y = 2026; y <= 2050; y++) {
    const S = stud(y), F = F0 * S / S0 * (cfg.ratioDrift ? Math.pow(1 + cfg.ratioDrift, y - 2025) : 1);
    const hires = Math.max(0, F - Fprev + Fprev * retireRate);
    const phd = cfg.phdGrad0 * Math.pow(1 + cfg.phdGrowth, Math.min(y - 2025, cfg.phdGrowYears)) * (y - 2025 > cfg.phdGrowYears ? Math.pow(1 + cfg.phdLateGrowth, y - 2025 - cfg.phdGrowYears) : 1);
    out.push({ y, n18: (births[y - 18] || 0) * 0.985, students: S, faculty: F, hires, phd, ratio: phd * cfg.acadSeekShare / hires });
    Fprev = F;
  }
  return out;
}

/* ---------- 蛛网模型（含行政放大与文化惯性） ----------
 * 招生 E_t = E_{t-1}·[1 + κ_adm·(Ŵ_t − 1)]^…；Ŵ 为适应性预期工资溢价，θ = 预期更新速度（文化惯性越强 θ 越小）
 * 毕业供给 S_t = E_{t−L}；需求 D_t 外生；溢价 W_t = (D_t / S_t)^(1/ε)
 */
function cobweb(c) {
  const T = c.T || 30, L = c.L || 4;
  const E = [], S = [], D = [], W = [], Wh = [];
  for (let t = 0; t < T; t++) {
    const gg = c.shock && t > c.shock.t ? (c.shock.g2 != null ? c.shock.g2 : c.g) : c.g;
    D[t] = t === 0 ? c.D0 : D[t - 1] * (1 + gg) * (c.shock && t === c.shock.t ? (1 + c.shock.size) : 1);
    S[t] = t < L ? c.S0 : E[t - L];
    W[t] = Math.pow(D[t] / S[t], 1 / c.eps);
    Wh[t] = t === 0 ? 1 : Wh[t - 1] + c.theta * (W[t] - Wh[t - 1]);
    let signal = 0; (c.policies || (c.policy ? [c.policy] : [])).forEach(pp => { if (t >= pp.t0 && t < pp.t1) signal += pp.size; });
    E[t] = (t === 0 ? c.S0 : E[t - 1]) * Math.max(0.6, Math.min(1.6, 1 + c.kappa * (Wh[t] - 1) + signal));
  }
  return { E, S, D, W, Wh };
}
// 线性化稳定性：在稳态附近 e_t = (1−θ)e_{t−1} + θ·w_t，w_t = −s_t/ε，s_t = x_{t−L}，x_t = x_{t−1} + κ·e_t
// 求伴随矩阵谱半径
function cobwebSpectral(theta, kappa, eps, L) {
  // 状态 [x_t, x_{t−1}, …, x_{t−L}, e_t]
  const n = L + 2; const A = Array.from({ length: n }, () => new Array(n).fill(0));
  // e_t = (1−θ)e_{t−1} − θ/ε · x_{t−L}
  // x_t = x_{t−1} + κ e_t = x_{t−1} + κ(1−θ)e_{t−1} − κθ/ε · x_{t−L}
  A[0][0] = 1; A[0][L] = -kappa * theta / eps; A[0][n - 1] = kappa * (1 - theta);
  for (let i = 1; i <= L; i++) A[i][i - 1] = 1;
  A[n - 1][L] = -theta / eps; A[n - 1][n - 1] = 1 - theta;
  // 幂迭代估计谱半径（复根情形用 ‖A^k‖^(1/k)）
  let M = A.map(r => r.slice());
  const mul = (P, Q) => P.map((r, i) => Q[0].map((_, j) => r.reduce((s, _, k) => s + P[i][k] * Q[k][j], 0)));
  const K = 64; for (let k = 1; k < K; k++) M = mul(M, A);
  let nr = 0; for (const r of M) for (const v of r) nr = Math.max(nr, Math.abs(v));
  return Math.pow(nr, 1 / K);
}

const API = { GLOBAL, IND, IND_KEYS, rng, simPath, evalRoute, optionValues, dixitPindyck, bsCall, mertonCall, academicMarket, cobweb, cobwebSpectral, effortCost, pMatchPhD };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PhDModel = API;
})(typeof window !== 'undefined' ? window : globalThis);
