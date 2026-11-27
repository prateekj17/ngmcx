import {historicalContext,Vintage} from "../lib/historical-context";
const cutoff="2026-11-26T12:00:00Z";
const base:Vintage={series:"storage",observation:"2026-11-20",availableAt:"2026-11-26T10:00:00Z",value:3858,source:"fixture"};
const run=(rows:Vintage[],hours=24)=>historicalContext(rows,cutoff,{storage:hours});
function check(ok:boolean,msg:string){if(!ok)throw new Error(msg);}
check(run([base]).complete,"available");
check(run([base,{...base,availableAt:"2026-11-26T13:00:00Z",value:999}]).features[0].vintage?.value===3858,"future excluded");
check(run([]).features[0].status==="MISSING","missing");
check(run([base],1).features[0].status==="STALE","stale");
check(run([base,{...base,availableAt:"2026-11-26T11:00:00Z",value:3859}]).features[0].vintage?.value===3859,"revision");
check(run([base]).decision==="NO_TRADE","research only");
let rejected=false;try{run([base,{...base,value:1}]);}catch{rejected=true;}check(rejected,"conflict");
rejected=false;try{run([{...base,availableAt:"2026-11-26"}]);}catch{rejected=true;}check(rejected,"timezone required");
console.log("Historical context: 8 checks passed");
