import { MarketInputs, Scores, TradeSide } from "./types";

export function clamp(n:number,min:number,max:number){ return Math.max(min,Math.min(max,n)); }
export function calculateScores(s:Scores){ return Object.values(s).reduce((a,b)=>a+b,0); }

/** Transparent rules-based checklist score, not a win probability or validated prediction model. */
export function assessMarket(m:MarketInputs, s:Scores, confirmation:boolean, eventRiskHigh:boolean){
  const total=calculateScores(s);
  const gap=m.resistance-m.support;
  const priceValid=[m.mcxPrice,m.support,m.resistance].every(Number.isFinite) && gap>0;
  const bullishEvidence=s.fundamental>=15 && s.weather>=11 && s.storage>=8 && s.technical>=9;
  const bearishEvidence=s.fundamental<=10 && s.weather<=9 && s.storage<=7 && s.technical<=7;
  let side:TradeSide="NO TRADE";
  let reason="Evidence is mixed or the confirmation checklist is incomplete.";
  if(priceValid && total>=75 && confirmation && !eventRiskHigh && bullishEvidence && m.mcxPrice>m.vwap){
    side="LONG"; reason="Bullish checklist alignment and price above VWAP. Wait for a confirmed trigger; score is not probability.";
  } else if(priceValid && total>=75 && confirmation && !eventRiskHigh && bearishEvidence && m.mcxPrice<m.vwap){
    side="SHORT"; reason="Bearish checklist alignment and price below VWAP. Wait for a confirmed trigger; score is not probability.";
  } else if(eventRiskHigh){ reason="High-impact event risk flagged. Reduce exposure or stand aside."; }
  return {total,side,reason};
}
export function tradeMath(side:"LONG"|"SHORT",entry:number,stop:number,target:number,riskRupees:number,lotSize:number){
  const perUnitRisk=Math.abs(entry-stop), perUnitReward=Math.abs(target-entry);
  const rr=perUnitRisk>0?perUnitReward/perUnitRisk:0;
  const units=perUnitRisk>0?Math.floor(riskRupees/perUnitRisk):0;
  const lots=lotSize>0?Math.floor(units/lotSize):0;
  const valid=side==="LONG"?stop<entry&&target>entry:stop>entry&&target<entry;
  return {rr,units,lots,valid,estimatedRisk:lots*lotSize*perUnitRisk};
}
