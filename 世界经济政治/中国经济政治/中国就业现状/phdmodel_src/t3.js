const M=require('./model.js');
for(const k of M.IND_KEYS){const o=M.optionValues(k,{N:2500});console.log(k, ['B','M','D'].map(r=>`${r}: OV ${o[r].OV.toFixed(1)} th ${o[r].th}`).join(' | '), '| acad', o.acad.allAcad.toFixed(0), 'ind', o.acad.allInd.toFixed(0), 'choiceOV', o.D.OVchoice.toFixed(1));}
