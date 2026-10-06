const GALLERY_GROUPS=[
 {name:'资管 / 机构',short:'资管',column:1,color:COLORS.asset},
 {name:'杠杆资金',short:'杠杆',column:2,color:COLORS.leveraged},
 {name:'交易商 / 中介',short:'交易商',column:3,color:COLORS.dealer},
 {name:'其他可报告',short:'其他',column:4,color:COLORS.other},
 {name:'非报告头寸',short:'非报告',column:5,color:COLORS.nonreportable},
];
const latestObservation=DATA.at(-1);
const latestPositions=GALLERY_GROUPS.map(group=>({
 name:group.name,value:latestObservation[group.column],color:group.color,
})).sort((first,second)=>second.value-first.value);

MONO.eReveal('latest-diverging',{
 animationDuration:900,animationEasing:'quarticOut',animationDelay:index=>index*90,
 tooltip:{...MONO.tipLight,formatter:point=>`${point.name}<br><b>${format(point.value)}</b> 十亿美元`},
 grid:{left:116,right:72,top:16,bottom:22},
 xAxis:{type:'value',min:-1200,max:1200,interval:400,
  splitLine:{lineStyle:{color:PALETTE.GRID,type:'dashed'}},
  axisLine:{show:false},axisTick:{show:false},
  axisLabel:{color:PALETTE.LAB,fontFamily:'Inter',fontSize:10,formatter:value=>value===0?'0':Math.abs(value)}},
 yAxis:{type:'category',data:latestPositions.map(item=>item.name),inverse:true,
  axisLine:{show:false},axisTick:{show:false},
  axisLabel:{color:PALETTE.TXT,fontFamily:'Inter',fontSize:11,fontWeight:600}},
 series:[{type:'bar',barWidth:18,
  data:latestPositions.map(item=>({name:item.name,value:item.value,
   itemStyle:{color:item.color,borderRadius:item.value>0?[0,9,9,0]:[9,0,0,9]}})),
  label:{show:true,fontFamily:'Inter',fontSize:11,fontWeight:700,position:'outside',
   formatter:point=>format(point.value),color:PALETTE.TXT},
  markLine:{symbol:'none',silent:true,label:{show:false},lineStyle:{color:PALETTE.LAB,width:1.4},data:[{xAxis:0}]},
 }],
});

