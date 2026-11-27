import {riskGate, type RiskInput} from "../lib/risk-gate";
const base:RiskInput={equity:2000000,availableMargin:2000000,dailyLoss:0,openRisk:0,entry:300,stop:295,target:312,lotUnits:1250,feePerLotSide:50,slippage:.1,marginFraction:.2,priorVolume:1000,priorOI:1000,minVolume:100,minOI:100,maxParticipation:.01,maxLots:20,validated:true,researchOnly:false,fresh:true};
const cases:[string,Partial<RiskInput>,string,number][]=[
 ["valid long",{},"PASS",1],
 ["valid short",{stop:305,target:288},"PASS",1],
 ["low volume",{priorVolume:99},"LOW_LIQUIDITY",0],
 ["low OI",{priorOI:99},"LOW_LIQUIDITY",0],
 ["stale",{fresh:false},"STALE_DATA",0],
 ["unvalidated",{validated:false},"UNVALIDATED_STRATEGY",0],
 ["research",{validated:false,researchOnly:true},"PASS",1],
 ["research still rejects low liquidity",{validated:false,researchOnly:true,priorVolume:0},"LOW_LIQUIDITY",0],
 ["cost adjusted reward",{target:310},"INSUFFICIENT_NET_REWARD",0],
 ["wrong stop",{stop:305},"INVALID_LEVELS",0],
 ["margin",{availableMargin:100},"RISK_OR_MARGIN_LIMIT",0],
 ["daily loss",{dailyLoss:19000},"RISK_OR_MARGIN_LIMIT",0],
 ["existing exposure",{openRisk:19000},"RISK_OR_MARGIN_LIMIT",0],
 ["participation",{maxParticipation:.0001},"RISK_OR_MARGIN_LIMIT",0],
 ["invalid numeric",{entry:NaN},"INVALID_INPUT",0],
 ["position cap",{equity:20000000,maxLots:2},"PASS",2],
 ["risk sizing",{equity:20000000},"PASS",10]
];
for(const [name,patch,reason,lots] of cases){
 const actual=riskGate({...base,...patch});
 if(actual.reason!==reason||actual.lots!==lots||actual.allowed!==(lots>0))throw Error(name+": "+JSON.stringify(actual));
 console.log("PASS "+name);
}
console.log(cases.length+" risk gate tests passed");
