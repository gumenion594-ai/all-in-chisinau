"""Build the three administrative levels + context localities + population.

Outputs web/data/admin.geojson with property `lvl` in {1,2,3,'ctx','mun'}.
"""
import json, os, sys, unicodedata, csv, math
from collections import defaultdict
from shapely.geometry import shape, mapping, Point, MultiPoint, box
from shapely.ops import unary_union, transform, voronoi_diagram
from shapely import set_precision
from pyproj import Transformer
from osmapi import get, API
from osmgeom import OSMStore, polys_only

ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "web", "data")
os.makedirs(OUT, exist_ok=True)

to_m = Transformer.from_crs(4326, 32635, always_xy=True).transform
to_ll = Transformer.from_crs(32635, 4326, always_xy=True).transform
P = lambda g: transform(to_m, g)
LL = lambda g: transform(to_ll, g)

MUN, CITY = 1691801, 1748490
SECTORS = {1813297: "Buiucani", 58512: "Centru", 1813306: "Botanica", 1813316: "Rîșcani", 1813315: "Ciocana"}


def norm(s):
    s = unicodedata.normalize("NFD", s or "").lower()
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.replace("ş", "s").replace("ţ", "t").replace("â", "i").replace("î", "i").strip()


area = json.load(open(os.path.join(RAW, "area.json")))["elements"]
store = OSMStore(area)

# ---------------------------------------------------------------- boundaries
adm = {rid: r for rid, r in store.rels.items() if r.get("tags", {}).get("boundary") == "administrative"
       and r["tags"].get("admin_level") in ("4", "7", "8", "9", "10")}
print("admin relations in area:", len(adm))
full = OSMStore()
geoms = {}
for rid, r in sorted(adm.items()):
    d = get(f"{API}/relation/{rid}/full.json", delay=1.0)
    if "error" in d:
        print("skip", rid, d); continue
    full.add(d["elements"])
    g, ok = full.rel_polygon(rid)
    g = polys_only(g)
    if g is None:
        print("no geom", rid, r["tags"].get("name")); continue
    geoms[rid] = P(g)

mun = geoms[MUN]
mun_area = mun.area
city = geoms[CITY]
tags = {rid: adm[rid]["tags"] for rid in geoms}


def nm(t):
    return t.get("name:ro") or t.get("name"), t.get("name:en") or t.get("name:ro") or t.get("name"), t.get("name:ru")


def inside_mun(g, thr=0.6):
    return g.intersection(mun).area / g.area > thr if g.area > 0 else False


# ---------- population (2024 census) from Wikidata export + Wikipedia table
pop24 = {}
for r in csv.DictReader(open(os.path.join(RAW, "wd_pops.csv"))):
    if r["date"].startswith("2024") and r["pop"]:
        pop24.setdefault(norm(r["itemLabel"]), int(float(r["pop"])))
# Commune / town totals (Wikipedia "Municipiul Chișinău" demography table, census 2024)
UNIT24 = {"chisinau": 567038, "durlesti": 26308, "codru": 18310, "singera": 12368, "stauceni": 11210,
          "cricova": 9536, "vadul lui voda": 4280, "vatra": 3391, "bacioi": 11663, "bubuieci": 11152,
          "truseni": 10937, "gratiesti": 7299, "ciorescu": 6714, "ghidighici": 5240, "budesti": 4425,
          "tohatin": 4045, "colonita": 3956, "cruzesti": 1709, "condrita": 547}
TOTAL24 = 720128
EST19 = 832865  # BNS usual-resident estimate, 2019 (pre-census, higher)
# City sector shares: Anuarul statistic al mun. Chișinău 2015 (BNS)
SECT_SHARE = {"Centru": 94800, "Buiucani": 112200, "Rîșcani": 139900, "Botanica": 172600, "Ciocana": 119300}

features = []
# Suburbs administered through each sector's pretura (Legea 136/2016; matches CUATM codes 011x..015x)
SUBURB_SECTOR = {
    "bacioi": "Botanica", "singera": "Botanica",
    "codru": "Centru",
    "durlesti": "Buiucani", "vatra": "Buiucani", "ghidighici": "Buiucani", "condrita": "Buiucani", "truseni": "Buiucani",
    "vadul lui voda": "Ciocana", "bubuieci": "Ciocana", "budesti": "Ciocana", "colonita": "Ciocana", "tohatin": "Ciocana", "cruzesti": "Ciocana",
    "cricova": "Rîșcani", "stauceni": "Rîșcani", "gratiesti": "Rîșcani", "ciorescu": "Rîșcani",
}


