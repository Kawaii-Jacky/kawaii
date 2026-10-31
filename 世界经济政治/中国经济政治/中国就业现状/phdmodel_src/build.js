// 生成论文与交互报告所需的全部结果
const M = require('./model.js');
const fs = require('fs');
const K = M.IND_KEYS, R3 = ['B', 'M', 'D'];
const N = +(process.argv[2] || 6000), NO = Math.round(N / 2);
const out = { keys: K, ind: {}, ages: [], meta: { N, date: '2026-10-13' } };
for (let a = M.GLOBAL.ageStart; a < M.GLOBAL.ageRetire; a++) out.ages.push(a);
const r1 = (x, d = 1) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);
const arr = (a, d = 1) => Array.from(a).map(v => r1(v, d));

function block(key, cfg) {
  const ev = {}; R3.forEach(r => ev[r] = M.evalRoute(key, r, Object.assign({ N }, cfg)));
  return ev;
}
function regret(ev, r) { // 路线 PV 低于本科路线中位数的概率
  const medB = ev.B.p50; let c = 0; for (const v of ev[r].pv) if (v < medB) c++; return c / ev[r].pv.length;
}

/* ---------- 1. 基准 ---------- */
for (const k of K) {
  const ev = block(k, {});
  const evMc = M.evalRoute(k, 'M', { N, scen: { pAdmitM: 1 } });   // 上岸条件路径：用于累计曲线与工时曲线
  const ov = M.optionValues(k, { N: NO });
  const p = M.IND[k];
  const d = { name: p.name, short: p.short, val: {}, cum: {}, heff: {}, hrs: {}, inc: {}, ov };
  R3.forEach(r => {
    const e = ev[r];
    const OV = ov[r].OV + (r === 'D' && p.P.acad > 0 ? Math.max(0, ov.D.OVchoice) : 0);
    d.val[r] = { static: r1(e.mean), se: r1(e.se, 2), OV: r1(OV), total: r1(e.mean + OV), p05: r1(e.p05), p10: r1(e.p10), p50: r1(e.p50), p90: r1(e.p90),
      sd: r1(e.sd), welfare: r1(e.welfare), cEqAnnual: r1(e.cEqAnnual, 2), lifeHours: Math.round(e.lifeHours), lifeHoursEff: Math.round(e.lifeHoursEff),
      lifeIncome: r1(e.lifeIncome), hourly: r1(e.hourly), hourlyEff: r1(e.hourlyEff), regret: r === 'B' ? null : r1(regret(ev, r), 3) };
    const ec = r === 'M' ? evMc : e;
    d.cum[r] = { p10: arr(ec.cumP10), p50: arr(ec.cumP50), p90: arr(ec.cumP90) };
    d.heff[r] = arr(ec.meanHe); d.hrs[r] = arr(ec.meanH); d.inc[r] = arr(ec.meanInc, 2);
  });
  d.Mcond = { static: r1(evMc.mean), welfare: r1(evMc.welfare), p10: r1(evMc.p10) };
  // 文化惯性的影子价格：使 D 路线强度折合福利追平 B 所需的年名望红利 ψ*（万元/年）
  { const tD = (p.clin ? p.clin.bUG : 4) + p.D.n + 1; let A = 0; for (let i = tD; i < out.ages.length; i++) A += Math.pow(1 + M.GLOBAL.r, -(i - (p.clin ? p.clin.bUG : 4)));
    d.psiStar = r1(Math.max(0, (ev.B.welfare - ev.D.welfare) / A), 2); d.psiStarM = r1(Math.max(0, (ev.B.welfare - evMc.welfare) / A), 2); }
  // 盈亏平衡年龄
  d.breakeven = {};
  ['M', 'D'].forEach(r => { let age = null; for (let i = 0; i < out.ages.length; i++) { if (out.ages[i] > 24 && d.cum[r].p50[i] >= d.cum.B.p50[i]) { age = out.ages[i]; break; } } d.breakeven[r] = age; });
  // 盈利指数 PI = PV(收益) / PV(机会成本)，以 22 岁为基期（均值路径）
  d.PI = {};
  const t0 = (p.clin ? p.clin.bUG : 4), rr = M.GLOBAL.r;
  ['M', 'D'].forEach(r => { const er = r === 'M' ? evMc : ev[r]; let S = 0, Kc = 0; for (let i = t0; i < out.ages.length; i++) { const df = Math.pow(1 + rr, -(i - t0)); const x = er.meanInc[i] - ev.B.meanInc[i]; if (x >= 0) S += x * df; else Kc -= x * df; } d.PI[r] = { S: r1(S), K: r1(Kc), PI: r1(S / Kc, 2) }; });
  // Dixit–Pindyck 阈值：总波动 = 行业波动 ⊕ 跳跃 ⊕ 个体离散（匹配不确定性取 50%）
  const sTot = Math.sqrt(p.sig * p.sig + p.lam * p.J * p.J + 0.25 * p.sz * p.sz);
  d.DP = { sigma: r1(sTot, 3) }; [0.03, 0.05, 0.08].forEach(r => { const x = M.dixitPindyck(r, 0.04, sTot); d.DP['r' + Math.round(r * 100)] = { beta: r1(x.beta, 2), mult: r1(x.mult, 2) }; });
  // Merton 跳跃扩散看涨：保留 2 年再决定读博（T=2） vs 立即执行
  const S = d.PI.D.S, Kc = d.PI.D.K;
  d.merton = { S, K: Kc, now: r1(Math.max(S - Kc, 0)), wait2: r1(M.mertonCall(S, Kc * 1.06, rr, Math.sqrt(p.sig * p.sig + 0.25 * p.sz * p.sz), 2, p.lam, p.J, 0.05)) };
  out.ind[k] = d;
  console.error('done', k);
}

