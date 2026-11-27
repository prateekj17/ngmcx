import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
export const dynamic="force-dynamic";
const fields=["open_interest_all","m_money_positions_long_all","m_money_positions_short_all","prod_merc_positions_long","prod_merc_positions_short"] as const;
export async function POST(req:Request){
 const secret=process.env.REFRESH_SECRET,url=process.env.DATABASE_URL;
 if(!secret||!url)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 if(req.headers.get("authorization")!=="Bearer "+secret)return NextResponse.json({status:"UNAUTHORIZED"},{status:401});
 try{
 const endpoint=new URL("https://publicreporting.cftc.gov/resource/72hh-3qpy.json");
 endpoint.searchParams.set("cftc_contract_market_code","023651");
 endpoint.searchParams.set("$order","report_date_as_yyyy_mm_dd DESC");
 endpoint.searchParams.set("$limit","300");
 const res=await fetch(endpoint,{cache:"no-store",signal:AbortSignal.timeout(20000)});
 if(!res.ok)return NextResponse.json({status:"UPSTREAM_FAILED",http:res.status},{status:502});
 const raw=await res.json();
 if(!Array.isArray(raw)||!raw.length)throw Error();
 const rows=raw.map((r:Record<string,unknown>)=>{
 if(r.cftc_contract_market_code!=="023651"||typeof r.report_date_as_yyyy_mm_dd!=="string"||!/^\d{4}-\d{2}-\d{2}T/.test(r.report_date_as_yyyy_mm_dd))throw Error();
 const [oi,long,short,producer_long,producer_short]=fields.map(k=>{
 const v=r[k];if(typeof v!=="number"&&(typeof v!=="string"||!/^\d+$/.test(v)))throw Error();
 const n=Number(v);if(!Number.isSafeInteger(n)||n<0)throw Error();return n;
 });
 if(oi<=0||[long,short,producer_long,producer_short].some(n=>n>oi))throw Error();
 return {day:r.report_date_as_yyyy_mm_dd.slice(0,10),oi,long_pos:long,short_pos:short,producer_long,producer_short};
 });
 if(new Set(rows.map(r=>r.day)).size!==rows.length)throw Error();
 const sql=neon(url);
 await sql`CREATE TABLE IF NOT EXISTS falcon_cot_observations(report_day date NOT NULL,oi bigint NOT NULL, long_pos bigint NOT NULL,short_pos bigint NOT NULL,producer_long bigint NOT NULL,producer_short bigint NOT NULL,capture_day date NOT NULL,retrieved_at timestamptz NOT NULL DEFAULT now(),published_at timestamptz,PRIMARY KEY(report_day,capture_day,oi,long_pos,short_pos,producer_long,producer_short))`;
 const inserted=await sql`INSERT INTO falcon_cot_observations(report_day,oi,long_pos,short_pos,producer_long,producer_short,capture_day) SELECT day,oi,long_pos,short_pos,producer_long,producer_short,(now() AT TIME ZONE 'UTC')::date FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(day date,oi bigint,long_pos bigint,short_pos bigint,producer_long bigint,producer_short bigint) ON CONFLICT DO NOTHING RETURNING report_day`;
 return NextResponse.json({status:"OK",results:[{series:"COT_NG",status:"OK",received:rows.length,inserted:inserted.length,latest:rows[0].day}],warning:"Report date is not release date. Publication timestamps unknown; historical rows not point-in-time validated."});
 }catch{return NextResponse.json({status:"INGEST_FAILED"},{status:502});}
}
export async function GET(){
 const url=process.env.DATABASE_URL;if(!url)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 try{const sql=neon(url);const exists=await sql`SELECT to_regclass('public.falcon_cot_observations') IS NOT NULL AS ready`;if(!exists[0].ready)return NextResponse.json({status:"AWAITING_INGESTION"});
 const rows=await sql`SELECT count(*)::int AS observations,count(DISTINCT report_day)::int AS weeks,min(report_day)::text AS earliest,max(report_day)::text AS latest,max(retrieved_at) AS last_capture FROM falcon_cot_observations`;
 const recent=await sql`SELECT DISTINCT ON(report_day) report_day::text AS day,oi::text AS oi,(long_pos-short_pos)::text AS net,(producer_long-producer_short)::text AS producer_net FROM falcon_cot_observations ORDER BY report_day DESC,retrieved_at DESC LIMIT 2`;
 return NextResponse.json({status:recent.length?"OK":"AWAITING_INGESTION",...rows[0],managed_money_net:recent[0]?.net,producer_net:recent[0]?.producer_net,weekly_net_change:recent.length===2&&(Date.parse(recent[0].day)-Date.parse(recent[1].day))===604800000?Number(recent[0].net)-Number(recent[1].net):null});
 }catch{return NextResponse.json({status:"UNAVAILABLE"},{status:503});}
}
