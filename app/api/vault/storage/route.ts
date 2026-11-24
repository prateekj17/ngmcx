import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 const secret=process.env.REFRESH_SECRET,url=process.env.DATABASE_URL,key=process.env.EIA_API_KEY;
 if(!secret||!url||!key)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 if(req.headers.get("authorization")!=="Bearer "+secret)return NextResponse.json({status:"UNAUTHORIZED"},{status:401});
 try{
 const endpoint=new URL("https://api.eia.gov/v2/natural-gas/stor/wkly/data/");
 for(const [k,v] of Object.entries({"api_key":key,"frequency":"weekly","data[0]":"value","facets[series][]":"NW2_EPG0_SWO_R48_BCF","sort[0][column]":"period","sort[0][direction]":"desc","length":"320"}))endpoint.searchParams.set(k,v);
 const res=await fetch(endpoint,{cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error("Upstream");
 const body=await res.json(),raw=body?.response?.data;
 if(!Array.isArray(raw)||raw.length<2)throw Error("Missing data");
 const rows=raw.map((r:Record<string,unknown>)=>{if(r.series!=="NW2_EPG0_SWO_R48_BCF"||typeof r.period!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(r.period)||r.value===null||r.value===undefined||r.value===""||!Number.isFinite(Number(r.value))||Number(r.value)<0)throw Error("Invalid observation");return {period:r.period,bcf:Number(r.value)};});
 const sql=neon(url);
 await sql`CREATE TABLE IF NOT EXISTS falcon_eia_storage_vintages (period date NOT NULL, bcf numeric NOT NULL CHECK(bcf>=0), first_seen_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(period,bcf))`;
 await sql`INSERT INTO falcon_eia_storage_vintages(period,bcf) SELECT period,bcf FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(period date,bcf numeric) ON CONFLICT DO NOTHING`;
 const count=await sql`SELECT count(*)::int AS count FROM falcon_eia_storage_vintages`;
 return NextResponse.json({status:"OK",received:rows.length,storedVersions:Number(count[0].count),warning:"First seen timestamps are ingestion times, not original EIA release times."});
 }catch{return NextResponse.json({status:"INGEST_FAILED"},{status:502});}
}
export async function GET(){
 const url=process.env.DATABASE_URL;if(!url)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 try{const sql=neon(url);const exists=await sql`SELECT to_regclass('public.falcon_eia_storage_vintages') IS NOT NULL AS ready`;if(!exists[0].ready)return NextResponse.json({status:"AWAITING_INGESTION"});const rows=await sql`SELECT count(*)::int AS versions,count(DISTINCT period)::int AS weeks,min(period)::text AS earliest,max(period)::text AS latest FROM falcon_eia_storage_vintages`;return NextResponse.json({status:"OK",...rows[0]});}catch{return NextResponse.json({status:"UNAVAILABLE"},{status:503});}
}
