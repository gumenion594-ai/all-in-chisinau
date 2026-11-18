"""Build thematic layers from data/raw/area.json:
landuse (zoning), roads (+lanes, bike, projects), transit (routes, stops, train),
buildings (3D), base (water lines, rail), labels, and residential weights for population."""
import json, os, re
from collections import defaultdict, Counter
from shapely.geometry import mapping, box, LineString
from shapely.ops import unary_union, linemerge
from shapely import set_precision
from osmgeom import OSMStore, polys_only
from osmapi import get, API

ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "web", "data")
os.makedirs(OUT, exist_ok=True)
BBOX = box(28.53, 46.84, 29.20, 47.21)

els = json.load(open(os.path.join(RAW, "area.json")))["elements"]
for _x in ("extra_e.json", "extra_n.json"):
    if os.path.exists(os.path.join(RAW, _x)):
        els += json.load(open(os.path.join(RAW, _x)))["elements"]
S = OSMStore(els)
print("nodes", len(S.nodes), "ways", len(S.ways), "rels", len(S.rels))


def write(name, feats):
    p = os.path.join(OUT, name)
    json.dump({"type": "FeatureCollection", "features": feats}, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{name}: {len(feats)} features, {os.path.getsize(p)/1e6:.1f} MB")


def F(g, props, tol=0.00002, prec=0.00001):
    if tol:
        g = g.simplify(tol, preserve_topology=True)
    g = set_precision(g, prec)
    if g.is_empty:
        return None
    return {"type": "Feature", "properties": props, "geometry": mapping(g)}


def nm(t):
    return t.get("name:ro") or t.get("name")


# ------------------------------------------------------------------ zoning
def zone_of(t):
    lu, nat, lei, am = t.get("landuse"), t.get("natural"), t.get("leisure"), t.get("amenity")
    if nat in ("water",) or lu in ("reservoir", "basin") or t.get("water"):
        return "water"
    if nat == "wetland": return "wetland"
    if lu in ("forest",) or nat == "wood": return "forest"
    if lei in ("park", "garden", "nature_reserve") or lu in ("recreation_ground", "village_green"): return "park"
    if lei in ("pitch", "stadium", "sports_centre", "track", "golf_course", "water_park"): return "sport"
    if lu == "cemetery" or am == "grave_yard": return "cemetery"
    if lu in ("residential",): return "residential"
    if lu in ("commercial", "retail") or am == "marketplace": return "commercial"
    if lu in ("industrial", "depot", "port", "garages", "storage"): return "industrial"
    if lu in ("farmland", "farmyard", "orchard", "vineyard", "plant_nursery", "greenhouse_horticulture", "allotments", "animal_keeping"): return "agri"
    if lu in ("meadow", "grass") or nat in ("grassland", "scrub", "heath"): return "grass"
    if lu == "military": return "military"
    if lu in ("railway",) or t.get("aeroway") == "aerodrome" or am in ("bus_station",): return "transport"
    if am in ("school", "university", "college", "kindergarten", "hospital", "clinic") or lu in ("education", "institutional", "religious", "civic_admin") or am == "place_of_worship": return "public"
    if lu in ("construction", "brownfield", "greenfield"): return "construction"
    if lu in ("quarry", "landfill") : return "quarry"
    if nat in ("bare_rock", "sand"): return "bare"
    return None


Z_ORDER = ["agri", "grass", "forest", "wetland", "residential", "commercial", "industrial", "military", "transport",
           "construction", "quarry", "bare", "public", "cemetery", "park", "sport", "water"]
zfe = []
for w in S.ways.values():
    t = w.get("tags", {})
    if "building" in t or "highway" in t: continue
    z = zone_of(t)
    if not z: continue
    g = S.way_polygon(w["id"])
    if g is None: continue
    zfe.append((z, g, t))
for r in S.rels.values():
    t = r.get("tags", {})
    if t.get("type") != "multipolygon" or "building" in t: continue
    z = zone_of(t)
    if not z: continue
    g, ok = S.rel_polygon(r["id"])
    g = polys_only(g)
    if g is None: continue
    zfe.append((z, g, t))
feats = []
zfe.sort(key=lambda x: (Z_ORDER.index(x[0]), -x[1].area))
for z, g, t in zfe:
    g = g.intersection(BBOX)
    g = polys_only(g)
    if g is None or g.area < 2e-8: continue
    f = F(g, {"z": z, "n": nm(t), "o": Z_ORDER.index(z)}, tol=0.00003)
    if f: feats.append(f)
write("landuse.geojson", feats)

# water lines (rivers/streams/canals) + railways basemap
base = []
for w in S.ways.values():
    t = w.get("tags", {})
    if t.get("waterway") in ("river", "stream", "canal", "ditch", "drain"):
        g = S.way_line(w["id"])
        if g is not None:
            f = F(g, {"k": "water", "w": t["waterway"], "n": nm(t)})
            if f: base.append(f)
write("base.geojson", base)

# ------------------------------------------------------------------ roads
ROAD_CLASSES = ["motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential",
                "living_street", "service", "pedestrian", "track", "cycleway", "footway", "path", "construction", "proposed"]
DEF_LANES = {"motorway": 4, "trunk": 4, "primary": 4, "secondary": 2, "tertiary": 2, "unclassified": 2,
             "residential": 2, "living_street": 1, "service": 1, "pedestrian": 0, "track": 1}


def lanes_of(t, cls):
    v = t.get("lanes")
    if v:
        m = re.match(r"\d+", v)
        if m: return int(m.group()), False
    f, b = t.get("lanes:forward"), t.get("lanes:backward")
    if f and b and f.isdigit() and b.isdigit(): return int(f) + int(b), False
    base = DEF_LANES.get(cls.replace("_link", ""), 1)
    if t.get("oneway") in ("yes", "-1") and base > 1: base = base // 2
    if cls.endswith("_link"): base = 1
    return base, True


def bike_of(t, hw):
    if hw == "cycleway": return "track"
    if t.get("bicycle") == "designated" and hw in ("path", "footway", "pedestrian"): return "path"
    vals = [t.get(k, "") for k in ("cycleway", "cycleway:both", "cycleway:left", "cycleway:right")]
    for v in vals:
        if v in ("track", "separate"): return "track"
    for v in vals:
        if v in ("lane", "opposite_lane", "buffered_lane"): return "lane"
    for v in vals:
        if v in ("shared_lane", "share_busway", "opposite_share_busway"): return "shared"
    return None


roads, bikes, projects = [], [], []
for w in S.ways.values():
    t = w.get("tags", {})
    hw = t.get("highway")
    if not hw: continue
    g = S.way_line(w["id"])
    if g is None: continue
    if t.get("area") == "yes": continue
    if t.get("tunnel") not in (None, "no") or t.get("location") in ("underground",) or t.get("indoor") == "yes":
        continue
    try:
        if int(t.get("layer", "0")) < 0: continue
    except ValueError:
        pass
    b = bike_of(t, hw)
    if b:
        f = F(g, {"b": b, "n": nm(t)})
        if f: bikes.append(f)
    if hw in ("construction", "proposed"):
        cls = t.get("construction") or t.get("proposed") or "road"
        f = F(g, {"st": hw, "c": cls, "n": nm(t), "ref": t.get("ref"), "src": "OSM"})
        if f: projects.append(f)
        continue
    if hw in ("footway", "path", "steps", "corridor", "bridleway", "platform", "elevator", "track", "bus_stop", "cycleway", "via_ferrata", "raceway", "services", "rest_area"):
        continue
    cls = hw
    ln, est = lanes_of(t, cls)
    props = {"c": cls, "l": ln, "e": 1 if est else 0, "n": nm(t), "ref": t.get("ref"),
             "ow": 1 if t.get("oneway") in ("yes", "-1") else 0}
    if t.get("bridge") and t["bridge"] != "no": props["br"] = 1
    if t.get("maxspeed"): props["ms"] = t["maxspeed"]
    if t.get("surface"): props["s"] = t["surface"]
    f = F(g, props)
    if f: roads.append(f)
# railways
rails = []
for w in S.ways.values():
    t = w.get("tags", {})
    if t.get("railway") in ("rail", "light_rail", "narrow_gauge", "construction", "abandoned", "disused"):
        g = S.way_line(w["id"])
        if g is not None:
            f = F(g, {"r": t["railway"], "srv": t.get("service"), "n": nm(t)})
            if f: rails.append(f)
write("roads.geojson", roads)
write("bike.geojson", bikes)
write("projects_osm.geojson", projects)
write("rail.geojson", rails)
print("lane tags present:", sum(1 for f in roads if not f["properties"]["e"]), "/", len(roads))

# ------------------------------------------------------------------ transit
MODES = {"bus", "trolleybus", "minibus", "share_taxi", "train", "tram", "light_rail"}
routes = {rid: r for rid, r in S.rels.items() if r.get("tags", {}).get("type") == "route" and r["tags"].get("route") in MODES}
print("transit routes:", Counter(r["tags"]["route"] for r in routes.values()))
# fetch full relations so members outside the first download are present (suburban routes)
TS = OSMStore()
TS.add(els)
for rid in routes:
    d = get(f"{API}/relation/{rid}/full.json", delay=1.0)
    if "error" not in d:
        TS.add(d["elements"])
way_routes = defaultdict(set)
route_list = []
stop_routes = defaultdict(set)
for rid, r in routes.items():
    t = r["tags"]
    mode = t["route"]
    if mode in ("minibus", "share_taxi"): mode = "minibus"
    ref = t.get("ref") or t.get("name", "?")
    key = f"{mode}:{ref}"
    route_list.append({"id": rid, "mode": mode, "ref": ref, "name": t.get("name"), "from": t.get("from"),
                       "to": t.get("to"), "op": t.get("operator"), "key": key})
    for m in r["members"]:
        if m["type"] == "way" and m.get("role", "") in ("", "forward", "backward") :
            way_routes[m["ref"]].add(key)
        elif m["type"] == "node" and ("stop" in m.get("role", "") or "platform" in m.get("role", "")):
            stop_routes[m["ref"]].add(key)
        elif m["type"] == "way" and "platform" in m.get("role", ""):
            pass
lines = []
for wid, keys in way_routes.items():
    g = TS.way_line(wid)
    if g is None: continue
    modes = sorted({k.split(":")[0] for k in keys})
    f = F(g, {"r": sorted(keys), "m": modes, "nr": len(keys)})
    if f: lines.append(f)
write("transit_lines.geojson", lines)
# stops: all bus/trolley stops + platforms + stations
stops = {}
for n in list(TS.nodes.values()):
    t = n.get("tags", {})
    kind = None
    if t.get("railway") in ("station", "halt") or (t.get("public_transport") == "station" and t.get("train") == "yes"):
        kind = "train"
    elif t.get("highway") == "bus_stop" or t.get("public_transport") == "platform":
        kind = "trolleybus" if t.get("trolleybus") == "yes" and t.get("bus") != "yes" else "bus"
    elif n["id"] in stop_routes:
        kind = "stop"
    if not kind: continue
    if n["id"] in stop_routes and kind != "train":
        ms = {k.split(":")[0] for k in stop_routes[n["id"]]}
        kind = "train" if "train" in ms else ("trolleybus" if ms == {"trolleybus"} else "bus")
    if t.get("public_transport") == "stop_position" and n["id"] not in stop_routes and kind != "train":
        continue
    stops[n["id"]] = {"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(n["lon"], 6), round(n["lat"], 6)]},
                      "properties": {"k": kind, "n": nm(t), "r": sorted(stop_routes.get(n["id"], []))}}
# drop stop_position nodes that duplicate a nearby platform (keep platforms)
write("stops.geojson", list(stops.values()))
json.dump(sorted(route_list, key=lambda r: (r["mode"], int(re.sub(r"\D", "", r["ref"]) or 0), r["ref"])),
          open(os.path.join(OUT, "routes.json"), "w"), ensure_ascii=False)

# ------------------------------------------------------------------ buildings (3D) + residential weights
DEF_LEVELS = {"apartments": 9, "dormitory": 5, "hotel": 8, "office": 6, "commercial": 3, "retail": 2,
              "industrial": 2, "warehouse": 1, "house": 1, "detached": 1, "semidetached_house": 2, "residential": 4,
              "garage": 1, "garages": 1, "shed": 1, "church": 2, "school": 3, "hospital": 5, "university": 4,
              "kindergarten": 2, "yes": 2}
RES = {"apartments": 1, "residential": 1, "house": 1, "detached": 1, "semidetached_house": 1, "dormitory": 1,
       "terrace": 1, "yes": 0.5}
blds, weights = [], []
for w in S.ways.values():
    t = w.get("tags", {})
    b = t.get("building")
    if not b or b == "no": continue
    g = S.way_polygon(w["id"])
    if g is None: continue
    h = None
    try:
        if t.get("height"): h = float(re.match(r"[\d.]+", t["height"]).group())
    except Exception: pass
    lv = None
    try:
        if t.get("building:levels"): lv = float(re.match(r"[\d.]+", t["building:levels"]).group())
    except Exception: pass
    est = h is None and lv is None
    if h is None:
        lv = lv if lv is not None else DEF_LEVELS.get(b, 2)
        h = lv * 3.0 + (1 if lv > 1 else 0.5)
    lv = lv if lv is not None else max(1, round(h / 3))
    c = g.centroid
    blds.append(F(g, {"h": round(h, 1), "t": b, "e": 1 if est else 0}, tol=0.000005))
    if b in RES:
        area_m2 = g.area * (111320 * 0.6820) * 110574  # cos(47°)
        weights.append([round(c.x, 5), round(c.y, 5), round(area_m2 * lv * RES[b], 1)])
blds = [b for b in blds if b]
print("buildings", len(blds))
half = len(blds) // 2
blds.sort(key=lambda f: f["geometry"]["coordinates"][0][0][0] if f["geometry"]["type"] == "Polygon" else 0)
write("buildings_a.geojson", blds[:half])
write("buildings_b.geojson", blds[half:])
json.dump(weights, open(os.path.join(RAW, "res_weights.json"), "w"))

# ------------------------------------------------------------------ labels
labels = []
RANK = {"city": 1, "town": 2, "suburb": 3, "village": 3, "quarter": 4, "neighbourhood": 5, "hamlet": 5}
for n in S.nodes.values():
    t = n.get("tags", {})
    p = t.get("place")
    if p in RANK and t.get("name"):
        labels.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(n["lon"], 5), round(n["lat"], 5)]},
                       "properties": {"ro": nm(t), "en": t.get("name:en") or nm(t), "ru": t.get("name:ru"), "p": p, "rk": RANK[p]}})
