export const researchWeights={weather:25,storage:20,production:10,demand:10,technical:15,curve:5,fxBasis:5,positioning:5,seasonality:3,crossMarket:2} as const;
export type Pillar=keyof typeof researchWeights;
export type Evidence={pillar:Pillar;score:number;publishedAt:string;validUntil:string;source:string};
export function degreeDays(meanF:number){if(!Number.isFinite(meanF))throw Error("Invalid temperature");return {hdd:Math.max(0,65-meanF),cdd:Math.max(0,meanF-65)};}
export function storageSurprise(expectedBcf:number,actualBcf:number){if(![expectedBcf,actualBcf].every(Number.isFinite))throw Error("Invalid storage change");return expectedBcf-actualBcf;}
export function weightedDegreeDays(rows:{meanF:number;weight:number}[]){
 if(!rows.length||rows.some(r=>!Number.isFinite(r.weight)||r.weight<0))throw Error("Invalid regional weights");
 const sum=rows.reduce((a,r)=>a+r.weight,0);if(sum<=0||!Number.isFinite(sum))throw Error("Invalid weight total");
 return rows.reduce((a,r)=>{const d=degreeDays(r.meanF);return {hdd:a.hdd+d.hdd*r.weight/sum,cdd:a.cdd+d.cdd*r.weight/sum};},{hdd:0,cdd:0});
}
export function researchBias(rows:Evidence[],asOf:string){
 const t=Date.parse(asOf);if(!Number.isFinite(t))throw Error("Invalid research timestamp");
 const latest=new Map<Pillar,Evidence>();
 for(const r of rows){
 const p=Date.parse(r.publishedAt),v=Date.parse(r.validUntil);
 if(!Object.prototype.hasOwnProperty.call(researchWeights,r.pillar)||!Number.isFinite(p)||!Number.isFinite(v)||v<p||!Number.isFinite(r.score)||Math.abs(r.score)>1||!r.source.trim())throw Error("Invalid evidence");
 if(p<=t&&(!latest.has(r.pillar)||p>Date.parse(latest.get(r.pillar)!.publishedAt)))latest.set(r.pillar,r);
 }
 let score=0,coverage=0;const missing:Pillar[]=[];
 for(const k of Object.keys(researchWeights) as Pillar[]){const r=latest.get(k);if(!r||Date.parse(r.validUntil)<t){missing.push(k);continue;}coverage+=researchWeights[k];score+=r.score*researchWeights[k];}
 return {score,coverage,missing,status:missing.length?"INCOMPLETE":"RESEARCH_ONLY"} as const;
}