def feat(geom_m, props):
    g = LL(geom_m).simplify(0.00004, preserve_topology=True)
    g = set_precision(g, 0.00001)
    features.append({"type": "Feature", "properties": props, "geometry": mapping(g)})


# ---------- Level 1: sectors (full territory incl. suburbs)
sector_geom = {SECTORS[r]: geoms[r] for r in SECTORS}

# ---------- Level 2: units with own mayoralty + city split by sector
lvl8 = [rid for rid in geoms if tags[rid].get("admin_level") == "8" and rid != CITY]
units = []  # dicts with geom, name, sector, kind, popkey
for sname, sg in sector_geom.items():
    part = sg.intersection(city)
    part = polys_only(part)
    if part and part.area > 1e5:
        units.append(dict(geom=part, ro=f"Chișinău – sectorul {sname}", en=f"Chișinău – {sname} sector",
                          ru=None, sector=sname, kind="city", key="chisinau", rid=CITY))
inside8 = [rid for rid in lvl8 if inside_mun(geoms[rid])]
ctx8 = [rid for rid in lvl8 if rid not in inside8 and geoms[rid].intersects(mun.buffer(15000))]
for rid in inside8:
    g = geoms[rid].intersection(mun)
    ro, en, ru = nm(tags[rid])
    sec = SUBURB_SECTOR.get(norm(ro)) or max(sector_geom, key=lambda s: sector_geom[s].intersection(g).area)
    units.append(dict(geom=g, ro=ro, en=en, ru=ru, sector=sec, kind=tags[rid].get("place", "commune"),
                      key=norm(ro), rid=rid))
covered = unary_union([u["geom"] for u in units])
gap = mun.difference(covered)
print("level-2 coverage %.2f%%, gap %.2f km2" % (100 * covered.area / mun_area, gap.area / 1e6))
# Assign leftover slivers/gaps to the neighbouring unit with the longest shared border
if gap.area > 0:
    parts = list(getattr(gap, "geoms", [gap]))
    for p in parts:
        if p.area < 1:
            continue
        best = max(units, key=lambda u: u["geom"].buffer(1).intersection(p).area)
        best["geom"] = unary_union([best["geom"], p])
# remove overlaps: later units win nothing, city keeps priority
acc = None
for u in units:
    if acc is not None:
        u["geom"] = polys_only(u["geom"].difference(acc)) or u["geom"]
    acc = u["geom"] if acc is None else unary_union([acc, u["geom"]])

# ---------- Population of level-2
city_build = None
try:
    bw = json.load(open(os.path.join(RAW, "res_weights.json")))  # [lon, lat, weight]
except FileNotFoundError:
    bw = []
bpts = [(Point(to_m(x, y)), w) for x, y, w in bw]
share_sum = sum(SECT_SHARE.values())
for u in units:
    if u["kind"] == "city":
        u["pop"] = round(UNIT24["chisinau"] * SECT_SHARE[u["sector"]] / share_sum)
        u["pop_src"] = "Recensământ 2024 (oraș 567 038), împărțit pe sectoare după Anuarul BNS 2015"
    else:
        k = u["key"]
        if k in UNIT24:
            u["pop"] = UNIT24[k]; u["pop_src"] = "Recensământ 2024 (BNS)"
        else:
            u["pop"] = pop24.get(k); u["pop_src"] = "Recensământ 2024 (Wikidata)" if u["pop"] else "n/a"

# ---------- Level 3
place_nodes = [n for n in store.nodes.values() if n.get("tags", {}).get("place") in
               ("quarter", "neighbourhood", "suburb", "village", "hamlet", "town", "isolated_dwelling")]
lvl9 = {rid: geoms[rid] for rid in geoms if tags[rid].get("admin_level") in ("9", "10")
        and tags[rid].get("place") not in ("allotments",) and "allotments" not in tags[rid].get("name", "").lower()
        and not tags[rid].get("name", "").startswith("Î.P.")}


