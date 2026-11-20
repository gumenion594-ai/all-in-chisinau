"""Cut the OSM elements the Heritage and Industry maps need (data/raw/osm_her_ind.json) out of the full area extract."""
import json, os, sys, collections
sys.path.insert(0, "/home/user/chisinau-map/scripts")
RAW = "/home/user/chisinau-map/data/raw"
els = []
for fn in ("area.json", "extra_e.json", "extra_n.json"):
    els += json.load(open(os.path.join(RAW, fn)))["elements"]
keep = []
C = collections.Counter()
for e in els:
    t = e.get("tags")
    if not t: continue
    hit = False
    for k in ("man_made", "industrial", "craft", "product", "heritage", "historic", "landuse", "building", "ruins", "abandoned", "building:condition", "disused", "office", "shop", "amenity", "wikidata"):
        if k in t: pass
    if t.get("man_made") in ("works", "kiln", "silo", "wastewater_plant", "water_works", "chimney") or "industrial" in t or "craft" in t or "product" in t \
       or "heritage" in t or "historic" in t or t.get("landuse") in ("industrial", "vineyard", "quarry", "farmyard", "greenhouse_horticulture") or t.get("building") in ("greenhouse", "cowshed", "sty", "barn", "farm_auxiliary") and t.get("name") or t.get("building") in ("industrial", "manufacture", "factory", "warehouse") \
       or t.get("power") in ("plant", "generator") or "wikidata" in t or t.get("shop") in ("wine", "bakery", "dairy", "confectionery") or t.get("office") in ("company",):
        keep.append(e)
        for k in ("man_made", "industrial", "craft", "historic", "heritage", "landuse", "building", "power"):
            if k in t and (k != "building" or t[k] in ("industrial", "manufacture", "factory")): C[(k, t[k] if k not in ("building",) else t[k])] += 1
print(len(keep))
for k, v in C.most_common(30): print(k, v)
# keep node coords for ways/relations
need = set()
ways = {e["id"]: e for e in els if e["type"] == "way"}
for e in keep:
    if e["type"] == "way": need.update(e["nodes"])
    if e["type"] == "relation":
        for m in e.get("members", []):
            if m["type"] == "way" and m["ref"] in ways: need.update(ways[m["ref"]]["nodes"])
sub = keep + [e for e in els if e["type"] == "node" and e["id"] in need] + [ways[m["ref"]] for e in keep if e["type"] == "relation" for m in e.get("members", []) if m["type"] == "way" and m["ref"] in ways]
json.dump({"elements": sub}, open(os.path.join(RAW, "osm_her_ind.json"), "w"))
