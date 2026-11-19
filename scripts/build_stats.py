"""Access & environment statistics on the 150 m grid used by the population map.

Every value is computed for each grid cell from WALKING DISTANCE ON THE STREET AND PATH NETWORK
(OpenStreetMap ways usable on foot), not straight-line distance, and counts ALL facilities around
with a distance decay (a gravity / cumulative-opportunity measure), not only the nearest one:

    raw(cell) = sum over facilities f within the cut-off of  weight(f) * exp(-d(cell, f) / d0)
    score     = 100 * (1 - exp(-raw / R))          (0 = very poor, 100 = very good; saturates)

  green   public green space: parks, public gardens, recreation grounds, forests/woods
          (>= 0.3 ha, no access=private/no; lawns, private gardens and small grass patches ignored).
          Each 150 m cell's share of green area (ha) is one source.   d0 = 400 m, cut-off 1.6 km
  transit bus / trolleybus / minibus stops, weight = number of lines serving the stop (max 12).
                                                                      d0 = 250 m, cut-off 1.0 km
  health  hospitals 4, clinics/polyclinics 2, doctors 1.5, dentists/labs 0.5. d0 = 700 m, cut-off 3 km
  school  schools / lyceums (weight 1).                               d0 = 600 m, cut-off 2.5 km
  air     estimated air-quality index (no measurements by area are available): exposure to traffic
          (road class x lanes, straight-line decay 120 m) and to industrial land (decay 400 m);
          score 100 = cleanest. Relative estimate, not µg/m³.

Output: web/data/statgrid.json  {kx0, ky0, W, H, dx, dy, s: {key: [score per cell or -1]}, aux: {...}, pop, jobs}
"""
import json, math, os, time
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra, connected_components
from scipy.spatial import cKDTree
from shapely.geometry import shape, box, Point
from shapely.ops import unary_union
from shapely.strtree import STRtree
from shapely.prepared import prep
from osmgeom import OSMStore, polys_only

ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "web", "data")
CY = 0.0015; CX = CY * 1.46
LAT0 = 47.0; MX = 111320 * math.cos(math.radians(LAT0)); MY = 110570
t0 = time.time()
def log(*a): print(f"[{time.time()-t0:6.0f}s]", *a, flush=True)

# ---------------------------------------------------------------- municipality and grid cells
admin = json.load(open(os.path.join(OUT, "admin.geojson")))["features"]
mun = unary_union([shape(f["geometry"]) for f in admin if f["properties"]["lvl"] == "mun"]).buffer(0.002)
minx, miny, maxx, maxy = mun.bounds
kx0, ky0 = int(minx / CX), int(miny / CY); kx1, ky1 = int(maxx / CX), int(maxy / CY)
W, H = kx1 - kx0 + 1, ky1 - ky0 + 1
pm = prep(mun)
cx = np.array([(kx0 + i + .5) * CX for i in range(W)]); cy = np.array([(ky0 + j + .5) * CY for j in range(H)])
inside = np.zeros((H, W), bool)
for j in range(H):
    for i in range(W):
        inside[j, i] = pm.contains(Point(cx[i], cy[j]))
cells = np.argwhere(inside)            # (j, i)
NC = len(cells)
cell_lon = cx[cells[:, 1]]; cell_lat = cy[cells[:, 0]]
log("grid", W, H, "cells inside", NC)
def to_m(lon, lat): return np.c_[(np.asarray(lon) - 28.85) * MX, (np.asarray(lat) - LAT0) * MY]

# population and jobs per cell (same keys as popgrid / jobgrid)
def grid_vals(name, key="p"):
    a = np.zeros((H, W), np.float32)
    for f in json.load(open(os.path.join(OUT, name)))["features"]:
        lon, lat = f["geometry"]["coordinates"]; i, j = int(lon / CX) - kx0, int(lat / CY) - ky0
        if 0 <= i < W and 0 <= j < H: a[j, i] += f["properties"][key]
    return a
POP = grid_vals("popgrid.geojson"); JOBS = grid_vals("jobgrid.geojson")

# ---------------------------------------------------------------- OSM
els = json.load(open(os.path.join(RAW, "area.json")))["elements"]
for _x in ("extra_e.json", "extra_n.json"):
    if os.path.exists(os.path.join(RAW, _x)): els += json.load(open(os.path.join(RAW, _x)))["elements"]
S = OSMStore(els); del els
log("osm", len(S.nodes), len(S.ways))