write("labels.geojson", labels)

# ------------------------------------------------------------------ rail with corridor fraction
from pyproj import Transformer
from shapely.ops import transform as _tf
_m = Transformer.from_crs(4326, 32635, always_xy=True).transform
mains = []
for w in S.ways.values():
    t = w.get("tags", {})
    if t.get("railway") == "rail" and t.get("tunnel") in (None, "no"):
        g = S.way_line(w["id"])
        if g is not None:
            mains.append((w["id"], t, g, _tf(_m, g)))
# corridor: walk main tracks longest-first; the part of a track already within 25 m of a counted track is a parallel track
mains.sort(key=lambda x: (x[1].get("service") is not None, -x[3].length))
covered = None
rails = []
for wid, t, g, gm in mains:
    if t.get("service"):
        cf = 0.0
    else:
        if covered is None:
            new_len = gm.length
        else:
            new_len = gm.difference(covered).length
        cf = round(min(1, new_len / gm.length), 3) if gm.length else 0
        buf = gm.buffer(25)
        covered = buf if covered is None else covered.union(buf)
    f = F(g, {"r": "rail", "srv": t.get("service"), "n": nm(t), "cf": cf, "km": round(gm.length / 1000, 4)})
    if f: rails.append(f)
for w in S.ways.values():
    t = w.get("tags", {})
    if t.get("railway") in ("light_rail", "narrow_gauge", "construction", "abandoned", "disused"):
        g = S.way_line(w["id"])
        if g is not None:
            f = F(g, {"r": t["railway"], "n": nm(t), "cf": 0, "km": 0})
            if f: rails.append(f)
