# SCORPIO NG 2.0 — Hobby setup
- Connect a free Neon PostgreSQL database to this existing Vercel project through Storage / Marketplace. Confirm DATABASE_URL is available.
- Add REFRESH_SECRET in Vercel Project Settings → Environment Variables (Production); redeploy.
- Optional: set EIA_STORAGE_API_URL only after verifying the exact EIA weekly storage series, geography and units. Never commit an API key.
- Deploy branch scorpio-ng-2.0 to Preview and test /api/status.
- Test /api/refresh with Authorization: Bearer YOUR_REFRESH_SECRET.
- Create a cron-job.org job every 15 minutes to GET https://YOUR_DOMAIN/api/refresh and send that Authorization header.
- Verify scheduler history and Vercel function logs.
A 15-minute poll does not make weekly EIA or daily FX data update every 15 minutes. MCX live quotes, NOAA and CFTC ingestion are not yet connected. Do not treat EOD/delayed MCX data as live.