MONO.obsReveal('leverage-waterfall',svg=>{
 const grossLong=latestObservation[6],grossShort=latestObservation[7],net=latestObservation[2];
 const rows=[
  {name:'总多头',value:grossLong,from:0,to:grossLong,color:COLORS.asset,negative:false},
  {name:'减：总空头',value:-grossShort,from:grossLong,to:net,color:COLORS.leveraged,negative:true},
  {name:'净持仓',value:net,from:0,to:net,color:COLORS.dealer,negative:false},
 ];
 const lower=Math.floor((Math.min(net,0)-80)/200)*200;
 const upper=Math.ceil((Math.max(grossLong,0)+80)/200)*200;
 const top=34,bottom=278,xPosition=index=>88+index*112;
 const yPosition=value=>bottom-(value-lower)/(upper-lower)*(bottom-top);
 for(let value=lower;value<=upper;value+=200){
  const y=yPosition(value);
  MONO.el(svg,'line',{x1:38,x2:370,y1:y,y2:y,stroke:value===0?PALETTE.LAB:PALETTE.GRID,'stroke-width':value===0?1.1:.7,'stroke-dasharray':value===0?'6 5':'2 5'});
  addText(svg,{x:31,y:y+3,fill:PALETTE.LAB,'font-size':7.5,'text-anchor':'end'},value);
 }
 rows.forEach((row,index)=>{
  const x=xPosition(index),low=Math.min(row.from,row.to),high=Math.max(row.from,row.to);
  const rungCount=Math.max(1,Math.ceil((high-low)/20));
  for(let rung=0;rung<=rungCount;rung++){
   const amount=low+(high-low)*rung/rungCount;
   const width=12+(MONO.rnd(rung+1,index+3)-.5)*2.2;
   MONO.el(svg,'line',{x1:x-width,x2:x+width,y1:yPosition(amount),y2:yPosition(amount),stroke:row.color,'stroke-width':1.15,
    'stroke-dasharray':row.negative?'3 2':'',opacity:.88,class:'fade',style:`animation-delay:${index*.14+rung*.012}s`});
  }
  if(index<rows.length-1){
   const handoff=index===0?grossLong:net;
   MONO.el(svg,'line',{x1:x+16,x2:xPosition(index+1)-16,y1:yPosition(handoff),y2:yPosition(handoff),stroke:PALETTE.FLOOR,'stroke-width':.8,'stroke-dasharray':'2 3',class:'fade'});
  }
  const endpoint=yPosition(row.to);
  const labelY=row.to<row.from?Math.min(bottom-8,endpoint+15):Math.max(top+9,endpoint-10);
  const label=addText(svg,{x,y:labelY,fill:row.color,'font-size':11,'font-weight':800,'text-anchor':'middle',class:'fade'},format(row.value));
  MONO.tip(label,`${row.name}：${format(row.value)} 十亿美元`);
  addText(svg,{x,y:bottom+23,fill:PALETTE.TXT,'font-size':8,'font-weight':700,'text-anchor':'middle','letter-spacing':'.08em'},row.name);
 });
 addText(svg,{x:204,y:327,fill:PALETTE.LAB,'font-size':7.2,'font-weight':600,'text-anchor':'middle','letter-spacing':'.08em'},'ONE RUNG ≈ $20BN · EXACT VALUES SHOWN · SPREADING INCLUDED ON BOTH SIDES');
});

