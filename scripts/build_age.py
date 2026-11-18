"""Construction period for every building, in the same order as the 3D building packs.
Priority: OSM start_date / construction_date > Wikidata inception (item within 30 m) > GHSL built-up epochs
(first epoch in which the 100 m cell reached half of its 2020 built-up surface)."""
import json, os, re, csv, glob
import numpy as np, rasterio
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
from osmgeom import OSMStore
ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw"); D = os.path.join(ROOT, "web", "data")
# 1 Imperiul Rus (<1918) · 2 interbelic · 3 1941–1975 · 4 1975–1991 · 5 1991–2010 · 6 2010–prezent
# 7 înainte de 1975, nedatat (GHSL) · 8 monument ocrotit nedatat (înainte de 1941) · 0 necunoscut
CLASSES = [(0, 1918, 1), (1918, 1941, 2), (1941, 1975, 3), (1975, 1991, 4), (1991, 2010, 5), (2010, 2100, 6)]
def cls_of(y):
    for a, b, c in CLASSES:
        if a <= y < b: return c
    return 1 if y < 1700 else 0
# ---- buildings in pack order (OSM a, OSM b, Microsoft)
geoms = []
for n in ("buildings_a.geojson", "buildings_b.geojson"):
    geoms += [shape(f["geometry"]) for f in json.load(open(os.path.join(D, n)))["features"]]
n_osm = len(geoms)
for h, ring in json.load(open(os.path.join(RAW, "msb_add.json"))):
    geoms.append(shape({"type": "Polygon", "coordinates": [ring]}))
cent = [g.representative_point() for g in geoms]
tree = STRtree(geoms)
cls = np.zeros(len(geoms), np.uint8); src = np.zeros(len(geoms), np.uint8)   # src 1 OSM, 2 Wikidata, 3 GHSL
# ---- GHSL
EP = [1975, 1990, 2000, 2010, 2020]
rs = {e: rasterio.open(glob.glob(os.path.join(RAW, "ghsl", f"E{e}", "*.tif"))[0]) for e in EP}
win = rasterio.windows.from_bounds(28.49, 46.81, 29.23, 47.24, rs[2020].transform)
arr = {e: rs[e].read(1, window=win).astype(np.float32) for e in EP}
tr = rasterio.windows.transform(win, rs[2020].transform)
inv = ~tr
# Proportional allocation: inside every GHSL cell, buildings are split between epochs in proportion to how much
# built-up surface the cell gained in each epoch; growth beyond the 2020 surface counts as 2020–present.
M2 = 111320 * 0.6820 * 110574
barea = np.array([g.area * M2 for g in geoms])
osm_flag = np.array([i < n_osm for i in range(len(geoms))])
cellb = {}
H_, W_ = arr[2020].shape
for i, c in enumerate(cent):
    col, row = inv * (c.x, c.y); r, q = int(row), int(col)
    if 0 <= r < H_ and 0 <= q < W_: cellb.setdefault((r, q), []).append(i)
EPCLS = [(7, None), (4, None), (5, None), (5, None), (6, None), (6, None)]   # <1975, 75-90, 90-00, 00-10, 10-20, >2020
for (r, q), idx in cellb.items():
    a = [arr[e][r, q] for e in EP]
    F = float(barea[idx].sum())
    inc = [a[0], a[1] - a[0], a[2] - a[1], a[3] - a[2], a[4] - a[3], 0.0]
    inc = [max(0.0, x) for x in inc]
    tot = sum(inc)
    if tot <= 0:
        for i in idx: cls[i] = 0; src[i] = 3   # no built-up surface detected by GHSL at all: period unknown
        continue
    quota = [F * x / tot for x in inc]
    # newest epochs are filled first with the most likely-new buildings: Microsoft-only footprints, then OSM by size
    order = sorted(idx, key=lambda i: barea[i])   # small structures fill the newest periods, large blocks the oldest
    # walk from the newest period backwards; a building gets the period containing the midpoint of its footprint
    bounds, acc = [], 0.0
    for k in range(5, -1, -1):
        acc += quota[k]; bounds.append((acc, k))
    pos = 0.0
    for i in order:
        mid = pos + barea[i] / 2; pos += barea[i]
        k = next((kk for lim, kk in bounds if mid <= lim + 1e-9), 0)
        cls[i] = EPCLS[k][0]; src[i] = 3
