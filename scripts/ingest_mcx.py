"""Research ingestion staging. Requires archive usage permission before running."""
import argparse, datetime as dt, hashlib, json, pathlib, urllib.request, urllib.parse, time, csv, io
p=argparse.ArgumentParser()
p.add_argument("--start",required=True)
p.add_argument("--end",required=True)
p.add_argument("--out",default="data/mcx-raw")
p.add_argument("--authorized",action="store_true")
a=p.parse_args()
if not a.authorized: p.error("Confirm archive access and storage terms before running")
start,end=dt.date.fromisoformat(a.start),dt.date.fromisoformat(a.end)
if end<start or (end-start).days>366: p.error("Use batches of up to one year")
out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True)
while start<=end:
 if start.weekday()<5:
  for symbol in ("NATURALGAS","NATGASMINI"):
   dest=out/f"{start}-{symbol}.csv"
   meta=dest.with_suffix(".json")
   if dest.exists() and meta.exists():
    continue
   url="https://mtf.trading/api/v1/mcx?"+urllib.parse.urlencode({"date":str(start),"symbol":symbol,"instr":"FUTCOM","format":"csv","limit":100000})
   try:
    with urllib.request.urlopen(url,timeout=30) as response:
     raw=response.read(5_000_001)
    if len(raw)>5_000_000: raise ValueError("Response too large")
    reader=csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    headers=reader.fieldnames or []
    if not {"symbol","expirydate","instrumentname"}.issubset({h.lower() for h in headers}): raise ValueError("Unexpected schema: "+str(headers))
    rows=list(reader)
    if not rows: raise ValueError("Empty session; holiday or missing data")
    for row in rows:
     lower={k.lower():v for k,v in row.items() if k is not None}
     if lower.get("symbol","").upper()!=symbol or lower.get("instrumentname","").upper()!="FUTCOM": raise ValueError("Unexpected instrument")
    dest.write_bytes(raw)
    meta.write_text(json.dumps({"source":url,"retrievedAt":dt.datetime.now(dt.timezone.utc).isoformat(),"sha256":hashlib.sha256(raw).hexdigest(),"rows":len(rows),"status":"unverified_archive"},indent=2))
    print(start,symbol,len(rows))
   except Exception as e:
    print("GAP",start,symbol,str(e))
    with (out/"gaps.jsonl").open("a") as f:f.write(json.dumps({"date":str(start),"symbol":symbol,"error":str(e)})+"\n")
   time.sleep(1)
 start+=dt.timedelta(days=1)
