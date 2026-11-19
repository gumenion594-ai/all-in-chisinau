"""Administrative levels 1-3 for two scenarios + neighbouring localities + population.

Scenarios (feature property `sc`): "cur" = today's borders, "ref" = after the 2027 amalgamation
(decisions adopted July–August 2026, list on alegeri.md), "both" = identical in the two.
Population: 2024 census (BNS) everywhere; sub-units are allocated with the largest-remainder
method so that every level sums exactly to its parent.

Outputs: web/data/admin.geojson, data/raw/pts.json (building points with population).
"""
import json, os, unicodedata, csv, re
from collections import defaultdict
from shapely.geometry import mapping, Point, MultiPoint, shape
from shapely.ops import unary_union, transform, voronoi_diagram, polylabel
from shapely.strtree import STRtree
from shapely import set_precision
from pyproj import Transformer
from osmapi import get, API
from osmgeom import OSMStore, polys_only

ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "web", "data")
to_m = Transformer.from_crs(4326, 32635, always_xy=True).transform
to_ll = Transformer.from_crs(32635, 4326, always_xy=True).transform
P = lambda g: transform(to_m, g)
LL = lambda g: transform(to_ll, g)

MUN, CITY = 1691801, 1748490
SECTORS = {1813297: "Buiucani", 58512: "Centru", 1813306: "Botanica", 1813316: "Rîșcani", 1813315: "Ciocana"}
REFORM = {  # cluster seat (inside municipality) -> communes joining from neighbouring raions
    "bubuieci": [19090940, 19090924],          # Floreni, Maximovca (Anenii Noi)
    "budesti": [19090925, 19090933],           # Bălțata, Cimișeni (Criuleni)  (+ Cruzești from the municipality)
    "ciorescu": [19090918, 19090948],          # Hrușova, Zăicana (Criuleni)
}
REFORM_ABSORB = {"cruzesti": "budesti"}       # municipal commune merging into another municipal cluster
SUBURB_SECTOR = {
    "bacioi": "Botanica", "singera": "Botanica", "codru": "Centru",
    "durlesti": "Buiucani", "vatra": "Buiucani", "ghidighici": "Buiucani", "condrita": "Buiucani", "truseni": "Buiucani",
    "vadul lui voda": "Ciocana", "bubuieci": "Ciocana", "budesti": "Ciocana", "colonita": "Ciocana", "tohatin": "Ciocana", "cruzesti": "Ciocana",
    "cricova": "Rîșcani", "stauceni": "Rîșcani", "gratiesti": "Rîșcani", "ciorescu": "Rîșcani",
}
UNIT24 = {"chisinau": 567038, "durlesti": 26308, "codru": 18310, "singera": 12368, "stauceni": 11210,
          "cricova": 9536, "vadul lui voda": 4280, "vatra": 3391, "bacioi": 11663, "bubuieci": 11152,
          "truseni": 10937, "gratiesti": 7299, "ciorescu": 6714, "ghidighici": 5240, "budesti": 4425,
          "tohatin": 4045, "colonita": 3956, "cruzesti": 1709, "condrita": 547}
SECT_SHARE = {"Centru": 94800, "Buiucani": 112200, "Rîșcani": 139900, "Botanica": 172600, "Ciocana": 119300}


def norm(s):
    s = unicodedata.normalize("NFD", s or "").lower()
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s.replace("-", " ")).strip()


def alloc(total, weights):
    """Largest-remainder split of an integer total by weights -> ints summing exactly to total."""
    total = int(total)
    sw = sum(weights)
    if total <= 0: return [0] * len(weights)
    if sw <= 0: weights, sw = [1] * len(weights), len(weights)
    raw = [total * w / sw for w in weights]
    out = [int(r) for r in raw]
    rest = total - sum(out)
    for i in sorted(range(len(raw)), key=lambda i: -(raw[i] - out[i]))[:rest]:
        out[i] += 1
    return out


# ------------------------------------------------------------------ OSM
els = json.load(open(os.path.join(RAW, "area.json")))["elements"]
for x in ("extra_e.json", "extra_n.json"):
    els += json.load(open(os.path.join(RAW, x)))["elements"]
store = OSMStore(els)
adm = {rid: r["tags"] for rid, r in store.rels.items() if r.get("tags", {}).get("boundary") == "administrative"
       and r["tags"].get("admin_level") in ("4", "7", "8", "9", "10")}
for rids in REFORM.values():
    for rid in rids:
        adm.setdefault(rid, get(f"{API}/relation/{rid}.json")["elements"][0]["tags"])
full = OSMStore()
geoms = {}
for rid in sorted(adm):
    d = get(f"{API}/relation/{rid}/full.json", delay=1.0)
    if "error" in d: continue
    full.add(d["elements"])
    g, _ = full.rel_polygon(rid)
    g = polys_only(g)
    if g is not None and g.area > 0:
        geoms[rid] = P(g).buffer(0)
