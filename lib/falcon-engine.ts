import type {Instrument,Quote} from "./market-data";
import {validateQuote} from "./market-data";
export type Setup={trend:"UP"|"DOWN"|"RANGE";vwap:number;atr:number;support:number;resistance:number;relativeVolume:number;triggerConfirmed:boolean;eventBlackout:boolean;bias:"BULLISH"|"BEARISH"|"NEUTRAL";};
export type TradePlan={symbol:string;expiry:string;side:"LONG"|"SHORT"|"NO TRADE";reason:string;entryLow?:number;entryHigh?:number;stop?:number;targets?:number[];rewardRisk?:number;observedAt:string;source:string};
export function planTrade(i:Instrument,q:Quote,s:Setup,now=Date.now(),costPoints=0):TradePlan{
 const base={symbol:i.symbol,expiry:i.expiry,observedAt:q.observedAt,source:q.source};
 const reject=(reason:string):TradePlan=>({...base,side:"NO TRADE",reason});
 const errors=validateQuote(q,i,now);
 if(errors.length)return reject(errors.join("; "));
 if(!Number.isFinite(Date.parse(i.expiry))||i.expiry.slice(0,10)<=new Date(now+19800000).toISOString().slice(0,10))return reject("Expiry day or expired contract");
 if(![i.tickSize,i.lotSize,s.vwap,s.atr,s.support,s.resistance,s.relativeVolume].every(x=>Number.isFinite(x)&&x>0)||s.support>=s.resistance||!Number.isFinite(costPoints)||costPoints<0)return reject("Invalid setup inputs");
 if(s.eventBlackout||!s.triggerConfirmed)return reject("Event blackout or unconfirmed trigger");
 if(s.relativeVolume<1||(q.ask-q.bid)/s.atr>0.1||q.openInterest<=0)return reject("Liquidity gate failed");
 const side=s.trend==="UP"&&q.last>s.vwap&&s.bias!=="BEARISH"?"LONG":s.trend==="DOWN"&&q.last<s.vwap&&s.bias!=="BULLISH"?"SHORT":null;
 if(!side)return reject("Trend, VWAP and research bias do not align");
 const tick=i.tickSize,down=(x:number)=>Math.floor(x/tick+1e-8)*tick,up=(x:number)=>Math.ceil(x/tick-1e-8)*tick;
 const entryLow=down(q.last-s.atr*0.1),entryHigh=up(q.last+s.atr*0.1);
 const stop=side==="LONG"?down(s.support-s.atr*0.2):up(s.resistance+s.atr*0.2);
 const worst=side==="LONG"?entryHigh:entryLow,dir=side==="LONG"?1:-1;
 const risk=dir*(worst-stop)+costPoints;
 if(entryLow<=0||stop<=0||dir*(worst-stop)<=0||risk>s.atr*3)return reject("Invalid or excessive stop distance");
 const targets=[2,3,4].map(r=>side==="LONG"?up(worst+r*risk+costPoints):down(worst-r*risk-costPoints));
 if(targets.some(t=>t<=0))return reject("Invalid targets");
 if(side==="LONG"?targets[0]>s.resistance:targets[0]<s.support)return reject("First structural obstacle prevents minimum 2R");
 return {...base,side,reason:"Conditional trend setup; confirm executable entry and account risk",entryLow,entryHigh,stop,targets,rewardRisk:(dir*(targets[0]-worst)-costPoints)/risk};
}
export function scanContracts(rows:{instrument:Instrument;quote:Quote;setup:Setup}[],now=Date.now(),costPoints=0):TradePlan[]{
 return rows.map(r=>planTrade(r.instrument,r.quote,r.setup,now,costPoints)).sort((a,b)=>Number(b.side!=="NO TRADE")-Number(a.side!=="NO TRADE")||(b.rewardRisk??0)-(a.rewardRisk??0));
}
