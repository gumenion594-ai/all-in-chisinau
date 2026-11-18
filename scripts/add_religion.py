"""Add churches, monasteries and other places of worship to pois.geojson (category 'religion')."""
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
fc["features"] = [f for f in fc["features"] if f["properties"]["c"] != "religion"]
have = {f["properties"]["id"] for f in fc["features"]}
def is_rel(t):
    return t.get("amenity") in ("place_of_worship", "monastery") or t.get("building") in ("church", "chapel", "cathedral", "monastery", "mosque", "synagogue") and t.get("name")
add = []
def emit(el, x, y):
    t = el["tags"]; pid = f'{el["type"][0]}{el["id"]}'
    if pid in have: return
    kind = t.get("amenity") if t.get("amenity") in ("place_of_worship", "monastery") else t.get("building")
    p = {"c": "religion", "k": kind, "n": t.get("name:ro") or t.get("name"), "id": pid}
    if t.get("religion"): p["rel"] = t["religion"]
    if t.get("denomination"): p["den"] = t["denomination"]
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
fc["features"] += dedup
json.dump(fc, open(os.path.join(D, "pois.geojson"), "w"), ensure_ascii=False, separators=(",", ":"))
from collections import Counter
print("religion", len(dedup), Counter(f["properties"].get("rel") for f in dedup).most_common(6), "inside now:", sum(1 for f in dedup if f["properties"]["i"] & 1))