tags = {rid: adm[rid] for rid in geoms}
mun = geoms[MUN]; city = geoms[CITY]
nm = lambda t: (t.get("name:ro") or t.get("name"), t.get("name:en") or t.get("name:ro") or t.get("name"), t.get("name:ru"))

# ------------------------------------------------------------------ census lookups
pop24 = defaultdict(list)  # norm name -> [(pop, point_m)]
for r in csv.DictReader(open(os.path.join(RAW, "wd_area_pops.csv"))):
    if r["date"].startswith("2024") and r["pop"]:
        m = re.match(r"Point\(([\d.]+) ([\d.]+)\)", r["coord"])
        if m:
            pop24[norm(r["itemLabel"])].append((int(float(r["pop"])), Point(to_m(float(m.group(1)), float(m.group(2))))))
for r in csv.DictReader(open(os.path.join(RAW, "wd_pops.csv"))):
    if r["date"].startswith("2024") and r["pop"] and not pop24.get(norm(r["itemLabel"])):
        pop24[norm(r["itemLabel"])].append((int(float(r["pop"])), None))


def census(name, region, want="min"):
    """2024 census figure of a named locality whose Wikidata point lies in/near region."""
    c = pop24.get(norm(name), [])
    near = [p for p, pt in c if pt is None or region.buffer(1500).contains(pt)]
    if not near: return None
    return min(near) if want == "min" else max(near)


# ------------------------------------------------------------------ level 2 (current)
sector_geom = {SECTORS[r]: geoms[r] for r in SECTORS}
units = []
for sname, sg in sector_geom.items():
    part = polys_only(sg.intersection(city))
    units.append(dict(geom=part, ro=f"Chișinău – sectorul {sname}", en=f"Chișinău – {sname} sector", ru=None,
                      sector=sname, kind="city", key="chisinau:" + sname))
inside8 = [rid for rid in geoms if tags[rid].get("admin_level") == "8" and rid != CITY
           and geoms[rid].intersection(mun).area > 0.6 * geoms[rid].area]
for rid in inside8:
    ro, en, ru = nm(tags[rid])
    units.append(dict(geom=geoms[rid].intersection(mun), ro=ro, en=en, ru=ru, sector=SUBURB_SECTOR[norm(ro)],
                      kind=tags[rid].get("place", "commune"), key=norm(ro), rid=rid))
gap = mun.difference(unary_union([u["geom"] for u in units]))
for p in getattr(gap, "geoms", [gap]):
    if p.area > 1:
        best = max(units, key=lambda u: u["geom"].buffer(1).intersection(p).area)
        best["geom"] = unary_union([best["geom"], p])
acc = None
for u in units:
    if acc is not None:
        u["geom"] = polys_only(u["geom"].difference(acc)) or u["geom"]
    acc = u["geom"] if acc is None else unary_union([acc, u["geom"]])
# population: city by sector shares (largest remainder), suburbs from census
city_units = [u for u in units if u["kind"] == "city"]
for u, v in zip(city_units, alloc(UNIT24["chisinau"], [SECT_SHARE[u["sector"]] for u in city_units])):
    u["pop"] = v; u["src"] = "Recensământ 2024: orașul 567 038, pe sectoare după ponderile Anuarului BNS 2015"
for u in units:
    if u["kind"] != "city":
        u["pop"] = UNIT24[u["key"]]; u["src"] = "Recensământ 2024 (BNS)"

# communes joining in 2027
new_units = []
for seat, rids in REFORM.items():
    for rid in rids:
        ro, en, ru = nm(tags[rid])
        g = geoms[rid]
        new_units.append(dict(geom=g, ro=ro, en=en, ru=ru, kind="commune", key=norm(ro), rid=rid, seat=seat,
                              pop=census(ro, g, "max"), src="Recensământ 2024 (BNS, prin Wikidata)"))

# ------------------------------------------------------------------ level 3 partition
place_nodes = [n for n in store.nodes.values() if n.get("tags", {}).get("place") in
               ("quarter", "neighbourhood", "suburb", "village", "hamlet", "town")]
lvl9 = {rid: g for rid, g in geoms.items() if tags[rid].get("admin_level") in ("9", "10") and tags[rid].get("name")
        and "allotments" not in tags[rid].get("name", "").lower() and not tags[rid].get("name", "").startswith("Î.P.")
        and tags[rid].get("place") != "allotments"}


