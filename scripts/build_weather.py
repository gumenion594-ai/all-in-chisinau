"""Temperature layer: MET Norway point forecasts on a grid (with altitude), downscaled to 52 m with the DEM
(standard lapse rate 0.65 °C / 100 m), plus Open-Meteo daily series for the chart."""
import json, os, time, math, struct, urllib.request, base64, io
import numpy as np
from PIL import Image
from shapely.geometry import shape
from shapely.prepared import prep
ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw", "weather"); D = os.path.join(ROOT, "web", "data")
os.makedirs(RAW, exist_ok=True)
UA = {"User-Agent": "chisinau-atlas/0.1 (open-data city map)"}
LAPSE = 0.0065
# elevation grid (z12 / 2 pixel grid)
eb = open(os.path.join(D, "elev.bin"), "rb").read()
EW, EH, EX0, EY0 = struct.unpack("<IIII", eb[:16])
EZ = np.frombuffer(eb[16:], "<u2").reshape(EH, EW).astype(np.float32)
WORLD = 2 ** 12 * 128
def ll2pix(lon, lat):
    s = math.sin(math.radians(lat))
    return (lon + 180) / 360 * WORLD - EX0, (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * WORLD - EY0
def pix2ll(i, j):
    lon = (i + EX0) / WORLD * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (j + EY0) / WORLD))))
    return lon, lat
def zat(lon, lat):
    i, j = ll2pix(lon, lat); i, j = int(i), int(j)
    return float(EZ[min(max(j, 0), EH - 1), min(max(i, 0), EW - 1)])
# ---- MET Norway grid
W, S, E, N = 28.55, 46.84, 29.20, 47.21
lons = np.arange(W, E + 1e-9, 0.035); lats = np.arange(S, N + 1e-9, 0.03)
pts = []
cache = os.path.join(RAW, "met_grid.json")
old = json.load(open(cache)) if os.path.exists(cache) and time.time() - os.path.getmtime(cache) < 3 * 3600 else None
if old: pts = old
else:
    for la in lats:
        for lo in lons:
            z = max(0, round(zat(lo, la)))
            url = f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={la:.4f}&lon={lo:.4f}&altitude={z}"
            for a in range(4):
                try:
                    d = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()); break
                except Exception as e:
                    time.sleep(2 + 3 * a); d = None
            if not d: continue
            ts = [(x["time"], x["data"]["instant"]["details"]["air_temperature"]) for x in d["properties"]["timeseries"]]
            pts.append({"lon": round(float(lo), 4), "lat": round(float(la), 4), "z": z, "ts": ts, "upd": d["properties"]["meta"]["updated_at"]})
            time.sleep(0.12)
    json.dump(pts, open(cache, "w"))
print("MET grid points", len(pts))
# daily means in local time (UTC+2 in November)
from datetime import datetime, timedelta, timezone
TZ = timezone(timedelta(hours=2))
now_local = datetime.now(TZ)
days = {}
for i, p in enumerate(pts):
    for t, v in p["ts"]:
        dt = datetime.fromisoformat(t.replace("Z", "+00:00")).astimezone(TZ)
        days.setdefault(dt.date().isoformat(), {}).setdefault(i, []).append(v)
cur = np.array([p["ts"][0][1] for p in pts], np.float32)       # first step = current hour
P = np.array([[p["lon"], p["lat"]] for p in pts]); Z = np.array([p["z"] for p in pts], np.float32)
# fine raster (every 2nd elevation pixel ≈ 105 m)
i0, j0 = [int(v) for v in ll2pix(W, N)]; i1, j1 = [int(v) for v in ll2pix(E, S)]
STEP = 2
JJ, II = np.mgrid[j0:j1:STEP, i0:i1:STEP]
zf = EZ[np.clip(JJ, 0, EH - 1), np.clip(II, 0, EW - 1)]
lonf = (II + EX0) / WORLD * 360 - 180
latf = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * (JJ + EY0) / WORLD))))
def field(vals):
    """IDW of sea-level-equivalent temperature, then back to each pixel's altitude."""
    t0 = vals + LAPSE * Z
    dx = (lonf[..., None] - P[:, 0]) * 76; dy = (latf[..., None] - P[:, 1]) * 111
    w = 1 / np.maximum(dx * dx + dy * dy, 0.05) ** 1.5
    return (w * t0).sum(-1) / w.sum(-1) - LAPSE * zf
