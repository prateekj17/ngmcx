export type MarketRow={day:string;expiry:string;symbol:string;open:number|null;high:number|null;low:number|null;close:number;previous_close:number|null;volume:number;oi:number};
function date(y:number,m:number,d:number){const x=new Date(Date.UTC(y,m-1,d));if(x.getUTCFullYear()!==y||x.getUTCMonth()!==m-1||x.getUTCDate()!==d)throw Error("Invalid date");return x.toISOString().slice(0,10);}
function num(v:unknown,nullable=false):number|null{if(v===null||v===undefined||v===""||v==="-"){if(nullable)return null;throw Error("Missing numeric value");}if(typeof v!=="number"&&typeof v!=="string")throw Error("Invalid number");const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error("Invalid number");return n;}
export function normalizeMCX(payload:unknown,day:string):MarketRow[]{
 const p=payload as {IsSuccess?:boolean;Data?:Record<string,unknown>[]};
 if(p?.IsSuccess!==true||!Array.isArray(p.Data))throw Error("Invalid source response");
 const seen=new Set<string>();const rows:MarketRow[]=[];
 for(const x of p.Data){
 const symbol=String(x.Symbol).trim().toUpperCase();
 if(!["NATURALGAS","NATGASMINI"].includes(symbol)||String(x.InstrumentName).trim()!=="FUTCOM")continue;
 const a=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(x.Date));const e=/^(\d{2})([A-Z]{3})(\d{4})$/.exec(String(x.ExpiryDate).trim().toUpperCase());
 if(!a||!e)throw Error("Invalid contract dates");
 const actual=date(+a[3],+a[1],+a[2]);const expiry=date(+e[3],["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"].indexOf(e[2])+1,+e[1]);
 if(actual!==day||expiry<day)throw Error("Unexpected session or expiry");
 const volume=num(x.Volume)!;const oi=num(x.OpenInterest)!;
 if(!Number.isInteger(volume)||!Number.isInteger(oi))throw Error("Invalid lot counts");
 const open=num(x.Open,true),high=num(x.High,true),low=num(x.Low,true),close=num(x.Close)!;
 if(close<=0||(volume>0&&(open===null||high===null||low===null||low<=0||high<low||open<low||open>high)))throw Error("Invalid traded OHLC");
 const key=symbol+"|"+expiry;if(seen.has(key))throw Error("Duplicate contract");seen.add(key);
 rows.push({day,expiry,symbol,open:volume===0?null:open,high:volume===0?null:high,low:volume===0?null:low,close,previous_close:num(x.PreviousClose,true),volume,oi});
 }
 if(!rows.length)throw Error("No eligible contracts");return rows;
}