write("rail.geojson", rails)

# ------------------------------------------------------------------ POIs
def poi_cat(t):
    a, sh, of, le, hc, tou = t.get("amenity"), t.get("shop"), t.get("office"), t.get("leisure"), t.get("healthcare"), t.get("tourism")
    nmx = (t.get("name") or "").lower()
    if a in ("university",): return "university"
    if a == "college" or "profesional" in nmx or "centrul de excelen" in nmx or "colegiul" in nmx: return "college"
    if a == "school": return "school"
    if a in ("kindergarten", "childcare"): return "kindergarten"
    if a == "pharmacy" or hc == "pharmacy": return "pharmacy"
    if a in ("hospital", "clinic", "doctors", "dentist") or hc in ("hospital", "clinic", "doctor", "dentist", "laboratory", "centre"): return "health"
    if sh in ("mall", "department_store"): return "mall"
    if a in ("townhall", "police", "courthouse", "fire_station", "embassy") or of in ("government", "diplomatic") or t.get("government"): return "gov"
    if a in ("restaurant", "fast_food", "food_court", "bar", "pub", "biergarten"): return "food"
    if a in ("cafe", "ice_cream"): return "cafe"
    if le in ("park", "garden") and t.get("access") not in ("private", "no"): return "park"
    if sh: return "shop"
    if of or t.get("craft") or a in ("bank", "bureau_de_change", "fuel", "car_wash", "car_rental", "post_office", "veterinary", "driving_school", "marketplace", "nightclub", "cinema", "theatre") or tou in ("hotel", "hostel", "guest_house", "motel") or le in ("fitness_centre", "sports_centre"):
        return "business"
    return None


