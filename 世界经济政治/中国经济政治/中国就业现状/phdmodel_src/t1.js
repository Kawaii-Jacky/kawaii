const M=require('./model.js');
for(const k of M.IND_KEYS){const row=[k];for(const r of ['B','M','D']){const e=M.evalRoute(k,r,{N:3000});row.push(r+':'+e.mean.toFixed(0)+'±'+e.se.toFixed(1)+' p10 '+e.p10.toFixed(0)+' p90 '+e.p90.toFixed(0)+' W '+e.welfare.toFixed(0)+' h/eff '+e.hourlyEff.toFixed(0));}console.log(row.join(' | '));}
