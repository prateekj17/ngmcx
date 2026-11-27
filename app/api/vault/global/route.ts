import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
export const dynamic="force-dynamic";
const series=["DEXINUS","DHHNGSP"] as const;
export async function POST(req:Request){
 const secret=process.env.REFRESH_SECRET,url=process.env.DATABASE_URL;
 if(!secret||!url)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 if(req.headers.get("authorization")!=="Bearer "+secret)return NextResponse.json({status:"UNAUTHORIZED"},{status:401});
 const sql=neon(url);
 try{
 await sql`CREATE TABLE IF NOT EXISTS falcon_global_observations (series text NOT NULL, observation_day date NOT NULL, value numeric NOT NULL, retrieved_at timestamptz NOT NULL DEFAULT now(), capture_day date NOT NULL, PRIMARY KEY(series,observation_day,capture_day,value))`;
 const results=await Promise.all(series.map(async s=>{
 try{
 const start=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
 const res=await fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id="+s+"&cosd="+start,{cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error("UPSTREAM");
 const body=await res.text();
 const [header,...lines]=body.trim().split(/\r?\n/);
 if(!["observation_date,"+s,"DATE,"+s].includes(header.trim()))throw Error("SCHEMA");
 const rows=lines.flatMap(line=>{
 const [day,v,...extra]=line.split(",");
 if(extra.length||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error("ROW");
 if(v==="."||v==="")return [];
 const value=Number(v);
 if(!Number.isFinite(value)||(s==="DEXINUS"&&value<=0))throw Error("VALUE");
 return [{day,value}];
 });
 if(!rows.length||new Set(rows.map(r=>r.day)).size!==rows.length)throw Error("COVERAGE");
 const capture=new Date().toISOString().slice(0,10);
 const inserted=await sql`INSERT INTO falcon_global_observations(series,observation_day,value,capture_day) SELECT ${s},day,value,${capture}::date FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(day date,value numeric) ON CONFLICT DO NOTHING RETURNING observation_day`;
 return {series:s,status:"OK",received:rows.length,inserted:inserted.length,latest:rows.map(r=>r.day).sort().pop()};
 }catch{return {series:s,status:"FAILED"};}
 }));
 const ok=results.every(r=>r.status==="OK");
 return NextResponse.json({status:ok?"OK":"PARTIAL",results,warning:"Daily published observations, not live futures quotes or original release timestamps."},{status:ok?200:502});
 }catch{return NextResponse.json({status:"INGEST_FAILED"},{status:502});}
}
export async function GET(){
 const url=process.env.DATABASE_URL;
 if(!url)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 try{
 const sql=neon(url);
 const exists=await sql`SELECT to_regclass('public.falcon_global_observations') IS NOT NULL AS ready`;
 if(!exists[0].ready)return NextResponse.json({status:"AWAITING_INGESTION"});
 const rows=await sql`SELECT series,count(*)::int AS observations,count(DISTINCT observation_day)::int AS days,min(observation_day)::text AS earliest,max(observation_day)::text AS latest,max(retrieved_at) AS last_capture FROM falcon_global_observations GROUP BY series ORDER BY series`;
 return NextResponse.json({status:"OK",rows});
 }catch{return NextResponse.json({status:"UNAVAILABLE"},{status:503});}
}
