import {compareRisk,ResearchConfig} from "../lib/risk-research";
function check(ok:boolean,msg:string){if(!ok)throw Error(msg);}
const cfg:ResearchConfig={capital:10000000,lotUnits:1250,feePerLotSide:50,slippage:.1,marginFraction:.2,minVolume:100,minOI:100,maxParticipation:.01,maxLots:2,expiry:"2027-01-25"};
const rows=Array.from({length:80},(_,i)=>{const p=300+i;return {time:new Date(Date.UTC(2026,7,1+i,12)).toISOString(),open:p,high:p+.5,low:p-.5,close:p,volume:1000,oi:1000};});
const r=compareRisk(rows,cfg);
for(const section of [r.development,r.holdout]){
 check(section.baseline.trades.length>0,"expected breakout trades");
 check(section.filtered.trades.length===section.baseline.trades.length,"liquid trades pass");
 check(Math.abs(section.filtered.net-section.baseline.net)<1e-6,"fixed size parity");
 check(section.baseline.trades.every(t=>Math.abs(t.net+350)<1e-6),"flat session net equals round trip friction");
}
const illiquid=compareRisk(rows.map(r=>({...r,oi:0})),cfg);
check(illiquid.development.filtered.trades.length===0,"reject illiquid");
check(illiquid.development.filtered.rejectedLosses===illiquid.development.baseline.trades.length,"rejected losses counted");
const empty=compareRisk(rows.map(r=>({...r,volume:0})),cfg);
check(empty.development.baseline.trades.length===0&&empty.development.baseline.untradedSessions>0,"no fills on zero volume");
console.log("Comparative research: 11 synthetic checks passed");
