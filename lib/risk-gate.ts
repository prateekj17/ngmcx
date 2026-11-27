// Pure risk gate: inputs must be known before order submission.
export type RiskInput = {
 equity:number; availableMargin:number; dailyLoss:number; openRisk:number;
 entry:number; stop:number; target:number; lotUnits:number;
 feePerLotSide:number; slippage:number; marginFraction:number;
 priorVolume:number; priorOI:number; minVolume:number; minOI:number;
 maxParticipation:number; maxLots:number; validated:boolean;
 researchOnly:boolean; fresh:boolean;
};
export function riskGate(x:RiskInput) {
 const reject=(reason:string)=>({allowed:false,lots:0,reason,riskPerLot:0});
 const nums=Object.values(x).filter(v=>typeof v==="number");
 if(!nums.every(Number.isFinite)||x.equity<=0||x.availableMargin<0||
 x.dailyLoss<0||x.openRisk<0||x.entry<=0||x.stop<=0||x.target<=0||
 x.lotUnits<=0||x.feePerLotSide<0||x.slippage<0||
 x.marginFraction<=0||x.marginFraction>1||x.minVolume<=0||x.minOI<=0||
 x.maxParticipation<=0||x.maxParticipation>1||!Number.isInteger(x.maxLots)||x.maxLots<1)
 return reject("INVALID_INPUT");
 if(!x.fresh)return reject("STALE_DATA");
 if(!x.validated&&!x.researchOnly)return reject("UNVALIDATED_STRATEGY");
 if(x.priorVolume<x.minVolume||x.priorOI<x.minOI)return reject("LOW_LIQUIDITY");
 const direction=Math.sign(x.target-x.entry);
 if(!direction||(x.entry-x.stop)*direction<=0)return reject("INVALID_LEVELS");
 const friction=2*x.slippage*x.lotUnits+2*x.feePerLotSide;
 const riskPerLot=Math.abs(x.entry-x.stop)*x.lotUnits+friction;
 const reward=Math.abs(x.target-x.entry)*x.lotUnits-friction;
 if(reward<2*riskPerLot)return reject("INSUFFICIENT_NET_REWARD");
 const budget=Math.min(x.equity*.005,x.equity*.01-x.dailyLoss-x.openRisk);
 const lots=Math.floor(Math.min(budget/riskPerLot,
 x.availableMargin/(x.entry*x.lotUnits*x.marginFraction+friction),
 x.priorVolume*x.maxParticipation,x.maxLots));
 if(lots<1)return reject("RISK_OR_MARGIN_LIMIT");
 return {allowed:true,lots,reason:"PASS",riskPerLot};
}
// Prior-session volume is only a liquidity proxy. Stops can gap; risk is not guaranteed.
// Research bypass applies only to strategy qualification, never other gates.
// Caller must enforce research-only isolation and verify contract-specific inputs.
