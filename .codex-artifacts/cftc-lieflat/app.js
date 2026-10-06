const rgb=hex=>[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16));
const mix=(first,second,weight)=>'#'+rgb(first).map((channel,index)=>Math.round(channel*(1-weight)+rgb(second)[index]*weight).toString(16).padStart(2,'0')).join('');
const luminance=hex=>rgb(hex).map(channel=>channel/255).map(channel=>channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4).reduce((total,channel,index)=>total+channel*[.2126,.7152,.0722][index],0);
const contrast=hex=>(Math.max(luminance(hex),luminance(PALETTE.BG))+.05)/(Math.min(luminance(hex),luminance(PALETTE.BG))+.05);
function legible(hex){
 for(let amount=0;amount<=1;amount+=.025){
  const adjusted=mix(hex,PALETTE.TXT,amount);
  if(contrast(adjusted)>=4.6)return adjusted;
 }
 return PALETTE.TXT;
}
const COLORS={asset:legible(PALETTE.DATA),leveraged:legible(PALETTE.HERO),dealer:legible(PALETTE.BEAD),other:PALETTE.DATA2,nonreportable:legible(PALETTE.RAMP6[1])};
PALETTE.MUT=legible(mix(PALETTE.BG,PALETTE.TXT,.65));
PALETTE.LAB=legible(mix(PALETTE.BG,PALETTE.TXT,.75));
document.getElementById('mono-style').textContent=MONO.CARD_CSS+`
:root{--bg:${PALETTE.BG};--ink:${PALETTE.TXT};--muted:${PALETTE.MUT};--faint:${PALETTE.FAINT};--grid:${PALETTE.GRID}}
.card{background:${PALETTE.BG}}svg text{fill:${PALETTE.TXT}}
h2,.eyebrow{color:${PALETTE.DATA}}
button[data-mode][aria-pressed=true]{background:${PALETTE.DATA};border-color:${PALETTE.DATA}}
button:not([aria-pressed=true]):hover,select:hover{background:${PALETTE.QUIET}}`;
const byId=id=>document.getElementById(id);
const SERIES=[
 {key:'asset',column:1,name:'资管 / 机构投资者',short:'资管机构',color:COLORS.asset,dash:''},
 {key:'leveraged',column:2,name:'杠杆资金（含对冲基金）',short:'杠杆资金',color:COLORS.leveraged,dash:''},
 {key:'dealer',column:3,name:'交易商 / 中介',short:'交易商',color:COLORS.dealer,dash:'9 5'},
 {key:'other',column:4,name:'其他可报告交易者',short:'其他机构',color:COLORS.other,dash:'2 5'},
 {key:'nonreportable',column:5,name:'非报告头寸',short:'非报告',color:COLORS.nonreportable,dash:'12 4 2 4'}
];
const GROSS=[
 {key:'long',column:6,name:'杠杆资金总多头（含价差腿）',short:'总多头',color:COLORS.asset,dash:''},
 {key:'short',column:7,name:'杠杆资金总空头（含价差腿）',short:'总空头',color:COLORS.leveraged,dash:''},
 {key:'net',column:2,name:'杠杆资金净持仓',short:'净持仓',color:COLORS.dealer,dash:'9 5'}
];
const TITLES={all:'资管净多头的另一面，是杠杆资金与交易商净空头',core:'三条主线：资管、杠杆资金与交易商',original:'原图两类之外，空头侧仍有其他参与者',gross:'总空头不等于净空头：同一类机构也持有多头'};
const state={mode:'all',period:'all',pinned:false,index:0};
let visibleRows=[],activeSeries=[],pointLayer,positionX,positionY;
const svg=byId('plot');
const limits={left:82,right:1080,top:45,bottom:440};
const format=value=>(value>0?'+':value<0?'−':'')+Math.abs(value).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
const stamp=value=>Date.parse(value+'T00:00:00Z');
const addText=(parent,attrs,text)=>MONO.txt(parent,{...attrs,style:`fill:${attrs.fill||PALETTE.TXT}`},text);

function showPoint(index){
 state.index=Math.max(0,Math.min(visibleRows.length-1,Number(index)));
 const row=visibleRows[state.index];
 byId('scrubber').value=state.index;
 byId('report-date').textContent='报告日 '+row[0]+(state.pinned?' · 已固定':'');
 byId('balance').textContent=state.mode==='all'?'五类净额合计：0.0':state.mode==='gross'?'总多头 − 总空头 = 净持仓':'所选类别并非全部市场';
 for(const series of activeSeries){
  byId('value-'+series.key).textContent=format(row[series.column]);
 }
 if(!pointLayer)return;
 pointLayer.replaceChildren();
 const horizontal=positionX(row[0]);
 MONO.el(pointLayer,'line',{x1:horizontal,x2:horizontal,y1:limits.top,y2:limits.bottom,stroke:PALETTE.FLOOR,'stroke-width':1,'stroke-dasharray':'3 5'});
 for(const series of activeSeries){
  MONO.el(pointLayer,'circle',{cx:horizontal,cy:positionY(row[series.column]),r:4,fill:PALETTE.BG,stroke:series.color,'stroke-width':1.8});
 }
}

