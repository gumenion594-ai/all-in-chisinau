"""Heritage map ("Patrimoniu"): protected monuments of Chișinău and the surrounding localities.

Sources: Wikidata (heritage designation P1435 = the Moldovan state register of monuments, with image P18, state of
conservation P5816, demolition date P576, inception, address, architect, Wikipedia article) + OpenStreetMap
(heritage=* objects missing from Wikidata, and building tags that tell the state: ruins, abandoned, disused,
building:condition).  Photos: Wikimedia Commons thumbnails (licences on Commons), stored as data URIs in chunks.
Output: web/data/heritage.json  and  web/data/her_ph_<n>.json
"""
import base64, csv, io, json, os, re, sys, time, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from osmgeom import OSMStore

ROOT = os.path.join(os.path.dirname(__file__), ".."); RAW = os.path.join(ROOT, "data", "raw"); D = os.path.join(ROOT, "web", "data")
CACHE = os.path.join(RAW, "heritage"); os.makedirs(CACHE, exist_ok=True)
UA = {"User-Agent": "city-atlas-prototype/1.0 (educational)"}
BOX = (28.53, 46.84, 29.20, 47.21)
Q = """SELECT ?item ?itemLabel ?itemDescription ?c ?herLabel ?img ?stateLabel ?inc ?dem ?addr ?archLabel ?ro ?en ?ru WHERE {
  SERVICE wikibase:box { ?item wdt:P625 ?c . bd:serviceParam wikibase:cornerSouthWest "Point(%s %s)"^^geo:wktLiteral . bd:serviceParam wikibase:cornerNorthEast "Point(%s %s)"^^geo:wktLiteral . }
  ?item wdt:P1435 ?her .
  OPTIONAL { ?item wdt:P18 ?img . } OPTIONAL { ?item wdt:P5816 ?state . } OPTIONAL { ?item wdt:P571 ?inc . } OPTIONAL { ?item wdt:P576 ?dem . }
  OPTIONAL { ?item wdt:P6375 ?addr . FILTER(LANG(?addr) = "ro" || LANG(?addr) = "") } OPTIONAL { ?item wdt:P84 ?arch . }
  OPTIONAL { ?ro schema:about ?item ; schema:isPartOf <https://ro.wikipedia.org/> . }
  OPTIONAL { ?en schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }
  OPTIONAL { ?ru schema:about ?item ; schema:isPartOf <https://ru.wikipedia.org/> . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ro,en,ru". }
}""" % BOX
fn = os.path.join(CACHE, "wd.csv")
if not os.path.exists(fn):
    req = urllib.request.Request("https://query.wikidata.org/sparql", data=urllib.parse.urlencode({"query": Q}).encode(), headers={**UA, "Accept": "text/csv"})
    open(fn, "wb").write(urllib.request.urlopen(req, timeout=300).read())
rows = list(csv.DictReader(open(fn)))
items = {}
for r in rows:
    q = r["item"].rsplit("/", 1)[1]
    m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", r["c"])
    if not m: continue
    it = items.setdefault(q, {"q": q, "n": r["itemLabel"], "d": r["itemDescription"], "ll": [round(float(m.group(1)), 6), round(float(m.group(2)), 6)],
                              "her": set(), "img": None, "st": set(), "inc": None, "dem": None, "addr": None, "arch": set(), "wiki": None})
    it["her"].add(r["herLabel"])
    if r["img"] and not it["img"]: it["img"] = urllib.parse.unquote(r["img"].rsplit("/", 1)[1])
    if r["stateLabel"]: it["st"].add(r["stateLabel"])
    if r["inc"] and not it["inc"]: it["inc"] = r["inc"][:4]
    if r["dem"]: it["dem"] = r["dem"][:4]
    if r["addr"]: it["addr"] = r["addr"]
    if r["archLabel"] and not re.match(r"^Q\d+$", r["archLabel"]): it["arch"].add(r["archLabel"])
    it["wiki"] = it["wiki"] or r["ro"] or r["en"] or r["ru"] or None
print("wikidata heritage items", len(items))

# ---- type (colour on the map)
REL = re.compile(r"\b(biseric|catedral|mănăstir|manastir|sinagog|capel|clopotni|schit|church|cathedral|monaster|synagogue|chapel|bell tower)", re.I)
def htype(it):
    h = " ".join(it["her"]).lower(); n = it["n"]
    if re.search(r"arbore|geologic|rezerva|peisagist|grădin|dendro|hidrolog|silvic|aviafaun|natur", h): return "nat"
    if "arheolog" in h: return "arh"
    if REL.search(n) or REL.search(it["d"] or ""): return "rel"
    if "arhitectur" in h or "urbanism" in h: return "arc"
    if "artă" in h or "for public" in h: return "art"
    if "istoric" in h: return "ist"
    return "alt"

# ---- OpenStreetMap: state tags of the matching object, and registered objects missing from Wikidata
S = OSMStore(json.load(open(os.path.join(RAW, "osm_her_ind.json")))["elements"])
def centre(e):
    if e["type"] == "node": return e["lon"], e["lat"]
    if e["type"] == "way":
        c = S.way_coords(e["id"])
        if c: return sum(x for x, _ in c) / len(c), sum(y for _, y in c) / len(c)
    if e["type"] == "relation":
        pts = [p for m in e.get("members", []) if m["type"] == "way" for p in (S.way_coords(m["ref"]) or [])]
        if pts: return sum(x for x, _ in pts) / len(pts), sum(y for _, y in pts) / len(pts)
    return None
