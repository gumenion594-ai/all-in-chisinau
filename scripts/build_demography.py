"""Census 2024 (BNS, final results) for the municipality, its five city sectors and every locality:
age groups and sex (tables 8.3, 8.4) and dwelling conditions (11.17 building type, 11.23 water, 11.27 bath,
11.31 sewage, 11.33 heating), plus household size and children (12.2, 12.6) for the whole municipality.
Source files: data/raw/rpl2024/*.xlsx (statistica.gov.md).  Output: web/data/demo.json
  {"mun": {...}, "u": {admin_name: {...}}}   keyed by the names used in admin.geojson (level 2 and level 3)
"""
import json, os, re, unicodedata
import openpyxl

ROOT = os.path.join(os.path.dirname(__file__), ".."); R = os.path.join(ROOT, "data", "raw", "rpl2024")
def norm(s):
    s = unicodedata.normalize("NFC", str(s)).replace("ş", "ș").replace("ţ", "ț").replace("Ş", "Ș").replace("Ţ", "Ț")
    s = re.sub(r"^\s*(or\.|com\.|mun\.|Mun\.)\s*", "", s.strip()); s = re.sub(r",.*$", "", s).strip()
    return s
def rows(fn, sh):
    return list(openpyxl.load_workbook(os.path.join(R, fn), read_only=True, data_only=True)[sh].iter_rows(values_only=True))

out = {}   # code → dict
def unit(code, name, kind):
    return out.setdefault(str(code), {"name": norm(name), "kind": kind})
# 8.4 age groups: (None, code, kind, name, total, 0-15, working, over)
for r in rows("Anexa_Localitati_RPL2024.xlsx", "8.4"):
    if r[1] is None or not isinstance(r[4], (int, float)): continue
    code = str(r[1]); 
    if not (code.startswith("1") and len(code) == 6) and code != "RM": continue
    u = unit(code, r[3], r[2]); u.update(pop=int(r[4]), a0=int(r[5] or 0), a1=int(r[6] or 0), a2=int(r[7] or 0))
for r in rows("Anexa_Localitati_RPL2024.xlsx", "8.3"):
    if len(r) < 7 or r[1] is None or not isinstance(r[4], (int, float)): continue
    code = str(r[1])
    if code in out: out[code].update(m=int(r[5] or 0), f=int(r[6] or 0))
# dwellings (structure tables, % ): code in column 0, name in column 1, total dwellings in column 2
def dwell(sh, cols):
    for r in rows("Anexa_Caracteristici_locuin%C8%9Be_ocupate_RPL2024.xlsx", sh):
        if not r or len(r) < 7 or r[1] is None or not isinstance(r[3], (int, float)): continue
        code = str(r[1]).strip()
        if code not in out or "dw_" + sh in out[code]: continue   # first block = all dwellings
        out[code]["dw_" + sh] = 1; out[code]["dw"] = int(r[3])
        for k, i in cols.items():
            if isinstance(r[i], (int, float)): out[code][k] = round(float(r[i]), 1)
dwell("11.17", {"houses": 4, "terr": 5, "blocks": 6})
dwell("11.23", {"water": 4})
dwell("11.27", {"bath": 4})
dwell("11.31", {"sewer": 4})
dwell("11.33", {"heat_c": 4, "heat_own": 5, "heat_stove": 6})
for u in out.values():
    for k in [k for k in u if k.startswith("dw_")]: del u[k]
mun = out.get("100000")
# households of the municipality (12.2: by number of persons; 12.6: with children under 18)
def find(fn, sh, key="Chișin"):
    for r in rows(fn, sh):
        if r and any(isinstance(x, str) and key in x for x in r[:3]): return r
r = next((r for r in rows("Anexa_Gospodarii_RPL2024.xlsx", "12.2") if r and str(r[1]) == "100000"), None)
if r: mun.update(hh=int(r[3]), hh_p=int(r[4]), hh1=int(r[5]), hh2=int(r[6]), hh3=int(r[7]), hh4=int(r[8]), hh5=int(r[9]), hh_avg=round(float(r[10]), 2))
r6 = next((r for r in rows("Anexa_Gospodarii_RPL2024.xlsx", "12.6") if r and str(r[1]) == "100000"), None)
if r6: mun.update(hh_kids=int(r6[3]) - int(r6[5]), hh_k1=int(r6[7]), hh_k2=int(r6[9]), hh_k3p=int(r6[3]) - int(r6[5]) - int(r6[7]) - int(r6[9]))

# match to the atlas units
A = json.load(open(os.path.join(ROOT, "web", "data", "admin.geojson")))
names2 = {f["properties"]["ro"] for f in A["features"] if f["properties"]["lvl"] == 2}
names3 = {f["properties"]["ro"] for f in A["features"] if f["properties"]["lvl"] == 3}
U = {}
for code, u in out.items():
    n = u["name"]
    m = re.match(r"Sectorul (.+)", n)
    if m:
        k = "Chișinău – sectorul " + m.group(1).replace("Rîşcani", "Rîșcani")
        if k in names2: U["2|" + k] = u
        continue
    if u["kind"] == "Comune" and n in names2: U["2|" + n] = u
    if u["kind"] == "Localitati" and n in names3: U["3|" + n] = u
    if u["kind"] == "Comune" and n in names3 and "3|" + n not in U and not any(o["kind"] == "Localitati" and o["name"] == n for o in out.values()): U["3|" + n] = u
missing2 = sorted(names2 - {k[2:] for k in U if k.startswith("2|")})
print("units matched", len(U), "level-2 missing:", missing2)
for u in list(U.values()) + [mun]: u.pop("kind", None)
json.dump({"mun": mun, "u": U, "src": "BNS, Recensământul Populației și Locuințelor 2024 (rezultate finale)"}, open(os.path.join(ROOT, "web", "data", "demo.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("mun", mun)
