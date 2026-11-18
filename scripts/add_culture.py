"""Museums, hotels and historic monuments as their own POI categories."""
import json, os
from shapely.geometry import shape, Point
from shapely.prepared import prep
from osmgeom import OSMStore, polys_only
ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw"); D = os.path.join(ROOT, "web", "data")
els = []
for fn in ("area.json", "extra_e.json", "extra_n.json"): els += json.load(open(os.path.join(RAW, fn)))["elements"]
S = OSMStore(els)
adm = json.load(open(os.path.join(D, "admin.geojson")))["features"]
munc = prep(shape(next(f for f in adm if f["properties"]["lvl"] == "mun" and f["properties"]["sc"] == "cur")["geometry"]))
munr = prep(shape(next(f for f in adm if f["properties"]["lvl"] == "mun" and f["properties"]["sc"] == "ref")["geometry"]))
fc = json.load(open(os.path.join(D, "pois.geojson")))
NEW = ("museum", "hotel", "monument")
# hotels used to be in "business": take them out, they are re-added below
fc["features"] = [f for f in fc["features"] if f["properties"]["c"] not in NEW and not (f["properties"]["c"] == "business" and f["properties"].get("k") in ("hotel", "hostel", "guest_house", "motel", "apartment"))]
HIST = {"monument", "memorial", "building", "castle", "archaeological_site", "ruins", "manor", "church", "monastery", "wayside_cross", "tomb", "city_gate", "fort", "heritage", "yes"}
def cat(t):
    if t.get("tourism") == "museum" or t.get("amenity") == "museum": return "museum"
    if t.get("tourism") in ("hotel", "hostel", "guest_house", "motel"): return "hotel"
    h = t.get("historic")
    if (h in HIST and (t.get("name") or h in ("monument", "memorial"))) or (t.get("heritage") and t.get("name")): return "monument"
    return None
RO = {"museum": "muzeu", "hotel": "hotel", "hostel": "hostel", "guest_house": "pensiune", "motel": "motel", "monument": "monument", "memorial": "memorial",
      "building": "clădire istorică", "castle": "conac / castel", "archaeological_site": "sit arheologic", "ruins": "ruine", "manor": "conac",
      "church": "biserică istorică", "monastery": "mănăstire istorică", "wayside_cross": "troiță", "tomb": "mormânt istoric", "city_gate": "poartă", "fort": "fortificație"}
add, seen = [], set()
def emit(el, x, y):
    t = el["tags"]; c = cat(t)
    if not c: return
    kind = t.get("tourism") if c in ("museum", "hotel") else (t.get("historic") or "heritage")
    p = {"c": c, "k": kind, "n": t.get("name:ro") or t.get("name"), "id": f'{el["type"][0]}{el["id"]}'}
    a = " ".join(v for v in [t.get("addr:street"), t.get("addr:housenumber")] if v)
    if a: p["a"] = a
    if t.get("website"): p["w"] = t["website"][:120]
    if t.get("opening_hours"): p["h"] = t["opening_hours"][:60]
    if t.get("stars"): p["st"] = t["stars"]
    if t.get("start_date"): p["sd"] = t["start_date"]
    if t.get("heritage"): p["her"] = t.get("heritage:operator") or t["heritage"]
    if t.get("wikidata"): p["wd"] = t["wikidata"]
    key = (c, p["n"], round(x, 3), round(y, 3))
    if p["n"] and key in seen: return
    seen.add(key)
    pt = Point(x, y); p["i"] = (1 if munc.contains(pt) else 0) + (2 if munr.contains(pt) else 0)
    add.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(x, 6), round(y, 6)]}, "properties": p})
for n in S.nodes.values():
    if n.get("tags"): emit(n, n["lon"], n["lat"])
for w in S.ways.values():
    if w.get("tags") and cat(w["tags"]):
        g = S.way_polygon(w["id"]) or S.way_line(w["id"])
        if g is not None: c = g.representative_point() if g.geom_type != "LineString" else g.interpolate(0.5, normalized=True); emit(w, c.x, c.y)
for r in S.rels.values():
    if r.get("tags") and cat(r["tags"]) and r["tags"].get("type") == "multipolygon":
        g, _ = S.rel_polygon(r["id"]); g = polys_only(g)
        if g is not None: c = g.representative_point(); emit(r, c.x, c.y)
fc["features"] += add
json.dump(fc, open(os.path.join(D, "pois.geojson"), "w"), ensure_ascii=False, separators=(",", ":"))
from collections import Counter
print(Counter(f["properties"]["c"] for f in add), "inside:", Counter(f["properties"]["c"] for f in add if f["properties"]["i"] & 1))
json.dump(RO, open(os.path.join(RAW, "culture_ro.json"), "w"), ensure_ascii=False)
