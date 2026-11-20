"""Industry map ("Industrie"): everything produced in the municipality and the surrounding localities.

Sources: OpenStreetMap (man_made=works, industrial=*, producing crafts, landuse=industrial / quarry, industrial
buildings with a name, power plants) + Wikidata (factories, wineries, power stations with coordinates).
Each enterprise is classified by its tags and name (ro / ru / en keywords) into a branch.  Industrial zones
(also the unnamed ones) are kept as areas.  Output: web/data/industry.json {points FC, zones FC}
"""
import csv, json, math, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from osmgeom import OSMStore, polys_only
from shapely.geometry import mapping

ROOT = os.path.join(os.path.dirname(__file__), ".."); RAW = os.path.join(ROOT, "data", "raw"); D = os.path.join(ROOT, "web", "data")
S = OSMStore(json.load(open(os.path.join(RAW, "osm_her_ind.json")))["elements"])
SERV = {"electronics_repair", "shoemaker", "glaziery", "roofer", "photographic_laboratory", "window_construction", "photographer", "cleaning", "plumber", "hvac", "key_cutter",
        "painter", "locksmith", "electrician", "optician", "tiler", "construction", "gardener", "yes", "agricultural_engines", "hairdresser", "car_repair"}
NOTPROD = {"warehouse", "depot", "vehicle_depot", "transport", "railway", "telecommunication", "pumping_station", "gas", "oil_depot", "logistics", "storage", "port"}
SKIP_NAME = re.compile(r"pompare|pomapre|ocol silvic|rezervor|distribu(ț|ti)e a gaz|bază de transport|baza de transport|radiofar|^blocul|turn de răcire|irigare|depozit|garaj|parcare|secția de alimentare|"
                       r"transformator|antena|petrol|carburant|stație de alimentare|autobaz|parc auto|vamă|terminal|склад|насос|zona antreprenoriatului|zona economic|subzona|zona de protecț|troleibuze|autobuze|combinatul auto|depoul|întreținere|intretinere|transport auto|\\bîta|autosalubritate|radiocomunica|radio|telecom|telefonic|vamal|poligonul auto|transport special|distribuție a gazelor|parcul de|centrul tehnic comercial|comerț|comert|aproviz|service\\b|servicii locative|baza nr|biergarten|recycling|rezerve materiale", re.I)
