(function(){
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const NS = 'http://www.w3.org/2000/svg';
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const ROUTE = { B:{name:'本科直接就业', c:'--s1'}, M:{name:'硕士', c:'--s2'}, D:{name:'博士', c:'--s3'} };
const fmt = (v, d=0) => (v==null||isNaN(v)) ? '—' : Number(v).toLocaleString('zh-CN',{maximumFractionDigits:d,minimumFractionDigits:d});
function el(tag, attrs, parent){ const e=document.createElementNS(NS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); if(parent) parent.appendChild(e); return e; }
function txt(p,x,y,s,a={}){ const t=el('text',Object.assign({x,y},a),p); t.textContent=s; return t; }
function niceTicks(lo,hi,n=5){ const span=hi-lo||1, step0=span/n, mag=Math.pow(10,Math.floor(Math.log10(step0))), f=step0/mag;
  const step=(f<1.5?1:f<3?2:f<7?5:10)*mag; const out=[]; for(let v=Math.ceil(lo/step)*step; v<=hi+1e-9; v+=step) out.push(+v.toFixed(10)); return out; }
const tip = $('#tip');
function showTip(html, ev, host){ tip.innerHTML=html; tip.style.opacity=1;
  const rect=host.getBoundingClientRect(); let x=ev.clientX+14, y=ev.clientY+window.scrollY-10;
  if (x+190>window.innerWidth) x=ev.clientX-200; tip.style.left=x+'px'; tip.style.top=y+'px'; }
function hideTip(){ tip.style.opacity=0; }

/* ---------- 折线图（含分位带、十字线） ---------- */
function lineChart(host, cfg){
  host.innerHTML=''; const W=cfg.W||960, H=cfg.H||360, pl=56, pr=cfg.pr||70, pt=16, pb=34;
  const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':cfg.aria||''},host);
  const xs=cfg.x, n=xs.length;
  let lo=cfg.ymin!=null?cfg.ymin:Infinity, hi=-Infinity;
  cfg.series.forEach(s=>{ (s.band?s.band[0]:s.data).forEach(v=>{ if(v<lo&&cfg.ymin==null) lo=v; }); (s.band?s.band[1]:s.data).forEach(v=>{ if(v>hi) hi=v; }); s.data.forEach(v=>{ if(v>hi) hi=v; if(cfg.ymin==null&&v<lo) lo=v; }); });
  if (cfg.ymax!=null) hi=cfg.ymax; const ticks=niceTicks(lo,hi,5); lo=Math.min(lo,ticks[0]); hi=Math.max(hi,ticks[ticks.length-1]);
  const getX=i=>pl+(W-pl-pr)*i/(n-1), Y=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));
  ticks.forEach(v=>{ el('line',{x1:pl,x2:W-pr,y1:Y(v),y2:Y(v),class:'gl'},svg); txt(svg,pl-8,Y(v)+4,(cfg.yfmt||fmt)(v),{'text-anchor':'end'}); });
  el('line',{x1:pl,x2:W-pr,y1:Y(lo),y2:Y(lo),class:'ax'},svg);
  const every=cfg.xEvery||Math.ceil(n/10);
  xs.forEach((v,i)=>{ if(i%every===0||i===n-1) txt(svg,getX(i),H-12,v,{'text-anchor':'middle'}); });
  if (cfg.zero && lo<0 && hi>0) el('line',{x1:pl,x2:W-pr,y1:Y(0),y2:Y(0),stroke:css('--text-3'),'stroke-width':1},svg);
  (cfg.marks||[]).forEach(m=>{ const xi=xs.indexOf(m.x); if(xi<0) return; el('line',{x1:getX(xi),x2:getX(xi),y1:pt,y2:H-pb,stroke:css('--axis'),'stroke-width':1},svg); txt(svg,getX(xi)+4,pt+11,m.label,{fill:css('--text-3')}); });
  cfg.series.forEach(s=>{ const col=css(s.c);
    if (s.band){ const up=s.band[1].map((v,i)=>`${getX(i)},${Y(v)}`), dn=s.band[0].map((v,i)=>`${getX(i)},${Y(v)}`).reverse();
      el('polygon',{points:up.concat(dn).join(' '),fill:col,opacity:.10},svg); }
    el('polyline',{points:s.data.map((v,i)=>`${getX(i)},${Y(v)}`).join(' '),fill:'none',stroke:col,'stroke-width':2,'stroke-linejoin':'round','stroke-linecap':'round','stroke-dasharray':s.dash||''},svg);
  });
  // 端点标签（带引线防重叠）
  const ends=cfg.series.filter(s=>!s.noLabel).map(s=>({s,y:Y(s.data[n-1])})).sort((a,b)=>a.y-b.y); let last=-1e9;
  ends.forEach(e=>{ let ly=Math.max(e.y,last+14); last=ly; const col=css(e.s.c);
    el('circle',{cx:getX(n-1),cy:e.y,r:4,fill:col,stroke:css('--surface'),'stroke-width':2},svg);
    if (Math.abs(ly-e.y)>2) el('line',{x1:getX(n-1)+5,x2:getX(n-1)+10,y1:e.y,y2:ly,stroke:css('--axis')},svg);
    txt(svg,getX(n-1)+12,ly+4,(e.s.short||e.s.name)+' '+(cfg.endFmt||cfg.yfmt||fmt)(e.s.data[n-1]),{fill:css('--text-1'),'font-weight':600}); });
  // 十字线
  const cross=el('line',{y1:pt,y2:H-pb,stroke:css('--text-3'),'stroke-width':1,opacity:0},svg);
  const dots=cfg.series.map(s=>el('circle',{r:4,fill:css(s.c),stroke:css('--surface'),'stroke-width':2,opacity:0},svg));
  const hit=el('rect',{x:pl,y:pt,width:W-pl-pr,height:H-pt-pb,fill:'transparent'},svg);
  hit.addEventListener('mousemove',ev=>{ const b=svg.getBoundingClientRect(); const mx=(ev.clientX-b.left)*W/b.width;
    const idx=Math.max(0,Math.min(n-1,Math.round((mx-pl)/(W-pl-pr)*(n-1))));
    cross.setAttribute('x1',getX(idx)); cross.setAttribute('x2',getX(idx)); cross.setAttribute('opacity',1);
    let html=`<b>${cfg.xLabel||''}${xs[idx]}</b>`;
    cfg.series.forEach((s,k)=>{ dots[k].setAttribute('cx',getX(idx)); dots[k].setAttribute('cy',Y(s.data[idx])); dots[k].setAttribute('opacity',1);
      html+=`<br><span class="k" style="background:${css(s.c)}"></span>${s.name}：${(cfg.tfmt||cfg.yfmt||fmt)(s.data[idx])}`;
      if (s.band) html+=` <span style="color:${css('--text-3')}">[${(cfg.yfmt||fmt)(s.band[0][idx])}–${(cfg.yfmt||fmt)(s.band[1][idx])}]</span>`; });
    showTip(html,ev,host); });
  hit.addEventListener('mouseleave',()=>{ hideTip(); cross.setAttribute('opacity',0); dots.forEach(d=>d.setAttribute('opacity',0)); });
}

