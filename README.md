# SCORPIO NG 2.0 — Vercel Hobby edition
Next.js research dashboard with Neon PostgreSQL persistence and a protected refresh endpoint.

## Architecture
- Vercel Hobby hosting.
- Neon PostgreSQL connected through Vercel Marketplace; app reads DATABASE_URL.
- External free scheduler (e.g. cron-job.org) calls GET /api/refresh every 15 minutes with Authorization: Bearer secret.
- Refresh checks Frankfurter USD/INR daily reference rate and an optional configured EIA API v2 URL.
- Source observations and refresh history are stored in Neon. GET /api/status reports health.

**Polling is not a market-data feed.** Frankfurter rates are generally daily; EIA storage is weekly. MCX bhavcopy is EOD/delayed, not live. NOAA/CFTC/MCX automated adapters are not connected yet. No missing values are invented.

## Setup
1. Vercel → existing project → Storage / Marketplace → create/connect Neon free plan. Ensure DATABASE_URL is injected.
2. Project Settings → Environment Variables → add REFRESH_SECRET as a long random value for Production. Redeploy.
3. Optional: set EIA_STORAGE_API_URL only after verifying exact EIA series, geography, units and publication period.
4. Deploy branch scorpio-ng-2.0 as a Preview first; open /api/status.
5. Test with: curl -H "Authorization: Bearer YOUR_SECRET" https://YOUR_DOMAIN/api/refresh
6. On cron-job.org create a GET job every 15 minutes to /api/refresh, with Authorization header Bearer YOUR_SECRET. Keep the secret private.

## Endpoints
- GET /api/status — source status, timestamps and configuration.
- GET /api/refresh — protected refresh trigger.

## Current sources
- Frankfurter USD/INR: connected; daily indicative reference rate.
- EIA storage: optional full URL; weekly; verify selected series and units.
- MCX official bhavcopy: not yet ingested; EOD/delayed only.
- NOAA weather: not connected; demand region/model selection needed.
- CFTC COT: not connected; weekly.

The refresh route only polls sources. It cannot cause upstream data to publish more frequently. No broker API, live MCX feed or automated order execution is included. Existing browser journal remains local to that browser; cloud journal/authentication is a separate build.

Research and education only. Futures are leveraged and can result in losses. Verify all inputs independently.