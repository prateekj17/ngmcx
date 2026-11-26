"use client";
import {useEffect,useState} from "react";
type Day={day:string;lowF:number;highF:number;hdd:number;cdd:number};
type Region={city:string;region:string;status:string;issuedAt:string|null;days:Day[]};
type Data={status:string;retrievedAt:string;available:number;total:number;regions:Region[];methodology:string;warning:string};
export default function Weather(){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function load(){setBusy(true);try{const r=await fetch("/api/weather",{cache:"no-store"});const d=await r.json();if(!r.ok||!Array.isArray(d.regions))throw Error();setData(d);setError("");}catch{setError("Forecast unavailable. Previously loaded forecasts may be stale.");}finally{setBusy(false);}}
 useEffect(()=>{void load();const t=setInterval(()=>void load(),900000);return()=>clearInterval(t);},[]);
 const panel={background:"#111e30",border:"1px solid #26364b",borderRadius:12,padding:20};
 const f=(v:number)=>v.toFixed(1);
 return <main style={{background:"#08111f",color:"#e2e8f0",minHeight:"100vh",padding:28,fontFamily:"system-ui",fontSize:16,lineHeight:1.5}}><div style={{maxWidth:1250,margin:"auto"}}>
 <a href="/" style={{color:"#7dd3fc"}}>← FALCON NG</a><h1 style={{fontSize:30,fontWeight:700,margin:"16px 0 4px"}}>US Weather Intelligence</h1><p style={{color:"#94a3b8"}}>NOAA / NWS · Regional heating and cooling demand indicators</p>
 <button disabled={busy} onClick={()=>void load()} style={{background:"#164e63",color:"white",padding:"10px 18px",borderRadius:8,margin:"16px 0"}}>{busy?"Refreshing…":"Refresh forecasts"}</button>
 {error&&<p role="alert" style={{color:"#fbbf24"}}>{error}</p>}
 {data&&<><p>{data.available}/{data.total} locations available · {data.status} · Retrieved {new Date(data.retrievedAt).toLocaleString()}</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16,marginTop:16}}>{data.regions.map(r=><section key={r.city} style={panel}><h2 style={{fontSize:22,fontWeight:700}}>{r.city}</h2><p style={{color:"#94a3b8"}}>{r.region} · {r.status}</p><p style={{fontSize:12,color:"#94a3b8"}}>Forecast updated: {r.issuedAt?new Date(r.issuedAt).toLocaleString():"Unavailable"}</p>
 {r.days.length>0?<><div style={{display:"flex",gap:20,margin:"12px 0"}}><div><small>Forecast HDD total</small><div style={{fontSize:26,color:"#38bdf8",fontWeight:700}}>{f(r.days.reduce((s,d)=>s+d.hdd,0))}</div></div><div><small>Forecast CDD total</small><div style={{fontSize:26,color:"#fbbf24",fontWeight:700}}>{f(r.days.reduce((s,d)=>s+d.cdd,0))}</div></div></div><p style={{fontSize:12}}>{r.days.length} complete forecast days</p><table style={{width:"100%",fontSize:13,textAlign:"right"}}><thead><tr><th style={{textAlign:"left"}}>Date</th><th>Low °F</th><th>High °F</th><th>HDD</th><th>CDD</th></tr></thead><tbody>{r.days.map(d=><tr key={d.day}><td style={{textAlign:"left"}}>{d.day.slice(5)}</td><td>{d.lowF}</td><td>{d.highF}</td><td style={{color:"#38bdf8"}}>{f(d.hdd)}</td><td style={{color:"#fbbf24"}}>{f(d.cdd)}</td></tr>)}</tbody></table></>:<p>Forecast unavailable</p>}</section>)}</div>
 <section style={{...panel,marginTop:20}}><h2 style={{fontSize:20,fontWeight:700}}>Methodology and limitations</h2><p>{data.methodology}</p><p style={{color:"#fbbf24"}}>{data.warning}</p><p>Higher HDD indicates greater heating requirements; higher CDD indicates greater cooling requirements. Neither measures a forecast change or departure from normal.</p></section></>}
 </div></main>;
}