/* ---------- 横向分组条形图 ---------- */
function hbar(host, cfg){
  host.innerHTML=''; const rows=cfg.rows, groups=cfg.groups, gh=groups.length*14+14, W=960, pl=cfg.pl||150, pr=70, pt=8;
  const H=pt+rows.length*gh+26; const svg=el('svg',{viewBox:`0 0 ${W} ${H}`},host);
  let lo=Math.min(0,...rows.flatMap(r=>groups.map(g=>r[g.k]))), hi=Math.max(...rows.flatMap(r=>groups.map(g=>r[g.k])));
  const ticks=niceTicks(lo,hi,5); lo=Math.min(lo,ticks[0]); hi=Math.max(hi,ticks[ticks.length-1]);
  const getXbar=v=>pl+(W-pl-pr)*(v-lo)/(hi-lo);
  ticks.forEach(v=>{ el('line',{x1:getXbar(v),x2:getXbar(v),y1:pt,y2:H-24,class:'gl'},svg); txt(svg,getXbar(v),H-8,(cfg.fmt||fmt)(v),{'text-anchor':'middle'}); });
  el('line',{x1:getXbar(0),x2:getXbar(0),y1:pt,y2:H-24,class:'ax'},svg);
  rows.forEach((r,ri)=>{ const y0=pt+ri*gh+6; txt(svg,pl-10,y0+groups.length*7+3,r.label,{'text-anchor':'end',fill:css('--text-1')});
    groups.forEach((g,gi)=>{ const v=r[g.k], y=y0+gi*14, x0=getXbar(Math.min(0,v)), w=Math.abs(getXbar(v)-getXbar(0));
      el('rect',{x:x0,y,width:Math.max(1,w),height:11,rx:3,fill:css(g.c)},svg);
      txt(svg,(v>=0?getXbar(v)+5:getXbar(v)-5),y+9.5,(cfg.fmt||fmt)(v),{'text-anchor':v>=0?'start':'end',fill:css('--text-2'),'font-size':10.5});
      const hb=el('rect',{x:pl,y:y-1,width:W-pl-pr,height:13,fill:'transparent'},svg);
      hb.addEventListener('mousemove',ev=>showTip(`<b>${r.label}</b><br><span class="k" style="background:${css(g.c)}"></span>${g.name}：${(cfg.fmt||fmt)(v)}${cfg.unit||''}`,ev,host));
      hb.addEventListener('mouseleave',hideTip); }); });
}