def partition(region, seeds):
    if len(seeds) == 1:
        return [(seeds[0][0], region)]
    pts, owner = [], []
    for i, (_, g) in enumerate(seeds):
        if g.geom_type == "Point":
            samp = [g]
        else:
            b = g.boundary; L = b.length; n = max(4, int(L / 150))
            samp = [b.interpolate(L * k / n) for k in range(n)] + [g.representative_point()]
        pts += samp; owner += [i] * len(samp)
    vd = voronoi_diagram(MultiPoint(pts), envelope=region.envelope.buffer(5000))
    tree = STRtree(list(vd.geoms))
    cells = defaultdict(list)
    for j, p in enumerate(pts):
        for idx in tree.query(p, predicate="intersects"):
            cells[owner[j]].append(vd.geoms[idx]); break
    out = []
    for i, (n, g) in enumerate(seeds):
        if not cells[i]: continue
        c = unary_union(cells[i])
        if g.geom_type != "Point": c = unary_union([c, g])
        out.append((n, c, g.area))
    res, acc = [], None
    for n, c, _ in sorted(out, key=lambda x: -x[2]):
        c = c.intersection(region)
        if acc is not None: c = c.difference(acc)
        c = polys_only(c)
        if c is None or c.area < 100: continue
        acc = c if acc is None else unary_union([acc, c]); res.append((n, c))
    return res


def node_seeds(region, kinds):
    d = {}
    for nd in place_nodes:
        t = nd["tags"]
        if t["place"] not in kinds: continue
        pt = Point(to_m(nd["lon"], nd["lat"]))
        if region.contains(pt):
            d.setdefault(norm(t.get("name")), ((t.get("name:ro") or t.get("name"), t.get("name:en") or t.get("name"), t.get("name:ru")), pt))
    return list(d.values())


bpts = json.load(open(os.path.join(RAW, "bpts_all2.json" if os.path.exists(os.path.join(RAW, "bpts_all2.json")) else "bpts_all.json")))  # [lon, lat, residential weight]
bgeo = [Point(to_m(x, y)) for x, y, _ in bpts]
btree = STRtree(bgeo)


def weight_in(g):
    return sum(bpts[i][2] for i in btree.query(g, predicate="contains"))



# ------------------------------------------------------------------ manual level-3 adjustments
from shapely.ops import linemerge as _lm
from shapely.geometry import LineString as _LS, Polygon as _Poly


def _osm_rel_poly(rid):
    d = get(f"{API}/relation/{rid}/full.json")
    st = OSMStore(d["elements"]); g, _ = st.rel_polygon(rid)
    return P(polys_only(g)).buffer(0)


def _named_line(name):
    ls = []
    for w in store.ways.values():
        t = w.get("tags", {})
        if t.get("name") == name and t.get("highway"):
            c = store.way_coords(w["id"])
            if c and len(c) > 1: ls.append(_LS([to_m(*p) for p in c]))
    m = _lm(ls)
    return max(getattr(m, "geoms", [m]), key=lambda g: g.length)


def _extend(line, d):
    c = list(line.coords)
    (x0, y0), (x1, y1) = c[0], c[1]; L = ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** .5
    a = (x0 - (x1 - x0) / L * d, y0 - (y1 - y0) / L * d)
    (x2, y2), (x3, y3) = c[-2], c[-1]; L = ((x3 - x2) ** 2 + (y3 - y2) ** 2) ** .5
    b = (x3 + (x3 - x2) / L * d, y3 + (y3 - y2) / L * d)
    return _LS([a] + c + [b])


DENDRARIU = _osm_rel_poly(9991571)
SPECIAL = [  # new urban development areas added as their own level-3 units
    (_osm_rel_poly(14336408), ("Satul German", "Satul German (German Village)", None), "zonă nouă de dezvoltare urbană (OSM)"),
    (_osm_rel_poly(14309918), ("Cartierul Cluj", "Cluj residential district", None), "zonă nouă de dezvoltare urbană (OSM)"),
]


