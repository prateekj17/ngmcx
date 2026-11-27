export type ContractRecord={id:string;exchange:"MCX"|"NYMEX";symbol:string;contractMonth:string;deliveryMonth?:string;listedAt:string;lastTradeAt:string;publishedAt:string;source:string;settlementReferenceId?:string;lotSize:number;tickSize:number};
export function activeContracts(records:ContractRecord[],asOf:string):ContractRecord[]{
 const t=Date.parse(asOf);if(!Number.isFinite(t))throw Error("Invalid as-of timestamp");
 const latest=new Map<string,ContractRecord>();
 for(const r of records){
 const p=Date.parse(r.publishedAt),l=Date.parse(r.listedAt),e=Date.parse(r.lastTradeAt);
 if(![p,l,e].every(Number.isFinite)||l>=e||!r.source.trim()||!Number.isFinite(r.lotSize)||r.lotSize<=0||!Number.isFinite(r.tickSize)||r.tickSize<=0)throw Error("Invalid contract metadata");
 if(p<=t&&(!latest.has(r.id)||p>Date.parse(latest.get(r.id)!.publishedAt)))latest.set(r.id,r);
 }
 return [...latest.values()].filter(r=>Date.parse(r.listedAt)<=t&&t<Date.parse(r.lastTradeAt)).sort((a,b)=>Date.parse(a.lastTradeAt)-Date.parse(b.lastTradeAt));
}
export function settlementReference(mcx:ContractRecord,records:ContractRecord[],asOf:string):ContractRecord|null{
 if(mcx.exchange!=="MCX"||!mcx.settlementReferenceId)return null;
 return activeContracts(records,asOf).find(r=>r.exchange==="NYMEX"&&r.id===mcx.settlementReferenceId)??null;
}
export function expiryRisk(r:ContractRecord,asOf:string):"EXPIRED"|"NEAR_EXPIRY"|"NORMAL"{
 const remaining=Date.parse(r.lastTradeAt)-Date.parse(asOf);
 if(!Number.isFinite(remaining))throw Error("Unknown expiry");
 return remaining<=0?"EXPIRED":remaining<=72*3600000?"NEAR_EXPIRY":"NORMAL";
}
