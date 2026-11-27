"use client";
import {useEffect,useState} from "react";
type Point={period:string;bcf:number;weeklyChangeBcf:number|null;lastYearBcf:number|null;yearOnYearPct:number|null;fiveYearAverageBcf:number|null;surplusBcf:number|null;surplusPct:number|null};
type Data={status:string;latest:Point;history:Point[];freshness:string;retrievedAt:string;methodology:string;warning:string};
const fmt=(n:number|null|undefined,d=0)=>n==null||!Number.isFinite(n)?"Unavailable":n.toLocaleString("en-US",{maximumFractionDigits:d,minimumFractionDigits:d});
export default function StorageIntelligence(){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 async function load(){setLoading(true);try{const r=await fetch("/api/vault/storage-intelligence",{cache:"no-store"});const d=await r.json();if(!r.ok||d.status!=="OK"||!d.latest||!Array.isArray(d.history))throw Error();setData(d);setError("");}catch{setError("Storage intelligence unavailable. Previously loaded values, if shown, may be stale.");}finally{setLoading(false);}}
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),900000);return()=>clearInterval(timer);},[]);
 const p=data?.latest,h=data?.history??[];
 const values=h.flatMap(r=>[r.bcf,r.fiveYearAverageBcf,r.lastYearBcf]).filter((v):v is number=>v!==null&&Number.isFinite(v));
 const min=Math.min(...values),max=Math.max(...values);
 const y=(v:number)=>220-(v-min)/Math.max(1,max-min)*180;
 const x=(i:number)=>65+i/Math.max(1,h.length-1)*800;
 const path=(key:"bcf"|"fiveYearAverageBcf"|"lastYearBcf")=>{let open=false;return h.map((r,i)=>{const v=r[key];if(v==null){open=false;return "";}const s=(open?"L":"M")+x(i)+" "+y(v);open=true;return s;}).join(" ");};
 const cards=p?[["Latest inventory",fmt(p.bcf)+" Bcf"],["Weekly net change",fmt(p.weeklyChangeBcf)+" Bcf"],["Five-year seasonal average",fmt(p.fiveYearAverageBcf,1)+" Bcf"],["Seasonal surplus / deficit",fmt(p.surplusBcf,1)+" Bcf"],["Seasonal deviation",fmt(p.surplusPct,2)+"%"],["Year-on-year change",fmt(p.yearOnYearPct,2)+"%"]]:[];
 return <main style={{background:"#08111f",color:"#e2e8f0",minHeight:"100vh",padding:"28px",fontFamily:"system-ui"}}>
 <div style={{maxWidth:1200,margin:"auto"}}><a href="/" style={{color:"#7dd3fc"}}>← FALCON NG</a><h1>Storage Intelligence</h1><p style={{color:"#94a3b8"}}>US Lower 48 working gas · EIA / Neon archive</p>
 <button onClick={()=>void load()} disabled={loading} style={{padding:10,background:"#164e63",color:"white",border:0,borderRadius:6}}>{loading?"Refreshing…":"Refresh data"}</button>
 {error&&<p role="alert" style={{color:"#fbbf24"}}>{error}</p>}
 {p&&data&&<><p>Week ending {p.period} · {data.freshness} · Retrieved {new Date(data.retrievedAt).toLocaleString()}</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>{cards.map(([label,value])=><section key={label} style={{background:"#111e30",border:"1px solid #26364b",padding:18,borderRadius:10}}><div style={{color:"#94a3b8",fontSize:13}}>{label}</div><h2 style={{margin:"8px 0"}}>{value.replace("Unavailable Bcf","Unavailable").replace("Unavailable%","Unavailable")}</h2></section>)}</div>
 <section style={{background:"#111e30",padding:18,marginTop:20,borderRadius:10}}><h2>52-week seasonal comparison</h2><p style={{fontSize:13}}><span style={{color:"#38bdf8"}}>● Actual inventory</span>　<span style={{color:"#fbbf24"}}>● Five-year average</span>　<span style={{color:"#94a3b8"}}>● Previous year</span></p>
 {values.length>0&&<svg viewBox="0 0 900 260" width="100%" role="img" aria-label="Historical storage comparison in billion cubic feet">{[0,1,2,3,4].map(i=>{const v=min+(max-min)*i/4;return <g key={i}><line x1="65" x2="865" y1={y(v)} y2={y(v)} stroke="#334155"/><text x="5" y={y(v)+4} fill="#94a3b8" fontSize="12">{fmt(v)}</text></g>})}<path d={path("bcf")} fill="none" stroke="#38bdf8" strokeWidth="3"/><path d={path("fiveYearAverageBcf")} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6 4"/><path d={path("lastYearBcf")} fill="none" stroke="#94a3b8" strokeWidth="2"/>{h.map((r,i)=>i%13===0||i===h.length-1?<text key={r.period} x={x(i)} y="245" textAnchor="middle" fill="#94a3b8" fontSize="11">{r.period.slice(0,7)}</text>:null)}</svg>}</section>
 <section style={{background:"#111e30",padding:18,marginTop:20,borderRadius:10}}><h2>Storage context</h2><p>{p.surplusBcf==null?"Insufficient seasonal history.":p.surplusBcf>0?"Inventory above calculated seasonal average.":p.surplusBcf<0?"Inventory below calculated seasonal average.":"Inventory at calculated seasonal average."} This is not a trade recommendation.</p><p style={{color:"#94a3b8",fontSize:13}}>{data.methodology}</p><p style={{color:"#fbbf24",fontSize:13}}>{data.warning}</p></section>
 </>}
 </div></main>;
}
