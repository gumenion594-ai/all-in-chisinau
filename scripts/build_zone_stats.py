"""Area of each land-use category inside the municipality (current and 2027 borders)."""
import json, os
from shapely.geometry import shape
from shapely.ops import transform
from shapely.strtree import STRtree
from pyproj import Transformer
ROOT = os.path.join(os.path.dirname(__file__), "..")
D = os.path.join(ROOT, "web", "data")
tm = Transformer.from_crs(4326, 32635, always_xy=True).transform
adm = json.load(open(os.path.join(D, "admin.geojson")))["features"]
lu = json.load(open(os.path.join(D, "landuse.geojson")))["features"]
G = [transform(tm, shape(f["geometry"])) for f in lu]
Z = [f["properties"]["z"] for f in lu]
tree = STRtree(G)
out = {}
for sc in ("cur", "ref"):
    mun = transform(tm, shape(next(f for f in adm if f["properties"]["lvl"] == "mun" and f["properties"]["sc"] == sc)["geometry"]))
    tot = mun.area / 1e6
    res = {}
    for i in tree.query(mun):
        a = G[i].intersection(mun).area / 1e6
        if a: res[Z[i]] = res.get(Z[i], 0) + a
    res["other"] = max(0.0, tot - sum(res.values()))
    out[sc] = {"total": round(tot, 2), "z": {k: round(v, 2) for k, v in res.items()}}
    print(sc, round(tot, 1), {k: round(v, 1) for k, v in sorted(res.items(), key=lambda x: -x[1])})
json.dump(out, open(os.path.join(D, "zone_stats.json"), "w"))
