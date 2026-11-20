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
# statistics cover the whole data area around the municipality (neighbouring towns and villages too), with a ~2 km
# margin inside the edge of the downloaded data so facilities just outside are not missing
REGION = box(28.535, 46.845, 29.195, 47.205)
minx, miny, maxx, maxy = REGION.bounds
kx0, ky0 = int(minx / CX), int(miny / CY); kx1, ky1 = int(maxx / CX), int(maxy / CY)
W, H = kx1 - kx0 + 1, ky1 - ky0 + 1
pm = prep(REGION); pmun = prep(mun)
cx = np.array([(kx0 + i + .5) * CX for i in range(W)]); cy = np.array([(ky0 + j + .5) * CY for j in range(H)])
inside = np.zeros((H, W), bool)
for j in range(H):
    for i in range(W):
        inside[j, i] = pm.contains(Point(cx[i], cy[j]))
munm = np.zeros((H, W), bool)
for j in range(H):
    for i in range(W):
        if inside[j, i]: munm[j, i] = pmun.contains(Point(cx[i], cy[j]))
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

# ---------------------------------------------------------------- multi-radius access ("how many can I reach, and how close")
# For each radius r (500 m, 1, 2, 5, 10 km) count the facilities reachable within r (weighted, with a soft edge ±15%):
#     value = Σ_r  a_r · ln(1 + C_r)        a = 1 · 0.5 · 0.25 · 0.1 · 0.04
# A facility close by is counted in every radius, so it weighs most; ln() gives diminishing returns, so hundreds of
# facilities 5–10 km away cannot outweigh one within 500 m. Radii up to 2 km use walking distance on the street & path
# network; 5 and 10 km use the straight line × 1.3 (usual detour).  Score = 100 · value / value of the best-served 1%.
RADII = [(500, 1.0), (1000, 0.5), (2000, 0.25), (5000, 0.1), (10000, 0.04)]
DET = 1.3
from scipy.signal import fftconvolve
CWm, CHm = CX * MX, CY * MY
ramp = lambda d, r: np.clip((1.15 * r - np.asarray(d)) / (0.3 * r), 0, 1)
def far_count(src_lon, src_lat, weight, r):
    P = int(math.ceil(1.15 * r / DET / min(CWm, CHm))) + 1
    Wg = np.zeros((H + 2 * P, W + 2 * P))
    for x, y, w in zip(src_lon, src_lat, weight):
        i, j = int(x / CX) - kx0 + P, int(y / CY) - ky0 + P
        if 0 <= i < W + 2 * P and 0 <= j < H + 2 * P: Wg[j, i] += w
    oy, ox = np.mgrid[-P:P + 1, -P:P + 1]
    C = fftconvolve(Wg, ramp(np.hypot(ox * CWm, oy * CHm) * DET, r), mode="same")[P:P + H, P:P + W]
    return np.maximum(C[cells[:, 0], cells[:, 1]], 0)