print("GHSL classified", int((src == 3).sum()), "of", len(geoms))
AREA = barea
# ---- Wikidata inception
nwd = 0
CENT = {"XVIII": 1780, "XIX": 1850, "XX": 1925}
nher = 0
for row in csv.DictReader(open(os.path.join(RAW, "wd_hist.csv"))):
    m = re.match(r"Point\(([\d.]+) ([\d.]+)\)", row["coord"])
    if not m: continue
    y = re.match(r"(\d{4})", row["inc"] or "") or re.search(r"(1[6-9]\d\d|20[0-2]\d)", row["itemLabel"])
    cy = re.search(r"sec(?:olul|\.)\s*(XVIII|XIX|XX)", row["itemLabel"], re.I)
    year = int(y.group(1)) if y else (CENT[cy.group(1).upper()] if cy else None)
    is_arch = row["her"] and ("arhitectural" in (row["desc"] or "") or re.match(r"(Casa|Clădirea|Biserica|Vila|Conacul|Catedrala|Palatul|Moara|Castelul|Gimnaziul|Liceul|Spitalul|Hotelul|Sinagoga|Capela|Fostul|Fosta)", row["itemLabel"]))
    if year is None and not is_arch: continue
    p = Point(float(m.group(1)), float(m.group(2)))
    near = [i for i in tree.query(p.buffer(0.0003))]
    if not near: continue
    i = min(near, key=lambda k: geoms[k].distance(p))
    if geoms[i].distance(p) >= 0.0003 or src[i] in (1, 2): continue
    if year is not None: cls[i] = cls_of(year); src[i] = 2; nwd += 1
    else: cls[i] = 8; src[i] = 4; nher += 1
print("Wikidata dated", nwd, "heritage undated", nher)
for row in []:
    m = y = None
    p = Point(float(m.group(1)), float(m.group(2)))
    near = [i for i in tree.query(p.buffer(0.0003))]
    if not near: continue
    i = min(near, key=lambda k: geoms[k].distance(p))
    if geoms[i].distance(p) < 0.0003:
        cls[i] = cls_of(int(y.group(1))); src[i] = 2; nwd += 1
print("Wikidata matched", nwd)
# ---- OSM tags (match tagged OSM building polygons by identical centroid)
nos = 0
els = []
for fn in ("area.json", "extra_e.json", "extra_n.json"): els += json.load(open(os.path.join(RAW, fn)))["elements"]
S = OSMStore(els)
for w in S.ways.values():
    t = w.get("tags", {})
    if "building" not in t: continue
    v = t.get("start_date") or t.get("construction_date") or t.get("year_of_construction")
    if not v: continue
    y = re.search(r"(1[6-9]\d\d|20[0-2]\d)", v)
    if not y: continue
    g = S.way_polygon(w["id"])
    if g is None: continue
    c = g.representative_point()
    hit = [i for i in tree.query(c) if i < n_osm and geoms[i].contains(c)]
    for i in hit: cls[i] = cls_of(int(y.group(1))); src[i] = 1; nos += 1
# OSM heritage-listed buildings without a year
for w in S.ways.values():
    t = w.get("tags", {})
    if "building" not in t or not t.get("heritage") or t.get("start_date"): continue
    g = S.way_polygon(w["id"])
    if g is None: continue
    c = g.representative_point()
    for i in tree.query(c):
        if i < n_osm and geoms[i].contains(c) and src[i] not in (1, 2): cls[i] = 8; src[i] = 4
