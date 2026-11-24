export type Candle = {time:string;open:number;high:number;low:number;close:number;volume:number};
export type Direction = "LONG"|"SHORT";
export type Signal = {time:string;side:Direction;entryLow:number;entryHigh:number;stop:number;targets:[number,number,number];source:string};
export type BacktestConfig = {initialCapital:number;riskFraction:number;feePerSide:number;slippagePoints:number;maxTradesPerDay:number;maxDailyLossFraction:number;lotUnits:number;};
export type BacktestTrade = {signalTime:string;entryTime:string;exitTime:string;side:Direction;entry:number;exit:number;stop:number;target:number;units:number;grossPnl:number;netPnl:number;reason:string};
export type BacktestResult = {trades:BacktestTrade[];netPnl:number;winRate:number;profitFactor:number|null;maxDrawdown:number;endingCapital:number;rejected:number;warnings:string[]};
const valid=(n:number)=>Number.isFinite(n)&&n>0;
const day=(s:string)=>new Date(Date.parse(s)+19800000).toISOString().slice(0,10);
export function backtest(candles:Candle[],signals:Signal[],config:BacktestConfig):BacktestResult {
 const warnings:string[]=[];let rejected=0;
 if(!valid(config.initialCapital)||!valid(config.lotUnits)||config.riskFraction<=0||config.riskFraction>0.02||config.maxDailyLossFraction<=0||config.maxTradesPerDay<1||config.feePerSide<0||config.slippagePoints<0)throw Error("Invalid backtest configuration");
 const ordered=[...candles].sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
 for(let i=0;i<ordered.length;i++){const c=ordered[i];if(!Number.isFinite(Date.parse(c.time))||![c.open,c.high,c.low,c.close].every(valid)||!Number.isFinite(c.volume)||c.volume<0||c.low>Math.min(c.open,c.close)||c.high<Math.max(c.open,c.close)||(i>0&&Date.parse(ordered[i-1].time)>=Date.parse(c.time)))throw Error("Invalid or duplicate OHLCV candles");}
 const trades:BacktestTrade[]=[];let capital=config.initialCapital,peak=capital,maxDrawdown=0;
 const daily=new Map<string,{count:number;loss:number}>();let lastExit=-1;
 for(const s of [...signals].sort((a,b)=>Date.parse(a.time)-Date.parse(b.time))){
  if(!Number.isFinite(Date.parse(s.time))||!s.source||![s.entryLow,s.entryHigh,s.stop,...s.targets].every(valid)||s.entryLow>s.entryHigh){rejected++;continue;}
  const entryIndex=ordered.findIndex((c,i)=>i>lastExit&&Date.parse(c.time)>Date.parse(s.time)&&Date.parse(c.time)-Date.parse(s.time)<=15*60000&&day(c.time)===day(s.time)&&c.high>=s.entryLow&&c.low<=s.entryHigh);
  if(entryIndex<0){rejected++;continue;}
  const first=ordered[entryIndex],key=day(first.time),d=daily.get(key)||{count:0,loss:0};
  if(d.count>=config.maxTradesPerDay||d.loss>=config.initialCapital*config.maxDailyLossFraction){rejected++;continue;}
  // Conservative entry at worst boundary; skip if that price was not actually traded.
  const rawEntry=s.side==="LONG"?s.entryHigh:s.entryLow;
  if(rawEntry<first.low||rawEntry>first.high){rejected++;continue;}
  const entry=rawEntry+(s.side==="LONG"?1:-1)*config.slippagePoints;
  const risk=s.side==="LONG"?entry-s.stop:s.stop-entry;
  if(risk<=0){rejected++;continue;}
  const target=s.targets[0];
  if((s.side==="LONG"&&target<=entry)||(s.side==="SHORT"&&target>=entry)){rejected++;continue;}
  const lots=Math.floor((capital*config.riskFraction)/(risk*config.lotUnits));
  if(lots<1){rejected++;continue;}
  const units=lots*config.lotUnits;
  let exit=first.close,exitTime=first.time,reason="end of available data",exitIndex=entryIndex;
  // Conservative intrabar ordering: if stop and target both touch, stop wins.
  for(let j=entryIndex;j<ordered.length;j++){
   const c=ordered[j];if(day(c.time)!==key){exit=ordered[j-1].close;exitTime=ordered[j-1].time;reason="session cutoff";exitIndex=j-1;break;}
   const hitStop=s.side==="LONG"?c.low<=s.stop:c.high>=s.stop;
   const hitTarget=s.side==="LONG"?c.high>=target:c.low<=target;
   if(hitStop){exit=s.side==="LONG"?Math.min(c.open,s.stop):Math.max(c.open,s.stop);exitTime=c.time;reason="stop";exitIndex=j;break;}
   if(hitTarget&&j>entryIndex){exit=target;exitTime=c.time;reason="target 1";exitIndex=j;break;}
   exit=c.close;exitTime=c.time;exitIndex=j;
  }
  exit+=(s.side==="LONG"?-1:1)*config.slippagePoints;
  const grossPnl=(exit-entry)*units*(s.side==="LONG"?1:-1);
  const netPnl=grossPnl-2*config.feePerSide*lots;
  capital+=netPnl;peak=Math.max(peak,capital);maxDrawdown=Math.max(maxDrawdown,(peak-capital)/peak);
  trades.push({signalTime:s.time,entryTime:first.time,exitTime,side:s.side,entry,exit,stop:s.stop,target,units,grossPnl,netPnl,reason});
  d.count++;d.loss+=Math.max(0,-netPnl);daily.set(key,d);lastExit=exitIndex;
  if(capital<=0){warnings.push("Capital depleted; simulation stopped");break;}
 }
 const wins=trades.filter(t=>t.netPnl>0).length,profits=trades.reduce((a,t)=>a+Math.max(0,t.netPnl),0),losses=trades.reduce((a,t)=>a+Math.max(0,-t.netPnl),0);
 warnings.push("Prototype: first target only; no partial exits, rollover, margin, funding or exchange-session calendar.");
 warnings.push("Signals must be generated point-in-time from historical information; precomputed hindsight signals invalidate results.");
 warnings.push("OHLC candles cannot establish intrabar order; stop-first assumption is conservative, but fills and gaps remain approximate.");
 return {trades,netPnl:capital-config.initialCapital,winRate:trades.length?wins/trades.length:0,profitFactor:losses?profits/losses:null,maxDrawdown,endingCapital:capital,rejected,warnings};
}
