"""Shrink layers for the web: dissolve land use per category, drop service roads,
flag major road projects, then assemble dist/ (single-file HTML + data/)."""
import json, os, shutil, datetime
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union
from shapely import set_precision

ROOT = os.path.join(os.path.dirname(__file__), "..")
D = os.path.join(ROOT, "web", "data")
DIST = os.path.join(ROOT, "dist")


def rw(name, fn):
    p = os.path.join(D, name)
    fc = json.load(open(p))
    fc = fn(fc) or fc
    json.dump(fc, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
    print(name, len(fc["features"]), f"{os.path.getsize(p)/1e6:.1f} MB")


# --- land use: dissolve by category (higher categories cut lower ones so colours don't stack)
def landuse(fc):
    if fc.get("dissolved"):
        return fc
    by = {}
    for f in fc["features"]:
        by.setdefault((f["properties"]["o"], f["properties"]["z"]), []).append(shape(f["geometry"]).buffer(0))
    out, acc = [], None
    for (o, z), gs in sorted(by.items(), reverse=True):  # top-most first
        g = unary_union([x for x in gs if x.area > 4e-9])
        if acc is not None:
            g = g.difference(acc)
        acc = g if acc is None else unary_union([acc, g])
        g = g.simplify(0.00003, preserve_topology=True).buffer(0)
        try:
            g = set_precision(g, 0.00001)
        except Exception:
            pass
        parts = [p for p in getattr(g, "geoms", [g]) if p.geom_type == "Polygon" and p.area > 3e-9]
        for p in parts:
            out.append({"type": "Feature", "properties": {"z": z}, "geometry": mapping(p)})
    out.sort(key=lambda f: f["properties"]["z"])
    return {"type": "FeatureCollection", "dissolved": True, "features": out}


rw("landuse.geojson", landuse)
rw("roads.geojson", lambda fc: {"type": "FeatureCollection", "features": [f for f in fc["features"] if f["properties"]["c"] not in ("service",)]})

# --- road projects
NOTES = {
    "Bulevardul Mircea cel Bătrân": "Prelungirea bd. Mircea cel Bătrân (proiect municipal în desfășurare).",
    "Centura Chișinăului": "Drumul de centură al Chișinăului (proiect de stat, planificat).",
    "Sectorul de extindere a Bulevardului Dimitrie Cantemir": "Prelungirea bd. Dimitrie Cantemir (PUG).",
    "Sectorul de extindere a Bulevardului Cuza Vodă": "Prelungirea bd. Cuza Vodă (PUG).",
    "Strada Bucovina": "Prelungirea str. Bucovina (planificat).",
}
fc = json.load(open(os.path.join(D, "projects_osm.geojson")))
for f in fc["features"]:
    p = f["properties"]
    major = p.get("c") in ("trunk", "primary", "secondary", "primary_link", "trunk_link", "secondary_link", "tertiary") or p.get("n") in NOTES
    p["major"] = 1 if major else 0
    if p.get("n") in NOTES:
        p["note"] = NOTES[p["n"]]
json.dump(fc, open(os.path.join(D, "projects.geojson"), "w"), ensure_ascii=False, separators=(",", ":"))
print("projects", len(fc["features"]), sum(f["properties"]["major"] for f in fc["features"]), "major")

# --- assemble dist
os.makedirs(os.path.join(DIST, "data"), exist_ok=True)
tpl = open(os.path.join(ROOT, "web", "index.template.html")).read()
css = open(os.path.join(ROOT, "node_modules", "maplibre-gl", "dist", "maplibre-gl.css")).read()
# Russian: T.ru + RUX pairs + third argument injected into every L("ro", "en") call that has a translation
import sys as _sys; _sys.path.insert(0, os.path.dirname(__file__))
from i18n_extract import calls as _calls
I18N = os.path.join(ROOT, "i18n")
RU_L = json.load(open(os.path.join(I18N, "ru_l.json")))
RU_P = json.load(open(os.path.join(I18N, "ru_pairs.json")))
def add_ru(src):
    ins = [(b1, RU_L[ro]) for st, en, ro, e, b1 in _calls(src) if ro in RU_L]
    for pos, ru in sorted(ins, reverse=True): src = src[:pos] + ", " + ru + src[pos:]
    return src
parts = [add_ru(open(os.path.join(ROOT, "web", n)).read()) for n in ("projects.js", "nb.js", "shell.js", "shell2.js", "shell3.js")]
parts.insert(1, open(os.path.join(I18N, "t_ru.js")).read() + "\nObject.assign(RUX, " + json.dumps(RU_P, ensure_ascii=False) + ");")
js = add_ru(open(os.path.join(ROOT, "web", "app.js")).read()).replace("/*__PROJECTS_JS__*/", "\n".join(parts))
html = tpl.replace("/*__MAPLIBRE_CSS__*/", css).replace("/*__APP_JS__*/", js).replace("__DATE__", datetime.date.today().isoformat())
open(os.path.join(DIST, "index.html"), "w").write(html)
for n in ["admin.geojson", "landuse.geojson", "base.geojson", "roads.geojson", "rail.geojson", "train.geojson", "bike.geojson",
          "projects.geojson", "transit_lines.geojson", "stops.geojson", "routes.json", "buildings_a.geojson", "buildings_b.geojson",
          "pois.geojson", "photos.json", "pts.json", "ring.geojson", "popgrid.geojson", "zone_stats.json", "builtup.geojson", "temp.json", "agegrid.geojson", "compare.json", "sat_a.bin", "sat_b.bin", "dem.bin", "relief.bin", "elev.bin"]:
    src = os.path.join(D, n)
    if os.path.exists(src):
        shutil.copy(src, os.path.join(DIST, "data", n))
        print(f"  dist/data/{n} {os.path.getsize(src)/1e6:.1f} MB")
print("dist/index.html", f"{os.path.getsize(os.path.join(DIST, 'index.html'))/1e3:.0f} kB")

# --- compact buildings: [h, x0, y0, dx, dy, ...] in 1e-5 degree integers relative to (28.5, 46.8); outer ring only
AGEF = os.path.join(ROOT, "data", "raw", "bld_age.json")
AGE = json.load(open(AGEF))["cls"] if os.path.exists(AGEF) else None
IDX = [0]
def nxt():
    i = IDX[0]; IDX[0] += 1
    return AGE[i] if AGE else 0
def pack(name_in):
    fc = json.load(open(os.path.join(D, name_in)))
    out = []
    for f in fc["features"]:
        age = nxt()
        g = f["geometry"]
        ring = g["coordinates"][0] if g["type"] == "Polygon" else g["coordinates"][0][0]
        if f["properties"]["t"] in ("shed", "garage", "garages", "hut", "roof", "carport") and f["properties"]["e"]:
            continue
        pts = [(round((x - 28.5) * 1e5), round((y - 46.8) * 1e5)) for x, y in ring[:-1]]
        if len(pts) < 3:
            continue
        arr = [round(f["properties"]["h"]) * 16 + age, pts[0][0], pts[0][1]]
        for (a, b), (c, d) in zip(pts, pts[1:]):
            arr += [c - a, d - b]
        out.append(arr)
    return out
allb = pack("buildings_a.geojson") + pack("buildings_b.geojson")
msb = os.path.join(ROOT, "data", "raw", "msb_add.json")
if os.path.exists(msb):
    for h, ring in json.load(open(msb)):
        age = nxt()
        pts = [(round((x - 28.5) * 1e5), round((y - 46.8) * 1e5)) for x, y in ring[:-1]]
        if len(pts) < 3: continue
        arr = [round(h) * 16 + age, pts[0][0], pts[0][1]]
        for (a, b), (c, d) in zip(pts, pts[1:]): arr += [c - a, d - b]
        allb.append(arr)
third = len(allb) // 3 + 1
for i, chunk in enumerate((allb[:third], allb[third:2 * third], allb[2 * third:])):
    p = os.path.join(DIST, "data", f"bld{i}.json")
    json.dump(chunk, open(p, "w"), separators=(",", ":"))
    print(p, len(chunk), f"{os.path.getsize(p)/1e6:.1f} MB")
for n in ("buildings_a.geojson", "buildings_b.geojson"):
    try: os.remove(os.path.join(DIST, "data", n))
    except FileNotFoundError: pass

# --- artifacts only serve text/media types: wrap binary packs as base64 JSON
import base64
for n in ("sat_a", "sat_b", "dem", "relief", "elev"):
    src = os.path.join(DIST, "data", n + ".bin")
    if os.path.exists(src):
        json.dump({"b64": base64.b64encode(open(src, "rb").read()).decode()}, open(os.path.join(DIST, "data", n + ".bin.json"), "w"))
        os.remove(src)
        print(n, round(os.path.getsize(os.path.join(DIST, "data", n + ".bin.json")) / 1e6, 1), "MB")

# temperature maps
tsrc = os.path.join(D, "temp")
if os.path.isdir(tsrc):
    tdst = os.path.join(DIST, "data", "temp")
    if os.path.isdir(tdst): shutil.rmtree(tdst)
    shutil.copytree(tsrc, tdst)
    print("temp maps", len(os.listdir(tdst)))
# ship stations only (raw stop points stay in web/data for rebuilding)
_p = os.path.join(DIST, "data", "stops.geojson"); _d = json.load(open(_p)); _d.pop("raw_features", None)
json.dump(_d, open(_p, "w"), ensure_ascii=False, separators=(",", ":"))
