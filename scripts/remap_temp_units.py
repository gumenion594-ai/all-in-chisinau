"""Re-key temp.json per-unit means after admin.geojson was rebuilt (ids change). Level 4 takes the old level-3 value
(split pieces inherit their former merged unit), level 3 groups average their level-4 parts."""
import json, os, sys
ROOT = os.path.join(os.path.dirname(__file__), ".."); D = os.path.join(ROOT, "web", "data")
old = json.load(open(sys.argv[1]))["features"]; new = json.load(open(os.path.join(D, "admin.geojson")))["features"]
key = lambda p: (p["lvl"], p["sc"], p["ro"], p.get("unit"))
oldid = {key(f["properties"]): f["properties"]["id"] for f in old}
SPLIT = {"Rîșcani": "Rîșcani-Visterniceni", "Visterniceni": "Rîșcani-Visterniceni", "Dokuceaev": "Dokuceaev-40 de ani", "40 de ani": "Dokuceaev-40 de ani"}
T = json.load(open(os.path.join(D, "temp.json")))
for mp in T["maps"].values():
    u = mp.get("u"); 
    if not u: continue
    nu = {}
    for f in new:
        p = f["properties"]
        if p["lvl"] == 4:
            ro = "Mircea cel Bătrân" if p["ro"].startswith("Cartierul 8") or p["ro"].startswith("Cartierul 9") else SPLIT.get(p["ro"], p["ro"])
            oid = oldid.get((3, p["sc"], ro, p.get("unit")))
        elif p["lvl"] in (1, 2, "ctx"):
            oid = oldid.get(key(p))
        else: continue
        if oid is not None and str(oid) in u: nu[str(p["id"])] = u[str(oid)]
    for f in new:
        p = f["properties"]
        if p["lvl"] != 3: continue
        vals = [nu[str(g["properties"]["id"])] for g in new if g["properties"]["lvl"] == 4 and g["properties"]["sc"] == p["sc"] and g["properties"].get("unit") == p.get("unit") and g["properties"].get("grp") == p["grp"] and str(g["properties"]["id"]) in nu]
        if vals: nu[str(p["id"])] = round(sum(vals) / len(vals), 1)
    mp["u"] = nu
json.dump(T, open(os.path.join(D, "temp.json"), "w"), separators=(",", ":"))
print("maps", len(T["maps"]), "units now", len(next(iter(T["maps"].values())).get("u", {})))