/* ---------- 估值矩阵表 ---------- */
function valueTable(host, data, keyOrder){
  const cols=[['static','静态 ENPV'],['OV','期权价值'],['total','含期权总值'],['p10','P10 尾部'],['welfare','强度折合福利'],['hourlyEff','有效时薪(元)'],['regret','后悔概率']];
  let h='<div class="tscroll"><table class="t"><thead><tr><th>行业 · 路线</th>'+cols.map(c=>`<th>${c[1]}</th>`).join('')+'</tr></thead><tbody>';
  keyOrder.forEach(k=>{ const d=data[k]; const best=['B','M','D'].reduce((a,b)=>d[b].total>d[a].total?b:a,'B'); const bestW=['B','M','D'].reduce((a,b)=>d[b].welfare>d[a].welfare?b:a,'B');
    ['B','M','D'].forEach((r,ri)=>{ const v=d[r];
      h+=`<tr${ri===0?' style="border-top:1px solid var(--axis)"':''}><td>${ri===0?'<b>'+d.name+'</b> · ':''}<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(${ROUTE[r].c});margin-right:6px;vertical-align:-1px"></span>${ROUTE[r].name}</td>`+
      `<td>${fmt(v.static)}</td><td>${v.OV>0.5?'+'+fmt(v.OV):fmt(v.OV)}</td><td class="${r===best?'best':''}">${fmt(v.total)}${r===best?' ★':''}</td><td>${fmt(v.p10)}</td><td class="${r===bestW?'best':''}">${fmt(v.welfare)}${r===bestW?' ◆':''}</td><td>${fmt(v.hourlyEff)}</td><td>${r==='B'?'—':fmt(v.regret*100,0)+'%'}</td></tr>`; }); });
  h+='</tbody></table></div>'; host.innerHTML=h;
}

/* ---------- 主题 ---------- */
$('#themeBtn').addEventListener('click',()=>{ const cur=document.documentElement.getAttribute('data-theme');
  const dark=cur? cur==='dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme',dark?'light':'dark'); renderAll(); });

/* ---------- 图：薪资累积 ---------- */
let curInd='AI', curInd2='AI';
function segButtons(id, keys, labels, cur, cb){ const box=document.getElementById(id); if(!box) return; box.innerHTML='';
  keys.forEach((k,i)=>{ const b=document.createElement('button'); b.textContent=labels[i]; if(k===cur) b.classList.add('on');
    b.onclick=()=>{ box.querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); cb(k); }; box.appendChild(b); }); }
