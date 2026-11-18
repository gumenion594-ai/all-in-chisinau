"""POI post-processing: drop private gardens, flag inside-municipality (current / 2027), fetch photos."""
import json, os, re, base64, urllib.request, urllib.parse, time
from shapely.geometry import shape, Point
from shapely.prepared import prep
ROOT = os.path.join(os.path.dirname(__file__), "..")
D = os.path.join(ROOT, "web", "data")
UA = {"User-Agent": "chisinau-map-builder/0.1 (open-data city atlas)"}
admin = json.load(open(os.path.join(D, "admin.geojson")))
munc = prep(next(shape(f["geometry"]) for f in admin["features"] if f["properties"]["lvl"] == "mun" and f["properties"]["sc"] == "cur"))
munr = prep(next(shape(f["geometry"]) for f in admin["features"] if f["properties"]["lvl"] == "mun" and f["properties"]["sc"] == "ref"))
fc = json.load(open(os.path.join(D, "pois.geojson")))
side = json.load(open(os.path.join(ROOT, "data", "raw", "poi_imgs.json")))
for f in fc["features"]:
    f["properties"].update({k: v for k, v in side.get(f["properties"]["id"], {}).items() if v})
out = []
for f in fc["features"]:
    p = f["properties"]
    if p["c"] == "park" and not (p.get("k") == "park" or p.get("n")):
        continue
    pt = Point(f["geometry"]["coordinates"])
    p["i"] = (1 if munc.contains(pt) else 0) + (2 if munr.contains(pt) else 0)
    out.append(f)
fc["features"] = out
from collections import Counter
print(Counter(f["properties"]["c"] for f in out), Counter(f["properties"]["i"] for f in out))

# --- photos: wikidata P18, wikimedia_commons tag, or commons-hosted image tag
def jget(url):
    for a in range(6):
        try:
            return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read())
        except Exception as e:
            print("retry", e); time.sleep(20 * (a + 1))
    return {}
files = {}
wd = [f["properties"]["wd"] for f in out if f["properties"].get("wd")]
for i in range(0, len(wd), 45):
    ids = "|".join(wd[i:i + 45])
    d = jget("https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims&format=json&ids=" + ids)
    for q, e in d.get("entities", {}).items():
        c = e.get("claims", {}).get("P18")
        if c: files[q] = c[0]["mainsnak"]["datavalue"]["value"]
imgs = {}
for f in out:
    p = f["properties"]
    fn = files.get(p.get("wd"))
    if not fn and p.get("cm", "").startswith("File:"): fn = p["cm"][5:]
    if not fn and p.get("img"):
        m = re.search(r"commons\.wikimedia\.org/wiki/File:(.+)$|upload\.wikimedia\.org/.+/([^/]+\.(?:jpe?g|png))$", p["img"], re.I)
        if m: fn = urllib.parse.unquote(m.group(1) or m.group(2))
    if fn: imgs[p["id"]] = fn
print("photos to fetch", len(imgs))
cache = os.path.join(ROOT, "data", "raw", "photos"); os.makedirs(cache, exist_ok=True)
data = {}
for pid, fn in imgs.items():
    path = os.path.join(cache, pid + ".jpg")
    if not os.path.exists(path):
        url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(fn.replace(" ", "_")) + "?width=320"
        try:
            b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
            open(path, "wb").write(b); time.sleep(1.5)
        except Exception as e:
            if "429" in str(e):
                time.sleep(30)
                try:
                    b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
                    open(path, "wb").write(b)
                except Exception as e2:
                    print("photo fail", pid, fn, e2); continue
            else:
                print("photo fail", pid, fn, e); continue
    b = open(path, "rb").read()
    if len(b) > 60000: continue
    mime = "image/png" if b[:4] == b"\x89PNG" else "image/jpeg"
    data[pid] = {"src": f"data:{mime};base64," + base64.b64encode(b).decode(), "file": fn}
for f in out:
    if f["properties"]["id"] in data: f["properties"]["ph"] = 1
    for k in ("img", "cm"): f["properties"].pop(k, None)
json.dump(fc, open(os.path.join(D, "pois.geojson"), "w"), ensure_ascii=False, separators=(",", ":"))
json.dump(data, open(os.path.join(D, "photos.json"), "w"), separators=(",", ":"))
print("photos", len(data), round(os.path.getsize(os.path.join(D, "photos.json")) / 1e6, 1), "MB")
