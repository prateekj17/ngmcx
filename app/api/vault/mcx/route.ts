import {NextResponse} from "next/server";
import {getDb} from "../../../../lib/db";
import {normalizeMCX} from "../../../../lib/mcx-ingestion";
export const dynamic="force-dynamic";
export const maxDuration=60;
async function schema(){const sql=getDb();await sql`CREATE TABLE IF NOT EXISTS falcon_mcx_daily(day date NOT NULL,expiry date NOT NULL,symbol text NOT NULL,open numeric,high numeric,low numeric,close numeric NOT NULL,previous_close numeric,volume bigint NOT NULL,oi bigint NOT NULL,source text NOT NULL,first_seen_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(day,expiry,symbol))`;return sql;}
function allowed(req:Request){return !!process.env.REFRESH_SECRET&&req.headers.get("authorization")==="Bearer "+process.env.REFRESH_SECRET;}
export async function POST(req:Request){
 if(!allowed(req))return NextResponse.json({status:"UNAUTHORIZED"},{status:401});
 try{
 const body=await req.json();const day=String(body.day??"");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day>new Date().toISOString().slice(0,10))return NextResponse.json({status:"INVALID_DATE"},{status:400});
 if(process.env.MCX_DATA_AUTHORIZED!=="true")return NextResponse.json({status:"AWAITING_DATA_PERMISSION"},{status:409});
 let payload=body.payload;let source="authorized_import";
 if(!payload){const endpoint=process.env.MCX_AUTHORIZED_PROVIDER_URL;if(!endpoint)return NextResponse.json({status:"AWAITING_PROVIDER"},{status:409});const url=new URL(endpoint);if(url.protocol!=="https:")throw Error();url.searchParams.set("date",day);const headers:Record<string,string>={Accept:"application/json"};if(process.env.MCX_PROVIDER_TOKEN)headers.Authorization="Bearer "+process.env.MCX_PROVIDER_TOKEN;const res=await fetch(url,{headers,cache:"no-store",signal:AbortSignal.timeout(20000),redirect:"error"});if(!res.ok)throw Error();payload=await res.json();source="authorized_provider";}
 const rows=normalizeMCX(payload,day);const sql=await schema();
 const inserted=await sql`INSERT INTO falcon_mcx_daily(day,expiry,symbol,open,high,low,close,previous_close,volume,oi,source) SELECT day,expiry,symbol,open,high,low,close,previous_close,volume,oi,${source} FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS r(day date,expiry date,symbol text,open numeric,high numeric,low numeric,close numeric,previous_close numeric,volume bigint,oi bigint) ON CONFLICT DO NOTHING RETURNING symbol`;
 return NextResponse.json({status:"OK",day,received:rows.length,inserted:inserted.length,existing:rows.length-inserted.length});
 }catch{return NextResponse.json({status:"INGEST_FAILED"},{status:422});}
}
export async function GET(req:Request){
 if(!allowed(req))return NextResponse.json({status:"UNAUTHORIZED"},{status:401});
 try{const sql=await schema();const rows=await sql`SELECT count(*)::int AS observations,count(DISTINCT day)::int AS sessions,count(DISTINCT (symbol,expiry))::int AS contracts,min(day) AS earliest,max(day) AS latest FROM falcon_mcx_daily`;return NextResponse.json({status:"OK",authorized:process.env.MCX_DATA_AUTHORIZED==="true",providerConfigured:!!process.env.MCX_AUTHORIZED_PROVIDER_URL,...rows[0]});}catch{return NextResponse.json({status:"VAULT_UNAVAILABLE"},{status:503});}
}