def partition(region, seeds):
    """Nearest-seed partition of region. seeds: list of (name_tuple, geometry_m)."""
    if len(seeds) == 1:
        return [(seeds[0][0], region)]
    pts, owner = [], []
    for i, (_, g) in enumerate(seeds):
        if g.geom_type == "Point":
            samp = [g]
        else:
            b = g.boundary
            L = b.length
            n = max(4, int(L / 150))
            samp = [b.interpolate(L * k / n) for k in range(n)] + [g.representative_point()]
        for s in samp:
            pts.append(s); owner.append(i)
    env = region.envelope.buffer(5000)
    vd = voronoi_diagram(MultiPoint(pts), envelope=env)
    cells = defaultdict(list)
    # map cells to points (shapely returns cells in arbitrary order) via spatial test
    from shapely.strtree import STRtree
    tree = STRtree(list(vd.geoms))
    for j, p in enumerate(pts):
        for idx in tree.query(p, predicate="intersects"):
            cells[owner[j]].append(vd.geoms[idx]); break
    out = []
    for i, (n, g) in enumerate(seeds):
        c = unary_union(cells[i]) if cells[i] else None
        if c is None:
            continue
        if g.geom_type != "Point":
            c = unary_union([c, g])
        out.append((n, c))
    # remove overlaps (polygon seeds may overlap neighbours' cells) and clip
    res, acc = [], None
    for n, c in sorted(out, key=lambda x: -seeds_area(x[0], seeds)):
        c = c.intersection(region)
        if acc is not None:
            c = c.difference(acc)
        c = polys_only(c)
        if c is None or c.area < 100:
            continue
        acc = c if acc is None else unary_union([acc, c])
        res.append((n, c))
    return res


def seeds_area(n, seeds):
    for nn, g in seeds:
        if nn == n:
            return g.area
    return 0


l3 = []
for u in units:
    reg = u["geom"]
    if u["kind"] == "city":
        seeds = []
        for nd in place_nodes:
            t = nd["tags"]
            if t["place"] not in ("quarter", "neighbourhood", "suburb"):
                continue
            pt = Point(to_m(nd["lon"], nd["lat"]))
            if reg.contains(pt):
                seeds.append(((t.get("name:ro") or t.get("name"), t.get("name:en") or t.get("name"), t.get("name:ru")), pt))
        # deduplicate by name
        d = {}
        for n, g in seeds:
            d.setdefault(norm(n[0]), (n, g))
        seeds = list(d.values())
        method = "aprox. (cea mai apropiată denumire OSM de cartier)"
    else:
        seeds = []
        for rid, g in lvl9.items():
            if g.intersection(reg).area > 0.5 * g.area:
                seeds.append((nm(tags[rid]), g))
        have = {norm(n[0]) for n, _ in seeds}
        for nd in place_nodes:
            t = nd["tags"]
            if t["place"] not in ("village", "town", "hamlet"):
                continue
            pt = Point(to_m(nd["lon"], nd["lat"]))
            if reg.contains(pt) and norm(t.get("name")) not in have:
                have.add(norm(t.get("name")))
                seeds.append(((t.get("name:ro") or t.get("name"), t.get("name:en") or t.get("name"), t.get("name:ru")), pt))
        method = "intravilan OSM + teren extravilan atribuit celei mai apropiate localități"
    if not seeds:
        seeds = [((u["ro"], u["en"], u["ru"]), reg.representative_point())]
    parts = partition(reg, seeds)
    for (ro, en, ru), g in parts:
        l3.append(dict(geom=g, ro=ro, en=en, ru=ru, parent=u, method=method if len(parts) > 1 else "limita UAT"))

# Population for level 3
for x in l3:
    u = x["parent"]
    k = norm(x["ro"])
    if u["kind"] != "city" and k in pop24 and len([y for y in l3 if y["parent"] is u]) > 1:
        x["pop"] = pop24[k]; x["pop_src"] = "Recensământ 2024 (Wikidata/BNS)"
