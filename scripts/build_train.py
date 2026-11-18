"""Suburban train Sîngera – Chișinău – Strășeni: shortest path on the OSM railway graph,
stops = every station/halt within 120 m of the path (in and outside the municipality)."""
import json, os, math
import networkx as nx
from shapely.geometry import LineString, Point, mapping
ROOT = os.path.join(os.path.dirname(__file__), "..")
els = json.load(open(os.path.join(ROOT, "data/raw/area.json")))["elements"]
nodes = {e["id"]: e for e in els if e["type"] == "node"}
G = nx.Graph()
def dist(a, b):
    return math.hypot((a["lon"] - b["lon"]) * 76000, (a["lat"] - b["lat"]) * 111000)
for e in els:
    if e["type"] == "way" and e.get("tags", {}).get("railway") == "rail":
        ns = e["nodes"]
        for a, b in zip(ns, ns[1:]):
            if a in nodes and b in nodes:
                G.add_edge(a, b, w=dist(nodes[a], nodes[b]))
def nearest(nid):
    s = nodes[nid]
    return min(G.nodes, key=lambda n: dist(nodes[n], s))
A = nearest(7915730621)  # Sîngera halt (south, on Revaca–Căinari line)
B = nearest(650729154)   # Strășeni station
path = nx.shortest_path(G, A, B, weight="w")
line = LineString([(nodes[n]["lon"], nodes[n]["lat"]) for n in path])
stations = [e for e in nodes.values() if e.get("tags", {}).get("railway") in ("station", "halt")]
stops = []
for s in stations:
    p = Point(s["lon"], s["lat"])
    d = line.distance(p) * 90000
    if d < 150:
        stops.append((line.project(p), s))
stops.sort(key=lambda x: x[0])
seen, out = set(), []
for _, s in stops:
    n = s["tags"].get("name")
    if n in seen: continue
    seen.add(n); out.append(s)
print("length km", round(sum(G[a][b]["w"] for a, b in zip(path, path[1:])) / 1000, 1))
print([s["tags"]["name"] for s in out])
fc = {"type": "FeatureCollection", "features": [
    {"type": "Feature", "properties": {"k": "line", "n": "Tren suburban Sîngera – Chișinău – Strășeni"},
     "geometry": mapping(line.simplify(0.00002))}] + [
    {"type": "Feature", "properties": {"k": "stop", "n": s["tags"]["name"], "i": i + 1, "t": s["tags"]["railway"]},
     "geometry": {"type": "Point", "coordinates": [round(s["lon"], 6), round(s["lat"], 6)]}} for i, s in enumerate(out)]}
json.dump(fc, open(os.path.join(ROOT, "web/data/train.geojson"), "w"), ensure_ascii=False)
