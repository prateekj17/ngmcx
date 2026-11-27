export type Instrument = {id:string;symbol:string;exchange:"MCX";expiry:string;lotSize:number;tickSize:number};
export type Quote = {instrumentId:string;observedAt:string;receivedAt:string;last:number;bid:number;ask:number;volume:number;openInterest:number;source:string};
export type HistoricalCandle = {time:string;open:number;high:number;low:number;close:number;volume:number;openInterest?:number};
export interface MarketDataProvider {
 readonly name:string;
 discoverNaturalGas():Promise<Instrument[]>;
 quotes(instruments:Instrument[]):Promise<Quote[]>;
 candles(instrument:Instrument,from:string,to:string,interval:"5m"|"15m"|"1h"|"1d"):Promise<HistoricalCandle[]>;
}
export function validateQuote(q:Quote,i:Instrument,now=Date.now(),maxAgeMs=60000):string[] {
 const errors:string[]=[];
 if(q.instrumentId!==i.id)errors.push("Instrument mismatch");
 const t=Date.parse(q.observedAt),r=Date.parse(q.receivedAt);
 if(!Number.isFinite(t)||!Number.isFinite(r)||t>r+5000||r>now+5000||now-t>maxAgeMs)errors.push("Invalid or stale timestamp");
 if(![q.last,q.bid,q.ask].every(x=>Number.isFinite(x)&&x>0)||q.bid>q.ask)errors.push("Invalid price or spread");
 if(![q.volume,q.openInterest].every(x=>Number.isFinite(x)&&x>=0))errors.push("Invalid volume or OI");
 if(!q.source.trim())errors.push("Missing provenance");
 return errors;
}
export class UnconfiguredProvider implements MarketDataProvider {
 readonly name="unconfigured";
 async discoverNaturalGas():Promise<Instrument[]>{throw new Error("Market data provider not configured");}
 async quotes(_instruments:Instrument[]):Promise<Quote[]>{throw new Error("Market data provider not configured");}
 async candles(_instrument:Instrument,_from:string,_to:string,_interval:"5m"|"15m"|"1h"|"1d"):Promise<HistoricalCandle[]>{throw new Error("Market data provider not configured");}
}