BR = [  # branch, colour, ro, en, keyword regex (name / tags)
 ("wine", "#9c2b54", "Vinuri și băuturi", "Wine and drinks", r"winery|vin[aă]r|vinuri|\bvin\b|vin-|-vin|wine|cricova|mileștii|milestii|divin|coniac|cognac|коньяк|вин|distiller|brewery|bere\b|beer|пиво|bottling|drinks|băuturi|apă minerală|suc(uri)?\b|alcool|spirt|lion gri|carlevana|dionysos|aroma\\b|vinuri"),
 ("food", "#e8590c", "Industria alimentară", "Food industry", r"mezprod|frigider|tutun|tobacco|frigorific|zernoff|alimcom|bakery|brut[aă]r|p[aâ]ine|panifica|franzel|covrig|lapte|lact|dairy|carne|meat|mezel|cofet|confect|bucuria|ulei|moar[aă]|grinding|f[aă]in|conserv|food|aliment|zah[aă]r|puratos|porco|cereal|chips|patiser|ciocolat|cafea|coffee|хлеб|молоч|мяс|кондитер|ice cream|înghețat|carmez|incomlac|jlc|alfa-nistru|orhei-vit"),
 ("agri", "#5c940d", "Agricultură: ferme, sere, apicultură", "Farming: farms, greenhouses, bees", r"incubator|agro\\b|agro-|agri|agro-industrial|agroindustrial|crescători|crescatori|poultry|avicol|ferm[aă]|farm|ser[ae]\b|serele|greenhouse|beekeeper|apicol|stupi|tractoare|zootehn|pepinier|nursery|ouă"),
 ("build", "#868e96", "Materiale de construcții, cariere", "Building materials, quarries", r"\\bvar\\b|var-|mineral|pietri|fasad|fațad|quarry|carier|beton|concrete|c[aă]r[aă]mid|brick|asfalt|asphalt|ciment|cement|perlit|armo|piatr|stone|nisip|sand|gips|ж/б|жби|бетон|кирпич|construcț|prefabricat|macon|lafarge"),
 ("metal", "#1971c2", "Metal, mașini, electrotehnică", "Metal, machinery, electrical", r"microprovod|sudor|incomaș|incomas|mecagro|termomontaj|hidrotehnic|hydro systems|vibropribor|topaz|hidropompa|supraten|lusmecon|piese|agregat|inteh|metal|ma[sș]in|machin|automotive|truck|hidroma|electro|electrical|cablu|cable|utilaj|lumin|lumens|semicond|mezon|radiator|steel|oțel|turnăt|forg|топаз|элект|машин|завод|uzina|uzin|fabrica de ferestre|fences|gates|aluminiu|alumin"),
 ("text", "#ae3ec9", "Textile, îmbrăcăminte, încălțăminte", "Textiles, clothing, footwear", r"eterna|carpet|covor|glorit|textil|cusut|tricot|încălț|incalt|shoe|footwear|confecț|confect[ie]|sewing|tailor|dressmaker|embroider|ionel|steaua reds|cosmos|blană|piel|leather|швей|трикот|обув|ткан"),
 ("wood", "#8d5a2b", "Mobilă și prelucrarea lemnului", "Furniture and wood", r"mobil|furniture|lemn|wood|carpenter|joiner|tâmpl|tampl|мебел|дерев|парчет|parchet|uși|usi\b"),
 ("chem", "#0ca678", "Chimie, farmaceutică, plastic, sticlă", "Chemicals, pharma, plastics, glass", r"pharma|farma|chim|plast|glass|sticl|oglin|mirror|vopse|paint|cosmet|detergent|cauciuc|rubber|polimer|fabrica de stic|фарм|хим|пласт|стекл|gaz industrial|oxigen|vitamin"),
 ("print", "#5c7cfa", "Tipografii, hârtie, film, media", "Printing, paper, film, media", r"tipograf|poligraf|editur|printing|printer|paper|hârtie|hartie|carton|ambalaj|packag|film|studio|типограф|бумаг|картон|știința|stiinta|europress|bons offices"),
 ("energy", "#f59f00", "Energie, căldură, apă potabilă", "Energy, heat, drinking water", r"power|\bcet\b|cet-|termoelectr|centrală|centrala|heating|cazangeri|termocom|water_works|stația de tratare|tratare a apei|staţia de tratare|solar|photovolt|fotovolt|\bpv\b|эко|котельн|тэц|biogaz|biogas"),
]
BRC = [(k, re.compile(rx, re.I)) for k, _, _, _, rx in BR]
TAGMAP = {"winery": "wine", "brewery": "wine", "distillery": "wine", "bottling": "wine", "bakery": "food", "confectionery": "food", "food_industry": "food", "meat": "food", "dairy": "food",
          "grinding_mill": "food", "oil": "food", "poultry_farm": "agri", "beekeeper": "agri", "agriculture": "agri", "brickworks": "build", "concrete_plant": "build", "mine": "build",
          "machinery": "metal", "automotive_industry": "metal", "electrical": "metal", "metal_construction": "metal", "blacksmith": "metal", "textile": "text", "tailor": "text",
          "dressmaker": "text", "embroiderer": "text", "furniture": "wood", "wood_processing": "wood", "carpenter": "wood", "joiner": "wood", "sawmill": "wood", "pharmaceuticals": "chem",
          "glass": "chem", "chemical": "chem", "plastic": "chem", "printing": "print", "polygraphy": "print", "paper_mill": "print", "printer": "print", "heating_station": "energy",
          "water_works": "energy", "power": "energy", "handicraft": "text"}
LBL = {"winery": "Vinărie", "brewery": "Fabrică de bere", "bakery": "Brutărie", "confectionery": "Cofetărie (producție)", "quarry": "Carieră", "power_plant": "Centrală electrică",
       "poultry_farm": "Fermă avicolă", "heating_station": "Centrală termică", "water_works": "Stație de tratare a apei", "works": "Întreprindere", "beekeeper": "Apicultor"}

def geom(e):
    try:
        if e["type"] == "node": return None
        if e["type"] == "way": return polys_only(S.way_polygon(e["id"]))
        return polys_only(S.rel_polygon(e["id"])[0])
    except Exception: return None
def centre(e, g):
    if e["type"] == "node": return e["lon"], e["lat"]
    if g is not None and not g.is_empty:
        p = g.representative_point(); return p.x, p.y
    c = S.way_coords(e["id"]) if e["type"] == "way" else None
    return (sum(x for x, _ in c) / len(c), sum(y for _, y in c) / len(c)) if c else None

