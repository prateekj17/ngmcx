import {riskGate} from "./risk-gate";
import {indicators} from "./indicators";
import type {HistoricalCandle} from "./market-data";
type Row=HistoricalCandle & {oi:number};
export type ResearchConfig={capital:number;lotUnits:number;feePerLotSide:number;slippage:number;marginFraction:number;minVolume:number;minOI:number;maxParticipation:number;maxLots:number;expiry:string};
export function compareRisk(rows:Row[],cfg:ResearchConfig){
 if(rows.length<60||rows.some(r=>!Number.isFinite(r.oi)||r.oi<0||r.time.slice(0,10)>=cfg.expiry))throw Error("Need 60+ valid pre-expiry sessions with OI");
 const ind=indicators(rows);
 const split=Math.floor(rows.length*.7);
 function run(start:number,end:number,mode:"baseline"|"filtered"|"sized"){
 let equity=cfg.capital,peak=equity,drawdown=0;
 const rejected:Record<string,number>={};
 let rejectedWins=0,rejectedLosses=0,rejectedFlat=0,rejectedNet=0,untradedSessions=0;
 const trades:{time:string;side:string;lots:number;net:number;equity:number}[]=[];
 for(let i=Math.max(start,30);i<end-1;i++){
 const c=rows[i],n=rows[i+1],a=ind[i].atr14,p=rows.slice(i-20,i);
 if(!a||a<=0||equity<=0)continue;
 const dir=c.close>Math.max(...p.map(r=>r.high))&&ind[i].ema9>ind[i].ema21?1:c.close<Math.min(...p.map(r=>r.low))&&ind[i].ema9<ind[i].ema21?-1:0;
 if(!dir)continue;
 if(n.volume===0){untradedSessions++;continue;}
 // Opening reference is known at simulated execution, not signal generation.
 const entry=n.open,stop=entry-dir*1.5*a;
 const friction=2*cfg.slippage+2*cfg.feePerLotSide/cfg.lotUnits;
 const target=entry+dir*(3*a+3*friction+0.000001);
 if(Math.min(entry,stop,target)<=0)continue;
 const gate=riskGate({...cfg,equity,availableMargin:equity,dailyLoss:0,openRisk:0,entry,stop,target,priorVolume:c.volume,priorOI:c.oi,validated:false,researchOnly:true,fresh:true});
 // Baseline: one lot, same signals and costs; not an executable recommendation.
 const lots=mode==="baseline"?1:gate.allowed?(mode==="filtered"?1:gate.lots):0;
 const hitStop=dir>0?n.low<=stop:n.high>=stop;
 const hitTarget=dir>0?n.high>=target:n.low<=target;
 const exit=hitStop?stop:hitTarget?target:n.close;
 const perLot=((exit-entry)*dir-friction)*cfg.lotUnits;
 if(!lots){rejected[gate.reason]=(rejected[gate.reason]||0)+1;rejectedNet+=perLot;if(perLot>0)rejectedWins++;else if(perLot<0)rejectedLosses++;else rejectedFlat++;continue;}
 const net=perLot*lots;
 equity+=net;peak=Math.max(peak,equity);drawdown=Math.max(drawdown,(peak-equity)/peak);
 trades.push({time:n.time,side:dir>0?"LONG":"SHORT",lots,net,equity});
 }
 const gain=trades.reduce((s,t)=>s+Math.max(0,t.net),0),loss=trades.reduce((s,t)=>s+Math.max(0,-t.net),0);
 return {trades,rejected,rejectedWins,rejectedLosses,rejectedFlat,rejectedNet,untradedSessions,net:equity-cfg.capital,drawdown,profitFactor:loss?gain/loss:null,winRate:trades.length?trades.filter(t=>t.net>0).length/trades.length:null};
 }
 return {development:{baseline:run(0,split,"baseline"),filtered:run(0,split,"filtered"),guarded:run(0,split,"sized")},holdout:{baseline:run(split,rows.length,"baseline"),filtered:run(split,rows.length,"filtered"),guarded:run(split,rows.length,"sized")},warning:"Research only. One contract, next-open reference, same-session exit, stop-first, assumed costs and margin. Baseline and filtered use one lot; guarded uses risk sizing. Rejected outcomes are hypothetical one-lot counterfactuals. Prior volume/OI are liquidity proxies; no actual fills or portfolio simulation."};
}