# ---------------------------------------------------------------- walking network
NOWALK = {"motorway", "motorway_link", "construction", "proposed", "raceway", "bus_guideway", "abandoned", "platform", "elevator", "no", "razed", "disused"}
nid = {}; ea, eb, ew = [], [], []
def node_index(n):
    k = nid.get(n)
    if k is None: k = nid[n] = len(nid)
    return k
for w in S.ways.values():
    tg = w.get("tags") or {}; hw = tg.get("highway")
    if not hw or hw in NOWALK: continue
    if tg.get("foot") in ("no", "private") or (tg.get("access") in ("private", "no") and tg.get("foot") not in ("yes", "designated", "permissive")): continue
    ns = [n for n in w["nodes"] if n in S.nodes]
    for a, b in zip(ns, ns[1:]):
        A, B = S.nodes[a], S.nodes[b]
        d = math.hypot((A["lon"] - B["lon"]) * MX, (A["lat"] - B["lat"]) * MY)
        ea.append(node_index(a)); eb.append(node_index(b)); ew.append(max(d, 0.1))
N = len(nid)
G = coo_matrix((ew, (ea, eb)), shape=(N, N)).tocsr()
ncomp, lab = connected_components(G, directed=False)
size = np.bincount(lab); good = size[lab] >= 200
ids = np.empty(N, np.int64); coords = np.zeros((N, 2))
for n, k in nid.items(): coords[k] = (S.nodes[n]["lon"], S.nodes[n]["lat"])
XY = to_m(coords[:, 0], coords[:, 1])
gidx = np.where(good)[0]; tree = cKDTree(XY[gidx])
log("graph nodes", N, "edges", len(ew), "kept nodes", len(gidx))
def snap(lon, lat):
    d, k = tree.query(to_m(lon, lat)); return gidx[k], d

cnode, csnap = snap(cell_lon, cell_lat)
csnap = np.minimum(csnap, 400)

def access(src_lon, src_lat, weight, d0, cut, name, group=None, ngroups=0):
    """Gravity sum over all sources reachable within `cut` metres of walking (optionally also split by source group)."""
    snode, ssnap = snap(np.asarray(src_lon), np.asarray(src_lat))
    grp = np.asarray(group if group is not None else np.zeros(len(snode), int))
    keep = ssnap < 300; snode, ssnap, weight, grp = snode[keep], ssnap[keep], np.asarray(weight, float)[keep], grp[keep]
    raw = np.zeros(NC); nearest = np.full(NC, np.inf); cum = np.zeros(NC)
    graw = np.zeros((ngroups, NC), np.float32) if ngroups else None
    # cells only need sources within cut + their own snap: limit each Dijkstra to `cut`
    order = np.argsort(snode); snode, ssnap, weight, grp = snode[order], ssnap[order], weight[order], grp[order]
    uniq, inv = np.unique(snode, return_inverse=True)
    B = 64
    for s in range(0, len(uniq), B):
        D = dijkstra(G, directed=False, indices=uniq[s:s + B], limit=cut)
        Dc = D[:, cnode]                       # (b, NC)
        for r in range(len(uniq[s:s + B])):
            members = np.where(inv == s + r)[0]
            row = Dc[r]
            ok = np.isfinite(row)
            if not ok.any(): continue
            for m in members:
                d = row[ok] + csnap[ok] + ssnap[m]
                okd = d <= cut
                idx = np.where(ok)[0][okd]; dd = d[okd]
                contrib = weight[m] * np.exp(-dd / d0)
                raw[idx] += contrib
                if graw is not None: graw[grp[m], idx] += contrib
                nearest[idx] = np.minimum(nearest[idx], dd)
                c10 = dd <= 800
                cum[idx[c10]] += weight[m]
    log(name, "sources", len(snode), "cells reached", int(np.isfinite(nearest).sum()))
    return (raw, nearest, cum, graw) if ngroups else (raw, nearest, cum)

def score(raw, R): return np.round(100 * (1 - np.exp(-raw / R))).astype(int)

res, aux = {}, {}
# ---------------------------------------------------------------- transit
stops = [f for f in json.load(open(os.path.join(OUT, "stops.geojson")))["features"] if f["properties"]["k"] in ("bus", "trolleybus")]
w = [min(12, len([r for r in f["properties"].get("r", []) if not r.startswith("train")]) or 1) for f in stops]
raw, near, cum = access([f["geometry"]["coordinates"][0] for f in stops], [f["geometry"]["coordinates"][1] for f in stops], w, 250, 1000, "transit")
res["transit"] = score(raw, 2.5); aux["transit_near"] = near; aux["transit_cum"] = cum

