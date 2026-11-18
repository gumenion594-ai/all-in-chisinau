"""Built-up areas: every building (OSM + Microsoft footprints) plus its immediate surroundings,
merged into continuous zones. Also counts buildings and built-up area inside the municipality."""
import json, os
from shapely.geometry import shape, mapping, box, Point
from shapely.ops import unary_union, transform
from shapely import affinity, set_precision
from shapely.prepared import prep
from pyproj import Transformer
ROOT = os.path.join(os.path.dirname(__file__), "..")
D = os.path.join(ROOT, "web", "data"); RAW = os.path.join(ROOT, "data", "raw")
K = 0.682
iso = lambda g: affinity.scale(g, xfact=K, yfact=1, origin=(0, 0))
back = lambda g: affinity.scale(g, xfact=1 / K, yfact=1, origin=(0, 0))
blds = []
for n in ("buildings_a.geojson", "buildings_b.geojson"):
    blds += [shape(f["geometry"]) for f in json.load(open(os.path.join(D, n)))["features"]]
for h, ring in json.load(open(os.path.join(RAW, "msb_add.json"))):
    blds.append(shape({"type": "Polygon", "coordinates": [ring]}))
print("buildings", len(blds))
cents = [b.centroid for b in blds]
out, allg = [], []
W, S, E, N = 28.50, 46.82, 29.22, 47.23
step = 0.04
x = W
while x < E:
    y = S
    while y < N:
        cell = box(x, y, x + step, y + step)
        bs = [iso(b) for b, c in zip(blds, cents) if W <= c.x and x <= c.x < x + step and y <= c.y < y + step]
        if bs:
            g = unary_union([b.buffer(0.00036) for b in bs]).buffer(-0.00018)   # ~40 m out, ~20 m back: building + yard
            g = g.intersection(iso(cell)).buffer(0)
            g = back(g)
            allg.append(g)
            for p in getattr(g, "geoms", [g]):
                if p.geom_type == "Polygon" and p.area > 1.5e-8:
                    pp = set_precision(p.simplify(0.00003, preserve_topology=True), 0.00001)
                    if not pp.is_empty: out.append({"type": "Feature", "properties": {}, "geometry": mapping(pp)})
        y += step
    x += step
json.dump({"type": "FeatureCollection", "features": out}, open(os.path.join(D, "builtup.geojson"), "w"), separators=(",", ":"))
print("built-up polygons", len(out), round(os.path.getsize(os.path.join(D, "builtup.geojson")) / 1e6, 1), "MB")
tm = Transformer.from_crs(4326, 32635, always_xy=True).transform
built = transform(tm, unary_union(allg).buffer(0))
adm = json.load(open(os.path.join(D, "admin.geojson")))["features"]
zs = json.load(open(os.path.join(D, "zone_stats.json")))
for sc in ("cur", "ref"):
    mg = shape(next(f for f in adm if f["properties"]["lvl"] == "mun" and f["properties"]["sc"] == sc)["geometry"])
    pm = prep(mg)
    n = sum(1 for c in cents if pm.contains(c))
    a = built.intersection(transform(tm, mg)).area / 1e6
    zs[sc]["built_km2"] = round(a, 2); zs[sc]["buildings"] = n
    print(sc, "built-up km2", round(a, 1), "buildings", n)
json.dump(zs, open(os.path.join(D, "zone_stats.json"), "w"))
