import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
export const dynamic="force-dynamic";
export async function GET(){
 const url=process.env.DATABASE_URL;
 if(!url)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 try{
 const sql=neon(url);
 const exists=await sql`SELECT to_regclass('public.falcon_weather_snapshots') IS NOT NULL AS ready`;
 if(!exists[0].ready)return NextResponse.json({status:"AWAITING_INGESTION"});
 const runs=await sql`SELECT DISTINCT retrieved_at FROM falcon_weather_snapshots ORDER BY retrieved_at DESC LIMIT 2`;
 if(runs.length<2)return NextResponse.json({status:"AWAITING_COMPARABLE_SNAPSHOTS",snapshots:runs.length});
 const latest=runs[0].retrieved_at,previous=runs[1].retrieved_at;
 const rows=await sql`SELECT a.city,a.region,a.forecast_day::text AS day,a.issued_at AS latest_issue,b.issued_at AS previous_issue,a.hdd::float8 AS latest_hdd,b.hdd::float8 AS previous_hdd,(a.hdd-b.hdd)::float8 AS delta_hdd,(a.cdd-b.cdd)::float8 AS delta_cdd,((a.low_f+a.high_f-b.low_f-b.high_f)/2)::float8 AS delta_mean_f FROM falcon_weather_snapshots a JOIN falcon_weather_snapshots b ON a.city=b.city AND a.forecast_day=b.forecast_day WHERE a.retrieved_at=${latest}::timestamptz AND b.retrieved_at=${previous}::timestamptz ORDER BY a.city,a.forecast_day`;
 const comparable=rows.filter(r=>r.latest_issue&&r.previous_issue&&Date.parse(String(r.latest_issue))>Date.parse(String(r.previous_issue)));
 const cities=Array.from(new Set(comparable.map(r=>String(r.city)))).map(city=>{
 const days=comparable.filter(r=>r.city===city);
 const hdd=days.reduce((s,r)=>s+Number(r.delta_hdd),0);
 const cdd=days.reduce((s,r)=>s+Number(r.delta_cdd),0);
 const temperature=days.reduce((s,r)=>s+Number(r.delta_mean_f),0)/days.length;
 return {city,region:days[0].region,matchedDays:days.length,deltaHdd:hdd,deltaCdd:cdd,meanTemperatureChangeF:temperature,direction:temperature<0?"COLDER":temperature>0?"WARMER":"UNCHANGED",days};
 });
 return NextResponse.json({status:cities.length?"OK":"AWAITING_UPDATED_FORECASTS",latest,previous,matchedRows:rows.length,updatedRows:comparable.length,cities,methodology:"Latest two retrieval snapshots; same city and target date; only strictly newer NOAA issue timestamps included.",warning:"Unequal overlapping horizons possible. City samples are not demand weighted. No trading signal."});
 }catch{return NextResponse.json({status:"UNAVAILABLE"},{status:503});}
}