# ---------------------------------------------------------------- health and schools
pois = json.load(open(os.path.join(OUT, "pois.geojson")))["features"]
HW = {"hospital": 4, "clinic": 2, "doctors": 1.5, "dentist": 0.5, "laboratory": 0.5}
hp = [f for f in pois if f["properties"]["c"] == "health" and f["properties"].get("k") in HW]
raw, near, cum = access([f["geometry"]["coordinates"][0] for f in hp], [f["geometry"]["coordinates"][1] for f in hp], [HW[f["properties"]["k"]] for f in hp], 700, 3000, "health")
res["health"] = score(raw, 7.0); aux["health_near"] = near; aux["health_cum"] = cum
sp = [f for f in pois if f["properties"]["c"] == "school"]
raw, near, cum = access([f["geometry"]["coordinates"][0] for f in sp], [f["geometry"]["coordinates"][1] for f in sp], [1] * len(sp), 600, 2500, "school")
res["school"] = score(raw, 0.8); aux["school_near"] = near; aux["school_cum"] = cum

# ---------------------------------------------------------------- public green space, weighted by how usable it is
# Each public green area gets a category from what OpenStreetMap shows inside it, and a weight (editable in the app):
#   a = landscaped (alleys, lighting, benches, playgrounds) 100%  ·  s = semi-landscaped (paths, no facilities) 50%
#   n = natural / unlandscaped (no paths) 20%.  For s and n only the part within 100 m of a path or of the edge counts.
from shapely.ops import transform as _tf
GREEN_L = {"park", "garden", "recreation_ground", "nature_reserve", "village_green"}
def is_public(tg): return tg.get("access") not in ("private", "no", "customers") and tg.get("garden:type") not in ("residential", "private")
to_xy = lambda g: _tf(lambda x, y, z=None: ((np.asarray(x) - 28.85) * MX, (np.asarray(y) - LAT0) * MY), g)
to_ll = lambda g: _tf(lambda x, y, z=None: (np.asarray(x) / MX + 28.85, np.asarray(y) / MY + LAT0), g)
PATHW = {"footway", "path", "track", "pedestrian", "cycleway", "steps", "bridleway", "living_street", "service"}
plines, plit = [], []
for w in S.ways.values():
    tg = w.get("tags") or {}
    if tg.get("highway") in PATHW:
        l = S.way_line(w["id"])
        if l is not None: plines.append(to_xy(l)); plit.append(tg.get("lit") == "yes")
ptree = STRtree(plines)
AMEN = {"bench": 1, "playground": 3, "toilets": 3, "fountain": 2, "drinking_water": 2, "street_lamp": 0.3, "waste_basket": 0.5, "shelter": 1}
apts, aw = [], []
for n in S.nodes.values():
    tg = n.get("tags") or {}
    k = tg.get("amenity") if tg.get("amenity") in AMEN else tg.get("leisure") if tg.get("leisure") == "playground" else "street_lamp" if tg.get("highway") == "street_lamp" else None
    if k: apts.append(to_xy(Point(n["lon"], n["lat"]))); aw.append(AMEN[k])
atree = STRtree(apts)
CUR = {"la izvor": "a", "muzeul satului": "s"}   # known exceptions where OSM lacks the details (editable in the app)
munxy = to_xy(mun.buffer(0.03))
cand = []
for kind, coll in (("w", S.ways), ("r", S.rels)):
    for oid, o in coll.items():
        tg = o.get("tags") or {}
        isforest = tg.get("landuse") == "forest" or tg.get("natural") == "wood"
        ok = tg.get("leisure") in GREEN_L or tg.get("landuse") == "recreation_ground" or isforest
        if not ok or not is_public(tg): continue
        if tg.get("leisure") == "garden" and tg.get("access") not in ("yes", "public", "permissive") and not tg.get("name"): continue   # unnamed gardens are usually private yards
        g = polys_only(S.way_polygon(oid) if kind == "w" else S.rel_polygon(oid)[0])
        if g is None: continue
        gx = to_xy(g)
        if not gx.intersects(munxy): continue
        gx = gx.intersection(munxy); ha = gx.area / 1e4
        park = tg.get("leisure") in ("park", "garden", "recreation_ground", "village_green") and not isforest
        if ha < (0.3 if park else 1.0): continue
        ins = [i for i in ptree.query(gx)]
        segs = [(plines[i].intersection(gx), plit[i]) for i in ins]
        pkm = sum(sg.length for sg, _ in segs) / 1000; lkm = sum(sg.length for sg, lt in segs if lt) / 1000
        am = sum(aw[i] for i in atree.query(gx) if gx.contains(apts[i]))
        q = am / ha + 4 * lkm / ha
        if park: cat = "a" if (q >= 0.25 or lkm / ha >= 0.02 or (ha < 8 and pkm / ha >= 0.08)) else "s" if (pkm / ha >= 0.04 or ha < 3) else "n"
        else: cat = "a" if (q >= 0.4 and pkm / ha >= 0.08) else "s" if pkm / ha >= 0.05 else "n"
        nm = tg.get("name") or ""
        for k, v in CUR.items():
            if k in nm.lower(): cat = v
        cand.append({"g": gx, "cat": cat, "n": nm, "ha": ha, "pkm": pkm, "q": q, "lines": [sg for sg, _ in segs if not sg.is_empty], "osm": f"{kind}{oid}"})
