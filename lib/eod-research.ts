import type {Candle} from "./backtest";
import {indicators} from "./indicators";
export function parseDailyCsv(csv:string):Candle[]{
 const lines=csv.trim().replace(/^\uFEFF/,"").split(/\r?\n/);
 if(lines.shift()?.trim().toLowerCase()!=="time,open,high,low,close,volume")throw Error("Expected time,open,high,low,close,volume");
 if(lines.length<60||lines.length>5000)throw Error("Provide 60–5000 daily rows for one contract");
 const rows=lines.map(line=>{const a=line.split(",").map(x=>x.trim());if(a.length!==6||a.some(x=>!x))throw Error("Invalid CSV row");const [time,o,h,l,c,v]=a;return {time,open:Number(o),high:Number(h),low:Number(l),close:Number(c),volume:Number(v)};});
 indicators(rows);
 if(rows.some((r,i)=>i>0&&r.time.slice(0,10)===rows[i-1].time.slice(0,10)))throw Error("Duplicate daily session");
 return rows;
}
export type DailyConfig={capital:number;lotUnits:number;feePerLotSide:number;slippage:number;marginFraction:number;expiry:string};
export function dailyResearch(rows:Candle[],cfg:DailyConfig){
 const {capital,lotUnits,feePerLotSide,slippage,marginFraction}=cfg;
 if(![capital,lotUnits,feePerLotSide,slippage,marginFraction].every(Number.isFinite)||capital<=0||lotUnits<=0||feePerLotSide<0||slippage<0||marginFraction<=0||marginFraction>1||!/^\d{4}-\d{2}-\d{2}$/.test(cfg.expiry))throw Error("Invalid research settings");
 if(rows.length<60||rows.some(r=>r.time.slice(0,10)>=cfg.expiry))throw Error("Need 60+ pre-expiry daily candles");
 const ind=indicators(rows),split=Math.floor(rows.length*.7);
 function run(start:number,end:number){
 let equity=capital,peak=capital,drawdown=0;const trades:{time:string;side:string;net:number;equity:number}[]=[];
 for(let i=Math.max(30,start);i<end-1;i++){
 const r=ind[i],c=rows[i],n=rows[i+1],p=rows.slice(i-20,i),a=r.atr14;
 if(!a||a<=0)continue;
 const dir=c.close>Math.max(...p.map(x=>x.high))&&r.ema9>r.ema21?1:c.close<Math.min(...p.map(x=>x.low))&&r.ema9<r.ema21?-1:0;
 if(!dir)continue;
 const entry=n.open+dir*slippage,stop=entry-dir*a*1.5,target=entry+dir*a*3;
 if(entry<=0||stop<=0||target<=0)continue;
 const risk=(a*1.5+slippage)*lotUnits+2*feePerLotSide;
 const lots=Math.floor(Math.min(equity*.005/risk,equity/(entry*lotUnits*marginFraction+2*feePerLotSide)));
 if(lots<1)continue;
 const hitStop=dir===1?n.low<=stop:n.high>=stop,hitTarget=dir===1?n.high>=target:n.low<=target;
 const exit=(hitStop?stop:hitTarget?target:n.close)-dir*slippage;
 const net=(exit-entry)*dir*lotUnits*lots-2*feePerLotSide*lots;
 equity+=net;peak=Math.max(peak,equity);drawdown=Math.max(drawdown,(peak-equity)/peak);
 trades.push({time:n.time,side:dir===1?"LONG":"SHORT",net,equity});if(equity<=0)break;
 }
 const profit=trades.reduce((s,t)=>s+Math.max(0,t.net),0),loss=trades.reduce((s,t)=>s+Math.max(0,-t.net),0);
 return {trades,net:equity-capital,drawdown,winRate:trades.length?trades.filter(t=>t.net>0).length/trades.length:null,profitFactor:loss?profit/loss:null};
 }
 return {development:run(0,split),holdout:run(split,rows.length),splitTime:rows[split].time,warning:"Daily OHLC next-open entry and same-session exit; stop-first ambiguity; assumed margin and costs; no live execution or statistical validation."};
}
