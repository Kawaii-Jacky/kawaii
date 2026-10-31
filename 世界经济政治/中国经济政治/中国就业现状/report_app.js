/* 就业地形图 · 图表逻辑 */
(function(){
'use strict';
const D = window.REPORT_DATA;
const AGES = D.ages, KEYS = D.keys;
const NAME = k => D.ind[k].short;

/* ---------- 暖色体系 ---------- */
const C = {
  terra:'#C96F4A', amber:'#E0A458', coral:'#E28B6D', olive:'#8A9A5B',
  sage:'#A9BC9B', teal:'#6E9A8B', rose:'#CE8577', brown:'#8A5A44',
  ink:'#43312A', ink2:'#7A6152', grid:'rgba(146,101,62,.14)'
};
const IND_COLOR = {AI:'#D96C47', BIO:'#8A9A5B', CLIN:'#C25E5E', BASIC:'#A9BC9B', EE:'#E0A458', NET:'#6E9A8B', FIN:'#8A5A44'};
const ROUTE_COLOR = {B:'#E0A458', M:'#C96F4A', D:'#8A5A44'};
const ROUTE_NAME = {B:'本科路线', M:'硕士路线', D:'博士路线'};
const FONT = {fontFamily:'Noto Sans SC, sans-serif'};

const baseAxis = extra => Object.assign({
  axisLine:{lineStyle:{color:'rgba(146,101,62,.4)'}},
  axisLabel:{color:C.ink2, fontSize:11},
  splitLine:{lineStyle:{color:C.grid}},
  axisTick:{show:false}
}, extra||{});
const tip = extra => Object.assign({
  trigger:'axis', backgroundColor:'rgba(255,251,243,.96)', borderColor:'rgba(201,111,74,.3)',
  textStyle:{color:C.ink, fontSize:12}, extraCssText:'border-radius:14px;box-shadow:0 8px 24px rgba(146,101,62,.18);padding:10px 14px;'
}, extra||{});

function mk(id){ const el=document.getElementById(id); const ch=echarts.init(el,null,{renderer:'canvas'});
  window.addEventListener('resize',()=>ch.resize());
  if(typeof ResizeObserver!=='undefined') new ResizeObserver(()=>ch.resize()).observe(el);
  return ch; }
/* 字体与布局重排后统一触发一次重绘 */
window.addEventListener('load',()=>{ [600,1800,3600].forEach(t=>setTimeout(()=>{
  document.querySelectorAll('.chart').forEach(el=>{ const ch=echarts.getInstanceByDom(el); if(ch) ch.resize(); });
},t)); });
function pills(id, items, onPick, cls){
  const box=document.getElementById(id); box.innerHTML='';
  items.forEach((it,i)=>{
    const b=document.createElement('button');
    b.className='pill '+(cls||'')+(i===0?' on':''); b.textContent=it.label;
    b.onclick=()=>{ box.querySelectorAll('.pill').forEach(x=>x.classList.remove('on')); b.classList.add('on'); onPick(it.key); };
    box.appendChild(b);
  });
}
function findings(id, arr){
  document.getElementById(id).innerHTML = arr.map(f=>
    `<div class="finding"><i>${f.tag}</i><b>${f.num}</b><p>${f.txt}</p></div>`).join('');
}
const r1 = x => Math.round(x*10)/10;

/* ================= 壹 · 3D 地形 ================= */
let curRoute='B';
const ter = mk('terrain3d');
function terrainData(route){
  const data=[];
  KEYS.forEach((k,yi)=>{
    const hrs=D.ind[k].hrs[route], he=D.ind[k].heff[route];
    AGES.forEach((a,xi)=> data.push([a, yi, r1(hrs[xi]), r1(he[xi])]));
  });
  return data;
}
function renderTerrain(){
  ter.setOption({
    backgroundColor:'transparent',
    tooltip:{backgroundColor:'rgba(255,251,243,.96)', borderColor:'rgba(201,111,74,.3)', textStyle:{color:C.ink},
      formatter:p=>`${NAME(KEYS[p.value[1]])} · ${p.value[0]} 岁<br>周工时 <b>${p.value[2]}h</b> · 有效工时 <b style="color:${C.terra}">${p.value[3]}h</b>`},
    visualMap:{dimension:3, min:20, max:80, calculable:true, orient:'vertical', right:8, top:'center',
      text:['有效工时 高','低'], textStyle:{color:'#43312A', fontSize:13, fontWeight:'bold'},
      inRange:{color:['#F3E3C3','#EBC07E','#DE9A55','#C96F4A','#8A5A44']}},
    xAxis3D:{name:'年龄', type:'value', min:18, max:62, nameGap:18,
      nameTextStyle:{color:'#43312A', fontSize:15, fontWeight:'bold'},
      axisLabel:{color:'#43312A', fontSize:13, fontWeight:'bold', textShadowColor:'rgba(250,241,226,.9)', textShadowBlur:3},
      axisLine:{lineStyle:{color:'rgba(138,90,68,.65)', width:1.5}}, splitLine:{lineStyle:{color:'rgba(146,101,62,.22)'}}},
    yAxis3D:{name:'行业', type:'category', data:KEYS.map(NAME), nameGap:18,
      nameTextStyle:{color:'#43312A', fontSize:15, fontWeight:'bold'},
      axisLabel:{color:'#43312A', fontSize:13, fontWeight:'bold', textShadowColor:'rgba(250,241,226,.9)', textShadowBlur:3},
      axisLine:{lineStyle:{color:'rgba(138,90,68,.65)', width:1.5}}},
    zAxis3D:{name:'周工时(h)', type:'value', min:0, max:70, nameGap:18,
      nameTextStyle:{color:'#43312A', fontSize:15, fontWeight:'bold'},
      axisLabel:{color:'#43312A', fontSize:12, fontWeight:'bold', textShadowColor:'rgba(250,241,226,.9)', textShadowBlur:3},
      splitLine:{lineStyle:{color:'rgba(146,101,62,.22)'}}},
    grid3D:{boxWidth:210, boxDepth:120, boxHeight:75,
      viewControl:{autoRotate:true, autoRotateSpeed:5, distance:255, alpha:26, beta:42},
      light:{main:{intensity:1.15, shadow:true, alpha:35, beta:-30}, ambient:{intensity:0.45}},
      postEffect:{enable:true, SSAO:{enable:true, radius:4, intensity:1.1}},
      temporalSuperSampling:{enable:true}},
    series:[{type:'surface', name:'劳动地貌', data:terrainData(curRoute),
      shading:'lambert', wireframe:{show:true, lineStyle:{color:'rgba(138,90,68,.18)', width:1}},
      itemStyle:{opacity:0.96}}]
  }, true);
}
pills('routePills', [{key:'B',label:'本科路线'},{key:'M',label:'硕士路线'},{key:'D',label:'博士路线'}],
  k=>{curRoute=k; renderTerrain();}, 'brown');
renderTerrain();

/* ---- 生涯剖面 ---- */
const prof = mk('profileChart');
let curProfInd='CLIN';
function renderProfile(){
  const ind=D.ind[curProfInd];
  const mkLine=(r,metric,name,color,dash,area,y2)=>({
    name, type:'line', smooth:true, symbol:'none', yAxisIndex:y2?1:0,
    data:ind[metric][r].map(v=>r1(v)),
    lineStyle:{width:dash?2:3.5, type:dash?'dashed':'solid', color},
    itemStyle:{color}, areaStyle:area?{color:new echarts.graphic.LinearGradient(0,0,0,1,
      [{offset:0,color:color+'55'},{offset:1,color:color+'08'}])}:null, z:dash?2:3});
  prof.setOption({
    tooltip:tip(), color:[ROUTE_COLOR.B,ROUTE_COLOR.M,ROUTE_COLOR.D],
    legend:{top:0, textStyle:{color:C.ink2, fontSize:11}, itemWidth:14, itemHeight:8},
    grid:{left:52,right:52,top:46,bottom:36},
    xAxis:baseAxis({type:'category', data:AGES, name:'年龄', nameLocation:'middle', nameGap:26, boundaryGap:false}),
    yAxis:[baseAxis({type:'value', name:'年收入(万元)', nameTextStyle:{color:C.ink2}}),
           baseAxis({type:'value', name:'周工时(h)', splitLine:{show:false}, nameTextStyle:{color:C.ink2}})],
    series:[
      mkLine('B','inc','本科 · 收入',ROUTE_COLOR.B,false,true),
      mkLine('M','inc','硕士 · 收入',ROUTE_COLOR.M,false,true),
      mkLine('D','inc','博士 · 收入',ROUTE_COLOR.D,false,true),
      mkLine('B','hrs','本科 · 工时',ROUTE_COLOR.B,true,false,true),
      mkLine('M','hrs','硕士 · 工时',ROUTE_COLOR.M,true,false,true),
      mkLine('D','hrs','博士 · 工时',ROUTE_COLOR.D,true,false,true),
      {name:'35岁门槛', type:'line', markArea:{silent:true, itemStyle:{color:'rgba(194,94,94,.10)'},
        label:{color:'#C25E5E', fontSize:11}, data:[[{xAxis:35, name:'35岁门槛'},{xAxis:45}]]}, data:[]}
    ]
  }, true);
}
pills('profIndPills', KEYS.map(k=>({key:k,label:NAME(k)})), k=>{curProfInd=k; renderProfile();}, 'olive');
renderProfile();

/* ---- findings 1 ---- */
(function(){
  let maxHe={v:0}, maxHrs={v:0};
  KEYS.forEach(k=>['B','M','D'].forEach(r=>{
    D.ind[k].heff[r].forEach((v,i)=>{ if(v>maxHe.v) maxHe={v,k,r,a:AGES[i]}; });
    D.ind[k].hrs[r].forEach((v,i)=>{ if(v>maxHrs.v) maxHrs={v,k,r,a:AGES[i]}; });
  }));
  const clinD=D.ind.CLIN.val.D, aiB=D.ind.AI.val.B;
  findings('f1',[
    {tag:'全图最陡的点', num:r1(maxHe.v)+' h/周', txt:`${NAME(maxHe.k)} · ${ROUTE_NAME[maxHe.r]} · ${maxHe.a} 岁：强度折算后的有效工时峰值。`},
    {tag:'最长劳动时间', num:r1(maxHrs.v)+' h/周', txt:`${NAME(maxHrs.k)} · ${ROUTE_NAME[maxHrs.r]} · ${maxHrs.a} 岁，名义工时之最——是法定 40h 的 ${r1(maxHrs.v/40)} 倍。`},
    {tag:'一生总工时之差', num:r1(clinD.lifeHours/1000)+'k vs '+r1(aiB.lifeHours/1000)+'k h', txt:'临床博士与 AI 本科的一生总工时（千小时）：学历越深，不一定干得越久，但开始得一定越晚。'},
    {tag:'有效时薪', num:r1(aiB.hourlyEff)+' 元/h', txt:`AI 本科路线的强度折算时薪；临床博士为 ${r1(clinD.hourlyEff)} 元/h——强度会把高薪重新定价。`}
  ]);
})();

/* ================= 贰 · 期权 ================= */
const optCh = mk('optionChart');
(function(){
  const cats=KEYS.map(NAME);
  const stat=KEYS.map(k=>r1(D.ind[k].ov.B.static>0? D.ind[k].val.B.static:0)); // placeholder guard
  const sB=KEYS.map(k=>r1(D.ind[k].val.B.static));
  const sM=KEYS.map(k=>r1(D.ind[k].val.M.static));
  const sD=KEYS.map(k=>r1(D.ind[k].val.D.static));
  const oB=KEYS.map(k=>r1(D.ind[k].ov.B.OV));
  const oM=KEYS.map(k=>r1(D.ind[k].ov.M.OV));
  const oD=KEYS.map(k=>r1(D.ind[k].ov.D.OV + (D.ind[k].ov.D.OVchoice||0)));
  const ovPct=KEYS.map(k=>{
    const tot=(D.ind[k].ov.B.OV+D.ind[k].ov.M.OV+D.ind[k].ov.D.OV+(D.ind[k].ov.D.OVchoice||0));
    const st=(D.ind[k].val.B.static+D.ind[k].val.M.static+D.ind[k].val.D.static)/3;
    return r1(tot/st*100);
  });
  optCh.setOption({
    tooltip:tip({formatter:ps=>{
      const i=ps[0].dataIndex, k=KEYS[i]; let h=`<b>${NAME(k)}</b>（万元，现值）<br>`;
      ps.forEach(p=>{ if(p.seriesName!=='期权占比') h+=`${p.marker}${p.seriesName}：<b>${p.value}</b><br>`; });
      h+=`<span style="color:${C.teal}">期权合计占静态价值 ${ovPct[i]}%</span>`; return h;}}),
    legend:{top:0, textStyle:{color:C.ink2, fontSize:11}},
    grid:{left:56,right:56,top:52,bottom:40},
    xAxis:baseAxis({type:'category', data:cats, axisLabel:{color:C.ink, fontSize:12, interval:0}}),
    yAxis:[baseAxis({type:'value', name:'现值(万元)', nameTextStyle:{color:C.ink2}}),
           baseAxis({type:'value', name:'期权占比(%)', splitLine:{show:false}, max:20, nameTextStyle:{color:C.ink2}})],
    series:[
      {name:'本科·静态价值', type:'bar', stack:'v', data:sB, barWidth:30,
        itemStyle:{color:'#F0CD96', borderRadius:[0,0,0,0]}},
      {name:'硕士·静态价值', type:'bar', stack:'v', data:sM.map((v,i)=>r1(v-sB[i])),
        itemStyle:{color:'#E3A05F'}},
      {name:'博士·静态价值', type:'bar', stack:'v', data:sD.map((v,i)=>r1(v-sM[i])),
        itemStyle:{color:'#C97C53'}},
      {name:'回炉读研期权(B)', type:'bar', stack:'v', data:oB, itemStyle:{color:C.olive, borderRadius:[0,0,0,0]}},
      {name:'转博期权(M)', type:'bar', stack:'v', data:oM, itemStyle:{color:C.teal}},
      {name:'博士退出+学术选择期权(D)', type:'bar', stack:'v', data:oD, itemStyle:{color:C.brown, borderRadius:[10,10,0,0]}},
      {name:'期权占比', type:'line', yAxisIndex:1, data:ovPct, symbol:'circle', symbolSize:9,
        lineStyle:{width:2.5, color:C.teal, type:'dashed'}, itemStyle:{color:C.teal, borderColor:'#fff', borderWidth:2}}
    ]
  });

  /* findings 2 */
  let mx={v:-1}, mn={v:1e9};
  KEYS.forEach((k,i)=>{ if(oB[i]>mx.v) mx={v:oB[i],k}; });
  const aiM=D.ind.AI.merton, bioM=D.ind.BIO.merton;
  findings('f2',[
    {tag:'最贵的转换权', num:r1(mx.v)+' 万', txt:`${NAME(mx.k)}本科路线的“回炉读研”美式期权——波动率 ${Math.round(D.ind[mx.k].params.sig*100)}% 与跳跃风险让它价值连城。`},
    {tag:'等待的溢价', num:'×'+(D.ind.AI.DP.r5.mult), txt:`AI 行业 Dixit–Pindyck 最优等待阈值：价值需达成本的 ${D.ind.AI.DP.r5.mult} 倍才值得立即投资（r=5%）。`},
    {tag:'Merton 估值', num:r1(aiM.wait2-aiM.now)+' 万', txt:`AI 博士“现在入场 vs 等两年”的跳跃扩散估值差——等待在看跌期权保护下仍为正收益。`},
    {tag:'学术彩票', num:r1(D.ind.BIO.ov.acad.allAcadW-D.ind.BIO.ov.acad.allIndW)+' 万', txt:'生物学术轨与业界轨的福利差：全冲教职的期望福利显著更低，却挡不住 55% 的偏好——稳定本身是定价因子。'}
  ]);
})();

/* ---- 风险气泡 ---- */
const bub = mk('riskBubble');
bub.setOption({
  tooltip:tip({trigger:'item', formatter:p=>`<b>${NAME(p.data[3])}</b><br>终身价值波动 σ：<b>${p.data[0]}</b> 万<br>总期权价值：<b>${p.data[1]}</b> 万<br>学术轨溢价：<b>${p.data[2]}</b> 万`}),
  grid:{left:60,right:30,top:40,bottom:44},
  xAxis:baseAxis({type:'value', name:'终身价值标准差(万元)', nameLocation:'middle', nameGap:28, nameTextStyle:{color:C.ink2}}),
  yAxis:baseAxis({type:'value', name:'期权价值合计(万元)', nameTextStyle:{color:C.ink2}}),
  series:[{type:'scatter',
    data:KEYS.map(k=>{
      const sd=(D.ind[k].val.B.sd+D.ind[k].val.M.sd+D.ind[k].val.D.sd)/3;
      const ov=D.ind[k].ov.B.OV+D.ind[k].ov.M.OV+D.ind[k].ov.D.OV+(D.ind[k].ov.D.OVchoice||0);
      const acad=D.ind[k].ov.acad? r1(D.ind[k].ov.acad.allAcad-D.ind[k].ov.acad.allInd):0;
      return [r1(sd), r1(ov), acad, k];
    }),
    symbolSize:d=>14+Math.abs(d[2])/2.2,
    itemStyle:{color:p=>IND_COLOR[p.data[3]], opacity:.82, borderColor:'#fff', borderWidth:2,
      shadowBlur:12, shadowColor:'rgba(146,101,62,.25)'},
    label:{show:true, formatter:p=>NAME(p.data[3]), position:'top', color:C.ink2, fontSize:11},
    markLine:{silent:true, symbol:'none', lineStyle:{color:'rgba(201,111,74,.4)', type:'dashed'},
      label:{color:C.ink2, fontSize:10}, data:[{type:'average', name:'均值'}]}
  }]
});

/* ---- DP / Merton ---- */
const dp = mk('dpChart');
(function(){
  const sigmas=KEYS.map(k=>D.ind[k].DP.sigma);
  const mult=KEYS.map(k=>D.ind[k].DP.r5.mult);
  const now=KEYS.map(k=>r1(D.ind[k].merton.now));
  const wait=KEYS.map(k=>r1(D.ind[k].merton.wait2));
  dp.setOption({
    tooltip:tip(),
    legend:{top:0, textStyle:{color:C.ink2, fontSize:11}},
    grid:{left:52,right:52,top:46,bottom:40},
    xAxis:baseAxis({type:'category', data:KEYS.map(NAME), axisLabel:{interval:0, fontSize:11, color:C.ink}}),
    yAxis:[baseAxis({type:'value', name:'等待倍数 V*/I', nameTextStyle:{color:C.ink2}}),
           baseAxis({type:'value', name:'Merton估值(万)', splitLine:{show:false}, nameTextStyle:{color:C.ink2}})],
    series:[
      {name:'现在读博估值', type:'bar', data:now, barWidth:16, itemStyle:{color:'#EBC07E', borderRadius:[8,8,0,0]}},
      {name:'等两年再决定', type:'bar', data:wait, barWidth:16, itemStyle:{color:C.olive, borderRadius:[8,8,0,0]}},
      {name:'D-P 最优等待倍数', type:'line', data:mult, symbol:'diamond', symbolSize:11,
        lineStyle:{width:3, color:C.brown}, itemStyle:{color:C.brown, borderColor:'#fff', borderWidth:2},
        label:{show:true, formatter:p=>'×'+p.value, color:C.brown, fontSize:10, position:'top'}}
    ]
  });
})();

/* ================= 叁 · 政策冲击 ================= */
const SCEN_KEYS = Object.keys(D.scen).filter(k=>k!=='base');
const scenHeat = mk('scenHeat');
let scenRoute='M';
function renderScen(){
  const base=D.scen.base.v;
  const data=[];
  SCEN_KEYS.forEach((s,yi)=>{
    KEYS.forEach((k,xi)=>{
      const b=base[k][scenRoute].welfare, v=D.scen[s].v[k][scenRoute].welfare;
      data.push([xi, yi, r1((v-b)/Math.abs(b)*100)]);
    });
  });
  let mn={v:1e9}, mx={v:-1e9};
  data.forEach(d=>{ if(d[2]<mn.v) mn={v:d[2],s:SCEN_KEYS[d[1]],k:KEYS[d[0]]}; if(d[2]>mx.v) mx={v:d[2],s:SCEN_KEYS[d[1]],k:KEYS[d[0]]}; });
  scenHeat.setOption({
    tooltip:tip({trigger:'item', formatter:p=>`<b>${D.scen[SCEN_KEYS[p.value[1]]].label}</b><br>${NAME(KEYS[p.value[0]])} · ${ROUTE_NAME[scenRoute]}<br>福利变化 <b style="color:${p.value[2]>0?C.olive:C.terra}">${p.value[2]>0?'+':''}${p.value[2]}%</b>`}),
    grid:{left:10,right:70,top:30,bottom:60, containLabel:true},
    xAxis:baseAxis({type:'category', data:KEYS.map(NAME), splitArea:{show:true, areaStyle:{color:['rgba(255,246,232,.5)','rgba(250,241,226,.5)']}}, axisLabel:{color:C.ink, fontSize:12}}),
    yAxis:baseAxis({type:'category', data:SCEN_KEYS.map(s=>D.scen[s].label.split('（')[0]),
      axisLabel:{color:C.ink2, fontSize:11, width:150, overflow:'break'}, splitLine:{show:false}}),
    visualMap:{min:-30, max:15, dimension:2, calculable:true, orient:'vertical', right:0, top:'center',
      textStyle:{color:C.ink2, fontSize:10}, formatter:v=>v+'%',
      inRange:{color:['#5E8C7B','#9DBBA4','#F2E3C4','#E5A55F','#C96F4A']}}, // 冷=受损，暖=增益
    series:[{type:'heatmap', data,
      label:{show:true, formatter:p=>(p.value[2]>0?'+':'')+p.value[2], fontSize:10,
        color:'#43312A'},
      itemStyle:{borderColor:'#FFFBF3', borderWidth:3, borderRadius:8},
      emphasis:{itemStyle:{shadowBlur:14, shadowColor:'rgba(138,90,68,.4)'}}}]
  }, true);
  return {mn,mx};
}
pills('scenRoutePills', [{key:'B',label:'本科路线'},{key:'M',label:'硕士路线'},{key:'D',label:'博士路线'}],
  k=>{scenRoute=k; renderScen();}, 'teal');
(function(){
  const {mn,mx}=renderScen();
  const age35=D.scen.age35.v, base=D.scen.base.v;
  const netHit=r1((age35.NET.B.welfare-base.NET.B.welfare)/base.NET.B.welfare*100);
  findings('f3',[
    {tag:'最重的一击', num:mn.v+'%', txt:`“${D.scen[mn.s].label.split('（')[0]}”情景下的${NAME(mn.k)}硕士路线——政策潮水对单一行业可以抹去的终身福利。`},
    {tag:'最暖的潮水', num:'+'+mx.v+'%', txt:`“${D.scen[mx.s].label.split('（')[0]}”情景下的${NAME(mx.k)}：国产替代类产业政策能真实抬高一代人的生涯回报。`},
    {tag:'35 岁门槛', num:netHit+'%', txt:'35 岁冲击风险加倍的反事实下，互联网本科路线的福利变化——门槛每抬高一分，长线期权就贬值一分。'},
    {tag:'真实世界的量级', num:'-29%', txt:'“双减”+三道红线年间，2022 年房地产行业招聘职位数同比降幅（智联招聘）——模型跳跃参数的现实锚。'}
  ]);
})();

/* ---- 时间轴 ---- */
(function(){
  const box=document.getElementById('policyTimeline');
  const evs=[...D.ext.policyEvents].sort((a,b)=>a.year-b.year);
  box.innerHTML=evs.map(e=>{
    const cls=e.dir>0?'up':(e.dir===0?'mid':'');
    const yr=Math.floor(e.year), m=Math.round((e.year-yr)*12);
    return `<div class="tl-item ${cls}"><span class="tag">${e.field}</span>
      <span class="yr">${yr}${m?' · '+m+'月':''}</span><h4>${e.name}</h4><p>${e.impact}</p></div>`;
  }).join('');
})();

/* ================= 肆 · AI 冲击棱镜 ================= */
(function(){
  const AI = D.ext.aiImpact;

  /* ---- 四象限靶心图 ---- */
  const quad = mk('quadrantChart');
  quad.setOption({
    tooltip:tip({trigger:'item', formatter:p=>`<b>${p.data[3]}</b>${p.data[4]==='ref'?'（参照专业）':''}<br>暴露度 <b>${p.data[0]}</b> / 5<br>净效应 <b>${p.data[1]>0?'+':''}${p.data[1]}</b>（互补 ↔ 替代）<br><span style="color:${C.ink2};font-size:11px">${p.data[2]}</span>`}),
    grid:{left:64,right:44,top:44,bottom:52},
    xAxis:baseAxis({type:'value', name:'AI 任务暴露度 →', nameLocation:'middle', nameGap:30,
      min:0, max:5, nameTextStyle:{color:C.ink, fontSize:12.5, fontWeight:'bold'},
      axisLabel:{color:C.ink, fontSize:12}, splitLine:{lineStyle:{color:'rgba(146,101,62,.12)'}}}),
    yAxis:baseAxis({type:'value', name:'互补增益 ↑ / ↓ 替代收缩', nameTextStyle:{color:C.ink, fontSize:12.5, fontWeight:'bold'},
      min:-2, max:2, axisLabel:{color:C.ink, fontSize:12}, splitLine:{lineStyle:{color:'rgba(146,101,62,.12)'}}}),
    series:[{type:'scatter',
      data:AI.quadrant.map(q=>[q.x, q.y, q.note, q.name, q.grp]),
      symbolSize:d=>d[4]==='ref'?30:38,
      itemStyle:{
        color:p=>{
          const v=p.data;
          if(v[4]==='ref') return '#CE8577';
          return v[1]>0? '#8A9A5B':'#C96F4A';
        },
        opacity:.9, borderColor:'#fff', borderWidth:2.5, shadowBlur:16, shadowColor:'rgba(146,101,62,.3)'},
      label:{show:true, formatter:p=>p.data[3], position:'top', color:C.ink, fontSize:12.5, fontWeight:'bold',
        textBorderColor:'rgba(250,241,226,.9)', textBorderWidth:3},
      markArea:{silent:true, data:[
        [{coord:[2.5,0], itemStyle:{color:'rgba(138,154,91,.10)'}, label:{show:true, position:'insideTopRight', color:'#6E7B48', fontSize:13, fontWeight:'bold', formatter:'驾驭区 · 高暴露高互补'}},{coord:[5,2]}],
        [{coord:[2.5,-2], itemStyle:{color:'rgba(194,94,94,.10)'}, label:{show:true, position:'insideBottomRight', color:'#A04B4B', fontSize:13, fontWeight:'bold', formatter:'危险区 · 高暴露被替代'}},{coord:[5,0]}],
        [{coord:[0,0], itemStyle:{color:'rgba(110,154,139,.08)'}, label:{show:true, position:'insideTopLeft', color:'#55756A', fontSize:13, fontWeight:'bold', formatter:'港湾 · 低暴露互补'}},{coord:[2.5,2]}],
        [{coord:[0,-2], itemStyle:{color:'rgba(224,164,88,.10)'}, label:{show:true, position:'insideBottomLeft', color:'#A97B3D', fontSize:13, fontWeight:'bold', formatter:'渐蚀区 · 低暴露缓慢替代'}},{coord:[2.5,0]}]
      ]},
      markLine:{silent:true, symbol:'none', lineStyle:{color:'rgba(138,90,68,.4)', type:'dashed'},
        label:{show:false}, data:[{xAxis:2.5},{yAxis:0}]}
    }]
  });

  /* ---- 学历非对称：院校层次视图 / 行业视图 ---- */
  const tier = mk('tierChart');
  function renderTierEdu(){
    const T=D.ext.tierEdu;
    const total=T.grads.reduce((a,b)=>a+b,0);
    tier.setOption({
      tooltip:tip({formatter:ps=>{
        const i=ps[0].dataIndex;
        let h=`<b>${T.tiers[i]}</b>　年毕业生 <b>${T.grads[i]} 万</b>（占 ${r1(T.grads[i]/total*100)}%）<br>`;
        ps.forEach(p=>{ if(p.seriesName==='AI 替代压力') h+=`${p.marker}替代压力指数：<b style="color:#C25E5E">${p.value}</b><br>`;
          if(p.seriesName==='信号认可度') h+=`${p.marker}信号认可度：<b style="color:#8A9A5B">${p.value}</b><br>`; });
        h+=`<span style="color:${C.ink2};font-size:11px">${T.notes[i]}</span>`; return h;}}),
      legend:{top:0, textStyle:{color:C.ink2, fontSize:11}},
      grid:{left:56,right:52,top:48,bottom:52},
      xAxis:baseAxis({type:'category', data:T.tiers,
        axisLabel:{color:C.ink, fontSize:11.5, fontWeight:'bold', interval:0, rotate:16}}),
      yAxis:[baseAxis({type:'value', name:'年毕业生(万人)', nameTextStyle:{color:C.ink2}}),
             baseAxis({type:'value', name:'指数(0-100)', max:110, splitLine:{show:false}, nameTextStyle:{color:C.ink2}})],
      series:[
        {name:'年毕业生规模', type:'bar', data:T.grads.map((g,i)=>({value:g,
            itemStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,
              [{offset:0,color:['#8A5A44','#A9714B','#C96F4A','#DE9A55','#E8C9A0','#A9BC9B'][i]},
               {offset:1,color:'#F2E3C4'}]), borderRadius:[10,10,0,0]}})),
          barWidth:34, itemStyle:{color:'#C96F4A'},
          label:{show:true, position:'top', fontSize:11, fontWeight:'bold', color:C.ink,
            formatter:p=>T.grads[p.dataIndex]+'万'}},
        {name:'AI 替代压力', type:'line', yAxisIndex:1, data:T.pressure, smooth:true,
          symbol:'circle', symbolSize:10, lineStyle:{width:3.5, color:'#C25E5E'}, itemStyle:{color:'#C25E5E', borderColor:'#fff', borderWidth:2},
          label:{show:true, fontSize:10, color:'#C25E5E', position:'top'}},
        {name:'信号认可度', type:'line', yAxisIndex:1, data:T.prestige, smooth:true,
          symbol:'diamond', symbolSize:10, lineStyle:{width:3, type:'dashed', color:C.olive}, itemStyle:{color:C.olive, borderColor:'#fff', borderWidth:2}}
      ]
    }, true);
  }
  function renderTierInd(){
    const tiers=['本科层级','硕士层级','博士层级'];
    const palette=['#C25E5E','#C96F4A','#8A5A44','#CE8577','#E0A458','#8A9A5B','#A9BC9B','#6E9A8B','#55756A'];
    const names=Object.keys(AI.tierPressure);
    tier.setOption({
      tooltip:tip(),
      legend:{top:0, textStyle:{color:C.ink2, fontSize:11}, type:'scroll'},
      grid:{left:52,right:30,top:56,bottom:36},
      xAxis:baseAxis({type:'category', data:tiers, boundaryGap:false,
        axisLabel:{color:C.ink, fontSize:13, fontWeight:'bold'}}),
      yAxis:baseAxis({type:'value', name:'替代压力指数', max:100, nameTextStyle:{color:C.ink2}}),
      series:names.map((n,i)=>({
        name:n, type:'line', smooth:true, symbol:'circle', symbolSize:n.includes('*')?9:7,
        data:AI.tierPressure[n],
        lineStyle:{width:n.includes('*')?4:2.5, type:n.includes('*')?'dashed':'solid', color:palette[i%palette.length]},
        itemStyle:{color:palette[i%palette.length]}
      })).concat([{name:'框架', type:'line', data:[], markLine:{silent:true, symbol:'none',
        lineStyle:{color:'rgba(194,94,94,.5)', type:'dotted'}, label:{color:'#A04B4B', fontSize:10, formatter:'可编码任务密集带 ≥60'},
        data:[{yAxis:60}]}}])
    }, true);
  }
  pills('tierViewPills', [{key:'edu',label:'按院校层次 · 含人数'},{key:'ind',label:'按行业'}],
    k=>k==='edu'?renderTierEdu():renderTierInd(), 'olive');
  renderTierEdu();

  /* ---- 模型证词：aiBust 情景按路线的福利冲击 ---- */
  const bust = mk('aiBustChart');
  (function(){
    const base=D.scen.base.v, shock=D.scen.aiBust.v;
    const cats=KEYS.map(NAME);
    // 用绝对变化(万元)而非百分比：部分行业福利基值接近零，百分比会失真爆炸
    const mkR=r=>KEYS.map(k=>r1(shock[k][r].welfare-base[k][r].welfare));
    const dB=mkR('B'), dM=mkR('M'), dD=mkR('D');
    bust.setOption({
      tooltip:tip({formatter:ps=>{let h=`<b>${ps[0].name}</b> · AI 泡沫出清情景<br>`;
        ps.forEach(p=>{const k=KEYS[p.dataIndex],r={本科路线:'B',硕士路线:'M',博士路线:'D'}[p.seriesName];
          const pct=r1(p.value/base[k][r].welfare*100);
          h+=`${p.marker}${p.seriesName}：<b style="color:${p.value<0?'#C25E5E':'#8A9A5B'}">${p.value>0?'+':''}${p.value} 万（${pct}%）</b><br>`;});return h;}}),
      legend:{top:0, textStyle:{color:C.ink2, fontSize:11}},
      grid:{left:58,right:24,top:44,bottom:36},
      xAxis:baseAxis({type:'category', data:cats, axisLabel:{color:C.ink, fontSize:12, interval:0}}),
      yAxis:baseAxis({type:'value', name:'终身福利变化(万元)', nameTextStyle:{color:C.ink2}}),
      series:[
        {name:'本科路线', type:'bar', data:dB, barGap:'10%', itemStyle:{color:'#E0A458', borderRadius:[7,7,0,0]}},
        {name:'硕士路线', type:'bar', data:dM, itemStyle:{color:'#C96F4A', borderRadius:[7,7,0,0]}},
        {name:'博士路线', type:'bar', data:dD, itemStyle:{color:'#8A5A44', borderRadius:[7,7,0,0]}},
        {name:'零线', type:'line', data:[], markLine:{silent:true, symbol:'none', label:{show:false},
          lineStyle:{color:'rgba(138,90,68,.5)'}, data:[{yAxis:0}]}}
      ]
    });
    findings('f4b',[
      {tag:'非对称冲击 · 模型证据', num:dB[0]+' 万 vs '+dD[0]+' 万', txt:`AI 寒冬情景下 AI 行业本科与博士路线的终身福利损失——冲击沿学历梯度递减（绝对值，万元）。`},
      {tag:'青年首当其冲', num:'+3pp', txt:'高盛：ChatGPT 发布后 20–30 岁科技从业者失业率升幅，是同龄其他行业（+0.5pp）的 6 倍——职业入口最先收窄。'},
      {tag:'暴露度冠军', num:'3.86 / 5', txt:'ICRIER 调查中数学家的 AI 暴露度为全职业最高；但高暴露职业的需求增长同样最强（R²=0.51）——暴露 ≠ 消亡。'},
      {tag:'压缩而非消灭', num:'杰文斯楔子', txt:'AI 对知识职业的主导效应是“计费工时压缩”：单位产出所需人数下降，岗位增长放缓但不消失（用户研究材料，2026）。'}
    ]);
  })();

  /* ---- 调控合力矩阵 ---- */
  const reg = mk('regChart');
  (function(){
    const R=AI.regulation;
    const data=[];
    R.vals.forEach((row,ri)=>row.forEach((v,ci)=>data.push([ci,ri,v])));
    reg.setOption({
      tooltip:tip({trigger:'item', formatter:p=>{
        const row=R.rows[p.value[1]], dim=R.dims[p.value[0]], v=p.value[2];
        const note=R.notes[row+'|'+dim];
        return `<b>${row} × ${dim}</b><br>强度 <b style="color:${v>0?'#8A9A5B':(v<0?'#C25E5E':'#7A6152')}">${v>0?'+':''}${v}</b>${note?`<br><span style="color:${C.ink2};font-size:11px">${note}</span>`:''}`;}}),
      grid:{left:10,right:80,top:24,bottom:70, containLabel:true},
      xAxis:baseAxis({type:'category', data:R.dims,
        axisLabel:{color:C.ink, fontSize:12, fontWeight:'bold', interval:0},
        splitArea:{show:true, areaStyle:{color:['rgba(255,246,232,.5)','rgba(250,241,226,.5)']}}}),
      yAxis:baseAxis({type:'category', data:R.rows, inverse:true,
        axisLabel:{color:C.ink2, fontSize:12}, splitLine:{show:false}}),
      visualMap:{min:-3, max:3, dimension:2, calculable:true, orient:'vertical', right:0, top:'center',
        textStyle:{color:C.ink2, fontSize:11}, formatter:v=>(v>0?'+':'')+v,
        inRange:{color:['#B54848','#DE9A55','#F2E3C4','#A9BC9B','#6E8B4F']}},
      series:[{type:'heatmap', data,
        label:{show:true, fontSize:12, fontWeight:'bold', color:'#43312A',
          formatter:p=>(p.value[2]>0?'+':'')+(p.value[2]!==0?p.value[2]:'·')},
        itemStyle:{borderColor:'#FFFBF3', borderWidth:3, borderRadius:9},
        emphasis:{itemStyle:{shadowBlur:14, shadowColor:'rgba(138,90,68,.4)'}}}]
    });
  })();
})();