def adjust_buiucani(parts):
    """Sculeanca + its industrial zone become one area; Calea Ieșilor is the border with Buiucani;
    Buiucani reaches the Dendrarium."""
    byn = {norm(x["ro"]): x for x in parts}
    sc, zi, bu = byn.get("sculeanca"), next((x for k, x in byn.items() if "sculeanca" in k and "zona" in k), None), byn.get("buiucani")
    if not (sc and zi and bu): return parts
    merged = unary_union([sc["geom"], zi["geom"], bu["geom"]])
    road = _extend(_named_line("Strada Calea Ieșilor"), 4000)
    # north-east half plane of the road: offset the road far to its left/right and close the polygon
    left = road.parallel_offset(8000, "left"); right = road.parallel_offset(8000, "right")
    def half(off):
        cs = list(road.coords) + list(off.coords)[::-1] if off.coords[0] != road.coords[0] else list(road.coords) + list(off.coords)
        return _Poly(cs).buffer(0)
    hl, hr = half(left), half(right)
    ne = hl if hl.centroid.y > hr.centroid.y else hr
    scul = polys_only(merged.intersection(ne)); buiu = polys_only(merged.difference(ne))
    others = [x for x in parts if x not in (sc, zi, bu)]
    # Buiucani stretches to the Dendrarium: the park and the cells between them join Buiucani
    reach = unary_union([buiu, DENDRARIU]).convex_hull.intersection(merged.union(DENDRARIU).buffer(0))
    for x in others:
        take = x["geom"].intersection(DENDRARIU.buffer(30))
        if take.area > 0:
            x["geom"] = polys_only(x["geom"].difference(DENDRARIU.buffer(30))) or x["geom"]
            buiu = unary_union([buiu, take])
    buiu = unary_union([buiu, polys_only(scul.intersection(DENDRARIU.buffer(30))) or buiu])
    scul = polys_only(scul.difference(buiu))
    sc.update(geom=scul, ro="Sculeanca", en="Sculeanca", method="Sculeanca + zona industrială; limita cu Buiucani pe Calea Ieșilor")
    bu.update(geom=polys_only(buiu), method="aprox.; de la Calea Ieșilor până la Dendrariu")
    return [x for x in parts if x is not zi]


def alba_iulia_border(parts):
    """Buiucanii Noi begins where str. Alba Iulia begins: the part of Flacăra along the street, west of its start, joins Buiucanii Noi."""
    byn = {norm(x["ro"]): x for x in parts}
    bn, fl = byn.get("buiucanii noi"), byn.get("flacara")
    if not (bn and fl): return parts
    sx, sy = to_m(28.79231, 47.0268)          # east end of str. Alba Iulia (Buiucani)
    dx, dy = to_m(28.76695, 47.03976); dx -= sx; dy -= sy   # direction of the street towards the west
    n = (dx * dx + dy * dy) ** 0.5; dx, dy = dx / n, dy / n
    from shapely.geometry import Polygon
    big = 20000
    # half plane on the street's side of the line through its start, perpendicular to it
    half = Polygon([(sx - dy * big, sy + dx * big), (sx - dy * big + dx * big, sy + dx * big + dy * big),
                    (sx + dy * big + dx * big, sy - dx * big + dy * big), (sx + dy * big, sy - dx * big)])
    take = polys_only(fl["geom"].intersection(half))
    if take is None or take.area < 1000: return parts
    bn["geom"] = unary_union([bn["geom"], take]).buffer(0); fl["geom"] = polys_only(fl["geom"].difference(half)) or fl["geom"]
    bn["method"] = (bn.get("method") or "") + "; limita cu Flacăra la începutul str. Alba Iulia"
    return parts


def carve_special(u, parts):
    for g, names, method in SPECIAL:
        cut = polys_only(g.intersection(u["geom"]))
        if cut is None or cut.area < 2e4: continue
        host = max(parts, key=lambda x: x["geom"].intersection(cut).area)
        for x in parts:
            if x["geom"].intersects(cut):
                x["geom"] = polys_only(x["geom"].difference(cut)) or x["geom"]
        parts.append(dict(geom=cut, ro=names[0], en=names[1], ru=names[2], village=host.get("village"), method=method, nb=True))
    return parts


# level 4 (sub-neighbourhoods) keeps Rîșcani / Visterniceni, Cartierul 8 / 8A / 9 and Dokuceaev / 40 de ani apart;
# level 3 groups them again (GROUPS below)
MERGES = {
    "chisinau:Botanica": [(("galata / aeroport", "codru"), ("Aeroport", "Airport"))],
}
# level 3 = groups of level-4 units. Villages: every village is one level-3 unit (all neighbourhoods of a town merge).
GROUPS = {
    "chisinau:Centru": {"Telecentru": ["telecentru", "dokuceaev", "40 de ani"], "Centru": ["melestiu", "hrusca", "caucaz", "hutuleuca", "centru"], "Malina": ["malina mare", "malina mica"]},
    "chisinau:Buiucani": {"Buiucani": ["buiucani", "buiucanii vechi", "vovinteni", "flacara"]},
    "chisinau:Ciocana": {"Ciocana Nouă": ["ciocana", "zona industriala ciocana", "ciocana noua"], "Mircea cel Bătrân": ["cartierul 8*", "cartierul 9*"]},
    "chisinau:Rîșcani": {"Rîșcanii de Jos": ["riscanii de jos", "sipka", "tabacaria"], "Rîșcani-Visterniceni": ["riscani", "visterniceni"],
                         "Poșta Veche": ["posta veche", "petricani", "doina", "ceucari"], "Rîșcanii de Sus": ["riscanii de sus", "bucovinei", "pan-com"]},
    "chisinau:Botanica": {"Botanica de Jos": ["botanica de jos", "muncesti"], "Botanica de Sus": ["botanica de sus", "nunta", "toamna de aur", "portile orasului", "valea farmecelor", "botanica"]},
}
def group_of(u, x):
    if u["kind"] != "city": return x.get("village") or x["ro"]
    n = norm(x["ro"])
    for g, keys in GROUPS.get(u.get("key"), {}).items():
        for k in keys:
            kk = norm(k.rstrip("*"))
            if n == kk or n.replace("-", " ") == kk.replace("-", " ") or (k.endswith("*") and n.startswith(kk)):
                return g
    return x["ro"]