def osm_state(t):
    if t.get("building") == "ruins" or t.get("ruins") == "yes" or t.get("historic") == "ruins": return "ruină"
    if t.get("abandoned") == "yes" or t.get("building") == "abandoned" or "abandoned:building" in t: return "abandonat"
    if t.get("disused") == "yes" or "disused:building" in t: return "nefolosit"
    c = t.get("building:condition") or t.get("condition")
    return {"bad": "stare proastă", "poor": "stare proastă", "average": "stare medie", "good": "stare bună", "deteriorated": "deteriorat"}.get(c)
osm_extra = []
for e in list(S.nodes.values()) + list(S.ways.values()) + list(S.rels.values()):
    t = e.get("tags") or {}
    if not t: continue
    q = t.get("wikidata")
    if q in items:
        s = osm_state(t)
        if s: items[q]["st"].add(s)
        continue
    if ("heritage" in t or "heritage:operator" in t) and (t.get("name") or t.get("historic")):
        c = centre(e)
        if not c or not (BOX[0] < c[0] < BOX[2] and BOX[1] < c[1] < BOX[3]): continue
        hist = t.get("historic", "")
        tp = "nat" if t.get("natural") or t.get("leisure") == "park" else "arh" if hist == "archaeological_site" else "rel" if (t.get("amenity") == "place_of_worship" or REL.search(t.get("name", ""))) else "art" if hist in ("memorial", "monument") else "arc" if t.get("building") else "ist"
        osm_extra.append({"q": None, "n": t.get("name:ro") or t.get("name") or hist, "d": None, "ll": [round(c[0], 6), round(c[1], 6)], "her": {"registru (OSM)"}, "img": None,
                          "st": {s for s in [osm_state(t)] if s}, "inc": (t.get("start_date") or "")[:4] or None, "dem": None, "addr": " ".join(x for x in [t.get("addr:street"), t.get("addr:housenumber")] if x) or None,
                          "arch": {t["architect"]} if t.get("architect") else set(), "wiki": None, "tp": tp})
print("OSM heritage objects without Wikidata", len(osm_extra))

# ---- photos (Commons thumbnails, 240 px)
P = {}
for q, it in items.items():
    if not it["img"]: continue
    path = os.path.join(CACHE, q + ".jpg")
    if not os.path.exists(path):
        url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(it["img"].replace(" ", "_")) + "?width=240"
        for a in range(4):
            try:
                b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read(); open(path, "wb").write(b); time.sleep(1.2); break
            except Exception as ex:
                print("photo retry", q, str(ex)[:60]); time.sleep(30 * (a + 1))
    if os.path.exists(path):
        b = open(path, "rb").read()
        if len(b) < 90000: P[q] = ("image/png" if b[:4] == b"\x89PNG" else "image/jpeg", b)
print("photos", len(P))

# ---- output
feats, chunk, CH = [], {}, 40
for it in list(items.values()) + osm_extra:
    tp = it.get("tp") or htype(it)
    st = sorted(it["st"])
    if it["dem"] and not any("demol" in s for s in st): st.append("demolat " + it["dem"])
    removed = tp != "arh" and ((it["d"] or "").startswith("fost ") or any(h.startswith("fost ") for h in it["her"]))
    imp = "nat" if re.search(r"importanță națională|national importance", it["d"] or "") else "loc" if re.search(r"importanță locală|local importance", it["d"] or "") else None
    p = {"n": it["n"], "t": tp, "h": sorted(it["her"]), "s": st}
    for k, v in (("q", it["q"]), ("d", it["d"]), ("y", it["inc"]), ("a", it["addr"]), ("ar", sorted(it["arch"])[:3] or None), ("w", it["wiki"]), ("imp", imp), ("x", 1 if removed else None), ("f", it["img"])):
        if v: p[k] = v
    if it["q"] in P:
        ci = len(chunk) // CH if False else None
    feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": it["ll"]}, "properties": p})
# photo chunks: fixed order
ph = [f for f in feats if f["properties"].get("q") in P]
for i, f in enumerate(ph): f["properties"]["ph"] = i // CH
for c in range((len(ph) + CH - 1) // CH):
    out = {f["properties"]["q"]: "data:%s;base64,%s" % (P[f["properties"]["q"]][0], base64.b64encode(P[f["properties"]["q"]][1]).decode()) for f in ph[c * CH:(c + 1) * CH]}
    json.dump(out, open(os.path.join(D, f"her_ph_{c}.json"), "w"), separators=(",", ":"))
json.dump({"type": "FeatureCollection", "features": feats, "nph": (len(ph) + CH - 1) // CH}, open(os.path.join(D, "heritage.json"), "w"), ensure_ascii=False, separators=(",", ":"))
from collections import Counter
print("features", len(feats), Counter(f["properties"]["t"] for f in feats), "with state", sum(1 for f in feats if f["properties"]["s"]), "photo chunks", (len(ph) + CH - 1) // CH)
