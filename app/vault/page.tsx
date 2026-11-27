"use client";
import {useEffect,useState} from "react";
const sources=[{name:"EIA storage",path:"storage",frequency:"Daily"},{name:"NOAA weather",path:"weather",frequency:"Every 6 hours"},{name:"Global market observations",path:"global",frequency:"Daily"}];
type Result={status:string;[key:string]:unknown};
export default function Vault(){
 const [data,setData]=useState<Record<string,Result>>({});
 const [updated,setUpdated]=useState("");
 useEffect(()=>{let active=true;async function load(){
 const results=await Promise.all(sources.map(async s=>{try{const r=await fetch("/api/vault/"+s.path,{cache:"no-store"});const d=await r.json();return [s.path,d] as const;}catch{return [s.path,{status:"UNAVAILABLE"}] as const;}}));
 if(active){setData(Object.fromEntries(results));setUpdated(new Date().toISOString());}
 }void load();const timer=setInterval(load,60000);return()=>{active=false;clearInterval(timer);};},[]);
 return <main style={{maxWidth:1100,margin:"auto",padding:24,color:"#e2e8f0",background:"#0f172a",minHeight:"100vh"}}>
 <a href="/" style={{color:"#93c5fd"}}>← Dashboard</a><h1 style={{fontSize:30,fontWeight:700}}>FALCON DATA VAULT</h1>
 <p>Database-reported coverage • Automatic refresh every minute</p><p>Last dashboard check: {updated||"Loading"}</p>
 {sources.map(s=>{const d=data[s.path];return <section key={s.path} style={{border:"1px solid #334155",borderRadius:12,padding:20,marginTop:16}}>
 <h2 style={{fontSize:22}}>{s.name}</h2><p>Collection schedule: {s.frequency}</p><p style={{color:d?.status==="OK"?"#86efac":"#fbbf24"}}>{d?.status||"CHECKING"} — database response, not a freshness guarantee</p>
 {d&&Object.entries(d).filter(([k])=>k!=="status"&&k!=="rows").map(([k,v])=><p key={k}>{k}: {String(v??"Unknown")}</p>)}
 {Array.isArray(d?.rows)&&d.rows.map((r:Record<string,unknown>,i:number)=><div key={i} style={{borderTop:"1px solid #334155",paddingTop:10}}>{Object.entries(r).map(([k,v])=><p key={k}>{k}: {String(v??"Unknown")}</p>)}</div>)}
 </section>;})}
 <section style={{marginTop:20}}><h2>Pending feeds</h2><p>MCX and NYMEX futures: authorized feed required. Henry Hub spot is not a futures quote.</p><p>Scheduled run success, source freshness and historical completeness require separate validation.</p></section>
 </main>;
}