/* ================= 伍 · 蛛网 ================= */
const cwFlow=mk('cobwebFlow'), cwPrem=mk('cobwebPremium');
let curCw='fin';
const CW_COLOR={E:'#C96F4A', S:'#E0A458', D:'#8A9A5B', W:'#8A5A44', Wh:'#6E9A8B'};
function renderCobweb(){
  const p=D.cobweb.presets[curCw], s=p.series;
  const years=Array.from({length:p.T},(_,i)=>p.y0+i);
  const areas=[];
  (p.policies||[]).forEach(pp=>areas.push([{xAxis:p.y0+pp.t0, name:'政策干预', itemStyle:{color:'rgba(138,154,91,.12)'}, label:{color:C.olive, fontSize:10}},{xAxis:p.y0+pp.t1}]));
  (p.shocks||[]).forEach(sh=>areas.push([{xAxis:p.y0+sh.t, name:'需求冲击', itemStyle:{color:'rgba(194,94,94,.10)'}, label:{color:'#C25E5E', fontSize:10}},{xAxis:Math.min(p.y0+sh.t+2, years[years.length-1])}]));
  const line=(key,name,color,dash)=>({name, type:'line', smooth:true, symbol:'none',
    data:s[key].map(v=>r1(v)), lineStyle:{width:key==='W'?3.5:2.5, type:dash?'dashed':'solid', color}, itemStyle:{color}});
  cwFlow.setOption({
    tooltip:tip(), legend:{top:0, textStyle:{color:C.ink2, fontSize:11}},
    grid:{left:44,right:16,top:44,bottom:30},
    xAxis:baseAxis({type:'category', data:years, boundaryGap:false}),
    yAxis:baseAxis({type:'value', name:'指数(基期=1)', nameTextStyle:{color:C.ink2}}),
    series:[line('H','报考热度 H(即时)', '#CE8577'), line('E','招生产能 E(滞后2年)',CW_COLOR.E),
      line('S','毕业供给 S(滞后4年)',CW_COLOR.S), line('D','需求 D',CW_COLOR.D),
      {name:'区间', type:'line', data:[], markArea:{silent:true, data:areas}}]
  }, true);
  cwPrem.setOption({
    tooltip:tip(), legend:{top:0, textStyle:{color:C.ink2, fontSize:11}},
    grid:{left:44,right:16,top:44,bottom:30},
    xAxis:baseAxis({type:'category', data:years, boundaryGap:false}),
    yAxis:baseAxis({type:'value', name:'工资溢价(倍数)', nameTextStyle:{color:C.ink2}}),
    series:[line('W','实际溢价 W',CW_COLOR.W), line('Wh','适应性预期 Ŵ(文化惯性)',CW_COLOR.Wh,true),
      {name:'基准', type:'line', data:[], markLine:{silent:true, symbol:'none',
        lineStyle:{color:'rgba(138,90,68,.35)', type:'dashed'}, label:{show:false}, data:[{yAxis:1}]}}]
  }, true);
  const rho=D.cobweb.rhoPresets[curCw];
  const rhoTxt=rho>1?`<b style="color:#A04B4B">ρ≈${rho}＞1，位于发散区</b>`:`ρ≈${rho}，贴近临界线（振荡衰减极慢）`;
  document.getElementById('cobwebNote').innerHTML=`<b style="color:${C.ink}">${p.label}</b>　${p.note}　<span style="color:${C.teal}">数值谱半径 ${rhoTxt}。</span>`;
}
pills('cobwebPills', Object.keys(D.cobweb.presets).map(k=>({key:k,label:D.cobweb.presets[k].label})),
  k=>{curCw=k; renderCobweb();});