RENAMES = {"durlesti": {"centru": "Durlești Centru"}, "singera": {"centru": "Sîngera Centru", "aeroport": "Sîngera-Aeroport"}}


def merge_rename(u, parts):
    for keys, (ro, en) in MERGES.get(u.get("key"), []):
        grp = [x for x in parts if any(norm(x["ro"]) == k or (k.endswith(" ") and norm(x["ro"]).startswith(k)) or
                                       (k.startswith("cartierul") and norm(x["ro"]).startswith(k.strip() + " ")) for k in keys)]
        if len(grp) >= 2:
            keep = grp[0]
            keep.update(geom=unary_union([x["geom"] for x in grp]).buffer(0), ro=ro, en=en, ru=None,
                        method="cartiere unite: " + ", ".join(x["ro"] for x in grp))
            parts = [x for x in parts if x is keep or x not in grp]
    for x in parts:
        new = RENAMES.get(u.get("key"), {}).get(norm(x["ro"]))
        if new: x["ro"] = x["en"] = new
    return parts


def defragment(parts):
    """Give every detached fragment of a neighbourhood to the neighbour it shares the longest border with."""
    for _ in range(3):
        moved = False
        for x in parts:
            g = x["geom"]
            if g.geom_type != "MultiPolygon": continue
            pieces = sorted(g.geoms, key=lambda p: -p.area)
            main, frags = pieces[0], pieces[1:]
            keep = [main]
            for fr in frags:
                best, blen = None, 0
                for y in parts:
                    if y is x: continue
                    l = fr.boundary.intersection(y["geom"].buffer(2)).length
                    if l > blen: best, blen = y, l
                if best is not None and blen > 0:
                    best["geom"] = unary_union([best["geom"], fr]).buffer(0); moved = True
                elif fr.area > 0.2 * main.area:
                    keep.append(fr)
            x["geom"] = unary_union(keep)
        if not moved: break
    return [x for x in parts if x["geom"].area > 100]


def trim_hrusca(parts):
    """Hrușca is the area around str. Hrușca west of the station; the long railway strip becomes its own zone."""
    hr = next((x for x in parts if norm(x["ro"]) == "hrusca"), None)
    if not hr: return parts
    core = Point(to_m(28.8528, 47.0096)).buffer(650)
    keep = polys_only(hr["geom"].intersection(core))
    rest = polys_only(hr["geom"].difference(core))
    if keep is None or rest is None: return parts
    # keep only the piece of the core that touches the Hrușca point; detached bits go to the railway zone
    pk = max(getattr(keep, "geoms", [keep]), key=lambda g: g.area)
    rest = unary_union([rest] + [g for g in getattr(keep, "geoms", [keep]) if g is not pk])
    hr["geom"] = pk; hr["method"] = "zona din jurul str. Hrușca, la vest de gară"
    rz = dict(geom=rest, ro="Zona feroviară (Gara Chișinău)", en="Railway zone (Chișinău station)", ru=None,
              method="fâșia căii ferate și a stației de triaj, separată de Hrușca; limita cu Hrușca pe bd. Iuri Gagarin", nb=True)
    parts.append(rz)
    gara_borders(hr, rz, next((x for x in parts if norm(x["ro"]) == "caucaz"), None))
    return parts


def gara_borders(hr, rz, cz):
    """Railway zone reaches bd. Iuri Gagarin; the station is inside it; Hrușca takes a ~150 m strip of Caucaz towards str. Ismail."""
    # bd. Iuri Gagarin runs NW-SE from the Hrușca streets to the roundabout at the station square
    gag = _extend(_LS([to_m(28.85488, 47.01346), to_m(28.85878, 47.01085)]), 600)
    st_pt = Point(to_m(28.8602, 47.01305))
    left, right = gag.buffer(4000, single_sided=True), gag.buffer(-4000, single_sided=True)
    rail_side = left if left.contains(st_pt) else right
    give = polys_only(hr["geom"].intersection(rail_side))
    station = Point(to_m(28.8602, 47.01305)).buffer(130)
    if give is not None and give.area < 0.8 * hr["geom"].area:
        moved = unary_union([give, hr["geom"].intersection(station)])
        rz["geom"] = unary_union([rz["geom"], moved]).buffer(0)
        hr["geom"] = polys_only(hr["geom"].difference(rail_side).difference(station)) or hr["geom"]
    else:
        print("WARN gara_borders: Gagarin split skipped", None if give is None else give.area / hr["geom"].area)
    if cz is not None:
        shared = hr["geom"].boundary.intersection(cz["geom"].buffer(5))
        if not shared.is_empty:
            strip = polys_only(cz["geom"].intersection(shared.buffer(150)))
            if strip is not None:
                hr["geom"] = unary_union([hr["geom"], strip]).buffer(0)
                cz["geom"] = polys_only(cz["geom"].difference(strip.buffer(0.5))) or cz["geom"]
                hr["method"] += "; limita cu Caucaz mutată ~150 m spre str. Ismail"

