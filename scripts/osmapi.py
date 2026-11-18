"""Tiny polite OSM API client with on-disk cache."""
import json, os, time, urllib.request, urllib.error, hashlib
UA = "chisinau-map-builder/0.1 (open-data city map)"
CACHE = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "cache")
os.makedirs(CACHE, exist_ok=True)
_last = [0.0]
def get(url, delay=1.0, retries=4):
    key = hashlib.sha1(url.encode()).hexdigest()
    p = os.path.join(CACHE, key + ".json")
    if os.path.exists(p):
        with open(p) as f: return json.load(f)
    for a in range(retries):
        wait = delay - (time.time() - _last[0])
        if wait > 0: time.sleep(wait)
        _last[0] = time.time()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=180) as r:
                data = json.loads(r.read())
            with open(p, "w") as f: json.dump(data, f)
            return data
        except urllib.error.HTTPError as e:
            if e.code in (400, 404, 410, 509) and a == retries - 1 or e.code in (400, 404, 410):
                return {"error": e.code, "body": e.read().decode(errors="ignore")[:300]}
            time.sleep(5 * (a + 1))
        except Exception as e:
            print("retry", url, e); time.sleep(5 * (a + 1))
    raise RuntimeError(url)
API = "https://api.openstreetmap.org/api/0.6"