renderCobweb();

/* ---- 谱半径矩阵 ---- */
const spec=mk('spectralHeat');
(function(){
  const ths=D.cobweb.thetas, kps=D.cobweb.kappas, rho=D.cobweb.rho4;
  const data=[];
  rho.forEach((row,ti)=>row.forEach((v,ki)=>data.push([ki,ti,v])));
  const near=(arr,v)=>{let bi=0,bd=1e9;arr.forEach((x,i)=>{const d=Math.abs(x-v);if(d<bd){bd=d;bi=i;}});return bi;};
  const markers=Object.keys(D.cobweb.presets).map(k=>{
    const p=D.cobweb.presets[k];
    return {name:p.label.split('（')[0], coord:[near(kps,p.kappa), near(ths,p.theta)],
      value:D.cobweb.rhoPresets[k]};
  });
  spec.setOption({
    tooltip:tip({trigger:'item', formatter:p=>p.seriesIndex===1?
      `<b>${p.data.name}</b><br>谱半径 ρ≈${p.data.value} ＞1（发散）`:
      `θ=${ths[p.value[1]]}，κ=${kps[p.value[0]]}<br>谱半径 ρ = <b>${p.value[2]}</b> ${p.value[2]>1?'<span style="color:#C96F4A">发散</span>':'<span style="color:#8A9A5B">收敛</span>'}`}),
    grid:{left:52,right:16,top:40,bottom:44},
    xAxis:baseAxis({type:'category', data:kps.map(k=>'κ='+k), name:'招生响应强度 κ', nameLocation:'middle', nameGap:28, nameTextStyle:{color:C.ink2}, axisLabel:{fontSize:10, color:C.ink2}}),
    yAxis:baseAxis({type:'category', data:ths.map(t=>'θ='+t), name:'预期更新 θ', nameTextStyle:{color:C.ink2}, axisLabel:{fontSize:10, color:C.ink2}}),
    visualMap:{min:0.85, max:1.22, dimension:2, calculable:true, orient:'horizontal', left:'center', bottom:0,
      textStyle:{color:C.ink2, fontSize:10}, inRange:{color:['#A9BC9B','#F2E3C4','#E5A55F','#C25E5E']}},
    series:[
      {type:'heatmap', data, label:{show:true, fontSize:9, color:'rgba(67,49,42,.75)', formatter:p=>p.value[2].toFixed(2)},
        itemStyle:{borderColor:'#FFFBF3', borderWidth:2, borderRadius:6}},
      {type:'scatter', data:markers, symbol:'pin', symbolSize:34,
        itemStyle:{color:C.brown, borderColor:'#fff', borderWidth:2, shadowBlur:8, shadowColor:'rgba(138,90,68,.5)'},
        label:{show:true, formatter:p=>p.data.name, position:'top', color:C.brown, fontSize:10, fontWeight:'bold'}, z:5}
    ]
  });
  findings('f4',[
    {tag:'热潮的物理属性', num:'ρ ≈ 0.92–1.04', txt:'五轮热潮的数值谱半径全部紧贴临界线 1——不会指数爆炸，但振荡衰减极慢：一次政策脉冲，余波就是十年周期。'},
    {tag:'法学热的顶点', num:'96 万', txt:'2024 年法考报名人数，6 年连涨 58.9% 后 2025 年首次回落——供给端的历史峰值。'},
    {tag:'土木热的塌缩', num:'-41,522 名', txt:'同济土木 2022 年在河南的投档位次一年下滑：需求冲击沿“分数线”完成了最直白的定价。'},
    {tag:'文化惯性的代价', num:'θ≈0.22–0.3', txt:'法学与土木的预期更新速度最低——家长和考生用 4 年前的工资信号投票，这正是蛛网过冲的燃料。'}
  ]);
})();

