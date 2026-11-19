"""Add sports centres, gyms (fitness), stadiums, sports halls and public pools to pois.geojson (category 'sport')."""
import json, os
from shapely.geometry import shape, Point
from shapely.prepared import prep
from osmgeom import OSMStore, polys_only
ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw"); D = os.path.join(ROOT, "web", "data")
els = []
for fn in ("area.json", "extra_e.json", "extra_n.json"):
    els += json.load(open(os.path.join(RAW, fn)))["elements"]
S = OSMStore(els)
adm = json.load(open(os.path.join(D, "admin.geojson")))["features"]
munc = prep(shape(next(f for f in adm if f["properties"]["lvl"] == "mun" and f["properties"]["sc"] == "cur")["geometry"]))
munr = prep(shape(next(f for f in adm if f["properties"]["lvl"] == "mun" and f["properties"]["sc"] == "ref")["geometry"]))
fc = json.load(open(os.path.join(D, "pois.geojson")))
fc["features"] = [f for f in fc["features"] if f["properties"]["c"] != "sport"]
have = {f["properties"]["id"] for f in fc["features"]}
SPORTK = ("fitness_centre", "sports_centre", "stadium", "sports_hall", "swimming_pool", "ice_rink")
def kind_of(t):
    l = t.get("leisure")
    if l == "fitness_centre" or t.get("amenity") == "gym" or (t.get("sport") == "fitness" and t.get("name")): return "fitness_centre"
    if l in ("sports_centre", "stadium", "sports_hall", "ice_rink"): return l
    if l == "swimming_pool" and t.get("name") and t.get("access") not in ("private", "customers", "no"): return "swimming_pool"
    if t.get("building") == "sports_hall" and t.get("name"): return "sports_hall"
    return None
def is_rel(t):
    return kind_of(t) is not None and t.get("access") not in ("private", "no")
add = []; MOVE = set()
def emit(el, x, y):
    t = el["tags"]; pid = f'{el["type"][0]}{el["id"]}'
    if pid in have: MOVE.add(pid)   # already listed under another category (e.g. businesses): move it here
    kind = kind_of(t)
    p = {"c": "sport", "k": kind, "n": t.get("name:ro") or t.get("name") or "", "id": pid}
    if t.get("sport"): p["sp"] = t["sport"][:60]
    if t.get("opening_hours"): p["h"] = t["opening_hours"][:80]
    a = " ".join(v for v in [t.get("addr:street"), t.get("addr:housenumber")] if v)
    if a: p["a"] = a
    if t.get("website"): p["w"] = t["website"][:120]
    pt = Point(x, y); p["i"] = (1 if munc.contains(pt) else 0) + (2 if munr.contains(pt) else 0)
    add.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(x, 6), round(y, 6)]}, "properties": p})
for n in S.nodes.values():
    if n.get("tags") and is_rel(n["tags"]): emit(n, n["lon"], n["lat"])
for w in S.ways.values():
    if w.get("tags") and is_rel(w["tags"]):
        g = S.way_polygon(w["id"])
        if g is not None: c = g.representative_point(); emit(w, c.x, c.y)
for r in S.rels.values():
    if r.get("tags") and is_rel(r["tags"]) and r["tags"].get("type") == "multipolygon":
        g, _ = S.rel_polygon(r["id"]); g = polys_only(g)
        if g is not None: c = g.representative_point(); emit(r, c.x, c.y)
# drop a node that sits inside an already-added building of the same place (same name, < 60 m)
dedup = []
for f in add:
    x, y = f["geometry"]["coordinates"]
    if any(g["properties"]["n"] == f["properties"]["n"] and f["properties"]["n"] and abs(g["geometry"]["coordinates"][0] - x) < 0.0008 and abs(g["geometry"]["coordinates"][1] - y) < 0.0005 for g in dedup):
        continue
    dedup.append(f)
fc["features"] = [f for f in fc["features"] if f["properties"]["id"] not in MOVE] + dedup
json.dump(fc, open(os.path.join(D, "pois.geojson"), "w"), ensure_ascii=False, separators=(",", ":"))
from collections import Counter
print("sport", len(dedup), Counter(f["properties"].get("k") for f in dedup).most_common(8), "inside now:", sum(1 for f in dedup if f["properties"]["i"] & 1))