pts, zones, farms, anon, anonb = [], [], [], [], []
for e in list(S.nodes.values()) + list(S.ways.values()) + list(S.rels.values()):
    t = e.get("tags") or {}
    if not t: continue
    lu = t.get("landuse"); ind = t.get("industrial"); cr = t.get("craft"); mm = t.get("man_made"); pw = t.get("power")
    is_zone = lu in ("industrial", "quarry")
    farm = lu in ("farmyard", "greenhouse_horticulture") or (t.get("building") in ("greenhouse", "cowshed", "sty", "barn", "farm_auxiliary") and t.get("name"))
    prod = mm == "works" or (ind and ind not in NOTPROD) or (cr and cr not in SERV) or is_zone or t.get("building") in ("industrial", "manufacture", "factory") or pw == "plant" or "product" in t \
           or mm == "water_works" or farm
    if not prod: continue
    g = geom(e) if e["type"] != "node" else None
    if is_zone and g is not None and not g.is_empty and g.geom_type in ("Polygon", "MultiPolygon"):
        zones.append({"type": "Feature", "geometry": mapping(g.simplify(0.00005)), "properties": {"k": "q" if lu == "quarry" else "i"}})
    nm = t.get("name:ro") or t.get("name") or t.get("operator")
    area = g.area * 111320 * math.cos(math.radians(47)) * 110570 if g is not None and not g.is_empty else 0
    if farm:   # farms, sheepfolds, greenhouses: named ones, and unnamed ones of at least half a hectare
        if not nm and area < 5000: continue
        if nm and SKIP_NAME.search(nm): continue
        c = centre(e, g)
        if not c: continue
        p = {"n": nm or ("Sere" if "greenhouse" in (lu or "") + (t.get("building") or "") else "Fermă"), "b": "agri", "a": round(area / 1e4, 2) if area else None, "src": "OSM", "k": lu or t.get("building")}
        if t.get("produce") or t.get("product"): p["pr"] = t.get("produce") or t.get("product")
        if t.get("operator") and t.get("operator") != nm: p["op"] = t["operator"]
        farms.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(c[0], 6), round(c[1], 6)]}, "properties": {k: v for k, v in p.items() if v is not None}})
        continue
    if not nm and lu == "industrial" and area >= 3000 and g is not None:   # unnamed industrial site: kept, marked as such
        c = centre(e, g)
        if c: anon.append(({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(c[0], 6), round(c[1], 6)]}, "properties": {"n": "Teren industrial fără nume", "b": "anon", "a": round(area / 1e4, 2), "src": "OSM", "k": "industrial"}}, g))
        continue
    if not nm and t.get("building") in ("industrial", "manufacture", "factory") and area >= 600 and g is not None:
        c = centre(e, g)
        if c: anonb.append(({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(c[0], 6), round(c[1], 6)]}, "properties": {"n": "Clădire industrială fără nume", "b": "anon", "a": round(area / 1e4, 2), "src": "OSM", "k": "building"}}, g))
        continue
    key = ind or cr or ("power_plant" if pw == "plant" else None) or ("quarry" if lu == "quarry" else None) or mm
    if not nm and not (key in TAGMAP or key in ("power_plant", "quarry")): continue
    if lu == "quarry" and not nm: continue
    if nm and SKIP_NAME.search(nm): continue
    c = centre(e, g)
    if not c: continue
    text = " ".join(filter(None, [nm, t.get("name:ru"), t.get("product"), t.get("description"), ind, cr, key]))
    br = TAGMAP.get(ind) or TAGMAP.get(cr) or ("energy" if pw == "plant" or mm == "water_works" else "build" if lu == "quarry" else None)
    if not br: br = next((k for k, rx in BRC if rx.search(text)), "other")
    p = {"n": nm or LBL.get(key, "Întreprindere"), "b": br, "a": round(area / 1e4, 2) if area else None}
    if t.get("name:ru") and t.get("name:ru") != nm: p["ru"] = t["name:ru"]
    if t.get("product"): p["pr"] = t["product"]
    if t.get("operator") and t.get("operator") != nm: p["op"] = t["operator"]
    if t.get("website") or t.get("contact:website"): p["web"] = t.get("website") or t.get("contact:website")
    addr = " ".join(x for x in [t.get("addr:street"), t.get("addr:housenumber")] if x)
    if addr: p["ad"] = addr
    if t.get("start_date"): p["y"] = t["start_date"][:4]
    if t.get("disused") == "yes" or "disused:industrial" in t or t.get("abandoned") == "yes": p["x"] = 1
    p["src"] = "OSM"; p["k"] = key
    pts.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(c[0], 6), round(c[1], 6)]}, "properties": {k: v for k, v in p.items() if v is not None}})

