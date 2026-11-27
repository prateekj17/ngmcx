export type RangeBar={day:string;symbol:string;expiry:string;open:number;high:number;low:number;close:number;volume:number;oi:number};
export function dailyRange(rows:RangeBar[]){
 if(!rows.length)throw Error("No observations");
 const {symbol,expiry}=rows[0];
 const sorted=[...rows].sort((a,b)=>a.day.localeCompare(b.day));
 for(let i=0;i<sorted.length;i++){
 const r=sorted[i];
 if(r.symbol!==symbol||r.expiry!==expiry||!/^\d{4}-\d{2}-\d{2}$/.test(r.day)||r.day>expiry||(i>0&&r.day===sorted[i-1].day)||![r.open,r.high,r.low,r.close].every(x=>Number.isFinite(x)&&x>0)||r.low>Math.min(r.open,r.close)||r.high<Math.max(r.open,r.close)||!Number.isFinite(r.volume)||r.volume<0||!Number.isFinite(r.oi)||r.oi<0)throw Error("Invalid or mixed contract observations");
 }
 const traded=sorted.filter(r=>r.volume>0);
 const sessions=traded.map(r=>({day:r.day,range:r.high-r.low,rangePct:100*(r.high-r.low)/r.open,body:r.close-r.open,volume:r.volume,oi:r.oi}));
 const windows=[5,20,60].map(n=>{
 const s=sessions.slice(-n),v=s.map(r=>r.range).sort((a,b)=>a-b),count=v.length;
 const median=count?(v[Math.floor((count-1)/2)]+v[Math.floor(count/2)])/2:null;
 return {window:n,count,complete:count===n,average:count?v.reduce((a,b)=>a+b,0)/count:null,median,maximum:count?v[count-1]:null,frequency:[5,10,15,20].map(threshold=>({threshold,count:v.filter(x=>x+1e-9>=threshold).length,pct:count?100*v.filter(x=>x+1e-9>=threshold).length/count:null}))};
 });
 return {symbol,expiry,sessions,windows,excludedZeroVolume:sorted.length-traded.length,warning:"Observed traded-session ranges, not achievable profits. Missing sessions are not inferred. Intraday sequence and execution require intraday candles."};
}