def build_l3(u):
    reg = u["geom"]
    parts = []
    if u["kind"] == "city":
        seeds = node_seeds(reg, ("quarter", "neighbourhood", "suburb"))
        for n, g in partition(reg, seeds or [((u["ro"], u["en"], u["ru"]), reg.representative_point())]):
            parts.append(dict(geom=g, ro=n[0], en=n[1], ru=n[2], method="aprox. după punctele de cartier din OSM", nb=True))
    else:
        seeds = [(nm(tags[rid]), g) for rid, g in lvl9.items() if g.intersection(reg).area > 0.5 * g.area]
        have = {norm(n[0]) for n, _ in seeds}
        for n, g in node_seeds(reg, ("village", "town", "hamlet")):
            if norm(n[0]) not in have:
                have.add(norm(n[0])); seeds.append((n, g))
        if not seeds:
            seeds = [((u["ro"], u["en"], u["ru"]), reg.representative_point())]
        villages = partition(reg, seeds)
        for n, g in villages:
            # split a town/village into its own neighbourhoods when OSM names at least two
            nb = node_seeds(g, ("quarter", "neighbourhood", "suburb"))
            if len(nb) >= 2:
                for (m, h) in partition(g, nb):
                    parts.append(dict(geom=h, ro=m[0], en=m[1], ru=m[2], village=n[0],
                                      method=f"cartier din {n[0]}, aprox. după punctele OSM", nb=True))
            else:
                parts.append(dict(geom=g, ro=n[0], en=n[1], ru=n[2], village=n[0],
                                  method="intravilan OSM + extravilan atribuit celei mai apropiate localități" if len(villages) > 1 else "limita UAT"))
    if u.get("key") == "chisinau:Buiucani":
        parts = alba_iulia_border(adjust_buiucani(parts))
    parts = carve_special(u, parts)
    parts = defragment(merge_rename(u, parts))
    if u.get("key") == "chisinau:Centru":
        parts = trim_hrusca(parts)
    # population
    for x in parts:
        x["w"] = weight_in(x["geom"])
    if u["kind"] == "city":
        for x, v in zip(parts, alloc(u["pop"], [x["w"] for x in parts])):
            x["pop"] = v; x["src"] = "estimare: populația sectorului repartizată după suprafața locuibilă a clădirilor (OSM)"
        return parts
    # villages: census figure per village, seat = remainder; then neighbourhoods inside a village by weight
    vil = defaultdict(list)
    for x in parts: vil[x["village"]].append(x)
    vpop = {}
    for v in vil:
        g = unary_union([x["geom"] for x in vil[v]])
        vpop[v] = census(v, g, "min") if len(vil) > 1 else u["pop"]
    if len(vil) > 1:
        for v in vil:
            pass
        known = {v: p for v, p in vpop.items() if p is not None}
        seat = [v for v in vil if norm(v) == u["key"]]
        if sum(known.values()) != u["pop"] or len(known) < len(vil):
            if seat and len(known) == len(vil):
                vpop[seat[0]] = u["pop"] - sum(p for v, p in known.items() if v != seat[0])
            elif seat:
                vpop[seat[0]] = None
            missing = [v for v in vil if vpop[v] is None]
            rest = u["pop"] - sum(p for p in vpop.values() if p is not None)
            for v, p in zip(missing, alloc(max(0, rest), [sum(x["w"] for x in vil[v]) for v in missing])):
                vpop[v] = p
            # final exactness guard
            diff = u["pop"] - sum(vpop.values())
            if diff:
                big = max(vpop, key=vpop.get); vpop[big] += diff
    for v, xs in vil.items():
        for x, p in zip(xs, alloc(vpop[v], [x["w"] for x in xs])):
            x["pop"] = p
            x["src"] = ("Recensământ 2024 (BNS)" if len(xs) == 1 else
                        f"estimare: populația localității {v} (Recensământ 2024) repartizată după clădirile locuibile")
    return parts