/* ---------- 2. 敏感性：折现率、选择效应、劳动负效用曲率、文化惯性（名望红利） ---------- */
const sens = {};
const grid = [
  ['r3', { G: { r: 0.03 } }], ['r8', { G: { r: 0.08 } }],
  ['sel0', { G: { sel: 0 } }], ['sel6', { G: { sel: 0.6 } }],
  ['eta1', { G: { eta: 1.0 } }],
  ['pre1', { G: { prestige: 1.0 } }],
  ['ret58', { G: { ageRetire: 58 } }],
  ['adm7', { scen: { pAdmitM: 0.7 } }]
];
for (const [name, cfg] of grid) {
  sens[name] = {};
  for (const k of K) { const ev = block(k, Object.assign({ N: Math.round(N / 2) }, cfg)); sens[name][k] = {}; R3.forEach(r => sens[name][k][r] = { mean: r1(ev[r].mean), welfare: r1(ev[r].welfare), p10: r1(ev[r].p10) }); }
  console.error('sens', name);
}
out.sens = sens;

/* ---------- 3. 情景 ---------- */
const SC = {
  base: { label: '基准', scen: {} },
  aiBust: { label: 'AI 泡沫出清（AI 漂移 −3pp、互联网 −1.5pp，跳跃频率 ×1.5）', scen: { dmu: { AI: -0.03, NET: -0.015 }, lamMul: 1.5 } },
  demo: { label: '人口断崖·高校收缩（教职获得率 ×0.6、长聘通过率 ×0.8）', scen: { acadMul: 0.6, passMul: 0.8 } },
  med: { label: '医疗控费深化（临床漂移 −1.5pp、生物 −0.5pp）', scen: { dmu: { CLIN: -0.015, BIO: -0.005 } } },
  chip: { label: '国产替代加速（电子电力漂移 +1pp、博士岗位 ×1.3）', scen: { dmu: { EE: 0.01 }, Vmul: { EE: 1.3 } } },
  phdGlut: { label: '博士供给 +50%（所有行业博士岗位紧度 ×0.67）', scen: { Vmul: Object.fromEntries(K.map(k => [k, 0.67])) } },
  friction: { label: '入职摩擦恶化（待业月数 ×1.5、错配概率 ×1.3）', scen: { uMul: 1.5, mMul: 1.3 } },
  age35: { label: '35 岁门槛强化（中年冲击风险 ×2）', scen: { h35Mul: 2 } }
};
out.scen = {};
for (const s in SC) {
  out.scen[s] = { label: SC[s].label, v: {} };
  for (const k of K) { const ev = block(k, { N: Math.round(N / 2), scen: SC[s].scen }); out.scen[s].v[k] = {}; R3.forEach(r => out.scen[s].v[k][r] = { mean: r1(ev[r].mean), welfare: r1(ev[r].welfare) }); }
  console.error('scen', s);
}

/* ---------- 4. 人口 × 教职 ---------- */
const births = { 2000: 1771, 2001: 1702, 2002: 1647, 2003: 1599, 2004: 1593, 2005: 1617, 2006: 1585, 2007: 1595, 2008: 1608, 2009: 1615, 2010: 1592,
  2011: 1785, 2012: 1973, 2013: 1776, 2014: 1897, 2015: 1655, 2016: 1883, 2017: 1765, 2018: 1523, 2019: 1465, 2020: 1202, 2021: 1062, 2022: 956, 2023: 902, 2024: 954, 2025: 792,
  2026: 780, 2027: 770, 2028: 760, 2029: 750, 2030: 740, 2031: 730, 2032: 720 };
const acadCfg = { faculty0: 222.36, retireRate: 0.025, ger0: 0.613, gerSlope: 0.006, gerMax: 0.80, acadSeekShare: 0.55,
  phdShare0: 0.31, phdShareSlope: 0.010, phdShareMax: 0.55, stick: 0.7, ratioDrift: 0.01 };
