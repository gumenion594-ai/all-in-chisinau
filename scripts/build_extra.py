"""Planned transport ring (Centura Chișinăului), population heat grid, elevation heat tiles."""
import json, os, io, glob, math, struct
from shapely.geometry import LineString, mapping, Point
from shapely.ops import linemerge
from shapely import set_precision
from pyproj import Transformer
ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw"); OUT = os.path.join(ROOT, "web", "data")
to_m = Transformer.from_crs(4326, 32635, always_xy=True).transform

# ---------------- ring
els = []
for fn in ("area.json", "extra_e.json", "extra_n.json"):
    els += json.load(open(os.path.join(RAW, fn)))["elements"]
nodes = {e["id"]: e for e in els if e["type"] == "node"}
ex, pr = [], []
for e in els:
    t = e.get("tags", {})
    if e["type"] != "way" or "Centura" not in (t.get("name") or ""): continue
    c = [(nodes[n]["lon"], nodes[n]["lat"]) for n in e["nodes"] if n in nodes]
    if len(c) < 2: continue
    if t.get("highway") in ("trunk", "trunk_link", "primary"): ex.append(LineString(c))
    elif t.get("highway") in ("proposed", "construction"): pr.append(LineString(c))
def km(ls): return sum(LineString([to_m(*p) for p in l.coords]).length for l in ls) / 1000
gap = LineString([(28.8640, 46.9427), (28.885, 46.947), (28.905, 46.952), (28.9265, 46.9558)])
feats = []
for l in linemerge(ex).geoms if hasattr(linemerge(ex), "geoms") else [linemerge(ex)]:
    feats.append({"type": "Feature", "properties": {"st": "existent"}, "geometry": mapping(set_precision(l.simplify(0.00003), 0.00001))})
m = linemerge(pr)
for l in getattr(m, "geoms", [m]):
    feats.append({"type": "Feature", "properties": {"st": "propus"}, "geometry": mapping(set_precision(l.simplify(0.00003), 0.00001))})
feats.append({"type": "Feature", "properties": {"st": "aprox"}, "geometry": mapping(gap)})
meta = {"km_existent": round(km(ex) / 1, 1), "km_propus": round(km(pr), 1), "km_aprox": round(km([gap]), 1)}
json.dump({"type": "FeatureCollection", "features": feats, "meta": meta}, open(os.path.join(OUT, "ring.geojson"), "w"), separators=(",", ":"))
print("ring", meta)

# ---------------- population heat grid (150 m cells) from building population points
pts = json.load(open(os.path.join(OUT, "pts.json")))
b = pts["b"]; x = y = 0; cells = {}
CELL = 0.0015
for i in range(0, len(b), 3):
    x += b[i]; y += b[i + 1]; p = b[i + 2] / 10
    if p <= 0: continue
    lon, lat = 28.5 + x / 1e5, 46.8 + y / 1e5
    k = (int(lon / (CELL * 1.46)), int(lat / CELL))
    cells[k] = cells.get(k, 0) + p
for lon, lat, p in pts["x"]:
    k = (int(lon / (CELL * 1.46)), int(lat / CELL)); cells[k] = cells.get(k, 0) + p
grid = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [round((kx + .5) * CELL * 1.46, 5), round((ky + .5) * CELL, 5)]},
         "properties": {"p": round(v, 1)}} for (kx, ky), v in cells.items() if v >= 0.5]
json.dump({"type": "FeatureCollection", "features": grid}, open(os.path.join(OUT, "popgrid.geojson"), "w"), separators=(",", ":"))
print("pop grid cells", len(grid), "max", round(max(f["properties"]["p"] for f in grid)))

# ---------------- elevation heat tiles
import numpy as np
from PIL import Image
T = os.path.join(RAW, "tiles")
# stepped hypsometric classes, 25 m each (no blue: low = green, high = brown/grey)
BANDS = [(0, (46, 125, 50)), (50, (76, 145, 65)), (75, (112, 165, 80)), (100, (153, 187, 92)), (125, (196, 207, 104)),
         (150, (232, 222, 120)), (175, (243, 200, 104)), (200, (236, 170, 88)), (225, (222, 139, 74)), (250, (198, 110, 66)),
         (275, (170, 88, 62)), (300, (140, 74, 60)), (325, (120, 92, 84)), (350, (165, 150, 145))]
def elev(z, x, y):
    a = np.asarray(Image.open(os.path.join(T, "dem", str(z), str(x), f"{y}.png")).convert("RGB")).astype(np.float32)
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
items = []
for z in range(9, 13):
    for p in glob.glob(os.path.join(T, "dem", str(z), "*", "*.png")):
        xx, yy = int(p.split(os.sep)[-2]), int(p.split(os.sep)[-1][:-4])
        e = elev(z, xx, yy)
        lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (yy + 0.5) / 2 ** z))))
        res = 40075016 * math.cos(math.radians(lat)) / 2 ** z / 256
        gy, gx = np.gradient(e, res)
        slope = np.arctan(np.hypot(gx, gy) * 1.4); aspect = np.arctan2(-gx, gy)
        hs = np.clip(np.sin(math.radians(45)) * np.cos(slope) + np.cos(math.radians(45)) * np.sin(slope) * np.cos(math.radians(315) - aspect), 0, 1)
        idx = np.clip(np.searchsorted([b[0] for b in BANDS], e, side="right") - 1, 0, len(BANDS) - 1)
        pal = np.array([b[1] for b in BANDS], np.float32)
        rgb = pal[idx] * (0.78 + 0.32 * hs[..., None])
        buf = io.BytesIO(); Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(buf, "JPEG", quality=82)
        items.append((f"{z}/{xx}/{yy}", buf.getvalue()))
idx, off = {}, 0
for k, bb in items: idx[k] = [off, len(bb)]; off += len(bb)
head = json.dumps(idx, separators=(",", ":")).encode()
with open(os.path.join(OUT, "relief.bin"), "wb") as f:
    f.write(struct.pack("<I", len(head))); f.write(head)
    for _, bb in items: f.write(bb)
print("relief heat tiles", len(items))
