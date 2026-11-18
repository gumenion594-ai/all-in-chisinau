"""Download satellite (EOX Sentinel-2 cloudless 2023) and terrain (Terrarium) tiles for the study bbox."""
import math, os, sys, urllib.request, concurrent.futures as cf
W, S, E, N = 28.50, 46.82, 29.22, 47.23
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "tiles")
def tx(lon, z): return int((lon + 180) / 360 * 2 ** z)
def ty(lat, z):
    r = math.radians(lat); return int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2 ** z)
SRC = {
    "sat": ("https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg", range(9, 15), "jpg"),
    "dem": ("https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png", range(9, 13), "png"),
}
def job(kind, z, x, y):
    url, _, ext = SRC[kind]
    p = os.path.join(OUT, kind, str(z), str(x), f"{y}.{ext}")
    if os.path.exists(p): return 0
    os.makedirs(os.path.dirname(p), exist_ok=True)
    for a in range(4):
        try:
            req = urllib.request.Request(url.format(z=z, x=x, y=y), headers={"User-Agent": "chisinau-map-builder/0.1"})
            data = urllib.request.urlopen(req, timeout=60).read()
            open(p, "wb").write(data); return len(data)
        except Exception as e:
            err = e
    print("FAIL", kind, z, x, y, err); return 0
jobs = []
for kind, (_, zs, _) in SRC.items():
    for z in zs:
        for x in range(tx(W, z), tx(E, z) + 1):
            for y in range(ty(N, z), ty(S, z) + 1):
                jobs.append((kind, z, x, y))
print(len(jobs), "tiles")
tot = 0
with cf.ThreadPoolExecutor(4) as ex:
    for n in ex.map(lambda j: job(*j), jobs): tot += n
print("done", round(tot / 1e6, 1), "MB")
