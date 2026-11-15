export type SourceStatus = { name:string; status:"CONNECTED"|"NEEDS API KEY"|"MANUAL INPUT"|"NOT CONNECTED"; detail:string; url?:string };
export async function getEiaStatus():Promise<SourceStatus>{
  if(!process.env.EIA_API_KEY) return {name:"EIA storage",status:"NEEDS API KEY",detail:"Add EIA_API_KEY in Vercel environment variables to enable API-backed storage retrieval.",url:"https://www.eia.gov/opendata/"};
  return {name:"EIA storage",status:"CONNECTED",detail:"API key configured. Wire your chosen EIA series and validate publication timestamps before using it."};
}
export const sources:SourceStatus[]=[
 {name:"MCX live quote",status:"MANUAL INPUT",detail:"No public, authenticated MCX market-data feed is bundled. Enter broker/vendor quote and timestamp."},
 {name:"Henry Hub / NYMEX",status:"MANUAL INPUT",detail:"Enter a licensed real-time quote or your approved data-provider feed."},
 {name:"USD/INR",status:"MANUAL INPUT",detail:"Enter a current rate from your bank/broker or licensed provider."},
 {name:"NOAA / NWS",status:"NOT CONNECTED",detail:"Weather API integration requires selecting U.S. demand regions and forecast products.",url:"https://www.weather.gov/documentation/services-web-api"},
 {name:"CFTC COT",status:"NOT CONNECTED",detail:"Weekly positioning is not intraday data. Add CFTC report parser and publication-date checks.",url:"https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm"},
 {name:"EIA storage",status:"NEEDS API KEY",detail:"EIA weekly storage series can be integrated with an API key.",url:"https://www.eia.gov/opendata/"}
];