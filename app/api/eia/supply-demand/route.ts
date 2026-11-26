import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
const metrics=[["production","Dry gas production","N9070US2"],["lng","LNG exports","N9133US2"],["consumption","Domestic consumption","N9140US2"],["power","Electric power consumption","N3045US2"]] as const;
export async function GET(req:Request){
 const key=process.env.EIA_API_KEY;
 if(!key)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 const selected=new URL(req.url).searchParams.get("metric");
 const active=selected?metrics.filter(m=>m[0]===selected):metrics;
 if(!active.length)return NextResponse.json({status:"INVALID_METRIC"},{status:400});
 const series=await Promise.all(active.map(async ([id,label,code])=>{
 try{
 const url=new URL("https://api.eia.gov/v2/seriesid/NG."+code+".M");
 for(const [k,v] of Object.entries({"api_key":key,"length":"60","sort[0][column]":"period","sort[0][direction]":"desc"}))url.searchParams.set(k,v);
 const res=await fetch(url,{next:{revalidate:3600},signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error("EIA_HTTP_"+res.status);
 const raw=(await res.json()).response?.data;
 if(!Array.isArray(raw))throw Error("MISSING_DATA_ARRAY");
 const rows=raw.filter(r=>r.series===code&&r.units==="MMCF"&&/^\d{4}-\d{2}$/.test(r.period)&&r.value!==null&&r.value!==""&&Number.isFinite(Number(r.value))&&Number(r.value)>=0).map(r=>{
 const [year,month]=String(r.period).split("-").map(Number);
 return {period:String(r.period),bcfPerDay:Number(r.value)/1000/new Date(Date.UTC(year,month,0)).getUTCDate()};
 }).sort((a,b)=>b.period.localeCompare(a.period));
 if(!rows.length){const sample=raw[0];return {id,label,code,status:"UNAVAILABLE",latest:null,yoyPct:null,history:[],diagnostic:{rowCount:raw.length,series:typeof sample?.series==="string"?sample.series:null,units:typeof sample?.units==="string"?sample.units:null,period:typeof sample?.period==="string"?sample.period:null,fields:sample?Object.keys(sample):[]}};}
 const latest=rows[0],prior=rows.find(r=>r.period===(Number(latest.period.slice(0,4))-1)+latest.period.slice(4));
 return {id,label,code,status:"OK",latest,yoyPct:prior&&prior.bcfPerDay>0?100*(latest.bcfPerDay/prior.bcfPerDay-1):null,history:rows.reverse()};
 }catch(e){const message=e instanceof Error?e.message:"";return {id,label,code,status:"UNAVAILABLE",latest:null,yoyPct:null,history:[],diagnostic:message.startsWith("EIA_HTTP_")||message==="MISSING_DATA_ARRAY"?message:e instanceof Error?e.name:"UNKNOWN_ERROR"};}
 }));
 const available=series.filter(s=>s.status==="OK").length;
 return NextResponse.json({status:available===active.length?"OK":available?"PARTIAL":"UNAVAILABLE",available,source:"EIA monthly natural gas statistics",retrievedAt:new Date().toISOString(),units:"Bcf/day",series,warning:"Monthly observations are delayed and revisable. Not current production or LNG feedgas flows. Retrieval is not publication time."},{status:available?200:503});
}
