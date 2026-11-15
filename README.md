# MCX Natural Gas Decision Engine

A Next.js starter dashboard for a research-led MCX Natural Gas futures workflow. Designed for GitHub + Vercel.

## What is included
- Dashboard with MCX, Henry Hub, USD/INR and manually entered technical levels.
- Transparent evidence scorecard (100-point checklist; **not** a win probability).
- Conservative NO TRADE default. The rules are illustrative guardrails, not a validated trading strategy.
- Basic risk/reward and lot-sizing calculator.
- Local browser trading journal with JSON export.
- Data-source readiness/status endpoint and EIA API-key placeholder.
- Responsive layout.

## Important data limitations
This project does **not** include a paid/live MCX or NYMEX feed, nor automatic NOAA model comparisons, EIA consensus, CFTC positioning, LNG/pipeline flows or news ingestion. Do not treat the sample/default values as current market data. Enter verified values and timestamps. Do not connect an unlicensed scraper or rely on delayed/free quotes for execution.

The EIA status route currently checks whether `EIA_API_KEY` is configured; it does not yet fetch storage series. NOAA is listed as a planned connector. A production data pipeline must preserve source, unit, publication time, retrieval time, contract month and data quality.

## Run locally
1. Install Node.js 20 or later.
2. Extract the ZIP and open the project directory.
3. Run:
   ```bash
   npm install
   npm run dev
   ```
4. Open http://localhost:3000

## Deploy to GitHub + Vercel
1. Create a new GitHub repository.
2. Upload/push the contents of this folder (not the enclosing ZIP).
3. In Vercel, choose **Add New → Project**, import the repository.
4. Framework preset: Next.js. Build command: `npm run build`.
5. Add `EIA_API_KEY` in Vercel Project → Settings → Environment Variables when ready to implement the EIA connector.
6. Deploy.

## Before real-money use — critical build backlog
1. **Licensed quote feed:** implement server-side MCX and NYMEX feed adapters; never expose vendor secrets in browser code.
2. **Time alignment:** persist quote timestamps/timezones, contract symbols, expiry calendars, stale-data thresholds and market-session state.
3. **FX conversion:** calculate a clearly labelled indicative MCX fair-value bridge using matched Henry Hub contract, conversion units, USD/INR and basis/contract differences. Do not treat it as exact parity.
4. **Fundamentals:** EIA storage actual + release calendar; NOAA/NWS/ECMWF/GFS forecast snapshots and HDD/CDD deltas; production, LNG feedgas, pipeline maintenance/outages, demand and cross-border flows.
5. **Consensus and event calendar:** ingest independently sourced consensus and label estimates; never invent missing consensus.
6. **Historical research:** store point-in-time datasets, avoid look-ahead bias, backtest walk-forward and out-of-sample, include fees/slippage/rolls and survivorship/data revisions.
7. **Scoring governance:** version the model, store each input and evidence URL, define missing-data penalties and calibrate only on out-of-sample results.
8. **Journal database:** replace browser localStorage with Postgres (e.g. Vercel Postgres/Neon) and authentication; add MFE/MAE, realised P&L, fees, slippage, rule violations and review tags.
9. **Risk controls:** exchange lot/tick validation, max daily loss, max trades/day, kill switch, gap/slippage assumptions and hard rejection of invalid sizing.
10. **Security/operations:** auth, rate limits, monitoring, secret management, backups and audit trail.

## Scoring interpretation
Weights: Fundamental 25, Weather 20, Storage 15, Supply/Demand 15, Technical 15, Positioning 5, Geopolitical/Event 5. The UI lets the analyst score each category. The demo rule only permits LONG/SHORT when total >=75, directional sub-scores align, price is on the corresponding side of VWAP, confirmation is checked and high event risk is not checked. This is a simple demonstrator and should be revised after research; score >=75 does not mean 75% probability.

## Contract specifications
Lot size, tick size, trading hours, expiry and rollover are intentionally user-verifiable inputs/backlog items. Confirm current MCX circulars and broker contract details for each contract month before using sizing output.

## Disclaimer
For research and education only; not investment advice, an exchange feed, broker terminal or automated execution system. No orders are placed. Futures are high risk. You are responsible for independent verification and decisions.