function render(animate=false){
 visibleRows=DATA.filter(row=>state.period==='original'?row[0]<='2023-12-31':state.period==='recent'?row[0]>='2021-01-01':true);
 activeSeries=state.mode==='gross'?GROSS:state.mode==='core'?SERIES.slice(0,3):state.mode==='original'?[SERIES[0],SERIES[3]]:SERIES;
 byId('chart-title').textContent=TITLES[state.mode];
 const firstDate=visibleRows[0][0],lastDate=visibleRows.at(-1)[0];
 byId('subtitle').textContent=(state.mode==='gross'?'多空总量与净额，三条独立数据线':'净持仓 = 多头 − 空头')+' · 十亿美元面值 · '+firstDate+'—'+lastDate;
 byId('start-label').textContent=firstDate;
 byId('end-label').textContent=lastDate;
 byId('scrubber').max=visibleRows.length-1;
 byId('notes').textContent=state.mode==='gross'?'空头总量按正数展示；净持仓可以为负。Spreading 同时加入多头和空头，净额不变。琥珀色只强调总空头，不代表收益或损失。':'横贯图中的浅褐色虚线是“净持仓 = 0”的参考线，不是某类机构。琥珀色只强调杠杆资金；保险公司归入资管 / 机构类别。';
 byId('legend').innerHTML=activeSeries.map(series=>`<div><div class="legend-name"><span class="legend-mark" style="color:${series.color};border-top-style:${series.dash?'dashed':'solid'}"></span><span>${series.name}</span></div><div class="legend-value" id="value-${series.key}" style="color:${series.color}"></div></div>`).join('');
 svg.replaceChildren();
 MONO.el(svg,'title',{}).textContent=TITLES[state.mode];
 MONO.el(svg,'desc',{}).textContent=firstDate+'至'+lastDate+'，单位十亿美元面值。2016年两期缺失汇总留空；通过滑杆可读取各期具体数值。';
 const firstStamp=stamp(firstDate),span=stamp(lastDate)-firstStamp;
 positionX=value=>limits.left+(stamp(value)-firstStamp)/span*(limits.right-limits.left);
 const values=visibleRows.flatMap(row=>activeSeries.map(series=>row[series.column]));
 const step=Math.max(...values.map(Math.abs))>1200?400:200;
 let upper=Math.ceil(Math.max(0,...values)/step)*step;
 let lower=Math.floor(Math.min(0,...values)/step)*step;
 if(state.mode!=='gross'){upper=Math.max(upper,-lower);lower=-upper;}
 positionY=value=>limits.bottom-(value-lower)/(upper-lower)*(limits.bottom-limits.top);
 addText(svg,{x:limits.left,y:19,fill:PALETTE.LAB,'font-size':12,'font-weight':600},'十亿美元面值');
 for(let value=lower;value<=upper;value+=step){
  const vertical=positionY(value);
  MONO.el(svg,'line',{x1:limits.left,x2:limits.right,y1:vertical,y2:vertical,stroke:value===0?PALETTE.LAB:PALETTE.GRID,'stroke-width':value===0?1.2:.7,'stroke-dasharray':value===0?'6 6':'2 5'});
  addText(svg,{x:limits.left-16,y:vertical+4,fill:PALETTE.LAB,'font-size':11,'text-anchor':'end'},value.toLocaleString('en-US'));
 }
 addText(svg,{x:limits.right,y:19,fill:PALETTE.LAB,'font-size':11,'text-anchor':'end'},'浅褐色虚线 = 零轴参考线，不是数据曲线');
 for(const row of visibleRows){
  const horizontal=positionX(row[0]);
  MONO.el(svg,'line',{x1:horizontal,x2:horizontal,y1:limits.bottom+11,y2:limits.bottom+17,stroke:PALETTE.FLOOR,'stroke-width':.6});
 }
 const fromYear=Number(firstDate.slice(0,4)),toYear=Number(lastDate.slice(0,4));
 const yearStep=toYear-fromYear>14?2:1;
 for(let year=fromYear;year<=toYear;year+=yearStep){
  const yearDate=year+'-01-01';
  if(stamp(yearDate)<firstStamp)continue;
  addText(svg,{x:positionX(yearDate),y:limits.bottom+38,fill:PALETTE.LAB,'font-size':11,'text-anchor':'middle'},String(year));
 }
 if(toYear-fromYear>14){addText(svg,{x:limits.left,y:limits.bottom+38,fill:PALETTE.LAB,'font-size':11,'text-anchor':'middle'},String(fromYear));}
 drawSeries(animate);
 pointLayer=MONO.el(svg,'g',{'aria-hidden':'true'});
 const hit=MONO.el(svg,'rect',{x:limits.left,y:limits.top,width:limits.right-limits.left,height:limits.bottom-limits.top,fill:'transparent'});
 hit.style.cursor='crosshair';
 hit.addEventListener('pointermove',event=>{if(!state.pinned)showPoint(nearestIndex(event));});
 hit.addEventListener('click',event=>{event.stopPropagation();state.pinned=!state.pinned;showPoint(nearestIndex(event));});
 hit.addEventListener('pointerleave',()=>{if(!state.pinned)showPoint(visibleRows.length-1);});
 showPoint(visibleRows.length-1);
}

