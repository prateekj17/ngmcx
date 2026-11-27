import type {HistoricalCandle} from "./market-data";
export type IndicatorRow={time:string;ema9:number;ema21:number;atr14:number|null;vwap:number|null;relativeVolume:number|null};
export function indicators(candles:HistoricalCandle[]):IndicatorRow[]{
 let e9=0,e21=0,atr=0,pv=0,vol=0,session="";
 const result:IndicatorRow[]=[];
 for(let i=0;i<candles.length;i++){
 const c=candles[i],t=Date.parse(c.time);
 if(!Number.isFinite(t)||!/[zZ]|[+-]\d\d:\d\d$/.test(c.time)||!([c.open,c.high,c.low,c.close].every(x=>Number.isFinite(x)&&x>0))||!Number.isFinite(c.volume)||c.volume<0||c.low>Math.min(c.open,c.close)||c.high<Math.max(c.open,c.close)||(i>0&&t<=Date.parse(candles[i-1].time)))throw Error("Invalid chronological OHLCV");
 const key=new Date(t+19800000).toISOString().slice(0,10);
 if(key!==session){session=key;pv=0;vol=0;}
 pv+=(c.high+c.low+c.close)/3*c.volume;vol+=c.volume;
 e9=i===0?c.close:e9+(c.close-e9)*2/10;
 e21=i===0?c.close:e21+(c.close-e21)*2/22;
 const prev=i?candles[i-1].close:c.close;
 const tr=Math.max(c.high-c.low,Math.abs(c.high-prev),Math.abs(c.low-prev));
 atr=i<14?atr+tr:i===14?(atr/14*13+tr)/14:(atr*13+tr)/14;
 const prior=candles.slice(Math.max(0,i-20),i);
 const avg=prior.length===20?prior.reduce((a,b)=>a+b.volume,0)/20:0;
 result.push({time:c.time,ema9:e9,ema21:e21,atr14:i<13?null:i===13?atr/14:atr,vwap:vol?pv/vol:null,relativeVolume:avg>0?c.volume/avg:null});
 }
 return result;
}
