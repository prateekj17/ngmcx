import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
const locations=[
["Boston","Northeast",42.36,-71.06],["New York","Northeast",40.71,-74.01],
["Chicago","Midwest",41.88,-87.63],["Minneapolis","Midwest",44.98,-93.27],
["Houston","South",29.76,-95.37],["Atlanta","South",33.75,-84.39],
["Denver","West",39.74,-104.99],["Seattle","West",47.61,-122.33]
] as const;
async function get(url:string){
 if(!url.startsWith("https://api.weather.gov/"))throw Error("Invalid source");
 const r=await fetch(url,{headers:{"User-Agent":"FALCON-NG (https://ngmcx-7182.vercel.app)","Accept":"application/geo+json"},next:{revalidate:3600},signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error("NWS unavailable");
 return r.json();
}
export async function GET(){
 const regions=await Promise.all(locations.map(async ([city,region,lat,lon])=>{
 try{
 const point=await get("https://api.weather.gov/points/"+lat+","+lon);
 const forecast=await get(String(point.properties.forecastHourly));
 const periods=forecast.properties.periods;
 const tz=String(point.properties.timeZone);
 const groups=new Map<string,{low:number;high:number;hours:Set<number>}>();
 const dateFmt=new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"});
 const today=dateFmt.format(new Date());
 for(const p of periods){
 const t=Date.parse(p.startTime);
 if(!Number.isFinite(t)||Date.parse(p.endTime)-t!==3600000||p.temperatureUnit!=="F"||typeof p.temperature!=="number"||!Number.isFinite(p.temperature))continue;
 const day=dateFmt.format(new Date(t));
 if(day<=today)continue;
 const a=groups.get(day)??{low:Infinity,high:-Infinity,hours:new Set<number>()};
 a.low=Math.min(a.low,p.temperature);a.high=Math.max(a.high,p.temperature);a.hours.add(t);groups.set(day,a);
 }
 const days=Array.from(groups.entries()).sort(([a],[b])=>a.localeCompare(b)).filter(([,a])=>a.hours.size===24).slice(0,5).map(([day,a])=>{const mean=(a.low+a.high)/2;return {day,lowF:a.low,highF:a.high,hdd:Math.max(0,65-mean),cdd:Math.max(0,mean-65)};});
 if(!days.length)throw Error("Incomplete forecast");
 return {city,region,status:"OK",issuedAt:forecast.properties.updateTime??null,days};
 }catch{return {city,region,status:"UNAVAILABLE",issuedAt:null,days:[]};}
 }));
 const available=regions.filter(r=>r.status==="OK").length;
 return NextResponse.json({status:available===8?"OK":available?"PARTIAL":"UNAVAILABLE",source:"NOAA National Weather Service hourly forecast",retrievedAt:new Date().toISOString(),available,total:8,regions,methodology:"Up to five complete 24-hour local forecast days; HDD and CDD use midpoint of hourly min/max temperatures and base 65 F. DST transition days omitted.",warning:"City samples only; not national demand-weighted data, climatological anomalies, or a trading signal."},{status:available?200:503});
}
