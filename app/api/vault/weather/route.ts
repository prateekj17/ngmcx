import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
import {GET as forecast} from "../../weather/route";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 const secret=process.env.REFRESH_SECRET,url=process.env.DATABASE_URL;
 if(!secret||!url)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 if(req.headers.get("authorization")!=="Bearer "+secret)return NextResponse.json({status:"UNAUTHORIZED"},{status:401});
 try{
 const response=await forecast();
 const data=await response.json();
 if(!response.ok||!Array.isArray(data.regions))throw Error();
 const rows=data.regions.flatMap((r:{city:string;region:string;status:string;issuedAt:string|null;days:{day:string;lowF:number;highF:number;hdd:number;cdd:number}[]})=>r.status==="OK"?r.days.map(d=>({city:r.city,region:r.region,issued_at:r.issuedAt,forecast_day:d.day,low_f:d.lowF,high_f:d.highF,hdd:d.hdd,cdd:d.cdd})):[]);
 if(!rows.length)throw Error();
 const sql=neon(url);
 await sql`CREATE TABLE IF NOT EXISTS falcon_weather_snapshots (id bigserial PRIMARY KEY, retrieved_at timestamptz NOT NULL, city text NOT NULL, region text NOT NULL, issued_at timestamptz, forecast_day date NOT NULL, low_f numeric NOT NULL, high_f numeric NOT NULL, hdd numeric NOT NULL CHECK(hdd>=0), cdd numeric NOT NULL CHECK(cdd>=0), UNIQUE(retrieved_at,city,forecast_day))`;
 const result=await sql`INSERT INTO falcon_weather_snapshots(retrieved_at,city,region,issued_at,forecast_day,low_f,high_f,hdd,cdd) SELECT ${data.retrievedAt}::timestamptz,city,region,issued_at,forecast_day,low_f,high_f,hdd,cdd FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(city text,region text,issued_at timestamptz,forecast_day date,low_f numeric,high_f numeric,hdd numeric,cdd numeric) ON CONFLICT DO NOTHING RETURNING id`;
 return NextResponse.json({status:"OK",coverage:data.status,locations:data.available,received:rows.length,inserted:result.length});
 }catch{return NextResponse.json({status:"INGEST_FAILED"},{status:502});}
}
export async function GET(){
 const url=process.env.DATABASE_URL;
 if(!url)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 try{
 const sql=neon(url);
 const exists=await sql`SELECT to_regclass('public.falcon_weather_snapshots') IS NOT NULL AS ready`;
 if(!exists[0].ready)return NextResponse.json({status:"AWAITING_INGESTION"});
 const rows=await sql`SELECT count(*)::int AS observations,count(DISTINCT retrieved_at)::int AS snapshots,count(DISTINCT city)::int AS cities,min(retrieved_at) AS earliest,max(retrieved_at) AS latest FROM falcon_weather_snapshots`;
 return NextResponse.json({status:"OK",...rows[0]});
 }catch{return NextResponse.json({status:"UNAVAILABLE"},{status:503});}
}
