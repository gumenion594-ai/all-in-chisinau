"""Fill residential land use where OSM has none: buffer residential buildings (OSM + Microsoft footprints),
close small gaps, keep only what no other land-use polygon already covers. Writes web/data/landuse.geojson in place."""
import json, os
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union
from shapely import affinity, set_precision
from shapely.strtree import STRtree
ROOT = os.path.join(os.path.dirname(__file__), "..")
D = os.path.join(ROOT, "web", "data")
lu = json.load(open(os.path.join(D, "landuse.geojson")))
lu["features"] = [f for f in lu["features"] if not f["properties"].get("inf")]
K = 0.682  # cos(47°): squash longitude so buffers are round
iso = lambda g: affinity.scale(g, xfact=K, yfact=1, origin=(0, 0))
back = lambda g: affinity.scale(g, xfact=1 / K, yfact=1, origin=(0, 0))
RES = {"apartments", "residential", "house", "detached", "semidetached_house", "dormitory", "terrace", "bungalow"}
blds = []
for n in ("buildings_a.geojson", "buildings_b.geojson"):
    for f in json.load(open(os.path.join(D, n)))["features"]:
        p = f["properties"]
        if p["t"] in RES or (p["t"] == "yes" and p["h"] >= 9):
            blds.append(shape(f["geometry"]))
msb = os.path.join(ROOT, "data", "raw", "msb_add.json")
if os.path.exists(msb):
    for h, ring in json.load(open(msb)):
        g = shape({"type": "Polygon", "coordinates": [ring]})
        if g.area * 111320 * K * 110574 >= 35: blds.append(g)
print("residential buildings", len(blds))
other = [iso(shape(f["geometry"])) for f in lu["features"] if not f["properties"].get("inf")]
otree = STRtree(other)
out = []
W, S, E, N = 28.50, 46.82, 29.22, 47.23
step = 0.04
x = W
while x < E:
    y = S
    while y < N:
        cell = box(x, y, x + step, y + step)
        bs = [iso(b) for b in blds if b.intersects(cell) and cell.contains(b.centroid)]
        if bs:
            g = unary_union([b.buffer(0.00045) for b in bs]).buffer(-0.00027)   # ~50 m out, ~30 m back (closes yards between blocks)
            g = g.intersection(iso(cell))
            near = [other[i] for i in otree.query(g)]
            if near: g = g.difference(unary_union(near))
            g = g.buffer(0)
            for p in getattr(g, "geoms", [g]):
                if p.geom_type == "Polygon" and p.area > 2.5e-8:
                    pp = set_precision(back(p).simplify(0.00003, preserve_topology=True), 0.00001)
                    if not pp.is_empty: out.append({"type": "Feature", "properties": {"z": "residential", "inf": 1}, "geometry": mapping(pp)})
        y += step
    x += step
print("inferred residential polygons", len(out))
lu["features"] = out + lu["features"]
lu["inferred"] = True
json.dump(lu, open(os.path.join(D, "landuse.geojson"), "w"), separators=(",", ":"))
print(round(os.path.getsize(os.path.join(D, "landuse.geojson")) / 1e6, 1), "MB")
