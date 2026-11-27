# FALCON 360 research policy

## Decision principles
- Default NO TRADE. No trade quotas or loss-recovery targets.
- Independent risk veto; no live execution authorization from research code.
- Regimes and factor weights are hypotheses, not established predictive relationships.
- Compare technical baseline with incremental fundamental features and ablation tests.

## Data acquisition priorities
1. MCX standard and mini: reproducible raw-file audit, session coverage, expiry mapping and provenance.
2. NYMEX contract-specific futures and USD/INR: documented source rights, timestamps, units and settlement conventions. Henry Hub spot is a separate proxy, never relabeled futures.
3. EIA original releases and contemporaneous expectations; revised series are exploratory only unless vintage history is established.
4. NOAA forecast archives: issue time, target time, model/run, regional HDD/CDD and comparable forecast revisions.
5. Production, LNG, demand, positioning and disruption history: publication lag and coverage explicitly documented.

## Historical integrity
Preserve originals and hashes. Reject conflicting keys; quarantine anomalies. Never infer missing observations as zero. Store observation period, publication/availability time, retrieval time, source and revision identity separately. Join only information available at the decision cutoff. Use explicit time zones and contract identifiers. Do not infer exact publication timestamps from dates alone.

## Testing
Freeze hypotheses and parameters before evaluation. Use chronological development and validation, then genuinely untouched forward data; previously examined 2026 data is not an untouched holdout. Compare regimes, expiry buckets and liquidity, realistic costs, portfolio exposure, gap risk and margin. Avoid double counting correlated standard/mini signals. Report sample size, net expectancy, realized R, profit factor, drawdown, uncertainty and cost sensitivity. Daily bars cannot validate intraday execution.

## Qualification
Require reproducible data and code, documented coverage, no leakage, robust net results across relevant regimes, independent risk checks and forward paper testing. Thresholds must be predeclared before evaluation. Missing critical evidence blocks qualification. No production merge or live trade recommendation merely because CI passes.

## Status
Policy only. No data import, strategy qualification or live authorization is implied.