pois = []
def add_poi(el, lon, lat):
    t = el.get("tags", {})
    c = poi_cat(t)
    if not c: return
    if c not in ("shop", "business", "park") and not t.get("name") and c not in ("pharmacy",):
        pass
    kind = t.get("amenity") or t.get("shop") or t.get("office") or t.get("healthcare") or t.get("leisure") or t.get("tourism") or t.get("craft")
    addr = " ".join(x for x in [t.get("addr:street"), t.get("addr:housenumber")] if x)
    p = {"c": c, "k": kind, "n": nm(t), "id": f'{el["type"][0]}{el["id"]}'}
    if addr: p["a"] = addr
    if t.get("opening_hours"): p["h"] = t["opening_hours"][:60]
    if t.get("website") or t.get("contact:website"): p["w"] = (t.get("website") or t.get("contact:website"))[:120]
    if t.get("brand"): p["b"] = t["brand"]
    if t.get("wikidata"): p["wd"] = t["wikidata"]
    if t.get("image"): p["img"] = t["image"]
    if t.get("wikimedia_commons"): p["cm"] = t["wikimedia_commons"]
    if c == "shop" and t.get("shop") in ("supermarket", "convenience", "grocery"): p["sub"] = "food"
    pois.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(lon, 6), round(lat, 6)]}, "properties": p})


