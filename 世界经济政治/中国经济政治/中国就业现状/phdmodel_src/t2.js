const M=require('./model.js');
for(const th of [0.2,0.5,1]) for(const ka of [0.3,0.6,1.0]) console.log('theta',th,'kappa',ka,'rho',M.cobwebSpectral(th,ka,1.0,4).toFixed(3));
for (const [k,s] of [['AI',.20],['NET',.15],['CLIN',.05]]) for(const r of [.03,.05,.08]) {const d=M.dixitPindyck(r,0.04,s);console.log(k,r,d.beta.toFixed(2),d.mult.toFixed(2));}
