// Research-only ranking; never authorizes execution.
export type ContractEvidence = {
 symbol: "NATURALGAS" | "NATGASMINI";
 expiry: string;
 day: string;
 volume: number;
 oi: number;
 close: number;
};
export function rankContracts(rows: ContractEvidence[], asOf: string, minVolume: number, minOI: number) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(minVolume) || minVolume <= 0 || !Number.isFinite(minOI) || minOI <= 0) throw new Error("Invalid research configuration");
 const seen = new Set<string>();
 const candidates = rows.map(r => {
  const key = r.symbol + ":" + r.expiry;
  if (seen.has(key)) throw new Error("Duplicate contract snapshot");
  seen.add(key);
  const valid = (r.symbol === "NATURALGAS" || r.symbol === "NATGASMINI") && /^\d{4}-\d{2}-\d{2}$/.test(r.expiry) && r.expiry > asOf && r.day === asOf && Number.isSafeInteger(r.volume) && Number.isSafeInteger(r.oi) && Number.isFinite(r.close) && r.close > 0;
  const eligible = valid && r.volume >= minVolume && r.oi >= minOI;
  const units = r.symbol === "NATURALGAS" ? 1250 : 250;
  return {...r, eligible, volumeUnits: eligible ? r.volume * units : 0, oiUnits: eligible ? r.oi * units : 0, reason: !valid ? "INVALID_OR_STALE" : !eligible ? "LOW_LIQUIDITY" : "RESEARCH_CANDIDATE"};
 });
 candidates.sort((a,b) => Number(b.eligible)-Number(a.eligible) || b.volumeUnits-a.volumeUnits || b.oiUnits-a.oiUnits || a.expiry.localeCompare(b.expiry));
 return {decision:"NO_TRADE" as const, reason:"STRATEGY_NOT_QUALIFIED", candidates};
}