function drawSeries(animate){
 const labels=[];
 for(const series of activeSeries){
  const group=MONO.el(svg,'g',{'data-series':series.key});
  let path='',previousStamp=null;
  for(const row of visibleRows){
   const currentStamp=stamp(row[0]);
   const command=previousStamp===null||currentStamp-previousStamp>8*86400000?'M':'L';
   path+=command+positionX(row[0]).toFixed(2)+' '+positionY(row[series.column]).toFixed(2)+' ';
   previousStamp=currentStamp;
  }
  const attributes={d:path,fill:'none',stroke:series.color,'stroke-width':1.8,'stroke-linejoin':'round','stroke-linecap':'round'};
  if(series.dash)attributes['stroke-dasharray']=series.dash;
  const curve=MONO.el(group,'path',attributes);
  if(animate&&!series.dash&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const length=curve.getTotalLength();
   curve.animate([{strokeDasharray:String(length),strokeDashoffset:String(length)},{strokeDasharray:String(length),strokeDashoffset:'0'}],{duration:MONO.MOTION.duration||1100,easing:'cubic-bezier(.4,0,.2,1)'});
  }
  for(const row of visibleRows){
   MONO.el(group,'circle',{cx:positionX(row[0]),cy:positionY(row[series.column]),r:visibleRows.length>300?.7:1.3,fill:series.color});
  }
  const last=visibleRows.at(-1),vertical=positionY(last[series.column]);
  MONO.el(group,'circle',{cx:limits.right,cy:vertical,r:3.2,fill:series.color});
  labels.push({series,value:last[series.column],actual:vertical,y:vertical});
 }
 labels.sort((first,second)=>first.y-second.y);
 for(let index=1;index<labels.length;index++)labels[index].y=Math.max(labels[index].y,labels[index-1].y+24);
 if(labels.at(-1).y>limits.bottom){
  labels.at(-1).y=limits.bottom;
  for(let index=labels.length-2;index>=0;index--)labels[index].y=Math.min(labels[index].y,labels[index+1].y-24);
 }
 for(const label of labels){
  MONO.el(svg,'path',{d:`M${limits.right+5} ${label.actual} L${limits.right+17} ${label.y} H${limits.right+24}`,fill:'none',stroke:label.series.color,'stroke-width':.8});
  addText(svg,{x:limits.right+29,y:label.y+4,fill:label.series.color,'font-size':11,'font-weight':600},label.series.short+' '+format(label.value));
 }
 addText(svg,{x:limits.left,y:508,fill:PALETTE.LAB,'font-size':10},'每个点 = 一个实际报告日；底部短线 = 报告日刻度。2016年两期缺失处断线，不插值。');
}

function nearestIndex(event){
 const point=svg.createSVGPoint();
 point.x=event.clientX;point.y=event.clientY;
 const local=point.matrixTransform(svg.getScreenCTM().inverse());
 const fraction=Math.max(0,Math.min(1,(local.x-limits.left)/(limits.right-limits.left)));
 const target=stamp(visibleRows[0][0])+fraction*(stamp(visibleRows.at(-1)[0])-stamp(visibleRows[0][0]));
 let low=0,high=visibleRows.length-1;
 while(low<high){
  const middle=Math.floor((low+high)/2);
  if(stamp(visibleRows[middle][0])<target)low=middle+1;else high=middle;
 }
 if(low>0&&Math.abs(stamp(visibleRows[low-1][0])-target)<Math.abs(stamp(visibleRows[low][0])-target))low--;
 return low;
}

for(const button of document.querySelectorAll('[data-mode]')){
 button.addEventListener('click',()=>{
  state.mode=button.dataset.mode;state.pinned=false;
  for(const candidate of document.querySelectorAll('[data-mode]'))candidate.setAttribute('aria-pressed',String(candidate===button));
  render(false);
 });
}
byId('period').addEventListener('change',event=>{state.period=event.target.value;state.pinned=false;render(false);});
byId('scrubber').addEventListener('input',event=>{state.pinned=true;showPoint(event.target.value);});
byId('replay').addEventListener('click',()=>{state.pinned=false;render(true);});
render(false);
MONO.obsReveal('plot',()=>{state.pinned=false;render(true);});
