"""Outlines of other cities for the size comparison: stored as offsets in metres from their centroid
(equal-area projection), so the browser can place them anywhere at true scale."""
import json, os
from pyproj import Transformer
from shapely.ops import transform
from shapely.geometry import mapping
from osmapi import get, API
from osmgeom import OSMStore, polys_only
OUT = os.path.join(os.path.dirname(__file__), "..", "web", "data", "compare.json")
CITIES = [("nyc", 175905, "New York City", "New York City"), ("manhattan", 8398124, "Manhattan", "Manhattan"),
          ("berlin", 62422, "Berlin", "Berlin"), ("barcelona", 347950, "Barcelona", "Barcelona"),
          ("bucuresti", 377733, "București", "Bucharest"), ("iasi", 1207838, "Iași", "Iași"), ("balti", 58983, "Municipiul Bălți", "Bălți Municipality"),
          ("stuttgart", 62375, "Stuttgart", "Stuttgart"), ("heilbronn", 62751, "Heilbronn", "Heilbronn")]
# NYC and Manhattan: official borough boundaries clipped to the shoreline (NYC Planning "nybb", via github.com/dwillis/nyc-maps)
from shapely.geometry import shape as _shape
from shapely.ops import unary_union as _uu
NYBB = {f["properties"]["BoroName"]: _shape(f["geometry"]).buffer(0) for f in json.load(open("/home/user/ext2/nyc-maps/boroughs.geojson"))["features"]}
LAND = {"nyc": _uu(list(NYBB.values())), "manhattan": NYBB["Manhattan"]}
out = []
for key, rid, ro, en in CITIES:
    if key in LAND:
        g, ok = LAND[key], True
    else:
        d = get(f"{API}/relation/{rid}/full.json", delay=1.0)
        st = OSMStore(d["elements"]); g, ok = st.rel_polygon(rid); g = polys_only(g)
    c = g.centroid
    laea = Transformer.from_crs(4326, f"+proj=laea +lat_0={c.y} +lon_0={c.x} +units=m", always_xy=True).transform
    gm = transform(laea, g).buffer(0)
    tol = max(15, (gm.area ** 0.5) / 400)
    gs = gm.simplify(tol, preserve_topology=True)
    polys = [p for p in getattr(gs, "geoms", [gs]) if p.area > gm.area * 0.0005]
    coords = [[[[round(x), round(y)] for x, y in p.exterior.coords]] + [[[round(x), round(y)] for x, y in r.coords] for r in p.interiors if abs(_a := 0) >= 0] for p in polys]
    out.append({"k": key, "ro": ro, "en": en, "km2": round(gm.area / 1e6, 1), "poly": coords})
    print(key, ok, round(gm.area / 1e6, 1), "km2", len(polys), "parts", sum(len(r) for p in coords for r in p), "pts")
json.dump(out, open(OUT, "w"), separators=(",", ":"))
print(round(os.path.getsize(OUT) / 1e3), "kB")
