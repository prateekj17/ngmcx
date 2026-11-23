# SCORPIO NG 3.0 — Backtesting plan

## Status
Prototype calculation module: `lib/backtest.ts`. It is **not yet wired to the UI**, not connected to historical MCX data, and has not been validated against broker executions. The production dashboard remains unchanged.

## Required data
- Contract-specific MCX Natural Gas OHLCV, volume and OI, with exchange timestamps and source attribution.
- Actual listed contract symbols, expiry, lot units, tick size and historical trading calendar.
- Point-in-time EIA storage releases, weather forecast snapshots and revisions, CFTC publications, NYMEX quotes and FX data where licensed/available.
- Preserve release timestamps; do not join a weekly report to days before its publication.
- Test each expiry separately; explicitly model rollover and liquidity. Never back-adjust prices without recording the adjustment method.

## Method
1. Split time chronologically into development, validation and untouched out-of-sample periods.
2. Generate each signal only from information available at that historical timestamp.
3. Enter only on subsequent candles; account for spread, slippage, fees and contract size.
4. When stop and target are both inside one OHLC bar, assume stop first unless tick data proves otherwise.
5. Enforce daily loss limits, per-trade sizing, maximum trades and session cutoff.
6. Report net P&L, trade count, win rate, profit factor, drawdown, expectancy and performance by contract and market regime.
7. Perform walk-forward and sensitivity testing; reject parameter sets that work only in one sample.

## Prototype limitations
- Current module uses first target only and approximates entry/exit fills.
- No broker authentication, historical data retrieval, automated trading or live signals.
- Must add exchange-specific sessions, gap logic, partial profit taking, trailing stops, open-interest filters, contract rollover, margin and tests before production.
- Do not interpret a backtest result as a prediction or guarantee.
