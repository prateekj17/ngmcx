// Research only. Availability timestamps must come from documented sources.
export type Vintage = {series:string; observation:string; availableAt:string; value:number; source:string};
function timestamp(s:string):number {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)) throw new Error("Explicit timestamp required");
 const n=Date.parse(s); if(!Number.isFinite(n)) throw new Error("Invalid timestamp"); return n;
}
export function historicalContext(rows:Vintage[], decisionAt:string, requirements:Record<string,number>) {
 const cutoff=timestamp(decisionAt);
 const seen=new Map<string,number>();
 const eligible=rows.filter(r=>{
  const available=timestamp(r.availableAt);
  if(!r.series.trim()||!r.source.trim()||!r.observation.trim()||!Number.isFinite(r.value)) throw new Error("Invalid vintage");
  const key=JSON.stringify([r.series,r.observation,available]);
  if(seen.has(key)&&seen.get(key)!==r.value) throw new Error("Conflicting vintage");
  seen.set(key,r.value);
  return available<=cutoff;
 });
 const features=Object.entries(requirements).map(([series,maxAgeHours])=>{
  if(!Number.isFinite(maxAgeHours)||maxAgeHours<=0) throw new Error("Invalid freshness limit");
  const latest=eligible.filter(r=>r.series===series).sort((a,b)=>timestamp(b.availableAt)-timestamp(a.availableAt)||b.observation.localeCompare(a.observation))[0];
  const ageHours=latest?(cutoff-timestamp(latest.availableAt))/3600000:null;
  const status=!latest?"MISSING":ageHours!==null&&ageHours>maxAgeHours?"STALE":"AVAILABLE";
  return {series,status,ageHours,vintage:status==="AVAILABLE"?latest:null};
 });
 return {decisionAt,features,complete:features.length>0&&features.every(f=>f.status==="AVAILABLE"),decision:"NO_TRADE" as const};
}
