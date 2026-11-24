import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 const key=process.env.EIA_API_KEY;
 if(!key)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 const url=new URL("https://api.eia.gov/v2/natural-gas/stor/wkly/data/");
 url.searchParams.set("api_key",key);
 url.searchParams.set("frequency","weekly");
 url.searchParams.set("data[0]","value");
 url.searchParams.set("facets[series][]","NW2_EPG0_SWO_R48_BCF");
 url.searchParams.set("sort[0][column]","period");
 url.searchParams.set("sort[0][direction]","desc");
 url.searchParams.set("length","320");
 try{
 const response=await fetch(url,{next:{revalidate:3600},signal:AbortSignal.timeout(15000)});
 if(!response.ok)return NextResponse.json({status:"UPSTREAM_ERROR",upstreamStatus:response.status},{status:502});
 const body=await response.json();
 const raw=body?.response?.data;
 if(!Array.isArray(raw))throw Error("Invalid response");
 const rows:{period:string;bcf:number}[]=raw.map((r:Record<string,unknown>)=>{
 if(r.series!=="NW2_EPG0_SWO_R48_BCF"||typeof r.period!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(r.period)||r.value===null||r.value===undefined||r.value===""||!Number.isFinite(Number(r.value))||Number(r.value)<0)throw Error("Invalid storage record");
 return {period:r.period,bcf:Number(r.value)};
 });
 rows.sort((a,b)=>b.period.localeCompare(a.period));
 if(rows.length<2||new Set(rows.map(r=>r.period)).size!==rows.length)throw Error("Insufficient or duplicate observations");
 const latest=rows[0],previous=rows[1];
 const consecutive=Date.parse(latest.period)-Date.parse(previous.period)===7*86400000;
 return NextResponse.json({status:"OK",source:"EIA weekly Lower 48 working gas storage",units:"Bcf",retrievedAt:new Date().toISOString(),latest,previous,weeklyChangeBcf:consecutive?latest.bcf-previous.bcf:null,history:rows,warning:"Observation dates are not release timestamps. Revised history is not point-in-time backtest data."});
 }catch{return NextResponse.json({status:"DATA_UNAVAILABLE"},{status:502});}
}