const annualByYear=new Map();
for(const row of DATA)annualByYear.set(row[0].slice(0,4),row);
const annualObservations=[...annualByYear.entries()].sort((first,second)=>first[0].localeCompare(second[0]));
MONO.obsReveal('annual-almanac',svg=>{
 const rowY=index=>54+index*23.2;
 const colX=index=>178+index*132;
 for(let y=38;y<=530;y+=5.8)MONO.el(svg,'line',{x1:54,x2:816,y1:y,y2:y,stroke:PALETTE.GRID,'stroke-width':.45,opacity:.7,class:'fade'});
 const bubbles=[];
 annualObservations.forEach(([year,row],rowIndex)=>{
  const y=rowY(rowIndex);
  MONO.el(svg,'line',{x1:54,x2:816,y1:y,y2:y,stroke:PALETTE.FLOOR,'stroke-width':.8,class:'fade',style:`animation-delay:${rowIndex*.025}s`});
  addText(svg,{x:46,y:y+3,fill:PALETTE.LAB,'font-size':8,'font-weight':700,'text-anchor':'end'},year);
  GALLERY_GROUPS.forEach((group,columnIndex)=>bubbles.push({year,rowIndex,columnIndex,group,value:row[group.column]}));
 });
 const categoryPeaks=GALLERY_GROUPS.map(group=>[...bubbles]
  .filter(bubble=>bubble.group===group)
  .sort((first,second)=>Math.abs(second.value)-Math.abs(first.value))[0]);
 const biggest=categoryPeaks.sort((first,second)=>Math.abs(second.value)-Math.abs(first.value)).slice(0,3);
 for(const [index,bubble] of [...bubbles].sort((first,second)=>Math.abs(second.value)-Math.abs(first.value)).entries()){
  if(Math.abs(bubble.value)<.01)continue;
  const seed=bubble.rowIndex*9+bubble.columnIndex;
  const radius=Math.sqrt(Math.abs(bubble.value))*.55;
  const x=colX(bubble.columnIndex)+(MONO.rnd(seed+2,bubble.columnIndex+7)-.5)*7;
  const y=rowY(bubble.rowIndex);
  const group=MONO.el(svg,'g',{class:'pop',style:`animation-delay:${.08+index*.006}s`});
  const shape=bubble.value>=0
   ?{d:MONO.blob(x,y,radius,seed),fill:bubble.group.color,'fill-opacity':.13,stroke:bubble.group.color,'stroke-opacity':.86,'stroke-width':1.1}
   :{d:MONO.blob(x,y,radius,seed),fill:PALETTE.BG,stroke:bubble.group.color,'stroke-width':1.2,'stroke-dasharray':'3 2'};
  const mark=MONO.el(group,'path',shape);
  MONO.tip(mark,`${bubble.year} · ${bubble.group.name} · ${format(bubble.value)} 十亿美元`);
  if(bubble.value>=0)MONO.el(group,'circle',{cx:x,cy:y,r:Math.max(1.2,radius*.16),fill:bubble.group.color});
  if(biggest.includes(bubble))addText(svg,{x,y:y-radius-5,fill:bubble.group.color,'font-size':8,'font-weight':800,'text-anchor':'middle'},format(bubble.value));
 }
 GALLERY_GROUPS.forEach((group,index)=>{
  const x=colX(index);
  addText(svg,{x,y:26,fill:group.color,'font-size':8,'font-weight':700,'text-anchor':'middle','letter-spacing':'.08em'},group.short);
  MONO.el(svg,'line',{x1:x-20,x2:x+20,y1:33,y2:33,stroke:group.color,'stroke-width':1.5,'stroke-dasharray':index===1?'4 3':''});
 });
 const maxAsset=[...annualObservations].sort((first,second)=>second[1][1]-first[1][1])[0];
 const minLeveraged=[...annualObservations].sort((first,second)=>first[1][2]-second[1][2])[0];
 const notes=[
  {year:maxAsset[0],column:0,text:`资管净多峰值 ${format(maxAsset[1][1])}`},
  {year:minLeveraged[0],column:1,text:`杠杆净空最深 ${format(minLeveraged[1][2])}`},
 ];
 notes.forEach((note,index)=>{
  const rowIndex=annualObservations.findIndex(item=>item[0]===note.year),x=colX(note.column),y=rowY(rowIndex);
  const targetX=index===0?650:470,targetY=index===0?y-32:y+34;
  MONO.el(svg,'path',{d:`M${x+18} ${y} C${x+45} ${y} ${targetX-25} ${targetY} ${targetX} ${targetY}`,fill:'none',stroke:PALETTE.FLOOR,'stroke-width':.8,class:'fade'});
  addText(svg,{x:targetX+6,y:targetY+3,fill:PALETTE.LAB,'font-size':7.2,'font-style':'italic'},note.text);
 });
 const events=[['2008','资管由净空转净多'],['2018','资管跨过 500'],['2022','分化重新扩大'],['2025','多空分化达峰']];
 const eventY=558;
 MONO.el(svg,'line',{x1:54,x2:816,y1:eventY-18,y2:eventY-18,stroke:PALETTE.FLOOR,'stroke-width':.8,class:'fade'});
 addText(svg,{x:54,y:eventY-25,fill:PALETTE.LAB,'font-size':7,'font-weight':800,'letter-spacing':'.14em'},'DATA MILESTONES');
 events.forEach(([year,note],index)=>{
  const x=88+index*185;
  MONO.el(svg,'line',{x1:x,x2:x,y1:eventY-18,y2:eventY-7,stroke:PALETTE.LAB,'stroke-width':1,class:'fade'});
  addText(svg,{x,y:eventY+4,fill:PALETTE.TXT,'font-size':8,'font-weight':800},year);
  addText(svg,{x,y:eventY+16,fill:PALETTE.LAB,'font-size':7},note);
 });
});

addEventListener('resize',()=>{
 const chart=echarts.getInstanceByDom(document.getElementById('latest-diverging'));
 if(chart)chart.resize();
});
