"""Building heights, as exact as the open data allows, and a 150 m 'building height' statistic.

1. OSM height / building:levels where tagged (exact; e = 0 in the building layers).
2. Otherwise GHSL Built-Height 2018 (EC JRC, average net building height on a ~90 m grid, from satellites):
   - small houses, garages, sheds keep house-like heights (clipped to 3–9 m),
   - the other buildings in the same GHSL pixel are scaled so that the floor-area-weighted mean height of ALL the
     pixel's buildings equals the GHSL value (known OSM heights are kept and taken into account),
   - pixels with no GHSL value fall back to the type defaults (e = 1).
   Estimated heights get e = 2. A hold-out test on OSM-tagged buildings reports the error.
Writes the new heights into web/data/buildings_a/b.geojson (3D buildings) and adds "height" (area-weighted mean
height, m) and "hmax" to web/data/statgrid.json.
"""
import json, math, os, random
import numpy as np, rasterio
from collections import defaultdict

ROOT = os.path.join(os.path.dirname(__file__), "..")
D = os.path.join(ROOT, "web", "data")
TIF = os.path.join(ROOT, "data", "raw", "ghsl", "H2018", "GHS_BUILT_H_ANBH_E2018_GLOBE_R2023A_4326_3ss_V1_0_R5_C21.tif")
MX = 111320 * math.cos(math.radians(47)); MY = 110570
SMALL = {"garage", "garages", "shed", "hut", "kiosk", "roof", "carport", "greenhouse", "container", "toilets", "service", "transformer_tower", "cabin"}
HOUSE = {"house", "detached", "semidetached_house", "bungalow", "farm", "farm_auxiliary", "barn", "stable", "terrace"}

R = rasterio.open(TIF); A = R.read(1).astype(float); nod = R.nodata
def ghsl(lon, lat):
    r, c = R.index(lon, lat)
    if 0 <= r < A.shape[0] and 0 <= c < A.shape[1]:
        v = A[r, c]; return (r, c), (None if (nod is not None and v == nod) or v <= 0 else v)
    return None, None

