import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
import {GET as supply} from "../../eia/supply-demand/route";
export const dynamic="force-dynamic";
const ids=["production","lng","consumption","power"];
export async function POST(req:Request){
 const secret=process.env.REFRESH_SECRET,url=process.env.DATABASE_URL;
 if(!secret||!url)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 if(req.headers.get("authorization")!=="Bearer "+secret)return NextResponse.json({status:"UNAUTHORIZED"},{status:401});
 try{
 const response=await supply(new Request(new URL("/api/eia/supply-demand",req.url)));
 const data=await response.json();
 if(!response.ok||!Array.isArray(data.series))throw Error();
 const sql=neon(url);
 await sql`CREATE TABLE IF NOT EXISTS falcon_fundamental_observations(metric text NOT NULL,period date NOT NULL,bcf_per_day numeric NOT NULL CHECK(bcf_per_day>=0),capture_day date NOT NULL,retrieved_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(metric,period,capture_day,bcf_per_day))`;
 const results=[];
 for(const id of ids){
 const s=data.series.find((x:{id:string})=>x.id===id);
 if(s?.status!=="OK"||!Array.isArray(s.history)||!s.history.length){results.push({series:id,status:"FAILED"});continue;}
 const rows=s.history.map((r:{period:string;bcfPerDay:number})=>{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.period)||!Number.isFinite(r.bcfPerDay)||r.bcfPerDay<0)throw Error();
 return {period:r.period+"-01",value:r.bcfPerDay};
 });
 if(new Set(rows.map((r:{period:string})=>r.period)).size!==rows.length)throw Error();
 const inserted=await sql`INSERT INTO falcon_fundamental_observations(metric,period,bcf_per_day,capture_day) SELECT ${id},period,value,(now() AT TIME ZONE 'UTC')::date FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(period date,value numeric) ON CONFLICT DO NOTHING RETURNING period`;
 results.push({series:id,status:"OK",received:rows.length,inserted:inserted.length,latest:rows.map((r:{period:string})=>r.period).sort().pop()});
 }
 const ok=results.every(r=>r.status==="OK");
 return NextResponse.json({status:ok?"OK":"PARTIAL",results,warning:"Monthly EIA data, potentially cached and revised; capture time is not release time."},{status:ok?200:502});
 }catch{return NextResponse.json({status:"INGEST_FAILED"},{status:502});}
}
export async function GET(){
 const url=process.env.DATABASE_URL;if(!url)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 try{const sql=neon(url);
 const exists=await sql`SELECT to_regclass('public.falcon_fundamental_observations') IS NOT NULL AS ready`;
 if(!exists[0].ready)return NextResponse.json({status:"AWAITING_INGESTION"});
 const rows=await sql`SELECT metric,count(*)::int AS observations,count(DISTINCT period)::int AS months,min(period)::text AS earliest,max(period)::text AS latest,max(retrieved_at) AS last_capture FROM falcon_fundamental_observations GROUP BY metric ORDER BY metric`;
 return NextResponse.json({status:rows.length===4?"OK":"PARTIAL",rows});
 }catch{return NextResponse.json({status:"UNAVAILABLE"},{status:503});}
}