/* ---- 真实数据 ---- */
const real=mk('realChart');
const REAL_TABS={
  law:{label:'法学：法考', render(){
    const L=D.ext.lawBoom;
    real.setOption({tooltip:tip(), legend:{top:0, textStyle:{color:C.ink2, fontSize:11}},
      grid:{left:50,right:50,top:44,bottom:34},
      xAxis:baseAxis({type:'category', data:L.years}),
      yAxis:[baseAxis({type:'value', name:'报名(万人)', nameTextStyle:{color:C.ink2}}),
             baseAxis({type:'value', name:'通过率(%)', max:30, splitLine:{show:false}, nameTextStyle:{color:C.ink2}})],
      series:[
        {name:'报名人数', type:'bar', data:L.signup, barWidth:22,
          itemStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#E0A458'},{offset:1,color:'#C96F4A'}]), borderRadius:[9,9,0,0]}},
        {name:'通过率', type:'line', yAxisIndex:1, data:L.passRate, connectNulls:true, smooth:true,
          symbol:'circle', symbolSize:8, lineStyle:{width:3, color:C.teal}, itemStyle:{color:C.teal}},
        {name:'授予资格(万人)', type:'line', data:L.grant, connectNulls:true, smooth:true, symbol:'diamond', symbolSize:8,
          lineStyle:{width:2.5, type:'dashed', color:C.brown}, itemStyle:{color:C.brown}}
      ]}, true);
  }},
  fin:{label:'金融：录取位次', render(){
    const F=D.ext.finBoom;
    real.setOption({tooltip:tip(), legend:{top:0, textStyle:{color:C.ink2, fontSize:11}},
      grid:{left:60,right:30,top:44,bottom:34},
      xAxis:baseAxis({type:'category', data:F.cufo.years}),
      yAxis:baseAxis({type:'value', name:'物理类最低录取位次(名)', inverse:true, nameTextStyle:{color:C.ink2}}),
      series:[
        {name:'中央财经大学', type:'line', data:F.cufo.rank, smooth:true, symbol:'circle', symbolSize:9,
          lineStyle:{width:3.5, color:C.terra}, itemStyle:{color:C.terra},
          areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#C96F4A33'},{offset:1,color:'#C96F4A05'}])},
          label:{show:true, color:C.terra, fontSize:10}},
        {name:'对外经贸大学', type:'line', data:F.uibe.rank, smooth:true, symbol:'triangle', symbolSize:9,
          lineStyle:{width:3.5, color:C.brown}, itemStyle:{color:C.brown}, label:{show:true, color:C.brown, fontSize:10, position:'bottom'}}
      ]}, true);
  }},
  civil:{label:'土木：同济投档', render(){
    const V=D.ext.civilBoom;
    real.setOption({tooltip:tip({trigger:'item'}),
      grid:{left:60,right:30,top:44,bottom:34},
      xAxis:baseAxis({type:'category', data:V.tongji.years}),
      yAxis:[baseAxis({type:'value', name:'投档分', min:500, max:700, nameTextStyle:{color:C.ink2}}),
             baseAxis({type:'value', name:'位次(名)', inverse:true, splitLine:{show:false}, nameTextStyle:{color:C.ink2}})],
      series:[
        {name:'河南理科投档分', type:'bar', data:V.tongji.score, barWidth:40,
          itemStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#8A9A5B'},{offset:1,color:'#C96F4A'}]), borderRadius:[10,10,0,0]},
          label:{show:true, position:'top', color:C.ink, fontWeight:'bold'}},
        {name:'投档位次', type:'line', yAxisIndex:1, data:V.tongji.rank, symbol:'circle', symbolSize:10,
          lineStyle:{width:3, color:C.brown, type:'dashed'}, itemStyle:{color:C.brown}, label:{show:true, color:C.brown, fontSize:10}}
      ]}, true);
  }},
  kaoyan:{label:'考研热退潮', render(){
    const K=D.ext.kaoyan;
    real.setOption({tooltip:tip(),
      grid:{left:50,right:30,top:44,bottom:34},
      xAxis:baseAxis({type:'category', data:K.years, boundaryGap:false}),
      yAxis:baseAxis({type:'value', name:'报名(万人)', min:200, nameTextStyle:{color:C.ink2}}),
      series:[{name:'考研报名', type:'line', data:K.signup, smooth:true, symbol:'circle', symbolSize:8,
        lineStyle:{width:3.5, color:C.teal}, itemStyle:{color:C.teal},
        areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#6E9A8B44'},{offset:1,color:'#6E9A8B05'}])},
        markPoint:{data:[{coord:['2023',474], value:'峰值 474万', itemStyle:{color:C.terra},
          label:{color:'#fff', fontSize:10}}], symbol:'pin', symbolSize:44}}]}, true);
  }}
};
pills('realPills', Object.keys(REAL_TABS).map(k=>({key:k,label:REAL_TABS[k].label})), k=>REAL_TABS[k].render(), 'brown');
REAL_TABS.law.render();

/* ================= 伍 · 灵活就业 ================= */
const gigS=mk('gigScatter');
(function(){
  const gig=D.ext.gigJobs;
  const gigData=gig.map(g=>({name:g.name, value:[g.hoursWeek, g.monthly, g.satisf||35], note:g.note}));
  // 白领参照：生涯总收入按 41 年职业期摊为月均（元）
  const whiteData=KEYS.map(k=>{
    const v=D.ind[k].val.B;
    const monthly=Math.round(v.lifeIncome*10000/((63-22)*12));
    return {name:NAME(k)+' · 本科路线', value:[D.ind[k].params.H.B, monthly, 55], star:true, k};
  });
  gigS.setOption({
    tooltip:tip({trigger:'item', formatter:p=>{
      if(p.data.star) return `<b>${p.data.name}</b>（对照）<br>周工时 ${p.value[0]}h · 生涯月均 ${Math.round(p.value[1]).toLocaleString()} 元`;
      const g=gig[p.dataIndex]; return `<b>${g.name}</b><br>周工时 <b>${g.hoursWeek}h</b> · 月均 <b>${g.monthly} 元</b>${g.satisf?`<br>收入满意度 <b>${g.satisf}%</b>`:''}<br><span style="color:${C.ink2};font-size:11px">${g.note}</span>`;}}),
    legend:{top:0, textStyle:{color:C.ink2, fontSize:11}},
    grid:{left:60,right:40,top:46,bottom:44},
    xAxis:baseAxis({type:'value', name:'每周工时(h)', nameLocation:'middle', nameGap:28, min:35, max:70, nameTextStyle:{color:C.ink2}}),
    yAxis:baseAxis({type:'value', name:'月收入(元)', nameTextStyle:{color:C.ink2}}),
    series:[
      {name:'灵活就业', type:'scatter', data:gigData,
        symbolSize:d=>18+d[2]*0.55,
        itemStyle:{color:p=>['#C96F4A','#E0A458','#8A5A44','#CE8577','#8A9A5B'][p.dataIndex%5],
          opacity:.85, borderColor:'#fff', borderWidth:2, shadowBlur:14, shadowColor:'rgba(146,101,62,.3)'},
        label:{show:true, formatter:p=>p.data.name, position:'top', color:C.ink, fontSize:11.5, fontWeight:'bold'},
        markLine:{silent:true, symbol:'none', label:{fontSize:10, color:C.ink2},
          lineStyle:{type:'dashed', color:'rgba(138,90,68,.4)'},
          data:[{xAxis:48.6, name:'全国周均48.6h'},{yAxis:6043, name:'蓝领月均6043元'}]}},
      {name:'学历路线对照', type:'scatter', data:whiteData, symbol:'pin', symbolSize:30,
        itemStyle:{color:C.teal, opacity:.8, borderColor:'#fff', borderWidth:2},
        label:{show:true, formatter:p=>p.data.name.split(' ')[0], position:'bottom', color:C.teal, fontSize:9.5}}
    ]
  });
  findings('f5',[
    {tag:'旷野的规模', num:'2.4 亿', txt:'2024 年全国灵活就业人员总量；其中新就业形态劳动者 8400 万，占职工总数 21%。'},
    {tag:'被低估的骑手', num:'6,803 元/月', txt:'2023 年外卖员月均收入，高于蓝领均值 6043 元；一线高频骑手旺季可达 1.1 万元。'},
    {tag:'彩票型职业', num:'67.9%', txt:'职业主播月入不足 3000 元的比例——均值 6709 元由 13.7% 的头部撑起，中位数远低于均值。'},
    {tag:'满意度的倒挂', num:'81.4% vs 22%', txt:'网约车司机（7623 元）收入满意度第一，货车司机（8424 元）收入最高但满意度垫底——自由本身是薪酬的一部分。'}
  ]);
})();

/* ---- 主播金字塔 ---- */
const pyr=mk('pyramidChart');
(function(){
  const bands=D.ext.gigJobs.find(g=>g.key==='zhubo').pyramid;
  pyr.setOption({
    tooltip:tip({trigger:'item', formatter:p=>`${p.name}<br>占比 <b>${p.value}%</b>（1508 万职业主播）`}),
    series:[{type:'funnel', left:'8%', right:'8%', top:16, bottom:16, sort:'none', gap:6,
      minSize:'18%', maxSize:'92%',
      data:bands.map((b,i)=>({name:b.band, value:b.pct,
        itemStyle:{color:['#E8C9A0','#DE9A55','#C96F4A','#8A5A44'][i], borderRadius:8, borderColor:'#FFFBF3', borderWidth:2}})),
      label:{show:true, position:'inside', formatter:'{b}\n{c}%', color:'#fff', fontSize:13, fontWeight:'bold',
        textBorderColor:'rgba(0,0,0,.12)', textBorderWidth:2},
      labelLine:{show:false}}],
    graphic:[{type:'text', left:'center', top:6, style:{
      text:'“90% 的主播收入不如外卖员”——塔尖 13.7% 拿走流量定价权',
      fill:C.ink2, fontSize:12, fontFamily:'Noto Sans SC'}}]
  });
})();

/* ---- 旷野 vs 航道 累积 ---- */
const gigL=mk('gigLifeChart');
let gigInd='NET';
function renderGigLife(){
  const ages=D.ext.gigLife.ages; // 20-60
  const cum=arr=>{let s=0;return arr.map(v=>(s=r1(s+v)));};
  const mkGig=(key,name,color)=>({name, type:'line', smooth:true, symbol:'none',
    data:cum(D.gigTraj[key]), lineStyle:{width:2.8, color}, itemStyle:{color},
    areaStyle:key==='rider'?{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:color+'3A'},{offset:1,color:color+'06'}])}:null});
  // 学历路线：对齐到 20-60 岁窗口（cum 从 18 岁开始）
  const ind=D.ind[gigInd];
  const align=route=>{const c=ind.cum[route].p50; return ages.map(a=>{const i=a-18; return i>=0&&i<c.length?r1(c[i]):null;});};
  gigL.setOption({
    tooltip:tip(), legend:{top:0, textStyle:{color:C.ink2, fontSize:11}},
    grid:{left:56,right:20,top:44,bottom:30},
    xAxis:baseAxis({type:'category', data:ages, name:'年龄', nameLocation:'middle', nameGap:26, boundaryGap:false}),
    yAxis:baseAxis({type:'value', name:'累计收入(万元)', nameTextStyle:{color:C.ink2}}),
    series:[
      mkGig('rider','骑手/司机型(中位)','#C96F4A'),
      mkGig('truck','货车司机型','#8A5A44'),
      mkGig('zhubo_mean','主播·均值','#CE8577'),
      mkGig('zhubo_top','主播·头部彩票','#E0A458'),
      {name:NAME(gigInd)+'本科(中位)', type:'line', smooth:true, symbol:'none', data:align('B'),
        lineStyle:{width:3, type:'dashed', color:C.teal}, itemStyle:{color:C.teal}},
      {name:NAME(gigInd)+'硕士(中位)', type:'line', smooth:true, symbol:'none', data:align('M'),
        lineStyle:{width:3, type:'dashed', color:C.brown}, itemStyle:{color:C.brown}}
    ]
  }, true);
}
pills('gigIndPills', KEYS.map(k=>({key:k,label:NAME(k)})), k=>{gigInd=k; renderGigLife();}, 'teal');
renderGigLife();