# overlaps: the better-landscaped polygon keeps the shared ground
cand.sort(key=lambda c: ("asn".index(c["cat"]), -c["ha"]))
taken = None; greens = []
for c in cand:
    g = c["g"] if taken is None else c["g"].difference(taken)
    if g.is_empty or g.area < 2000: continue
    taken = c["g"] if taken is None else unary_union([taken, c["g"]])
    if c["cat"] != "a":   # only the reachable fringe: 100 m from a path or the edge
        reach = unary_union([g.boundary.buffer(100)] + [l.buffer(100) for l in c["lines"]])
        g = g.intersection(reach)
    c["use"] = g; greens.append(c)
for k in "asn": log("green", k, sum(1 for c in greens if c["cat"] == k), "areas", round(sum(c["ha"] for c in greens if c["cat"] == k)), "ha", round(sum(c["use"].area for c in greens if c["cat"] == k) / 1e4), "usable ha")
# split into grid cells -> sources weighted by usable ha, one group per green area
src_lon, src_lat, src_w, src_g = [], [], [], []
for gi, c in enumerate(greens):
    gl = to_ll(c["use"]); x0, y0, x1, y1 = gl.bounds
    for kx in range(int(x0 / CX), int(x1 / CX) + 1):
        for ky in range(int(y0 / CY), int(y1 / CY) + 1):
            cb = box(kx * CX, ky * CY, (kx + 1) * CX, (ky + 1) * CY)
            if not gl.intersects(cb): continue
            inter = gl.intersection(cb); ha = to_xy(inter).area / 1e4
            if ha < 0.03: continue
            pt = inter.representative_point()
            src_lon.append(pt.x); src_lat.append(pt.y); src_w.append(ha); src_g.append(gi)
raw, near, cum, graw = access(src_lon, src_lat, src_w, 400, 1600, "green", src_g, len(greens))
COEF = {"a": 1.0, "s": 0.5, "n": 0.2}; GREEN_R = 5.0
wraw = sum(COEF[c["cat"]] * graw[i] for i, c in enumerate(greens))
res["green"] = score(wraw, GREEN_R); aux["green_near"] = near; aux["green_cum"] = cum
# for the app: named areas (≥ 2 ha) separately so their category can be changed; the rest summed per category
GREEN_OUT = {"coef": COEF, "R": GREEN_R, "rest": {}, "areas": []}
rest = {k: np.zeros(NC) for k in "asn"}
flat = cells[:, 0] * W + cells[:, 1]
for i, c in enumerate(greens):
    if c["n"] and c["ha"] >= 2:
        nz = np.where(graw[i] > 0.002)[0]
        lon, lat = to_ll(c["g"].representative_point()).coords[0]
        GREEN_OUT["areas"].append({"id": c["osm"], "n": c["n"], "cat": c["cat"], "ha": round(c["ha"], 1), "uha": round(c["use"].area / 1e4, 1), "km": round(c["pkm"], 1),
                                   "c": [round(lon, 5), round(lat, 5)], "k": flat[nz].tolist(), "v": [round(float(x), 3) for x in graw[i][nz]]})
    else: rest[c["cat"]] += graw[i]
GREEN_OUT["areas"].sort(key=lambda a: -a["ha"])
log("named green areas", len(GREEN_OUT["areas"]), "by cat", {k: sum(1 for a in GREEN_OUT["areas"] if a["cat"] == k) for k in "asn"})