const KEYS=RESULTS.keys, NAMES=KEYS.map(k=>RESULTS.ind[k].short);
function drawCum(){ const d=RESULTS.ind[curInd], ages=RESULTS.ages;
  lineChart($('#ch-cum'),{x:ages,xLabel:'年龄 ',xEvery:5,zero:true,yfmt:v=>fmt(v)+'万',tfmt:v=>fmt(v,1)+' 万',
    series:['B','M','D'].map(r=>({name:ROUTE[r].name,short:r==='B'?'本科':r==='M'?'硕士':'博士',c:ROUTE[r].c,data:d.cum[r].p50,band:r===curBand?[d.cum[r].p10,d.cum[r].p90]:null})),
    marks:[{x:35,label:'35 岁门槛'}]});
  const be=d.breakeven; $('#cum-note').innerHTML=`盈亏平衡年龄（中位数累计收入追平本科）：硕士 <b>${be.M||'未追平'}</b> 岁 · 博士 <b>${be.D||'未追平'}</b> 岁。阴影为所选路线的 P10–P90 区间。`; }
let curBand='D';
function drawHours(){ const d=RESULTS.ind[curInd2], ages=RESULTS.ages;
  lineChart($('#ch-hours'),{x:ages,xLabel:'年龄 ',xEvery:5,ymin:0,yfmt:v=>fmt(v)+'h',tfmt:v=>fmt(v,1)+' 有效小时/周',
    series:['B','M','D'].map(r=>({name:ROUTE[r].name,short:r==='B'?'本科':r==='M'?'硕士':'博士',c:ROUTE[r].c,data:d.heff[r]})),
    marks:[{x:22,label:'本科毕业'},{x:35,label:'35'}]});
  const v=d.val; $('#hours-note').innerHTML=['B','M','D'].map(r=>`${ROUTE[r].name}：终身 ${fmt(v[r].lifeHours/1e4,1)} 万小时（强度折合 ${fmt(v[r].lifeHoursEff/1e4,1)} 万）· 有效时薪 ${fmt(v[r].hourlyEff)} 元`).join('<br>'); }

/* ---------- 实验室：浏览器端重算 ---------- */
const LAB={ind:'AI'};
function labRun(){
  const P=window.PhDModel; const g=id=>parseFloat(document.getElementById(id).value);
  const G={ r:g('l-r')/100, prestige:g('l-pre'), pAdmitM:g('l-adm')/100, eta:g('l-eta'), ageRetire:63 };
  const scen={ sigMul:g('l-sig'), lamMul:g('l-lam'), h35Mul:g('l-h35'), acadMul:g('l-acad'), Vmul:{[LAB.ind]:g('l-V')}, uMul:g('l-u') };
  $$('.slider').forEach(s=>{ const i=s.querySelector('input'); s.querySelector('b').textContent=i.dataset.f? i.value+i.dataset.f : i.value; });
  const N=1200, rows=[], cfg={N,G,scen,seed:7};
  const ov=P.optionValues(LAB.ind,Object.assign({},cfg,{N:800}));
  ['B','M','D'].forEach(r=>{ const e=P.evalRoute(LAB.ind,r,cfg); rows.push({r,label:ROUTE[r].name,stat:e.mean,ov:ov[r].OV,tot:e.mean+ov[r].OV,p10:e.p10,wel:e.welfare,he:e.hourlyEff}); });
  hbar($('#ch-lab'),{rows:rows.map(x=>({label:x.label,a:x.stat,b:x.tot,c:x.wel})),groups:[{k:'a',name:'静态 ENPV',c:'--seq-3'},{k:'b',name:'含期权总值',c:'--seq-5'},{k:'c',name:'强度折合福利',c:'--s2'}],fmt:v=>fmt(v)+'万',pl:120});
  const best=rows.reduce((a,b)=>b.tot>a.tot?b:a), bestW=rows.reduce((a,b)=>b.wel>a.wel?b:a);
  $('#lab-out').innerHTML=`<b>${RESULTS.ind[LAB.ind].name}</b>：货币最优 <b>${best.label}</b>（${fmt(best.tot)} 万元）；扣除劳动强度后最优 <b>${bestW.label}</b>（${fmt(bestW.wel)} 万元）。`+
    `<br>期权价值：本科回炉 ${fmt(ov.B.OV,1)} · 硕士转博 ${fmt(ov.M.OV,1)} · 博士退出 ${fmt(ov.D.OV,1)}（万元，蒙特卡洛 N=${N}，标准误约 ±${fmt(rows[2].stat*0.02,1)}）`;
}

