"""Offline research staging. No database writes or network access."""
import argparse
import hashlib
import io
import json
import math
import zipfile
from pathlib import Path
from datetime import datetime
import pandas as pd

LIMIT = 100 * 1024 * 1024
COLUMNS = ["Date","Instrument Name","Symbol","Expiry Date","Open","High","Low","Close","Previous Close","Volume(Lots)","Open Interest(Lots)"]

def sources(path):
    if path.is_dir():
        for p in sorted(path.iterdir()):
            if p.suffix.lower() in (".xls",".xlsx",".zip"):
                yield from sources(p)
    elif path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as z:
            members = [m for m in z.infolist() if not m.is_dir() and Path(m.filename).suffix.lower() in (".xls",".xlsx")]
            if sum(m.file_size for m in members) > LIMIT:
                raise ValueError("ZIP exceeds uncompressed limit")
            for m in members:
                yield str(path)+":"+m.filename, z.read(m)
    else:
        if path.stat().st_size > LIMIT:
            raise ValueError("File too large")
        yield str(path), path.read_bytes()

def number(v, integer=False, nullable=False):
    if pd.isna(v) or str(v).strip() in ("","-"):
        if nullable:
            return None
        raise ValueError("Missing numeric value")
    n = float(str(v).replace(",",""))
    if not math.isfinite(n) or n < 0 or (integer and not n.is_integer()):
        raise ValueError("Invalid numeric value")
    return int(n) if integer else n

def parse(raw):
    if raw.startswith(b"PK") or raw.startswith(bytes.fromhex("d0cf11e0")):
        df = pd.read_excel(io.BytesIO(raw))
    else:
        tables = pd.read_html(io.BytesIO(raw))
        df = next(t for t in tables if set(COLUMNS).issubset(t.columns))
    if not set(COLUMNS).issubset(df.columns):
        raise ValueError("Unexpected MCX columns")
    for _, r in df.iterrows():
        symbol = str(r["Symbol"]).strip()
        if symbol not in ("NATURALGAS","NATGASMINI") or str(r["Instrument Name"]).strip() != "FUTCOM":
            continue
        day = pd.to_datetime(r["Date"], format="%d %b %Y", errors="raise").date() if isinstance(r["Date"],str) else pd.Timestamp(r["Date"]).date()
        expiry = pd.to_datetime(r["Expiry Date"],format="%d%b%Y",errors="raise").date() if isinstance(r["Expiry Date"],str) else pd.Timestamp(r["Expiry Date"]).date()
        if day > expiry:
            raise ValueError("Observation after expiry")
        vol = number(r["Volume(Lots)"], True)
        o,h,l = [number(r[k],nullable=vol==0) for k in ("Open","High","Low")]
        c = number(r["Close"])
        prev = number(r["Previous Close"],nullable=True)
        oi = number(r["Open Interest(Lots)"],True)
        flags = []
        if vol and (min(o,h,l,c)<=0 or not l<=o<=h):
            flags.append("INVALID_TRADED_OHLC")
        if vol and not l<=c<=h:
            flags.append("CLOSE_OUTSIDE_RANGE")
        if not vol:
            o=h=l=None
        if c<=0:
            flags.append("NONPOSITIVE_CLOSE")
        yield dict(day=str(day),expiry=str(expiry),symbol=symbol,open=o,high=h,low=l,close=c,previous_close=prev,volume=vol,oi=oi,flags=flags)

def stage(paths):
    records, manifest = {}, []
    duplicates = 0
    for path in paths:
        for name,raw in sources(path):
            digest = hashlib.sha256(raw).hexdigest()
            count = 0
            for row in parse(raw):
                count += 1
                key = (row["symbol"],row["expiry"],row["day"])
                if key in records:
                    if records[key]["observation"] != row:
                        raise ValueError(f"Conflicting observation: {key}")
                    duplicates += 1
                    if digest not in records[key]["source_hashes"]:
                        records[key]["source_hashes"].append(digest)
                else:
                    records[key] = dict(observation=row,source_hashes=[digest])
            if not count:
                raise ValueError(f"No eligible observations: {name}")
            manifest.append(dict(file=name,sha256=digest,rows=count))
    if not records:
        raise ValueError("No observations")
    rows = [records[k] for k in sorted(records)]
    return dict(status="STAGED_NOT_VALIDATED_FOR_TRADING",files=manifest,duplicates=duplicates,unique_rows=len(rows),flagged_rows=sum(bool(r["observation"]["flags"]) for r in rows),records=rows)

if __name__ == "__main__":
    p=argparse.ArgumentParser()
    p.add_argument("inputs",nargs="+",type=Path)
    p.add_argument("--output",required=True,type=Path)
    a=p.parse_args()
    result=stage(a.inputs)
    with a.output.open("x",encoding="utf-8") as f:
        json.dump(result,f,allow_nan=False)
    print(json.dumps({k:v for k,v in result.items() if k not in ("records","files")}))
