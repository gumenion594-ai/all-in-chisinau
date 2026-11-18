"""Fill buildings missing from OSM with Microsoft Global ML Building Footprints (release 2026-02).
A footprint is added only if it does not touch any OSM building. Outputs:
  data/raw/msb_add.json   [[height, [[lon,lat],...]], ...]
  data/raw/bpts_all2.json OSM building points + added ones (residential weight for houses >= 35 m2)."""
import json, os, gzip, glob
from shapely.geometry import shape, box
from shapely.strtree import STRtree
ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw")
BB = box(28.50, 46.82, 29.22, 47.23)
osm = []
for n in ("buildings_a.geojson", "buildings_b.geojson"):
    for f in json.load(open(os.path.join(ROOT, "web", "data", n)))["features"]:
        osm.append(shape(f["geometry"]))
tree = STRtree(osm)
M2 = 111320 * 0.6820 * 110574
add, pts = [], []
for fn in glob.glob(os.path.join(RAW, "msb", "*.csv.gz")):
    for line in gzip.open(fn, "rt"):
        f = json.loads(line)
        g = shape(f["geometry"])
        if not BB.contains(g): continue
        a = g.area * M2
        if a < 15: continue
        if len(tree.query(g.buffer(0.00001), predicate="intersects")): continue
        h = f["properties"].get("height", -1)
        lv = max(1, round(h / 3)) if h and h > 0 else 1
        hh = h if h and h > 0 else 4.0
        add.append([round(hh, 1), [[round(x, 6), round(y, 6)] for x, y in g.exterior.coords]])
        c = g.centroid
        pts.append([round(c.x, 5), round(c.y, 5), round(a * lv, 1) if a >= 35 else 0.0])
json.dump(add, open(os.path.join(RAW, "msb_add.json"), "w"))
base = json.load(open(os.path.join(RAW, "bpts_all.json")))
json.dump(base + pts, open(os.path.join(RAW, "bpts_all2.json"), "w"))
print("OSM buildings", len(osm), "added from Microsoft footprints", len(add))
