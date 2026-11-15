export type Bias = "BULLISH" | "BEARISH" | "NEUTRAL";
export type TradeSide = "LONG" | "SHORT" | "NO TRADE";
export type Scores = { fundamental:number; weather:number; storage:number; supplyDemand:number; technical:number; positioning:number; eventRisk:number };
export type JournalEntry = { id:string; date:string; contract:string; side:TradeSide; entry:number; stop:number; target:number; riskRupees:number; score:number; rationale:string; outcome?:string; lesson?:string };
export type MarketInputs = { mcxPrice:number; henryHub:number; usdInr:number; previousClose:number; support:number; resistance:number; vwap:number; atr:number; volumeNote:string; openInterestNote:string; contract:string; expiry:string };