# ---------------------------------------------------------------- air (estimated exposure index)
RW = {"motorway": 6, "trunk": 6, "primary": 4, "secondary": 2.5, "tertiary": 1.2, "unclassified": 0.4, "residential": 0.3, "living_street": 0.1, "service": 0.1,
      "trunk_link": 3, "primary_link": 2, "secondary_link": 1.2, "tertiary_link": 0.6, "motorway_link": 3}
roads = json.load(open(os.path.join(OUT, "roads.geojson")))["features"]
P = []; Wt = []
CM = to_m(cell_lon, cell_lat)
for f in roads:
    c = f["properties"].get("c"); wgt = RW.get(c)
    if not wgt: continue
    lanes = f["properties"].get("l") or 2
    co = np.array(f["geometry"]["coordinates"]) if f["geometry"]["type"] == "LineString" else None
    if co is None or len(co) < 2: continue
    m = to_m(co[:, 0], co[:, 1])
    for a, b in zip(m, m[1:]):   # sample every ~25 m
        L = np.hypot(*(b - a)); n = max(1, int(L / 25))
        for t in (np.arange(n) + .5) / n:
            P.append(a + (b - a) * t); Wt.append(wgt * lanes / 2 * L / n)
P = np.array(P); Wt = np.array(Wt); rt = cKDTree(P)
traffic = np.zeros(NC)
for k, nb in enumerate(rt.query_ball_point(CM, 600)):
    if nb: d = np.hypot(*(P[nb] - CM[k]).T); traffic[k] = (Wt[nb] * np.exp(-d / 120)).sum()
lu = json.load(open(os.path.join(OUT, "landuse.geojson")))["features"]
ind = [shape(f["geometry"]) for f in lu if f["properties"]["z"] in ("industrial", "quarry")]
IP, IW = [], []
for g in ind:
    for p in getattr(g, "geoms", [g]):
        a = p.area * MX * MY
        if a < 3000: continue
        n = max(1, int(a / 20000)); c = p.representative_point()
        IP.append(to_m(c.x, c.y)[0]); IW.append(a / 1e4)
IP = np.array(IP); IW = np.array(IW); it = cKDTree(IP)
indus = np.zeros(NC)
for k, nb in enumerate(it.query_ball_point(CM, 2000)):
    if nb: d = np.hypot(*(IP[nb] - CM[k]).T); indus[k] = (IW[nb] * np.exp(-d / 400)).sum()
E = traffic / 1000 + indus * 0.6
popc = POP[cells[:, 0], cells[:, 1]]
ref = np.median(E[popc > 5])
res["air"] = np.round(100 * np.exp(-E / (2.2 * ref))).astype(int)
aux["air_traffic"] = traffic; aux["air_indus"] = indus
log("air median exposure", round(ref, 2))

# ---------------------------------------------------------------- write
def full(v, nod=-1, dec=0):
    a = np.full((H, W), nod, float); a[cells[:, 0], cells[:, 1]] = v
    a = np.where(np.isfinite(a), a, nod)
    return [round(float(x), dec) if dec else int(x) for x in a.ravel()]
out = {"kx0": kx0, "ky0": ky0, "W": W, "H": H, "dx": CX, "dy": CY,
       "s": {k: full(v) for k, v in res.items()},
       "near": {k: full(np.minimum(aux[k + "_near"], 9999)) for k in ("transit", "health", "school", "green")},
       "cum": {"transit": full(aux["transit_cum"]), "green": full(aux["green_cum"], dec=1), "health": full(aux["health_cum"], dec=1), "school": full(aux["school_cum"])},
       "green": {**GREEN_OUT, "rest": {k: full(v, 0, 3) for k, v in rest.items()}},
       "pop": [round(float(x), 1) for x in POP.ravel()], "jobs": [round(float(x), 1) for x in JOBS.ravel()]}
json.dump(out, open(os.path.join(OUT, "statgrid.json"), "w"), separators=(",", ":"))
log("statgrid.json", round(os.path.getsize(os.path.join(OUT, "statgrid.json")) / 1e6, 2), "MB")
pw = popc / popc.sum()
for k, v in res.items():
    print(k, "pop-weighted mean", round(float((v * pw).sum()), 1), "share of residents <40:", round(float(pw[v < 40].sum()) * 100, 1), "%")
for k in ("transit", "health", "school", "green"):
    nn = aux[k + "_near"]; print(k, "median nearest (m, residents)", int(np.median(np.repeat(nn[popc > 0], 1))))
