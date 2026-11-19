"""Estimate jobs (workplaces) on the same 150 m grid as the population map.

There is no official employment data by neighbourhood, so jobs are modelled from:
  1. non-residential buildings: floor area (footprint × floors) ÷ typical m² per worker for the building type;
     untagged buildings inside industrial / commercial / public / transport land use count as that use;
  2. places from OpenStreetMap (shops, cafés, firms, schools, clinics…) with typical staff numbers, which
     catch small workplaces on the ground floor of apartment blocks;
  3. the total inside the municipality is scaled to TARGET (order of magnitude of employment in Chișinău).
"""
import json, os, math
from shapely.geometry import shape, Point
from shapely.strtree import STRtree

ROOT = os.path.join(os.path.dirname(__file__), "..")
D = os.path.join(ROOT, "web", "data")
TARGET = 350_000
CELL = 0.0015; CX = CELL * 1.46

M2_PER_JOB = {"office": 18, "commercial": 35, "retail": 40, "store": 40, "industrial": 90, "warehouse": 200, "service": 60,
              "school": 110, "kindergarten": 80, "hospital": 35, "university": 70, "college": 90, "public": 30, "government": 25,
              "hotel": 50, "train_station": 60, "hangar": 150}
# job classes: i industry & logistics, c retail, food & services, o offices & public administration, e education, s health, t transport
B_CLASS = {"industrial": "i", "warehouse": "i", "hangar": "i", "office": "o", "public": "o", "government": "o", "commercial": "c", "retail": "c", "store": "c",
           "service": "c", "hotel": "c", "school": "e", "kindergarten": "e", "university": "e", "college": "e", "hospital": "s", "train_station": "t"}
Z_CLASS = {"industrial": "i", "commercial": "c", "public": "o", "transport": "t", "military": "o"}
def poi_class(c, k):
    if c in ("health", "pharmacy"): return "s"
    if c in ("school", "kindergarten", "college", "university"): return "e"
    if c == "gov" or k in ("company", "it", "notary", "lawyer", "insurance", "estate_agent", "bank"): return "o"
    return "c"
CLS = "icoest"
ZONE_M2 = {"industrial": 120, "commercial": 40, "public": 45, "transport": 90, "military": 200}
POI_JOBS = {"supermarket": 25, "convenience": 3, "mall": 250, "department_store": 120, "restaurant": 10, "bar": 6, "pub": 6, "fast_food": 8,
            "cafe": 5, "bank": 12, "fuel": 6, "company": 15, "it": 20, "pharmacy": 3, "clinic": 25, "dentist": 5, "doctors": 8, "hospital": 150,
            "townhall": 30, "police": 40, "government": 40, "courthouse": 60, "school": 70, "kindergarten": 25, "college": 60, "university": 300,
            "hotel": 25, "guest_house": 4, "hostel": 4, "museum": 15, "theatre": 40, "marketplace": 60, "post_office": 8, "car_repair": 5,
            "hairdresser": 3, "beauty": 3, "fitness_centre": 6, "notary": 4, "lawyer": 4, "insurance": 6, "estate_agent": 4}
POI_CAT = {"shop": 3, "food": 8, "cafe": 5, "business": 6, "health": 10, "pharmacy": 3, "gov": 30, "school": 70, "kindergarten": 25,
           "college": 60, "university": 300, "hotel": 20, "mall": 250, "museum": 15, "religion": 2, "park": 1, "monument": 0}

lu = json.load(open(os.path.join(D, "landuse.geojson")))["features"]
lu_g = [shape(f["geometry"]) for f in lu]; lu_z = [f["properties"]["z"] for f in lu]
tree = STRtree(lu_g)
def zone_at(x, y):
    p = Point(x, y)
    for i in tree.query(p):
        if lu_g[i].contains(p): return lu_z[i]
    return None

def area_m2(ring):
    lat = ring[0][1]; kx = 111320 * math.cos(math.radians(lat)); ky = 110574
    s = 0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]): s += x1 * y2 - x2 * y1
    return abs(s) / 2 * kx * ky

key = lambda x, y: (int(x / CX), int(y / CELL))
bld, poi = {}, {}
for fn in ("buildings_a.geojson", "buildings_b.geojson"):
    for f in json.load(open(os.path.join(D, fn)))["features"]:
        p = f["properties"]; t = p.get("t") or "yes"
        g = f["geometry"]; ring = g["coordinates"][0] if g["type"] == "Polygon" else g["coordinates"][0][0]
        cx = sum(c[0] for c in ring[:-1]) / max(1, len(ring) - 1); cy = sum(c[1] for c in ring[:-1]) / max(1, len(ring) - 1)
        m2 = M2_PER_JOB.get(t); cl = B_CLASS.get(t)
        if m2 is None and t in ("yes", "construction", "roof"):
            if t != "yes": continue
            z = zone_at(cx, cy); m2 = ZONE_M2.get(z); cl = Z_CLASS.get(z)
        if not m2: continue
        floors = max(1, round((p.get("h") or 3) / 3.3))
        jobs = area_m2(ring) * floors * 0.8 / m2   # 80% of gross floor area is usable
        k = key(cx, cy); d = bld.setdefault(k, dict.fromkeys(CLS, 0.0)); d[cl] += jobs

for f in json.load(open(os.path.join(D, "pois.geojson")))["features"]:
    p = f["properties"]; x, y = f["geometry"]["coordinates"]
    j = POI_JOBS.get(p.get("k"), POI_CAT.get(p.get("c"), 0))
    if j: k = key(x, y); d = poi.setdefault(k, dict.fromkeys(CLS, 0.0)); d[poi_class(p.get("c"), p.get("k"))] += j

cells, bycls = {}, {}
Z0 = dict.fromkeys(CLS, 0.0)
for k in set(bld) | set(poi):
    b, q = bld.get(k, Z0), poi.get(k, Z0)
    f = 0.6 if sum(b.values()) > 0 else 1.0   # places inside counted buildings overlap with them
    bycls[k] = {c: b[c] + q[c] * f for c in CLS}; cells[k] = sum(bycls[k].values())

# scale to the municipality total
mun = [f for f in json.load(open(os.path.join(D, "admin.geojson")))["features"] if f["properties"]["lvl"] == "mun" and f["properties"].get("sc") in ("cur", "both")][0]
mg = shape(mun["geometry"]).buffer(0)
inside = sum(v for (kx, ky), v in cells.items() if mg.contains(Point((kx + .5) * CX, (ky + .5) * CELL)))
s = TARGET / inside
grid = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [round((kx + .5) * CX, 5), round((ky + .5) * CELL, 5)]},
         "properties": {"p": round(v * s, 1), **{c: round(bycls[(kx, ky)][c] * s, 1) for c in CLS if bycls[(kx, ky)][c] * s >= 0.05},
                        "d": max(CLS, key=lambda c: bycls[(kx, ky)][c])}} for (kx, ky), v in cells.items() if v * s >= 0.5]
json.dump({"type": "FeatureCollection", "meta": {"target": TARGET, "raw_inside": round(inside), "scale": round(s, 3)}, "features": grid},
          open(os.path.join(D, "jobgrid.geojson"), "w"), separators=(",", ":"))
tot = {c: round(sum(f["properties"].get(c, 0) for f in grid)) for c in CLS}
print("by class", tot)
print("job cells", len(grid), "raw inside", round(inside), "scale", round(s, 3), "max cell", round(max(f["properties"]["p"] for f in grid)))