for u in units + new_units:
    u["l3"] = build_l3(u)
    s = sum(x["pop"] for x in u["l3"])
    assert s == u["pop"], (u["ro"], s, u["pop"])

# ------------------------------------------------------------------ reform (2027) level-2 units
ref_units = []
seat_of = {}
for u in units:
    if u.get("key") in REFORM_ABSORB:
        continue
    if u.get("key") in REFORM:
        joins = [n for n in new_units if n["seat"] == u["key"]] + [x for x in units if REFORM_ABSORB.get(x.get("key")) == u["key"]]
        g = unary_union([u["geom"]] + [j["geom"] for j in joins])
        names = ", ".join(j["ro"] for j in joins)
        ref_units.append(dict(u, geom=g, pop=u["pop"] + sum(j["pop"] for j in joins), ref_changed=True,
                              src=f"Recensământ 2024: {u['ro']} + {names}", l3=u["l3"] + sum((j["l3"] for j in joins), []),
                              note=f"Primărie unită din 2027 (amalgamare voluntară): {u['ro']} + {names}"))
    else:
        ref_units.append(u)

# ------------------------------------------------------------------ emit
features, fid = [], [0]


def emit(lvl, g, props, sc):
    fid[0] += 1
    props = dict(props); pre = props.pop("_gg", None)
    lp = g.buffer(-30) if g.buffer(-30).area > 0 else g
    big = max(getattr(lp, "geoms", [lp]), key=lambda x: x.area)
    try: c = LL(polylabel(big, 5))
    except Exception: c = LL(big.representative_point())
    pr = {"id": fid[0], "lvl": lvl, "sc": sc, "km2": round(g.area / 1e6, 2), "lx": round(c.x, 5), "ly": round(c.y, 5)}
    pr.update({k: v for k, v in props.items() if v is not None})
    if pr.get("pop") and g.area: pr["dens"] = round(pr["pop"] / (g.area / 1e6))
    gg = pre if pre is not None else set_precision(LL(g).simplify(0.00003, preserve_topology=True), 0.00001)
    features.append({"type": "Feature", "properties": pr, "geometry": mapping(gg)})


def uprops(u, extra=None):
    d = {"ro": u["ro"], "en": u["en"] or u["ro"], "ru": u.get("ru"), "pop": u["pop"], "src": u["src"],
         "sector": u.get("sector"), "kind": u["kind"]}
    if u.get("key") == "condrita":
        d["note"] = "Sub 3 000 de locuitori, fără cluster voluntar: trece la amalgamare normativă (partener nestabilit oficial)."
    if u.get("note"): d["note"] = u["note"]
    d.update(extra or {}); return d


mun_ref = unary_union([u["geom"] for u in ref_units])
emit("mun", mun, {"ro": "Municipiul Chișinău", "en": "Chișinău Municipality", "pop": 720128, "src": "Recensământ 2024 (BNS)"}, "cur")
emit("mun", mun_ref, {"ro": "Municipiul Chișinău (din 2027)", "en": "Chișinău Municipality (from 2027)",
                      "pop": sum(u["pop"] for u in ref_units), "src": "Recensământ 2024 (BNS), cu localitățile care aderă prin amalgamare"}, "ref")
for sname in sector_geom:
    for sc, us in (("cur", units), ("ref", ref_units)):
        mine = [u for u in us if u["sector"] == sname]
        changed = any(u.get("ref_changed") or u.get("key") in REFORM_ABSORB for u in units + ref_units if u["sector"] == sname)
        if sc == "ref" and not changed: continue
        emit(1, unary_union([u["geom"] for u in mine]),
             {"ro": f"Sectorul {sname}", "en": f"{sname} sector", "pop": sum(u["pop"] for u in mine),
              "src": "suma primăriilor din sector (Recensământ 2024)", "sector": sname}, sc if changed else "both")
for u in units:
    changed = u.get("key") in REFORM or u.get("key") in REFORM_ABSORB
    emit(2, u["geom"], uprops(u), "cur" if changed else "both")
for u in ref_units:
    if u.get("ref_changed"):
        emit(2, u["geom"], uprops(u), "ref")
# level-3 blocks share their edges exactly (coverage simplification), so projects can merge them cleanly in the browser
import shapely as _sh
_l3 = [x for u in units for x in u["l3"]] + [x for n in new_units for x in n["l3"]]
_cov = _sh.coverage_simplify(_sh.set_precision(_sh.GeometryCollection([LL(x["geom"]) for x in _l3]).geoms, 0.000001), 0.00003)
for x, g_ in zip(_l3, _cov):
    x["_gg"] = set_precision(_sh.make_valid(g_), 0.00001)