# A town's census figure covers the whole unit; its own seat = unit total minus its other villages
for u in units:
    kids = [x for x in l3 if x["parent"] is u]
    if len(kids) > 1 and sum(x.get("pop", 0) for x in kids) > (u.get("pop") or 0):
        seat = [x for x in kids if norm(x["ro"]) == u["key"]]
        if seat:
            others = sum(x.get("pop", 0) for x in kids if x is not seat[0])
            seat[0]["pop"] = max(0, u["pop"] - others)
            seat[0]["pop_src"] = "Recensământ 2024: total UAT minus satele componente"
# distribute remaining population in each unit by residential floor-area weights
if bpts:
    from shapely.strtree import STRtree
    tree = STRtree([p for p, _ in bpts])
    wsum = {}
    for i, x in enumerate(l3):
        idx = tree.query(x["geom"], predicate="contains")
        wsum[i] = sum(bpts[j][1] for j in idx)
else:
    wsum = {i: x["geom"].area for i, x in enumerate(l3)}
for u in units:
    kids = [i for i, x in enumerate(l3) if x["parent"] is u]
    known = sum(l3[i].get("pop", 0) for i in kids)
    rest = [i for i in kids if "pop" not in l3[i]]
    remaining = max(0, (u.get("pop") or 0) - known)
    tw = sum(wsum[i] for i in rest) or 1
    for i in rest:
        l3[i]["pop"] = round(remaining * wsum[i] / tw)
        l3[i]["pop_src"] = ("estimare: populația unității repartizată după suprafața locuibilă a clădirilor (OSM)"
                            if len(kids) > 1 else u.get("pop_src"))

# ---------- emit
fid = [0]


def emit(lvl, g, ro, en, ru, pop, src, extra=None):
    fid[0] += 1
    props = {"id": fid[0], "lvl": lvl, "ro": ro, "en": en or ro, "ru": ru, "pop": pop, "src": src,
             "km2": round(g.area / 1e6, 2), "dens": round(pop / (g.area / 1e6)) if pop and g.area else None}
    props.update(extra or {})
    lp = LL(g.buffer(-30) if g.buffer(-30).area > 0 else g)
    from shapely.ops import polylabel
    big = max(getattr(lp, "geoms", [lp]), key=lambda x: x.area)
    try:
        c = polylabel(big, 0.0005)
    except Exception:
        c = big.representative_point()
    props["lx"], props["ly"] = round(c.x, 5), round(c.y, 5)
    feat(g, props)


sector_full = {sname: unary_union([u["geom"] for u in units if u["sector"] == sname]) for sname in sector_geom}
emit("mun", mun, "Municipiul Chișinău", "Chișinău Municipality", "Муниципий Кишинэу", TOTAL24, "Recensământ 2024 (BNS)")
for s, g in sector_full.items():
    pop = sum(u["pop"] or 0 for u in units if u["sector"] == s)
    emit(1, g, f"Sectorul {s}", f"{s} sector".replace("Rîșcani", "Rîșcani"), None, pop,
         "suma unităților de nivel 2 (Recensământ 2024)", {"sector": s})
for u in units:
    emit(2, u["geom"], u["ro"], u["en"], u["ru"], u["pop"], u["pop_src"], {"sector": u["sector"], "kind": u["kind"]})
for x in l3:
    emit(3, x["geom"], x["ro"], x["en"], x["ru"], x["pop"], x["pop_src"],
         {"sector": x["parent"]["sector"], "unit": x["parent"]["ro"], "method": x["method"]})
for rid in ctx8:
    ro, en, ru = nm(tags[rid])
    emit("ctx", geoms[rid], ro, en, ru, None, None, {"kind": tags[rid].get("place")})

json.dump({"type": "FeatureCollection", "features": features,
           "meta": {"total24": TOTAL24, "est19": EST19}},
          open(os.path.join(OUT, "admin.geojson"), "w"), ensure_ascii=False, separators=(",", ":"))
from collections import Counter
print(Counter(f["properties"]["lvl"] for f in features))
print("sum L2 pop", sum(u["pop"] or 0 for u in units), "sum L3", sum(x["pop"] for x in l3))
for u in units:
    kids = [x for x in l3 if x["parent"] is u]
    print(f'  {u["ro"]:40s} {u["sector"]:9s} {u["pop"]:>7} L3={sum(x["pop"] for x in kids):>7} ' + ", ".join(f'{x["ro"]}:{x["pop"]}' for x in kids)[:200])