/* ================= 柒 · 人口深流 ================= */
const acad=mk('acadChart');
(function(){
  const A=D.acad, ys=A.map(x=>x.y);
  acad.setOption({
    tooltip:tip(), legend:{top:0, textStyle:{color:C.ink2, fontSize:11}},
    grid:{left:64,right:96,top:46,bottom:34},
    xAxis:baseAxis({type:'category', data:ys, boundaryGap:false}),
    yAxis:[
      baseAxis({type:'value', name:'18岁人口(万人)', position:'left', min:0, max:2200,
        nameTextStyle:{color:'#B8834A', fontSize:11.5, fontWeight:'bold'},
        axisLabel:{color:'#B8834A', fontSize:11}, splitLine:{lineStyle:{color:C.grid}}}),
      baseAxis({type:'value', position:'right', min:0, max:22,
        axisLabel:{color:C.terra, fontSize:11}, splitLine:{show:false}}),
      baseAxis({type:'log', position:'right', offset:56, min:0.5, max:50, logBase:10,
        axisLabel:{color:C.brown, fontSize:11, formatter:v=>v>=1?v:v.toFixed(1)}, splitLine:{show:false}})
    ],
    series:[
      {name:'18岁人口(左轴)', type:'line', smooth:true, symbol:'none', data:A.map(x=>r1(x.n18)),
        lineStyle:{width:0}, areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,
          [{offset:0,color:'#E0A45855'},{offset:1,color:'#E0A45808'}])}, itemStyle:{color:C.amber}, stack:'x', z:1},
      {name:'博士毕业供给(右轴·万人)', type:'line', yAxisIndex:1, smooth:true, symbol:'circle', symbolSize:5,
        data:A.map(x=>x.phd), lineStyle:{width:3.5, color:C.terra}, itemStyle:{color:C.terra},
        areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,
          [{offset:0,color:'#C96F4A2E'},{offset:1,color:'#C96F4A05'}])}, z:3,
        label:{show:true, fontSize:9.5, color:C.terra, interval:4, formatter:p=>p.value}},
      {name:'教职新增需求(右轴·万人)', type:'line', yAxisIndex:1, smooth:true, symbol:'diamond', symbolSize:6,
        data:A.map(x=>r1(x.hires)), lineStyle:{width:3.5, color:C.olive}, itemStyle:{color:C.olive}, z:3,
        label:{show:true, fontSize:9.5, color:'#6E7B48', interval:4, position:'bottom', formatter:p=>p.value}},
      {name:'竞争烈度(最右轴·对数)', type:'line', yAxisIndex:2, smooth:true, symbol:'none',
        data:A.map(x=>r1(x.ratio)), lineStyle:{width:2.5, type:'dashed', color:C.brown}, itemStyle:{color:C.brown}, z:2,
        markLine:{silent:true, symbol:'none', label:{fontSize:10, color:'#A04B4B', formatter:'供求平衡线'},
          lineStyle:{type:'dashed', color:'rgba(194,94,94,.5)'},
          data:[{yAxis:1}]}}
    ]
  });
})();
})();
