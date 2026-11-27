import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
export const dynamic = "force-dynamic";
const DAY = 86400000;
type Observation = {period:string; bcf:number};
export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
  try {
    const sql = neon(url);
    const raw = await sql`SELECT DISTINCT ON (period) period::text AS period, bcf::float8 AS bcf FROM falcon_eia_storage_vintages ORDER BY period DESC, first_seen_at DESC, bcf DESC`;
    const rows: Observation[] = raw.map(r=>({period:String(r.period),bcf:Number(r.bcf)}));
    if (!rows.length || rows.some(r=>!Number.isFinite(r.bcf)||r.bcf<0||!Number.isFinite(Date.parse(r.period)))) throw Error("Invalid data");
    const byDate = new Map(rows.map(r=>[r.period,r.bcf]));
    function compare(row:Observation) {
      const t=Date.parse(row.period);
      const prior=Array.from({length:5},(_,i)=>{
        const target=new Date(t);
        target.setUTCFullYear(target.getUTCFullYear()-i-1);
        const match=rows.reduce<Observation|null>((best,r)=>{
          const distance=Math.abs(Date.parse(r.period)-target.getTime());
          return distance<=3*DAY && (!best||distance<Math.abs(Date.parse(best.period)-target.getTime()))?r:best;
        },null);
        return match;
      });
      const average=prior.every(r=>r!==null)?prior.reduce((sum,r)=>sum+(r?.bcf??0),0)/5:null;
      const previous=byDate.get(new Date(t-7*DAY).toISOString().slice(0,10));
      const lastYear=prior[0]?.bcf??null;
      return {...row,weeklyChangeBcf:previous===undefined?null:row.bcf-previous,
        lastYearBcf:lastYear,yearOnYearPct:lastYear&&lastYear>0?100*(row.bcf-lastYear)/lastYear:null,
        fiveYearAverageBcf:average,surplusBcf:average===null?null:row.bcf-average,
        surplusPct:average&&average>0?100*(row.bcf-average)/average:null,
        comparisonWeeks:prior};
    }
    const latest=compare(rows[0]);
    const ageDays=(Date.now()-Date.parse(latest.period))/DAY;
    return NextResponse.json({status:"OK",source:"Neon archive of EIA Lower 48 working gas storage",units:"Bcf",
      retrievedAt:new Date().toISOString(),observationAgeDays:Math.floor(ageDays),freshness:ageDays<0?"INVALID":ageDays>14?"STALE":"RECENT_OBSERVATION",
      latest,history:rows.slice(0,52).reverse().map(compare),
      methodology:"Nearest weekly observation within three days of each prior calendar-year anniversary; all five years required. Calculated comparison, not official EIA five-year benchmark.",
      warning:"Observation date is not release time. Archive may include revisions and does not capture all reversions. Not point-in-time backtest data or a trading signal."});
  } catch {
    return NextResponse.json({status:"DATA_UNAVAILABLE"},{status:503});
  }
}