print("OSM dated", nos)
# ---- typology for undated pre-1975 buildings (class 7)
from osmapi import get, API
d = get(f"{API}/relation/11146243/full.json"); st = OSMStore(d["elements"]); hc, _ = st.rel_polygon(11146243)
from shapely.prepared import prep as _prep
HC = _prep(hc)
props = []
for n in ("buildings_a.geojson", "buildings_b.geojson"):
    props += [f["properties"] for f in json.load(open(os.path.join(D, n)))["features"]]
n_blk = n_hc = 0
for i in range(len(geoms)):
    if cls[i] != 7: continue
    p = props[i] if i < n_osm else None
    if p and ((p["t"] in ("apartments", "residential", "dormitory") and p["h"] >= 12) or (p["t"] in ("yes", "commercial", "office", "public") and p["h"] >= 15 and not p["e"])):
        cls[i] = 3; src[i] = 5; n_blk += 1                      # Soviet-era block
    elif HC.contains(cent[i]) and (p is None or p["h"] <= 10):
        cls[i] = 1; src[i] = 5; n_hc += 1                       # low-rise house in the historic centre
print("typology: soviet blocks", n_blk, "historic-centre low-rise", n_hc)
# ---- historical periods: 1 Russian Empire (<1918) · 2 Romanian rule (1918–1941) · 3 USSR (1941–1991) · 4 Independence (1991–) · 0 undated
FINE = cls.copy()
REMAP = {0: 0, 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 4, 7: 3, 8: 1}
cls = np.array([REMAP[int(k)] for k in FINE], np.uint8)
# undated listed monuments: Russian Empire inside the 19th-century city, Romanian period elsewhere
for i in np.where(FINE == 8)[0]:
    if not HC.contains(cent[i]): cls[i] = 2
# ---- coarse grid for zoomed-out view: dominant period per ~150 m cell, weighted by footprint
CW, CH = 0.0021, 0.00135
cells = {}
for g, c, k in zip(geoms, cent, cls.tolist()):
    key = (int(c.x / CW), int(c.y / CH))
    d = cells.setdefault(key, [0.0] * 9); d[int(k)] += g.area
# organic period zones for the zoomed-out view: buildings of each period buffered (~35 m) and merged
from shapely import affinity, set_precision
from shapely.ops import unary_union
from shapely.geometry import box as _box, mapping
K = 0.682
iso = lambda g: affinity.scale(g, xfact=K, yfact=1, origin=(0, 0)); back = lambda g: affinity.scale(g, xfact=1 / K, yfact=1, origin=(0, 0))
feats = []
step = 0.04; x = 28.50
while x < 29.22:
    y = 46.82
    while y < 47.23:
        sel = [i for i, c in enumerate(cent) if x <= c.x < x + step and y <= c.y < y + step]
        if sel:
            cellbox = iso(_box(x, y, x + step, y + step))
            for k in (0, 4, 3, 2, 1):   # every period gets its own full zone (they may overlap)
                gs = [iso(geoms[i]) for i in sel if cls[i] == k]
                if not gs: continue
                # ~80 m out, ~40 m back: closes the gaps between village houses, keeps ~40 m of surroundings
                z = unary_union([g.buffer(0.0007) for g in gs]).buffer(-0.00035).intersection(cellbox).buffer(0)
                for p in getattr(z, "geoms", [z]):
                    if p.geom_type == "Polygon" and p.area > 6e-9:
                        pp = set_precision(back(p).simplify(0.00004, preserve_topology=True), 0.00001)
                        if not pp.is_empty: feats.append({"type": "Feature", "properties": {"a": int(k), "o": {0: 0, 4: 1, 3: 2, 2: 3, 1: 4}[int(k)]}, "geometry": mapping(pp)})
        y += step
    x += step
json.dump({"type": "FeatureCollection", "features": feats}, open(os.path.join(D, "agegrid.geojson"), "w"), separators=(",", ":"))
print("age zones", len(feats))
json.dump({"cls": cls.tolist(), "src": src.tolist(), "area": [round(float(x), 1) for x in AREA]}, open(os.path.join(RAW, "bld_age.json"), "w"))
from collections import Counter
print(sorted(Counter(cls.tolist()).items()))