def emit_l4_l3(u, extra, sc):
    """Level 4 = the building blocks; level 3 = their groups (same unit)."""
    groups = defaultdict(list)
    for x in u["l3"]:
        x["grp"] = group_of(u, x); groups[x["grp"]].append(x)
        emit(4, x["geom"], {"ro": x["ro"], "en": x["en"] or x["ro"], "ru": x.get("ru"), "pop": x["pop"], "src": x["src"], "grp": x["grp"],
                            "method": x["method"], "vil": x.get("village"), "_gg": x["_gg"], **extra}, sc)
    for g, xs in groups.items():
        one = len(xs) == 1 and xs[0]["ro"] == g
        gg = set_precision(_sh.make_valid(unary_union([x["_gg"] for x in xs])), 0.00001)
        emit(3, unary_union([x["geom"] for x in xs]).buffer(0), {"ro": g, "en": (xs[0]["en"] or g) if one else g, "pop": sum(x["pop"] for x in xs),
             "src": xs[0]["src"] if one else "suma microcartierelor (nivelul 4)", "grp": g, "parts": None if one else ", ".join(x["ro"] for x in xs),
             "method": xs[0]["method"] if one else "cartier format din: " + ", ".join(x["ro"] for x in xs), "vil": xs[0].get("village"), "_gg": gg, **extra}, sc)
for u in units:
    emit_l4_l3(u, {"sector": u["sector"], "unit": u["ro"], "ukey": u.get("key")}, "both")
for n in new_units:
    seat = next(u for u in ref_units if u.get("key") == n["seat"])
    emit_l4_l3(n, {"sector": seat["sector"], "unit": f'{seat["ro"]} (din 2027; azi {n["ro"]})', "ukey": seat.get("key"), "ukey0": n.get("key"), "unit0": n["ro"]}, "ref")
# neighbouring localities (outside)
new_rids = {n["rid"] for n in new_units}
ctx = []
for rid, g in geoms.items():
    t = tags[rid]
    if t.get("admin_level") != "8" or rid == CITY or rid in inside8: continue
    if not g.intersects(mun.buffer(20000)): continue
    ro, en, ru = nm(t)
    pop = census(ro, g, "max")
    ctx.append((rid, g, pop))
    emit("ctx", g, {"ro": ro, "en": en, "ru": ru, "pop": pop, "src": "Recensământ 2024 (BNS, prin Wikidata)" if pop else None,
                    "kind": t.get("place"), "note": "Se alătură municipiului din 2027" if rid in new_rids else
                    ("A votat aderarea la Colonița (decizia 4/1 din 29.07.2026), dar clusterul nu s-a constituit (Maximovca a ales Bubuieci). "
                     "Trece la amalgamare normativă; partenerul nu e stabilit oficial, deci rămâne în afara municipiului." if norm(ro) == "dolinnoe" else None)},
         "cur" if rid in new_rids else "both")

# ------------------------------------------------------------------ building points with population
all_l3 = [x for u in units + new_units for x in u["l3"]] + [dict(geom=g, pop=p or 0) for rid, g, p in ctx if rid not in new_rids]
bpop = [0.0] * len(bpts)
extra = []
for x in all_l3:
    idx = list(btree.query(x["geom"], predicate="contains"))
    w = sum(bpts[i][2] for i in idx)
    if w > 0:
        for i in idx: bpop[i] += x["pop"] * bpts[i][2] / w
    elif x["pop"]:
        c = LL(x["geom"].representative_point()); extra.append([round(c.x, 5), round(c.y, 5), x["pop"]])
# compact: [x, y, pop*10] ints, delta-coded by 1e-5 deg
pts, px, py = [], 0, 0
for (x, y, _), p in zip(bpts, bpop):
    X, Y = round((x - 28.5) * 1e5), round((y - 46.8) * 1e5)
    pts += [X - px, Y - py, round(p * 10)]; px, py = X, Y
json.dump({"b": pts, "x": extra}, open(os.path.join(OUT, "pts.json"), "w"), separators=(",", ":"))
json.dump({"type": "FeatureCollection", "features": features}, open(os.path.join(OUT, "admin.geojson"), "w"),
          ensure_ascii=False, separators=(",", ":"))
from collections import Counter
print(Counter((f["properties"]["lvl"], f["properties"]["sc"]) for f in features))
for sc in ("cur", "ref"):
    for lv in (1, 2, 3, 4):
        s = sum(f["properties"].get("pop", 0) for f in features if f["properties"]["lvl"] == lv and f["properties"]["sc"] in (sc, "both"))
        print(sc, "L", lv, s)
print("building pop total", round(sum(bpop)), "extra", sum(e[2] for e in extra))
for u in ref_units:
    print(f'{u["ro"]:32s} {u["sector"]:9s} {u["pop"]:>7}  ' + ", ".join(f'{x["ro"]}:{x["pop"]}' for x in u["l3"])[:230])
