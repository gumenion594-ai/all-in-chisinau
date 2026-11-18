"""One stop per physical station: merge platform/stop-position points and both directions
(same name within 150 m; unnamed points within 40 m of another point)."""
import json, os, math
D = os.path.join(os.path.dirname(__file__), "..", "web", "data")
p = os.path.join(D, "stops.geojson")
raw = json.load(open(p))
feats = raw.get("raw_features") or raw["features"]
def dist(a, b): return math.hypot((a[0] - b[0]) * 75900, (a[1] - b[1]) * 111200)
clusters = []
order = sorted(feats, key=lambda f: (f["properties"]["n"] is None, -len(f["properties"]["r"])))
for f in order:
    c = f["geometry"]["coordinates"]; n = f["properties"]["n"]
    best = None
    for cl in clusters:
        d = dist(c, cl["c"])
        if (n and cl["n"] == n and d < 150) or (not n and d < 40) or (n and not cl["n"] and d < 40):
            best = cl; break
    if best:
        best["pts"].append(c); best["r"] |= set(f["properties"]["r"])
        if f["properties"]["k"] == "trolleybus" and best["k"] == "bus" and not best["r"]: best["k"] = "trolleybus"
        if not best["n"] and n: best["n"] = n
    else:
        clusters.append({"c": c, "n": n, "k": f["properties"]["k"], "r": set(f["properties"]["r"]), "pts": [c]})
out = []
for cl in clusters:
    x = sum(q[0] for q in cl["pts"]) / len(cl["pts"]); y = sum(q[1] for q in cl["pts"]) / len(cl["pts"])
    modes = {r.split(":")[0] for r in cl["r"]}
    k = "train" if "train" in modes and cl["k"] == "train" else ("trolleybus" if modes == {"trolleybus"} else cl["k"])
    out.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(x, 6), round(y, 6)]},
                "properties": {"k": k, "n": cl["n"], "r": sorted(cl["r"]), "np": len(cl["pts"])}})
json.dump({"type": "FeatureCollection", "features": out, "raw_features": feats}, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
print("stop points", len(feats), "-> stations", len(out))