// 博士毕业生：2026–2030 由 2022–2025 招生滞后 4.5 年、完成率 0.88 推出；之后按招生 2025 年后年增 3%（至 2030）、再持平推算
const enroll = { 2021: 12.58, 2022: 13.90, 2023: 15.33, 2024: 17.11, 2025: 20.16 };
for (let y = 2026; y <= 2050; y++) enroll[y] = y <= 2030 ? enroll[y - 1] * 1.03 : enroll[y - 1] * (y <= 2035 ? 1.0 : 0.98);
const phdGrad = (y) => 0.88 * (0.5 * (enroll[y - 4] || 0) + 0.5 * (enroll[y - 5] || 0));
function studentsIdx(y) { let s = 0; for (let a = 18; a <= 21; a++) s += (births[y - a] || 0); const ger = Math.min(acadCfg.gerMax, acadCfg.ger0 + acadCfg.gerSlope * (y - 2025)); return s * ger; }
const S0 = studentsIdx(2025);
const acad = []; let Fp = acadCfg.faculty0, DFp = acadCfg.faculty0 * acadCfg.phdShare0 * 1.0;
for (let y = 2026; y <= 2050; y++) {
  const F = acadCfg.faculty0 * Math.pow(studentsIdx(y) / S0, acadCfg.stick) * Math.pow(1 + acadCfg.ratioDrift, y - 2025);
  const share = Math.min(acadCfg.phdShareMax, acadCfg.phdShare0 + acadCfg.phdShareSlope * (y - 2024));
  const DF = F * share;
  const retire = DFp * acadCfg.retireRate;
  const hires = Math.max(0.3, DF - DFp + retire);   // 博士学历教职年新增需求（万）
  const g = phdGrad(y);
  acad.push({ y, n18: r1((births[y - 18] || 0) * 0.985, 0), students: r1(studentsIdx(y), 0), faculty: r1(F, 1), hires: r1(hires, 2), phd: r1(g, 2), ratio: r1(g * acadCfg.acadSeekShare / hires, 2) });
  Fp = F; DFp = DF;
}
out.acad = acad; out.acadCfg = acadCfg;

/* ---------- 5. 蛛网：五轮热潮 ---------- */
const presets = {
  law:   { label: '法学热（1999–）', y0: 1999, T: 27, L: 4, D0: 1, S0: 1, g: 0.05, eps: 1.0, theta: 0.25, kappa: 0.50, policies: [{ t0: 0, t1: 7, size: 0.10 }], note: '2012 年法学列入国家控制布点（K），相当于把 κ 压到接近 0——入口被封，但存量过剩已经形成。' },
  civil: { label: '土木热（2003–）', y0: 2003, T: 26, L: 4, D0: 1, S0: 1, g: 0.08, eps: 1.0, theta: 0.30, kappa: 0.55, policies: [{ t0: 5, t1: 8, size: 0.06 }], shock: { t: 18, size: -0.35, g2: -0.10 }, note: '需求冲击：房地产投资 2021 峰值后 4 年 −44%，招生计划 11 万→不足 7.5 万。' },
  fin:   { label: '金融热（2008–）', y0: 2008, T: 22, L: 4, D0: 1, S0: 1, g: 0.06, eps: 1.0, theta: 0.30, kappa: 0.60, policies: [{ t0: 8, t1: 12, size: 0.05 }], shock: { t: 14, size: -0.20, g2: -0.01 }, note: '2022 限薪/递延/追索：右尾被行政截断，需求侧发生"封顶"冲击。' },
  net:   { label: '互联网/计算机热（2012–）', y0: 2012, T: 22, L: 4, D0: 1, S0: 1, g: 0.12, eps: 1.0, theta: 0.40, kappa: 0.70, policies: [{ t0: 4, t1: 9, size: 0.10 }], shock: { t: 9, size: -0.25, g2: 0.01 }, note: '大数据专业 2016→2020 增长约 200 倍；大厂员工数 2021 见顶。' },
  ai:    { label: 'AI 热（2017–）', y0: 2017, T: 22, L: 4, D0: 1, S0: 1, g: 0.12, eps: 1.0, theta: 0.40, kappa: 0.70, policies: [{ t0: 1, t1: 4, size: 0.18 }, { t0: 8, t1: 11, size: 0.12 }], note: '2019 年度新增备案 180 所为首峰；2025–2027"超常布局"为二次推力。2025 年求职 +39% vs 职位 +3%。' }
};
out.cobweb = { presets };
// 稳定性前沿：谱半径 ρ(θ, κ) 网格，L = 4 与 L = 1
const thetas = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0], kappas = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2];
out.cobweb.rho4 = thetas.map(t => kappas.map(k => r1(M.cobwebSpectral(t, k, 1.0, 4), 3)));
out.cobweb.rho1 = thetas.map(t => kappas.map(k => r1(M.cobwebSpectral(t, k, 1.0, 1), 3)));
out.cobweb.thetas = thetas; out.cobweb.kappas = kappas;
out.cobweb.rhoPresets = Object.fromEntries(Object.entries(presets).map(([k, c]) => [k, r1(M.cobwebSpectral(c.theta, c.kappa, c.eps, c.L), 3)]));

/* ---------- 参数表（供论文附录） ---------- */
out.params = { GLOBAL: M.GLOBAL, IND: M.IND };
fs.writeFileSync('results.json', JSON.stringify(out));
console.error('written results.json', (JSON.stringify(out).length / 1024).toFixed(0) + 'KB');
