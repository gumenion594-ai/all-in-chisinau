"""Estimate the capacity (pupils) of every school in pois.geojson from its buildings.

No official per-school pupil numbers are reachable from here and OpenStreetMap has no capacity tags, so:
  floor area = Σ footprint × levels of the buildings on the school grounds (amenity=school area; for a school mapped
               only as a point or a single building: the building it is in / the school building itself)
  capacity   ≈ floor area / 10 m² per pupil (usual gross area per pupil, incl. corridors, gym, canteen), 80–2,500.
Levels: building:levels or height from OSM; otherwise 3 for school buildings, 2 for others (as in build_layers.py).
Writes p.cap (pupils, rounded to 10) and p.cap_src ("bld" estimated from buildings, "def" = typical value) on schools.
"""
import json, math, os, re
import numpy as np
from shapely.geometry import Point
from shapely.strtree import STRtree
from osmgeom import OSMStore, polys_only

ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw"); D = os.path.join(ROOT, "web", "data")
MX = 111320 * math.cos(math.radians(47)); MY = 110570
M2_PER_PUPIL = 10.0
els = []
for fn in ("area.json", "extra_e.json", "extra_n.json"):
    if os.path.exists(os.path.join(RAW, fn)): els += json.load(open(os.path.join(RAW, fn)))["elements"]
S = OSMStore(els); del els

def num(v):
    try: return float(re.match(r"[\d.]+", v).group())
    except Exception: return None
blds, info = [], []
for w in S.ways.values():
    t = w.get("tags") or {}
    b = t.get("building")
    if not b or b == "no": continue
    g = S.way_polygon(w["id"])
    if g is None: continue
    lv = num(t.get("building:levels", "")) if t.get("building:levels") else None
    if lv is None and t.get("height"): h = num(t["height"]); lv = max(1, round(h / 3.3)) if h else None
    if lv is None: lv = 3 if b in ("school", "college", "university") or t.get("amenity") == "school" else 2
    blds.append(g); info.append((g.area * MX * MY, min(lv, 12)))
tree = STRtree(blds)
print("buildings", len(blds))

def grounds(pid):
    kind, oid = pid[0], int(pid[1:])
    if kind == "w": return S.way_polygon(oid)
    if kind == "r": return polys_only(S.rel_polygon(oid)[0])
    return None

fc = json.load(open(os.path.join(D, "pois.geojson")))
caps = []
for f in fc["features"]:
    p = f["properties"]
    if p["c"] != "school": continue
    g = grounds(p["id"])
    area = 0.0
    if g is not None and not g.is_empty:
        for i in tree.query(g):
            b = blds[i]
            if g.contains(b.representative_point()) or b.intersection(g).area > 0.5 * b.area: area += info[i][0] * info[i][1]
    if area < 300:   # a point, or grounds without mapped buildings: the building at the point (within 40 m)
        pt = Point(f["geometry"]["coordinates"])
        near = [i for i in tree.query(pt.buffer(0.0005)) if blds[i].distance(pt) * MX < 40]
        if near: area = max(info[i][0] * info[i][1] for i in near)
    if area >= 300:
        p["cap"] = int(round(min(2500, max(80, area / M2_PER_PUPIL)) / 10) * 10); p["cap_src"] = "bld"
    else:
        p.pop("cap", None); p["cap_src"] = "def"
    caps.append(p.get("cap"))
# general education only (primary, gymnasium, lyceum); not dance / language / driving / sports / art schools or kindergartens
from unicodedata import normalize
de = lambda x: normalize("NFKD", (x or "").lower()).encode("ascii", "ignore").decode()
NOT = ("dans", "limb", "english", "engl", "make-up", "makeup", "sport", "arte", "art ", "muzic", "auto", "conduc", "gradinit", "timpurie", "creativ", "club", "centrul", "academ", "studio", "beauty", "frumuset", "it ", "programare", "robot", "fitness", "balet", "inot", "sah", "karate", "tenis", "fotbal", "haltere")
YES = ("liceu", "gimnaz", "scoala primara", "scoala nr", "scoala-gradinita", "complexul educational", "scoala medie", "scoala de cultura generala", "scoala internat", "lyceum", "school no", "scoala")
for f in fc["features"]:
    p = f["properties"]
    if p["c"] != "school": continue
    n = de(p.get("n"))
    p["gen"] = 1 if (not n or (any(k in n for k in YES) and not any(k in n for k in NOT)) or any(k in n for k in ("liceu", "gimnaz", "primar", "excelsis", "alternative education school"))) else 0
    if "abandonat" in n: p["gen"] = 0
known = [f["properties"]["cap"] for f in fc["features"] if f["properties"]["c"] == "school" and f["properties"].get("gen") and f["properties"].get("cap")]
med = int(np.median(known)) if known else 500
for f in fc["features"]:
    p = f["properties"]
    if p["c"] != "school": continue
    if not p.get("cap"): p["cap"] = med
    if p.get("gen") and p["cap"] < 150 and ("liceu" in de(p.get("n")) or "gimnaz" in de(p.get("n"))): p["cap"] = med; p["cap_src"] = "def"   # buildings missing in OSM
json.dump(fc, open(os.path.join(D, "pois.geojson"), "w"), ensure_ascii=False, separators=(",", ":"))
inside = [f["properties"]["cap"] for f in fc["features"] if f["properties"]["c"] == "school" and f["properties"].get("gen") and f["properties"].get("i", 1) & 1]
print("general schools", sum(1 for f in fc["features"] if f["properties"]["c"] == "school" and f["properties"].get("gen")), "excluded:", [f["properties"].get("n") for f in fc["features"] if f["properties"]["c"] == "school" and not f["properties"].get("gen")])
print("schools", len(caps), "estimated from buildings", len(known), "median", med, "p10/p90", int(np.percentile(known, 10)), int(np.percentile(known, 90)),
      "total places in the municipality", sum(inside))
