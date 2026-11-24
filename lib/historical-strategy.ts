import {indicators} from "./indicators";
import type {Candle,Signal} from "./backtest";
export function historicalBreakouts(candles:Candle[],tickSize:number):Signal[]{
 if(!Number.isFinite(tickSize)||tickSize<=0)throw Error("Invalid tick size");
 const rows=indicators(candles),out:Signal[]=[];
 const down=(n:number)=>Math.floor(n/tickSize+1e-8)*tickSize,up=(n:number)=>Math.ceil(n/tickSize-1e-8)*tickSize;
 for(let i=30;i<candles.length;i++){
 const c=candles[i],r=rows[i],prior=candles.slice(i-20,i);
 if(r.atr14===null||r.atr14<=0||r.vwap===null||r.relativeVolume===null||r.relativeVolume<1.3)continue;
 const hi=Math.max(...prior.map(x=>x.high)),lo=Math.min(...prior.map(x=>x.low));
 const side=c.close>hi&&r.ema9>r.ema21&&c.close>r.vwap?"LONG":c.close<lo&&r.ema9<r.ema21&&c.close<r.vwap?"SHORT":null;
 if(!side)continue;
 const a=r.atr14,entryLow=down(c.close-a*.1),entryHigh=up(c.close+a*.1);
 const stop=side==="LONG"?down(hi-a*.6):up(lo+a*.6),worst=side==="LONG"?entryHigh:entryLow,dir=side==="LONG"?1:-1,risk=dir*(worst-stop);
 if(entryLow<=0||stop<=0||risk<=0||risk>2*a)continue;
 const target=(m:number)=>side==="LONG"?up(worst+m*risk):down(worst-m*risk);
 const targets:[number,number,number]=[target(2),target(3),target(4)];
 if(targets.some(t=>t<=0))continue;
 out.push({time:c.time,side,entryLow,entryHigh,stop,targets,source:"Historical breakout v0; closed candles only"});
 }
 return out;
}