def counts(src_lon, src_lat, weight, name, radii=RADII, group=None, ngroups=0):
    """C_r per cell for every radius; with groups, also per group for the network radii."""
    src_lon = np.asarray(src_lon, float); src_lat = np.asarray(src_lat, float); weight = np.asarray(weight, float)
    snode, ssnap = snap(src_lon, src_lat)
    grp = np.asarray(group if group is not None else np.zeros(len(snode), int))
    keep = ssnap < 300; snode, ssnap, weight, grp, slon, slat = snode[keep], ssnap[keep], weight[keep], grp[keep], src_lon[keep], src_lat[keep]
    net = [r for r, _ in radii if r <= 2000]; far = [r for r, _ in radii if r > 2000]
    C = {r: np.zeros(NC) for r in net}
    GC = {r: np.zeros((ngroups, NC), np.float32) for r in net} if ngroups else None
    order = np.argsort(snode); snode, ssnap, weight, grp = snode[order], ssnap[order], weight[order], grp[order]
    uniq, inv = np.unique(snode, return_inverse=True)
    lim = 1.15 * max(net)
    for s in range(0, len(uniq), 64):
        Dc = dijkstra(G, directed=False, indices=uniq[s:s + 64], limit=lim)[:, cnode]
        for rr in range(Dc.shape[0]):
            row = Dc[rr]; ok = np.isfinite(row)
            if not ok.any(): continue
            okidx = np.where(ok)[0]
            for m in np.where(inv == s + rr)[0]:
                d = row[ok] + csnap[ok] + ssnap[m]
                for r in net:
                    v = weight[m] * ramp(d, r); C[r][okidx] += v
                    if GC is not None: GC[r][grp[m], okidx] += v
    for r in far: C[r] = far_count(slon, slat, weight, r)
    nearest = dijkstra(G, directed=False, indices=uniq, limit=10000, min_only=True)[cnode] + csnap
    log(name, "sources", len(snode), {r: round(float(np.percentile(C[r], 50)), 1) for r in C})
    return (C, nearest, GC) if ngroups else (C, nearest)

def value(C, radii=RADII, unit=1.0): return sum(a * np.log1p(C[r] / unit) for r, a in radii)
POPC = POP[cells[:, 0], cells[:, 1]] * munm[cells[:, 0], cells[:, 1]]   # score scales are set on the municipality's residents
def score(v):
    vmax = float(np.percentile(np.repeat(v[POPC > 0], np.maximum(1, np.round(POPC[POPC > 0] / 5).astype(int))), 99))
    return np.clip(np.round(100 * v / vmax), 0, 100).astype(int), vmax

res, aux, NORM = {}, {}, {}
# ---------------------------------------------------------------- transit: lines (each counted once, at its nearest stop)
TR_RADII = [(300, 1.0), (500, 0.6), (1000, 0.25), (2000, 0.05)]
stops = [f for f in json.load(open(os.path.join(OUT, "stops.geojson")))["features"] if f["properties"]["k"] in ("bus", "trolleybus")]
lines = {}
for f in stops:
    for r in f["properties"].get("r", []):
        if not r.startswith("train"): lines.setdefault(r, []).append(f["geometry"]["coordinates"])
TC = {r: np.zeros(NC) for r, _ in TR_RADII}
for ln, pts in lines.items():
    sn, ss = snap(np.array([p[0] for p in pts]), np.array([p[1] for p in pts]))
    sn = np.unique(sn[ss < 300])
    if not len(sn): continue
    d = dijkstra(G, directed=False, indices=sn, limit=2300, min_only=True)[cnode] + csnap + 20
    for r, _ in TR_RADII: TC[r] += ramp(d, r)
sn, ss = snap(np.array([f["geometry"]["coordinates"][0] for f in stops]), np.array([f["geometry"]["coordinates"][1] for f in stops]))
tnear = dijkstra(G, directed=False, indices=np.unique(sn[ss < 300]), limit=10000, min_only=True)[cnode] + csnap
res["transit"], NORM["transit"] = score(value(TC, TR_RADII)); aux["transit_near"] = tnear; aux["transit_cum"] = np.round(TC[500])
log("transit lines", len(lines))

