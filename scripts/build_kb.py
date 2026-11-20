"""City knowledge base for the assistant: plain-text Wikipedia articles about Chișinău (ro / en / ru), split into
passages with their source. Wikipedia text is CC BY-SA 4.0: every passage keeps its article title and URL so answers
can cite it.  Output: web/data/kb.json  {"src": [[lang, title, url], ...], "p": [[src_index, heading, text], ...]}
"""
import json, os, re, time, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "data", "raw", "kb"); os.makedirs(CACHE, exist_ok=True)
OUT = os.path.join(ROOT, "web", "data", "kb.json")
UA = {"User-Agent": "city-atlas-prototype/1.0 (educational; wikipedia API)"}

def api(lang, **q):
    q.update(format="json", formatversion=2)
    url = f"https://{lang}.wikipedia.org/w/api.php?" + urllib.parse.urlencode(q)
    for i in range(8):
        try:
            time.sleep(3)
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r: return json.load(r)
        except Exception as e:
            time.sleep(60 * (i + 1)); err = e
    raise err

def extract(lang, title):
    fn = os.path.join(CACHE, f"{lang}_{re.sub(r'[^0-9A-Za-zĂÂÎȘȚăâîșțА-Яа-я_-]+', '_', title)[:90]}.json")
    if os.path.exists(fn): return json.load(open(fn))
    d = api(lang, action="query", prop="extracts", explaintext=1, exsectionformat="wiki", redirects=1, titles=title)
    pg = d["query"]["pages"][0]
    res = None if pg.get("missing") else {"title": pg["title"], "text": pg.get("extract", "")}
    json.dump(res, open(fn, "w"), ensure_ascii=False)
    return res

def links(lang, title):
    out, cont = [], {}
    while True:
        d = api(lang, action="query", prop="links", pllimit="max", plnamespace=0, redirects=1, titles=title, **cont)
        out += [l["title"] for p in d["query"]["pages"] for l in p.get("links", [])]
        if "continue" not in d: return out
        cont = d["continue"]

CORE = {
 "ro": ["Chișinău", "Istoria Chișinăului", "Municipiul Chișinău", "Sectorul Centru", "Sectorul Buiucani", "Sectorul Botanica", "Sectorul Ciocana", "Sectorul Rîșcani",
        "Catedrala Mitropolitană Nașterea Domnului din Chișinău", "Arcul de Triumf din Chișinău", "Grădina Publică „Ștefan cel Mare și Sfânt”", "Parcul Valea Morilor",
        "Parcul Catedralei din Chișinău", "Piața Marii Adunări Naționale", "Bulevardul Ștefan cel Mare și Sfânt", "Muzeul Național de Istorie a Moldovei",
        "Muzeul Național de Etnografie și Istorie Naturală", "Muzeul Național de Artă al Moldovei", "Teatrul Național „Mihai Eminescu”", "Teatrul Național de Operă și Balet „Maria Bieșu”",
        "Palatul Republicii (Chișinău)", "Casa Guvernului (Chișinău)", "Clădirea Parlamentului Republicii Moldova", "Primăria Chișinău", "Turnul de apă din Chișinău",
        "Circul din Chișinău", "Gara Chișinău", "Aeroportul Internațional Chișinău", "Troleibuzul în Chișinău", "Transportul în Chișinău", "Universitatea de Stat din Moldova",
        "Grădina Botanică din Chișinău", "Valea Trandafirilor", "Lacul Ghidighici", "Monumentul lui Ștefan cel Mare din Chișinău", "Lista primarilor Chișinăului",
        "Cricova (vinărie)", "Mileștii Mici (vinărie)", "Pogromul de la Chișinău", "Ghetoul din Chișinău", "Cetatea Chișinăului", "Sinagoga din Chișinău",
        "Biserica Sfântul Teodor Tiron din Chișinău", "Biserica Mazarache", "Stadionul Zimbru", "Muzeul Satului din Chișinău", "Parcul La Izvor", "Parcul Dendrariu",
        "Consiliul Municipal Chișinău", "Durlești", "Codru, Chișinău", "Vatra, Chișinău", "Cricova", "Sîngera", "Vadul lui Vodă", "Ialoveni", "Stăuceni", "Băcioi", "Trușeni"],
 "en": ["Chișinău", "History of Chișinău", "Timeline of Chișinău", "Chișinău Municipality", "Trolleybuses in Chișinău", "Chișinău International Airport", "Chișinău railway station",
        "Nativity Cathedral, Chișinău", "Triumphal Arch, Chișinău", "Stephen the Great Central Park", "Valea Morilor", "Great National Assembly Square", "Stephen the Great Monument",
        "Kishinev pogrom", "Chișinău Ghetto", "Moldova State University", "Cricova (winery)", "Mileștii Mici (winery)", "Economy of Moldova", "Moldova", "Palace of the Republic (Moldova)",
        "Government House, Chișinău", "Botanica (Chișinău)", "Buiucani", "Ciocana", "Rîșcani, Chișinău", "Centru, Chișinău", "Durlești", "Codru, Chișinău", "Cricova", "Vadul lui Vodă"],
 "ru": ["Кишинёв", "История Кишинёва", "Кишинёвский троллейбус", "Кишинёвский погром", "Собор Рождества Христова (Кишинёв)", "Триумфальная арка (Кишинёв)"],
}
src, P = [], []
seen = set()
def add(lang, title):
    e = extract(lang, title)
    if not e or len(e["text"]) < 400 or (lang, e["title"]) in seen: return 0
    seen.add((lang, e["title"]))
    si = len(src); src.append([lang, e["title"], f"https://{lang}.wikipedia.org/wiki/" + urllib.parse.quote(e["title"].replace(" ", "_"))])
    head, buf, n = "", [], 0
    def flush():
        nonlocal buf, n
        t = " ".join(buf).strip()
        if len(t) > 60: P.append([si, head, t]); n += 1
        buf = []
    for line in e["text"].split("\n"):
        line = line.strip()
        if not line: continue
        m = re.match(r"^(=+)\s*(.*?)\s*=+$", line)
        if m:
            flush(); head = m.group(2)
            if re.match(r"(Note|Bibliografie|Legături externe|Vezi și|References|External links|See also|Further reading|Примечания|Литература|Ссылки|См\. также)", head, re.I): head = "__skip__"
            continue
        if head == "__skip__": continue
        for sent in re.split(r"(?<=[.!?])\s+", line):
            buf.append(sent)
            if sum(len(x) for x in buf) > 700: flush()
        flush()
    return n
for lang, titles in CORE.items():
    for t in titles: print(lang, t, add(lang, t))
# articles linked from the main Romanian article whose title mentions Chișinău (streets, buildings, institutions…)
extra = [t for t in links("ro", "Chișinău") if "Chișinău" in t or "Chișinăului" in t]
print("linked", len(extra))
for t in extra[:180]: add("ro", t)
json.dump({"src": src, "p": P}, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
print("articles", len(src), "passages", len(P), "MB", round(os.path.getsize(OUT) / 1e6, 2))