/* ---------- 人口 × 教职 ---------- */
function drawAcad(){ const a=RESULTS.acad;
  lineChart($('#ch-acad'),{x:a.map(d=>d.y),xEvery:4,ymin:0,yfmt:v=>fmt(v,1),tfmt:v=>fmt(v,2),
    series:[{name:'学术求职博士 / 新增教职（竞争比）',short:'竞争比',c:'--s3',data:a.map(d=>d.ratio)}]});
  lineChart($('#ch-n18'),{x:a.map(d=>d.y),xEvery:4,ymin:0,yfmt:v=>fmt(v)+'万',tfmt:v=>fmt(v,0)+' 万人',
    series:[{name:'18 岁人口',short:'18 岁',c:'--s1',data:a.map(d=>d.n18)},{name:'学术求职博士',short:'求职博士',c:'--s3',data:a.map(d=>d.phd*RESULTS.acadCfg.acadSeekShare)},{name:'高校新增教职',short:'新增教职',c:'--s2',data:a.map(d=>d.hires)}]}); }

/* ---------- 蛛网 ---------- */
const PRE=RESULTS.cobweb.presets; let curPre=Object.keys(PRE)[0];
function drawCob(){ const P=window.PhDModel; const c=Object.assign({},PRE[curPre]);
  c.theta=parseFloat($('#c-theta').value); c.kappa=parseFloat($('#c-kappa').value);
  $('#c-theta-v').textContent=c.theta.toFixed(2); $('#c-kappa-v').textContent=c.kappa.toFixed(2);
  const r=P.cobweb(c), yrs=r.S.map((_,i)=>c.y0+i);
  lineChart($('#ch-cob'),{x:yrs,xEvery:3,ymin:0,yfmt:v=>fmt(v,2),tfmt:v=>fmt(v,2),
    series:[{name:'毕业生供给（指数）',short:'供给',c:'--s1',data:r.S},{name:'市场需求（指数）',short:'需求',c:'--s3',data:r.D},{name:'招生（指数）',short:'招生',c:'--s2',data:r.E,dash:'5 4'}]});
  const rho=P.cobwebSpectral(c.theta,c.kappa,c.eps,c.L);
  $('#cob-note').innerHTML=`${c.label}：线性化系统谱半径 ρ = <b>${rho.toFixed(3)}</b> ${rho>1?'（&gt;1，振荡发散：热潮—过剩循环自我放大）':'（&lt;1，振荡收敛）'}。${c.note||''}`; }

function renderAll(){
  segButtons('seg-cum',KEYS,NAMES,curInd,k=>{curInd=k;drawCum();});
  segButtons('seg-band',['B','M','D'],['本科带','硕士带','博士带'],curBand,k=>{curBand=k;drawCum();});
  segButtons('seg-hours',KEYS,NAMES,curInd2,k=>{curInd2=k;drawHours();});
  segButtons('seg-lab',KEYS,NAMES,LAB.ind,k=>{LAB.ind=k;labRun();});
  segButtons('seg-cob',Object.keys(PRE),Object.keys(PRE).map(k=>PRE[k].label),curPre,k=>{curPre=k;$('#c-theta').value=PRE[k].theta;$('#c-kappa').value=PRE[k].kappa;drawCob();});
  drawCum(); drawHours(); valueTable($('#tbl-val'),RESULTS.ind,KEYS); drawAcad(); drawCob(); labRun();
  if (RESULTS.figs) RESULTS.figs.forEach(f=>{ const h=document.getElementById(f.id); if(!h) return; if(f.type==='hbar') hbar(h,f.cfg); });
  if (window.__extra) window.__extra({lineChart,hbar,css,fmt,ROUTE});
}
let labTimer=null;
document.addEventListener('input',e=>{ if(e.target.closest('#lab')){ clearTimeout(labTimer); labTimer=setTimeout(labRun,120); } if(e.target.closest('#cobctl')) drawCob(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',renderAll);
renderAll();
})();