# Wikidata producers
WDCLS = {"fabrică": None, "vinărie": "wine", "semiconductor fabrication plant": "metal", "combined heat and power station": "energy", "editură": "print", "afacere": None}
for r in csv.DictReader(open(os.path.join(RAW, "heritage", "wd_ind.csv"))):
    cl = r["clsLabel"]
    if cl not in WDCLS or (cl == "afacere" and "producție" not in r["indLabel"]): continue
    if cl == "editură" and not re.search(r"poligraf|tipograf", r["itemLabel"] + r["itemDescription"], re.I): continue
    m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", r["c"]); lon, lat = float(m.group(1)), float(m.group(2))
    nm = r["itemLabel"]; br = WDCLS[cl] or next((k for k, rx in BRC if rx.search(nm + " " + r["itemDescription"])), "other")
    if any(f["properties"]["n"].lower() == nm.lower() or (abs(f["geometry"]["coordinates"][0] - lon) < 0.003 and abs(f["geometry"]["coordinates"][1] - lat) < 0.002 and nm.lower()[:5] in f["properties"]["n"].lower()) for f in pts): continue
    p = {"n": nm, "b": br, "d": r["itemDescription"] or None, "y": (r["inc"] or "")[:4] or None, "web": r["web"] or None, "src": "Wikidata", "q": r["item"].rsplit("/", 1)[1]}
    if "former" in r["itemDescription"] or "fost" in r["itemDescription"]: p["x"] = 1
    pts.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(lon, 6), round(lat, 6)]}, "properties": {k: v for k, v in p.items() if v}})

# unnamed industrial sites: only where no named enterprise already stands on them; unnamed industrial buildings only
# outside every industrial zone; farms only where no named enterprise sits within 100 m
from shapely.strtree import STRtree
from shapely.geometry import Point as _P
named = [_P(f["geometry"]["coordinates"]) for f in pts]
tree = STRtree(named)
for f, g in anon:
    if not len(tree.query(g, predicate="intersects")): pts.append(f)


zall = []
for z in zones:
    from shapely.geometry import shape as _shape
    zall.append(_shape(z["geometry"]))
zt = STRtree(zall)
for f, g in anonb:
    if not len(zt.query(g.representative_point(), predicate="intersects")): pts.append(f)
for f in farms:
    q = _P(f["geometry"]["coordinates"])
    if not any(n.distance(q) < 0.0012 for n in [named[i] for i in tree.query(q.buffer(0.0012))]): pts.append(f)
# de-duplicate: same normalised name within 400 m -> keep the one with the largest area
norm = lambda s: re.sub(r"[^a-zăâîșțа-я0-9]", "", s.lower().replace("ş", "ș").replace("ţ", "ț"))
pts.sort(key=lambda f: -(f["properties"].get("a") or 0))
keep = []
for f in pts:
    x, y = f["geometry"]["coordinates"]; n = norm(f["properties"]["n"])
    generic = f["properties"]["n"] in LBL.values() or f["properties"]["n"] == "Întreprindere"
    if f["properties"]["b"] != "anon" and f["properties"]["n"] not in ("Fermă", "Sere", "Stână") and any(norm(g["properties"]["n"]) == n and abs(g["geometry"]["coordinates"][0] - x) < 0.0055 and abs(g["geometry"]["coordinates"][1] - y) < 0.0036 for g in keep): continue
    keep.append(f)
from collections import Counter
print("enterprises", len(keep), Counter(f["properties"]["b"] for f in keep), "zones", len(zones))
print([f["properties"]["n"] for f in keep if f["properties"]["b"] == "other"][:80])
json.dump({"points": {"type": "FeatureCollection", "features": keep}, "zones": {"type": "FeatureCollection", "features": zones},
           "br": [[k, c, ro, en] for k, c, ro, en, _ in BR] + [["other", "#495057", "Alte întreprinderi (profil necunoscut)", "Other enterprises (activity unknown)"], ["anon", "#adb5bd", "Terenuri și clădiri industriale fără nume", "Unnamed industrial sites and buildings"]]},
          open(os.path.join(D, "industry.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("MB", round(os.path.getsize(os.path.join(D, "industry.json")) / 1e6, 2))