adm = json.load(open(os.path.join(D, "admin.geojson")))["features"]
mun = prep(shape(next(f for f in adm if f["properties"]["lvl"] == "mun" and f["properties"]["sc"] == "cur")["geometry"]))
from shapely.geometry import Point
inside = np.array([[mun.contains(Point(float(lonf[r, c]), float(latf[r, c]))) for c in range(lonf.shape[1])] for r in range(0, lonf.shape[0])])
# colour scale -20..35 °C
STOPS = [(-20, (49, 54, 149)), (-10, (69, 117, 180)), (-3, (116, 173, 209)), (2, (171, 217, 233)), (7, (224, 243, 248)),
         (12, (254, 224, 144)), (18, (253, 174, 97)), (24, (244, 109, 67)), (30, (215, 48, 39)), (35, (165, 0, 38))]
ABS = [(-15, (49, 54, 149)), (-5, (69, 117, 180)), (3, (116, 173, 209)), (10, (171, 217, 233)), (15, (230, 245, 200)),
       (20, (254, 224, 144)), (25, (253, 174, 97)), (30, (244, 109, 67)), (35, (215, 48, 39))]
def png(f):
    """Absolute colour scale (cold = blue, summer = red); local differences slightly amplified (x1.5) so they stay visible but small."""
    m = float(f[inside].mean())
    v = m + (f - m) * 1.5
    rgb = np.stack([np.interp(v, [s[0] for s in ABS], [s[1][c] for s in ABS]) for c in range(3)], -1).astype(np.uint8)
    buf = io.BytesIO(); Image.fromarray(rgb).save(buf, "JPEG", quality=82); return buf.getvalue()
# masks of every administrative unit on the raster grid (mean temperature per unit)
from shapely import vectorized
UNITS = {}
for f in adm:
    pr = f["properties"]
    if pr["lvl"] in (1, 2, 3, "ctx"):
        UNITS[pr["id"]] = vectorized.contains(shape(f["geometry"]), lonf, latf)
UNITS = {k: m for k, m in UNITS.items() if m.any()}
def unit_means(f):
    return {k: round(float(f[m].mean()), 1) for k, m in UNITS.items()}
odir = os.path.join(D, "temp"); os.makedirs(odir, exist_ok=True)
for f_ in os.listdir(odir): os.remove(os.path.join(odir, f_))
out = {"bounds": [[float(lonf[0, 0]), float(latf[0, 0])], [float(lonf[0, -1]), float(latf[0, -1])], [float(lonf[-1, -1]), float(latf[-1, -1])], [float(lonf[-1, 0]), float(latf[-1, 0])]],
       "updated": pts[0]["upd"], "now_time": pts[0]["ts"][0][0], "maps": {}}
fc = field(cur)
open(os.path.join(odir, "now.jpg"), "wb").write(png(fc))
out["maps"]["now"] = {"mean": round(float(fc[inside].mean()), 1), "min": round(float(fc[inside].min()), 1), "max": round(float(fc[inside].max()), 1), "u": unit_means(fc)}
for day, per in sorted(days.items()):
    if len(per) < len(pts) * 0.9 or min(len(v) for v in per.values()) < 4: continue   # need a fairly full day
    vals = np.array([np.mean(per[i]) for i in range(len(pts))], np.float32)
    f = field(vals)
    open(os.path.join(odir, f"{day}.jpg"), "wb").write(png(f))
    out["maps"][day] = {"mean": round(float(f[inside].mean()), 1), "min": round(float(f[inside].min()), 1), "max": round(float(f[inside].max()), 1), "src": "met", "u": unit_means(f)}
# past days: Open-Meteo city daily mean, spread with the same altitude correction
om = json.load(open(os.path.join(RAW, "om_city.json")))
zc = float(om.get("elevation", 64))
for d_, mean, mx, mn in zip(om["daily"]["time"], om["daily"]["temperature_2m_mean"], om["daily"]["temperature_2m_max"], om["daily"]["temperature_2m_min"]):
    if d_ in out["maps"] or mean is None: continue
    if d_ > now_local.date().isoformat() or d_ < (now_local.date() - timedelta(days=30)).isoformat(): continue
    f = mean - LAPSE * (zf - zc)
    open(os.path.join(odir, f"{d_}.jpg"), "wb").write(png(f))
    out["maps"][d_] = {"mean": round(float(f[inside].mean()), 1), "min": round(float(f[inside].min()), 1), "max": round(float(f[inside].max()), 1), "src": "om", "u": unit_means(f)}
out["series"] = [{"d": d_, "mean": a, "max": b, "min": c} for d_, a, b, c in zip(om["daily"]["time"], om["daily"]["temperature_2m_mean"], om["daily"]["temperature_2m_max"], om["daily"]["temperature_2m_min"])]
out["om_current"] = om.get("current")
out["generated"] = now_local.isoformat(timespec="minutes")
json.dump(out, open(os.path.join(D, "temp.json"), "w"), separators=(",", ":"))
print("maps", len(out["maps"]), "now mean", out["maps"]["now"], "size", sum(os.path.getsize(os.path.join(odir, f_)) for f_ in os.listdir(odir)) // 1000, "kB")