# ---------------------------------------------------------------- health and schools
pois = json.load(open(os.path.join(OUT, "pois.geojson")))["features"]
HW = {"hospital": 4, "clinic": 2, "doctors": 1.5, "dentist": 0.5, "laboratory": 0.5}
hp = [f for f in pois if f["properties"]["c"] == "health" and f["properties"].get("k") in HW]
C, near = counts([f["geometry"]["coordinates"][0] for f in hp], [f["geometry"]["coordinates"][1] for f in hp], [HW[f["properties"]["k"]] for f in hp], "health")
res["health"], NORM["health"] = score(value(C, unit=2.0)); aux["health_near"] = near; aux["health_cum"] = C[1000]
# general-education schools only, weighted by estimated places (build_school_cap.py): 500 places = 1
sp = [f for f in pois if f["properties"]["c"] == "school" and f["properties"].get("gen", 1)]
C, near = counts([f["geometry"]["coordinates"][0] for f in sp], [f["geometry"]["coordinates"][1] for f in sp], [f["properties"].get("cap", 500) / 500 for f in sp], "school")
res["school"], NORM["school"] = score(value(C)); aux["school_near"] = near; aux["school_cum"] = np.round(C[1000] * 500 / 10) * 10   # places within 1 km

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
munxy = to_xy(REGION.buffer(0.03))
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
GR_RADII = [(500, 1.0), (1000, 0.5), (2000, 0.25)]   # parks are used close to home: nothing beyond 2 km
GUNIT = 2.0   # ha: ln(1 + ha/2) — a 2 ha square counts, a 100 ha park counts more but not 50 times more
_, near, GC = counts(src_lon, src_lat, src_w, "green", GR_RADII, src_g, len(greens))
COEF = {"a": 1.0, "s": 0.5, "n": 0.2}
GCw = {r: sum(COEF[c["cat"]] * GC[r][i] for i, c in enumerate(greens)) for r, _ in GR_RADII}
res["green"], NORM["green"] = score(value(GCw, GR_RADII, GUNIT)); aux["green_near"] = near; aux["green_cum"] = GCw[1000]
GREEN_R = {"radii": GR_RADII, "unit": GUNIT, "vmax": NORM["green"]}
GREEN_OUT = {"coef": COEF, "norm": GREEN_R, "rest": {}, "areas": []}
rest = {k: {r: np.zeros(NC) for r, _ in GR_RADII} for k in "asn"}
flat = cells[:, 0] * W + cells[:, 1]
for i, c in enumerate(greens):
    if c["n"] and c["ha"] >= 2:
        nz = np.where(GC[2000][i] > 0.002)[0]
        lon, lat = to_ll(c["g"].representative_point()).coords[0]
        GREEN_OUT["areas"].append({"id": c["osm"], "n": c["n"], "cat": c["cat"], "ha": round(c["ha"], 1), "uha": round(c["use"].area / 1e4, 1), "km": round(c["pkm"], 1),
                                   "c": [round(lon, 5), round(lat, 5)], "k": flat[nz].tolist(), "v": {str(r): [round(float(x), 2) for x in GC[r][i][nz]] for r, _ in GR_RADII}})
    else:
        for r, _ in GR_RADII: rest[c["cat"]][r] += GC[r][i]
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
popc = POP[cells[:, 0], cells[:, 1]] * munm[cells[:, 0], cells[:, 1]]
ref = np.median(E[popc > 5])
res["air"] = np.round(100 * np.exp(-E / (2.2 * ref))).astype(int)
aux["air_traffic"] = traffic; aux["air_indus"] = indus
log("air median exposure", round(ref, 2))