for n in S.nodes.values():
    if n.get("tags"): add_poi(n, n["lon"], n["lat"])
for w in S.ways.values():
    t = w.get("tags")
    if not t or not poi_cat(t): continue
    g = S.way_polygon(w["id"]) or S.way_line(w["id"])
    if g is None: continue
    c = g.representative_point() if g.geom_type != "LineString" else g.interpolate(0.5, normalized=True)
    add_poi(w, c.x, c.y)
for r in S.rels.values():
    t = r.get("tags", {})
    if t.get("type") != "multipolygon" or not poi_cat(t): continue
    g, _ = S.rel_polygon(r["id"]); g = polys_only(g)
    if g is None: continue
    c = g.representative_point(); add_poi(r, c.x, c.y)
pois = [p for p in pois if BBOX.contains(__import__("shapely.geometry", fromlist=["Point"]).Point(p["geometry"]["coordinates"]))]
print("POIs", Counter(p["properties"]["c"] for p in pois))
write("pois.geojson", pois)

# all building centroids (count) with residential weight
allb = []
for w in S.ways.values():
    t = w.get("tags", {})
    b = t.get("building")
    if not b or b == "no": continue
    if t.get("location") == "underground" or t.get("layer", "0").startswith("-"): continue
    g = S.way_polygon(w["id"])
    if g is None: continue
    c = g.centroid
    lv = None
    try:
        lv = float(re.match(r"[\d.]+", t.get("building:levels", "")).group())
    except Exception:
        lv = DEF_LEVELS.get(b, 2)
    wgt = g.area * (111320 * 0.6820) * 110574 * lv * RES.get(b, 0)
    allb.append([round(c.x, 5), round(c.y, 5), round(wgt, 1)])
json.dump(allb, open(os.path.join(RAW, "bpts_all.json"), "w"))
print("building points", len(allb))