files = ["buildings_a.geojson", "buildings_b.geojson"]
FC = [json.load(open(os.path.join(D, f))) for f in files]
MSB = os.path.join(ROOT, "data", "raw", "msb_add.json")   # Microsoft footprints missing from OSM: [height, ring]
msb = json.load(open(MSB)) if os.path.exists(MSB) else []
FC.append({"features": [{"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [ring]}, "properties": {"h": h, "t": "yes", "e": 1}} for h, ring in msb]})
B = []   # [fc_index, feature, footprint m², centroid, type, osm_height or None, pixel, ghsl]
for fi, fc in enumerate(FC):
    for f in fc["features"]:
        g = f["geometry"]; rings = [g["coordinates"][0]] if g["type"] == "Polygon" else [p[0] for p in g["coordinates"]]
        area = 0; cx = cy = 0; n = 0
        for ring in rings:
            for (x1, y1), (x2, y2) in zip(ring, ring[1:]): area += (x1 * y2 - x2 * y1) / 2
            for x, y in ring[:-1]: cx += x; cy += y; n += 1
        area = abs(area) * MX * MY; cx /= n; cy /= n
        p = f["properties"]; known = p["h"] if p.get("e") == 0 else None
        pix, gv = ghsl(cx, cy)
        B.append([fi, f, area, (cx, cy), p.get("t", "yes"), known, pix, gv])
print("buildings", len(B), "with OSM height", sum(1 for b in B if b[5] is not None), "with GHSL", sum(1 for b in B if b[7]))

# ---- learned model: gradient boosting trained on the buildings whose height OSM knows
from sklearn.ensemble import HistGradientBoostingRegressor
from scipy.spatial import cKDTree
from scipy.ndimage import uniform_filter, maximum_filter
A0 = np.where((A > 0) & (A != (nod if nod is not None else -9999)), A, 0)
A3, A7, M3 = uniform_filter(A0, 3), uniform_filter(A0, 7), maximum_filter(A0, 3)
TYPES = ["yes", "apartments", "house", "residential", "detached", "commercial", "retail", "industrial", "school", "garage", "garages", "shed", "office", "church", "hospital", "university", "kindergarten", "public", "warehouse", "hotel", "civic"]
XY = np.array([[(b[3][0] - 28.8327) * MX, (b[3][1] - 47.0245) * MY] for b in B])
def geomf(b):
    g = b[1]["geometry"]; ring = np.array(g["coordinates"][0] if g["type"] == "Polygon" else g["coordinates"][0][0])
    w = (ring[:, 0].max() - ring[:, 0].min()) * MX; h = (ring[:, 1].max() - ring[:, 1].min()) * MY
    return max(w, h) / max(1, min(w, h)), b[2] / max(1, w * h)
GF = np.array([geomf(b) for b in B])
base = []
for i, b in enumerate(B):
    pix = b[6]; r, c = pix if pix else (0, 0)
    base.append([A0[r, c], A3[r, c], A7[r, c], M3[r, c], math.log1p(b[2]), GF[i, 0], GF[i, 1], math.hypot(*XY[i]) / 1000, TYPES.index(b[4]) if b[4] in TYPES else len(TYPES)])
base = np.array(base)
def neigh(train_idx, query_idx):
    """mean / max / count of KNOWN heights within 150 m (excluding the building itself)."""
    t = np.array(sorted(train_idx)); tree = cKDTree(XY[t]); hv = np.array([B[i][5] for i in t])
    out = np.zeros((len(query_idx), 3))
    for n, q in enumerate(query_idx):
        nb = [k for k in tree.query_ball_point(XY[q], 150) if t[k] != q]
        if nb: v = hv[nb]; out[n] = [v.mean(), v.max(), len(nb)]
    return out
def fit_predict(train_idx, query_idx):
    Xtr = np.hstack([base[train_idx], neigh(train_idx, train_idx)]); ytr = np.array([B[i][5] for i in train_idx])
    m = HistGradientBoostingRegressor(max_iter=400, learning_rate=0.06, max_leaf_nodes=31, min_samples_leaf=15, l2_regularization=1.0,
                                      categorical_features=[8], loss="absolute_error", random_state=0).fit(Xtr, ytr)
    return np.clip(m.predict(np.hstack([base[query_idx], neigh(train_idx, query_idx)])), 2.5, 120)

random.seed(1)
tagged = [i for i, b in enumerate(B) if b[5] is not None]
test = sorted(random.sample(tagged, len(tagged) // 5)); train = sorted(set(tagged) - set(test))
pred = fit_predict(train, test); real = np.array([B[i][5] for i in test]); err = pred - real
DEF = {"apartments": 16, "house": 3.5, "residential": 16}
dflt = np.array([B[i][1]["properties"]["h"] if False else DEF.get(B[i][4], 7) for i in test])
print(f"hold-out {len(test)} OSM-tagged buildings: model MAE {np.abs(err).mean():.1f} m (median {np.median(np.abs(err)):.1f} m, ±3 m: {np.mean(np.abs(err) <= 3)*100:.0f}%), "
      f"type-default MAE {np.abs(dflt - real).mean():.1f} m, real mean {real.mean():.1f} m")
for lo, hi in [(0, 8), (8, 20), (20, 40), (40, 200)]:
    m = (real >= lo) & (real < hi)
    if m.any(): print(f"   real {lo}-{hi} m: n={m.sum()} MAE {np.abs(err[m]).mean():.1f}")
hide = test
unknown = [i for i, b in enumerate(B) if b[5] is None]
final = dict(zip(unknown, fit_predict(tagged, unknown)))
for i in tagged: final[i] = B[i][5]
for i, b in enumerate(B):
    if b[4] in SMALL and b[5] is None: final[i] = min(final[i], 4.0)
for i, b in enumerate(B):
    p = b[1]["properties"]
    if b[5] is not None: p["e"] = 0
    else: p["h"] = round(float(final[i]), 1); p["e"] = 2
for f, fc in zip(files, FC): json.dump(fc, open(os.path.join(D, f), "w"), separators=(",", ":"))
if msb: json.dump([[f["properties"]["h"], f["geometry"]["coordinates"][0]] for f in FC[2]["features"]], open(MSB, "w"), separators=(",", ":"))

# ---- 150 m statistic: floor-area-weighted mean height and tallest building per cell
sg = json.load(open(os.path.join(D, "statgrid.json")))
W, H, kx0, ky0, CX, CY = sg["W"], sg["H"], sg["kx0"], sg["ky0"], sg["dx"], sg["dy"]
sa = np.zeros(W * H); sh = np.zeros(W * H); mx = np.zeros(W * H)
for i, b in enumerate(B):
    x, y = b[3]; ii, jj = int(x / CX) - kx0, int(y / CY) - ky0
    if 0 <= ii < W and 0 <= jj < H:
        k = jj * W + ii; h = b[1]["properties"]["h"]; sa[k] += b[2]; sh[k] += b[2] * h; mx[k] = max(mx[k], h)
inside = np.array(sg["s"]["green"]) >= 0
hm = np.where(sa > 0, sh / np.maximum(sa, 1), 0)
sg["s"]["height"] = [int(round(v * 10)) if ins else -1 for v, ins in zip(hm, inside)]       # tenths of a metre
sg["hmax"] = [int(round(v)) for v in mx]
sg["hsrc"] = {"osm": int(sum(1 for b in B if b[5] is not None)), "ghsl": int(sum(1 for b in B if b[5] is None and b[7])), "default": int(sum(1 for b in B if b[5] is None and not b[7])),
              "mae": round(float(np.abs(err).mean()), 1), "within3": round(float(np.mean(np.abs(err) <= 3)) * 100), "test_n": len(hide), "mae_default": round(float(np.abs(dflt - real).mean()), 1)}
json.dump(sg, open(os.path.join(D, "statgrid.json"), "w"), separators=(",", ":"))
print("height grid written", sg["hsrc"])
