import {dailyRange,RangeBar} from "../lib/daily-range";
function check(ok:boolean,msg:string){if(!ok)throw Error(msg);}
const base:RangeBar={day:"2026-11-01",symbol:"NATURALGAS",expiry:"2027-01-25",open:300,high:310,low:300,close:305,volume:100,oi:200};
const rows=Array.from({length:5},(_,i)=>({...base,day:"2026-11-0"+(i+1),high:300+5*(i+1)}));
const r=dailyRange(rows);
check(r.windows[0].average===15,"average");
check(r.windows[0].median===15,"median");
check(r.windows[0].maximum===25,"maximum");
check(r.windows[0].frequency[1].count===4,"threshold");
check(r.windows[0].complete&&!r.windows[1].complete,"coverage");
check(dailyRange([...rows,{...base,day:"2026-11-06",volume:0}]).excludedZeroVolume===1,"zero volume");
for(const bad of [[],[base,base],[base,{...base,day:"2026-11-02",symbol:"NATGASMINI"}],[{...base,high:299}]]){
 let threw=false;try{dailyRange(bad)}catch{threw=true}check(threw,"reject invalid data");
}
console.log("Daily range: 10 checks passed (synthetic fixtures)");
