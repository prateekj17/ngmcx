"use client";
import {useEffect,useState} from "react";
type Point={period:string;bcfPerDay:number};
type Metric={id:string;label:string;status:string;latest:Point|null;yoyPct:number|null;history:Point[];sourceUrl?:string;method?:string};
type Data={status:string;available:number;retrievedAt:string;series:Metric[];warning:string};
export default function SupplyDemand(){
 const [data,setData]=useState<Data|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function load(){setBusy(true);try{const r=await fetch("/api/eia/supply-demand",{cache:"no-store"});const d=await r.json();if(!Array.isArray(d.series))throw Error();setData(d);setError(r.ok?"":"Source unavailable");}catch{setError("Refresh failed; any previously displayed data may be stale.");}finally{setBusy(false);}}
 useEffect(()=>{void load();},[]);
 const panel={background:"#111e30",border:"1px solid #26364b",borderRadius:12,padding:20};
 return <main style={{background:"#08111f",color:"#e2e8f0",minHeight:"100vh",padding:24,fontFamily:"system-ui"}}><div style={{maxWidth:1250,margin:"auto"}}>
 <a href="/" style={{color:"#7dd3fc"}}>← FALCON NG</a><h1 style={{fontSize:30,fontWeight:700}}>Supply &amp; Demand Intelligence</h1><p style={{color:"#94a3b8"}}>EIA monthly US natural gas statistics · Bcf/day</p>
 <button disabled={busy} onClick={()=>void load()} style={{background:"#164e63",color:"white",padding:"10px 18px",borderRadius:8,margin:"16px 0"}}>{busy?"Refreshing…":"Refresh data"}</button>
 {error&&<p role="alert" style={{color:"#fbbf24"}}>{error}</p>}
 {data&&<><p>{data.available}/4 indicators available · {data.status} · Retrieved {new Date(data.retrievedAt).toLocaleString()}</p><p style={{color:"#fbbf24",margin:"12px 0"}}>{data.warning}</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>{data.series.map(s=>{
 const h=s.history.filter(p=>Number.isFinite(p.bcfPerDay)).sort((a,b)=>a.period.localeCompare(b.period));
 const min=Math.min(...h.map(p=>p.bcfPerDay)),max=Math.max(...h.map(p=>p.bcfPerDay)),range=max-min||1;
 const xy=(p:Point)=>{const [y,m]=p.period.split("-").map(Number);return y*12+m;};
 const span=h.length?xy(h[h.length-1])-xy(h[0])||1:1;
 const path=h.map((p,i)=>{const x=54+(xy(p)-xy(h[0]))/span*410,y=15+(max-p.bcfPerDay)/range*135;return (i&&xy(p)-xy(h[i-1])===1?"L":"M")+x+" "+y;}).join(" ");
 const seasonal=s.latest?h.filter(p=>p.period.slice(5)===s.latest!.period.slice(5)&&p.period<s.latest!.period).slice(-4):[];
 const avg=seasonal.length?seasonal.reduce((a,p)=>a+p.bcfPerDay,0)/seasonal.length:null;
 return <section key={s.id} style={panel}><h2 style={{fontSize:20,fontWeight:700}}>{s.label}</h2>{s.latest?<><div style={{fontSize:30,color:"#38bdf8",fontWeight:700}}>{s.latest.bcfPerDay.toFixed(2)} <small style={{fontSize:13}}>Bcf/day</small></div><p>Observation: {s.latest.period} · YoY: {s.yoyPct===null?"Unavailable":s.yoyPct.toFixed(2)+"%"}</p><p style={{color:"#94a3b8",fontSize:13}}>Monthly data · {s.method??"EIA series API"}</p>
 {h.length>1&&<svg viewBox="0 0 480 185" width="100%" role="img" aria-label={s.label+" monthly historical trend"}>{[0,1,2,3].map(i=><g key={i}><line x1="54" x2="464" y1={15+i*45} y2={15+i*45} stroke="#334155"/><text x="48" y={19+i*45} textAnchor="end" fill="#94a3b8" fontSize="11">{(max-range*i/3).toFixed(1)}</text></g>)}<path d={path} fill="none" stroke="#38bdf8" strokeWidth="2"/><text x="54" y="174" fill="#94a3b8" fontSize="11">{h[0].period}</text><text x="464" y="174" textAnchor="end" fill="#94a3b8" fontSize="11">{h[h.length-1].period}</text></svg>}
 <p style={{fontSize:13}}>Same-month prior-year sample average ({seasonal.length} years): {avg===null?"Unavailable":avg.toFixed(2)+" Bcf/day"}</p><p style={{fontSize:12,color:"#94a3b8"}}>{h.length} monthly observations · {s.sourceUrl?<a href={s.sourceUrl} style={{color:"#7dd3fc"}}>Official EIA table</a>:"Official EIA API"}</p></>:<p>Indicator unavailable</p>}</section>;
 })}</div><p style={{marginTop:20,color:"#94a3b8"}}>Production, exports and consumption are separate indicators, not an additive supply-demand balance. Monthly history may be revised; this dashboard does not establish point-in-time availability or intraday trading signals.</p></>}
 </div></main>;
}
