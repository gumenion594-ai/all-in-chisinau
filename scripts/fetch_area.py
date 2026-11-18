"""Download all OSM data in the study bbox via the OSM API map call (quadtree split on overflow).
Merges into data/raw/area.json (dedup by type/id)."""
import json, sys, os
from osmapi import get, API
import sys
W, S, E, N = (28.53, 46.84, 29.15, 47.18) if len(sys.argv) < 2 else tuple(map(float, sys.argv[1].split(",")))
STEP = 0.05
elements = {}
calls = [0]
def fetch(w, s, e, n, depth=0):
    url = f"{API}/map.json?bbox={w:.5f},{s:.5f},{e:.5f},{n:.5f}"
    d = get(url, delay=1.0); calls[0] += 1
    if "error" in d:
        mw, ms = (w + e) / 2, (s + n) / 2
        print("  " * depth + f"split {w:.3f},{s:.3f} ({d['error']})", flush=True)
        for q in ((w, s, mw, ms), (mw, s, e, ms), (w, ms, mw, n), (mw, ms, e, n)):
            fetch(*q, depth + 1)
        return
    for el in d["elements"]:
        elements[(el["type"], el["id"])] = el
x = W
cells = []
while x < E - 1e-9:
    y = S
    while y < N - 1e-9:
        cells.append((x, y, min(x + STEP, E), min(y + STEP, N))); y += STEP
    x += STEP
for i, c in enumerate(cells):
    fetch(*c)
    print(f"cell {i+1}/{len(cells)} calls={calls[0]} elements={len(elements)}", flush=True)
out = os.path.join(os.path.dirname(__file__), "..", "data", "raw", sys.argv[2] if len(sys.argv) > 2 else "area.json")
json.dump({"elements": list(elements.values())}, open(out, "w"))
print("done", len(elements))
