"""Estimated flood exposure on the 150 m grid (no official flood map for the municipality is reachable from here).

Method: HAND — Height Above Nearest Drainage. On the ~52 m elevation grid, water is routed downhill (hollows filled,
steepest descent) and every point gets the height above the watercourse its water reaches (OSM rivers, streams, canals; culverted parts and ditches excluded) and the distance to it.
Low ground right next to a river floods first. Small streams carry less water, so their HAND is counted triple
(the same flood depth covers less ground). Safety score (100 = least exposed):
    HAND 0–0.7 m → 0–20 · 0.7–1.5 m → 20–40 · 1.5–3 m → 40–60 · 3–6 m → 60–80 · 6–12 m+ → 80–100
plus closed hollows (pits more than 2.5 m below their surroundings, where rain water collects) count as exposed.
Adds s.flood, "hand" (m, tenths) and "wdist" (m) to web/data/statgrid.json.
"""
import json, math, os, struct
import numpy as np
from scipy.ndimage import uniform_filter, distance_transform_edt, grey_closing
from osmgeom import OSMStore

ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw"); D = os.path.join(ROOT, "web", "data")
eb = open(os.path.join(D, "elev.bin"), "rb").read()
ew, eh, ex0, ey0 = struct.unpack("<IIII", eb[:16]); E = np.frombuffer(eb[16:], "<u2").reshape(eh, ew).astype(float)
Es = uniform_filter(E, 3)
WORLD = 2 ** 12 * 128; PIX = 40075016.7 * math.cos(math.radians(47)) / WORLD
merc_y = lambda lat: (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * WORLD
px = lambda lon: (lon + 180) / 360 * WORLD - ex0
py = lambda lat: merc_y(lat) - ey0

els = []
for fn in ("area.json", "extra_e.json", "extra_n.json"):
    if os.path.exists(os.path.join(RAW, fn)): els += json.load(open(os.path.join(RAW, fn)))["elements"]
S = OSMStore(els); del els
river = np.zeros((eh, ew), bool); stream = np.zeros((eh, ew), bool); n = {"river": 0, "stream": 0}
for w in S.ways.values():
    t = w.get("tags") or {}; ww = t.get("waterway")
    if ww not in ("river", "stream", "canal") or t.get("tunnel") in ("culvert", "yes") or t.get("intermittent") == "yes" and ww == "stream" and False: continue
    c = S.way_coords(w["id"])
    if not c: continue
    big = ww in ("river", "canal"); n["river" if big else "stream"] += 1
    for (x1, y1), (x2, y2) in zip(c, c[1:]):
        a, b = (px(x1), py(y1)), (px(x2), py(y2)); L = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) * 2))
        for k in range(L + 1):
            i, j = int(a[0] + (b[0] - a[0]) * k / L), int(a[1] + (b[1] - a[1]) * k / L)
            if 0 <= i < ew and 0 <= j < eh: (river if big else stream)[j, i] = True
print("waterways", n, "pixels", int(river.sum()), int(stream.sum()))
# ---- HAND along the flow of water: fill hollows (priority flood), steepest-descent (D8) direction, then every cell
# takes the elevation of the watercourse where its water ends up.
import heapq
drain = river | stream
nr, nc = Es.shape; N = nr * nc
Z = Es.ravel().copy(); F = np.full(N, np.inf); done = np.zeros(N, bool); hp = []
seeds = set(np.where(drain.ravel())[0].tolist())
for j in range(nr): seeds.add(j * nc); seeds.add(j * nc + nc - 1)
for i in range(nc): seeds.add(i); seeds.add((nr - 1) * nc + i)
for k in seeds: F[k] = Z[k]; done[k] = True; heapq.heappush(hp, (Z[k], k))
NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
down = np.full(N, -1, np.int64)
while hp:
    z, k = heapq.heappop(hp); j, i = divmod(k, nc)
    for dj, di in NB:
        jj, ii = j + dj, i + di
        if 0 <= jj < nr and 0 <= ii < nc:
            q = jj * nc + ii
            if not done[q]:
                done[q] = True; F[q] = max(Z[q], z + 1e-3); down[q] = k; heapq.heappush(hp, (F[q], q))
order = np.argsort(F, kind="stable"); dr_ = drain.ravel(); isriv = river.ravel()
lvl = np.zeros(N); kind = np.zeros(N, np.int8)   # 1 river, 2 stream, 0 map edge
for k in order:
    if dr_[k]: lvl[k] = Z[k]; kind[k] = 1 if isriv[k] else 2
    elif down[k] >= 0: lvl[k] = lvl[down[k]]; kind[k] = kind[down[k]]
    else: lvl[k] = Z[k]; kind[k] = 0
HANDr = np.maximum(0, Z - lvl).reshape(nr, nc); KIND = kind.reshape(nr, nc)
H = np.where(KIND == 1, HANDr, np.where(KIND == 2, HANDr * 3, 99.0))   # small streams: the same depth reaches a third as high
dist = distance_transform_edt(~drain) * PIX
# closed hollows where rain water collects: filled depth > 2.5 m
pit = (F.reshape(nr, nc) - Es) > 2.5
safe = np.interp(H, [0, 0.7, 1.5, 3, 6, 12], [0, 20, 40, 60, 80, 100])
safe = np.where(pit, np.minimum(safe, 45), safe)
print("HAND done; river-drained share", round(float((KIND == 1).mean()) * 100), "%")
sg = json.load(open(os.path.join(D, "statgrid.json")))
W, Hh, kx0, ky0, CX, CY = sg["W"], sg["H"], sg["kx0"], sg["ky0"], sg["dx"], sg["dy"]
inside = np.array(sg["s"]["green"]) >= 0
fs, fh, fd = [], [], []
for k in range(W * Hh):
    if not inside[k]: fs.append(-1); fh.append(-1); fd.append(-1); continue
    j, i = divmod(k, W)
    lo0, lo1 = (kx0 + i) * CX, (kx0 + i + 1) * CX; la0, la1 = (ky0 + j) * CY, (ky0 + j + 1) * CY
    a0, a1 = int(px(lo0)), int(px(lo1)) + 1; b0, b1 = int(py(la1)), int(py(la0)) + 1
    blk = (slice(max(0, b0), min(eh, b1)), slice(max(0, a0), min(ew, a1)))
    if safe[blk].size == 0: fs.append(100); fh.append(999); fd.append(9999); continue
    # the most exposed quarter of the cell decides (a flood plain at the edge of a cell matters)
    fs.append(int(round(np.percentile(safe[blk], 40)))); fh.append(int(round(float(min(99, np.percentile(H[blk], 40))) * 10))); fd.append(int(round(float(dist[blk].min()))))
sg["s"]["flood"] = fs; sg["hand"] = fh; sg["wdist"] = fd
json.dump(sg, open(os.path.join(D, "statgrid.json"), "w"), separators=(",", ":"))
pop = np.array(sg["pop"]); f = np.array(fs); m = (f >= 0) & (pop > 0)
print("flood: residents in cells with score < 20:", int(pop[m & (f < 20)].sum()), "< 40:", int(pop[m & (f < 40)].sum()), "of", int(pop[m].sum()))