# ---------------------------------------------------------------- terrain slope (how suitable the ground is for building)
# elev.bin: ~52 m grid (web-mercator, z12 pixels halved) from build_tiles.py. Slope per pixel from the elevation
# gradient (lightly smoothed, elevations are whole metres), then averaged over each 150 m cell.
# Score: <5 % → 80–100 · 5–10 % → 60–80 · 10–15 % → 40–60 · 15–25 % → 20–40 · >25 % → 0–20 (40 % and more = 0).
import struct
eb = open(os.path.join(OUT, "elev.bin"), "rb").read()
ew_, eh_, ex0, ey0 = struct.unpack("<IIII", eb[:16]); E = np.frombuffer(eb[16:], "<u2").reshape(eh_, ew_).astype(float)
from scipy.ndimage import uniform_filter
Es = uniform_filter(E, 3)
WORLD = 2 ** 12 * 128
pix = 40075016.7 * math.cos(math.radians(47)) / WORLD           # metres per pixel at Chișinău's latitude
gy, gx = np.gradient(Es, pix)
SL = np.hypot(gx, gy) * 100                                        # percent
merc_y = lambda lat: (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * WORLD
slope = np.zeros(NC)
for n_, (j, i) in enumerate(cells):
    lo0, lo1 = (kx0 + i) * CX, (kx0 + i + 1) * CX; la0, la1 = (ky0 + j) * CY, (ky0 + j + 1) * CY
    px0, px1 = int((lo0 + 180) / 360 * WORLD - ex0), int((lo1 + 180) / 360 * WORLD - ex0) + 1
    py0, py1 = int(merc_y(la1) - ey0), int(merc_y(la0) - ey0) + 1
    blk = SL[max(0, py0):min(eh_, py1), max(0, px0):min(ew_, px1)]
    slope[n_] = float(blk.mean()) if blk.size else 0
res["slope"] = np.round(np.interp(slope, [0, 5, 10, 15, 25, 40], [100, 80, 60, 40, 20, 0])).astype(int)
aux["slope_pct"] = slope
log("slope % residents median", round(float(np.median(slope[POPC > 0])), 1), "share of land > 15 %", round(float((slope > 15).mean()) * 100, 1))

# ---------------------------------------------------------------- write
def full(v, nod=-1, dec=0):
    a = np.full((H, W), nod, float); a[cells[:, 0], cells[:, 1]] = v
    a = np.where(np.isfinite(a), a, nod)
    return [round(float(x), dec) if dec else int(x) for x in a.ravel()]
out = {"kx0": kx0, "ky0": ky0, "W": W, "H": H, "dx": CX, "dy": CY,
       "s": {k: full(v) for k, v in res.items()},
       "near": {k: full(np.minimum(np.round(aux[k + "_near"]), 99999)) for k in ("transit", "health", "school", "green")},
       "norm": NORM,
       "slope_pct": full(np.round(aux["slope_pct"] * 10), 0),   # slope in tenths of a percent
       "cum": {"transit": full(aux["transit_cum"]), "green": full(aux["green_cum"], dec=1), "health": full(aux["health_cum"], dec=1), "school": full(aux["school_cum"])},   # transit: lines within 500 m; others: weight within 1 km
       "green": {**GREEN_OUT, "rest": {k: {str(r): full(v[r], 0, 2) for r, _ in GR_RADII} for k, v in rest.items()}},
       "mun": [int(x) for x in munm.ravel()],
       "pop": [round(float(x), 1) for x in POP.ravel()], "jobs": [round(float(x), 1) for x in JOBS.ravel()]}
json.dump(out, open(os.path.join(OUT, "statgrid.json"), "w"), separators=(",", ":"))
log("statgrid.json", round(os.path.getsize(os.path.join(OUT, "statgrid.json")) / 1e6, 2), "MB")
pw = popc / popc.sum()
for k, v in res.items():
    print(k, "pop-weighted mean", round(float((v * pw).sum()), 1), "share of residents <40:", round(float(pw[v < 40].sum()) * 100, 1), "%")
for k in ("transit", "health", "school", "green"):
    nn = aux[k + "_near"]; print(k, "median nearest (m, residents)", int(np.median(np.repeat(nn[popc > 0], 1))))
for nm, lon, lat in [("centru", 28.835, 47.024), ("Botanica Dacia", 28.86, 46.985), ("Ciocana", 28.89, 47.04), ("Buiucanii Noi", 28.79, 47.03), ("Durlesti", 28.76, 47.02), ("Codru", 28.80, 46.975), ("Bacioi", 28.885, 46.912), ("Budesti", 28.98, 47.07), ("Truseni", 28.70, 47.07)]:
    i, j = int(lon / CX) - kx0, int(lat / CY) - ky0; k = np.where((cells[:, 0] == j) & (cells[:, 1] == i))[0]
    if len(k): k = k[0]; print(nm, {s: int(res[s][k]) for s in res}, "lines<=500m", int(aux["transit_cum"][k]), "near school m", int(aux["school_near"][k]))
