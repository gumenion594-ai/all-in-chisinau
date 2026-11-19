// ================================================================== ALL IN CHIȘINĂU — home, guide wizard, archives, assistant, login, settings (prototype)
const CENTER = [28.8327, 47.0245];
const deacc = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---------------------------------------------------------------- small read-only map used on pages
function miniMap(el, { center = CENTER, zoom = 12, interactive = true } = {}) {
  const P = pal();
  const m = new maplibregl.Map({ container: el, center, zoom, interactive, attributionControl: false, maxBounds: [[DBOX[0] - 0.05, DBOX[1] - 0.04], [DBOX[2] + 0.05, DBOX[3] + 0.04]], minZoom: 8.6, maxZoom: 18,
    style: { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": P.bg } }] } });
  m.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "© OpenStreetMap" }));
  if (interactive) m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  try { const ro = new ResizeObserver(() => m.resize()); ro.observe(el); m.on("remove", () => ro.disconnect()); } catch {}
  m.ready = new Promise((res) => m.on("load", async () => {
    const [lu, base, roads, admin] = await Promise.all(["landuse.geojson", "base.geojson", "roads.geojson", "admin.geojson"].map(load));
    m.addSource("lu", { type: "geojson", data: lu });
    m.addSource("base", { type: "geojson", data: base });
    m.addSource("roads", { type: "geojson", data: roads });
    m.addSource("adm", { type: "geojson", data: admin });
    m.addLayer({ id: "lu", type: "fill", source: "lu", paint: { "fill-color": ["match", ["get", "z"], ...Object.entries(P.zone).flat(), "#ccc"], "fill-opacity": ["match", ["get", "z"], "water", 0.8, 0.22] } });
    m.addLayer({ id: "water", type: "line", source: "base", paint: { "line-color": P.water, "line-width": ["match", ["get", "w"], "river", 1.6, 0.5] } });
    m.addLayer({ id: "roads", type: "line", source: "roads", filter: ["in", ["get", "c"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary", "residential", "unclassified"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": isDark() ? "#3a404c" : "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 10, ["match", ["get", "c"], ["motorway", "trunk", "primary"], 1.4, 0.3], 15, ["match", ["get", "c"], ["motorway", "trunk", "primary"], 7, ["secondary", "tertiary"], 5, 2.5]] } });
    m.addLayer({ id: "mun", type: "line", source: "adm", filter: ["all", ["==", ["get", "lvl"], "mun"], ["in", ["get", "sc"], ["literal", [REF(), "both"]]]],
      paint: { "line-color": P.line, "line-width": 1.6, "line-dasharray": [3, 2] } });
    res(m);
  }));
  return m;
}

// ---------------------------------------------------------------- Ghid turistic: 3 questions, then a plan on a map
const GI = {   // interest → [ro, en, colour, quota per day, total cap, filter]
  trips: ["Excursii în apropiere (până la ~25 km)", "Day trips nearby (up to ~25 km)", "#0b7285", 3, 99, (p) => p.trip || (p.c === "religion" && /manastir/.test(deacc(p.n))) || (p.c === "monument" && ["castle", "archaeological_site"].includes(p.k)) || (p.c === "museum" && /aer liber|etnograf|satului/.test(deacc(p.n)))],
  hist: ["Istorie și monumente", "History & monuments", "#c2410c", 3, 99, (p) => p.c === "monument" && ["monument", "building", "castle", "ruins", "archaeological_site", "church", "yes"].includes(p.k) && !/^buncar/.test(deacc(p.n))],
  mem: ["Memoriale", "Memorials", "#7c2d12", 1, 4, (p) => p.c === "monument" && p.k === "memorial"],
  mus: ["Muzee", "Museums", "#9333ea", 2, 99, (p) => p.c === "museum"],
  theatre: ["Teatru, operă, concerte", "Theatre, opera, concerts", "#db2777", 1, 99, (p) => p.k === "theatre"],
  cinema: ["Cinema", "Cinema", "#be185d", 1, 3, (p) => p.k === "cinema"],
  rel: ["Biserici și mănăstiri", "Churches & monasteries", "#a16207", 1, 99, (p) => p.c === "religion"],
  park: ["Parcuri în oraș", "City parks", "#15803d", 1, 99, (p) => p.c === "park"],
  nature: ["Natură, lacuri, păduri", "Nature, lakes, forests", "#166534", 1, 3, (p) => p.c === "park" && /padur|lac|vale|rezerv|dendrar|botanic|silvic/.test(deacc(p.n))],
  localfood: ["Bucătărie moldovenească", "Moldovan cuisine", "#b91c1c", 1, 99, (p) => p.c === "food" && p.k === "restaurant" && /casa|placint|hanul|tavern|mold|bunic|cuptor|mamalig|taifas|vatra|satul|basarab|bastion|gustul/.test(deacc(p.n))],
  food: ["Restaurante", "Restaurants", "#dc2626", 1, 99, (p) => p.c === "food" && p.k === "restaurant"],
  cafe: ["Cafenele și deserturi", "Cafés & desserts", "#92400e", 1, 99, (p) => p.c === "cafe"],
  wine: ["Vin și degustări", "Wine & tastings", "#7f1d1d", 2, 6, (p) => p.k === "winery" || (p.k === "wine" && p.i === 0 && /vinari|winery|bardar/.test(deacc(p.n))) || (p.k === "wine" && /combinatul de vinuri/.test(deacc(p.n))) || (p.c === "food" && /wine|vin/.test(deacc(p.n)))],
  night: ["Baruri și cluburi", "Bars & clubs", "#4338ca", 1, 99, (p) => p.k === "nightclub" || p.k === "pub" || p.k === "bar"],
  shop: ["Cumpărături (mall-uri)", "Shopping (malls)", "#0e7490", 1, 2, (p) => p.c === "mall"],
  market: ["Piețe", "Markets", "#ca8a04", 1, 2, (p) => p.k === "marketplace"],
  sport: ["Sport și mișcare", "Sport & fitness", "#0f766e", 1, 2, (p) => p.k === "sports_centre"],
  kids: ["Cu copiii", "With kids", "#2563eb", 1, 3, (p) => /copii|family|kids|aventur|zoo|circ|joac/.test(deacc(p.n))],
  gov: ["Clădiri publice și ambasade", "Public buildings & embassies", "#475569", 1, 3, (p) => p.k === "townhall" && /chisinau|primaria municipiului/.test(deacc(p.n)) || p.k === "diplomatic"],
};
const GX = (id, n, c, k = "sight") => ({ type: "Feature", properties: { c: "trip", k, n, id: "x-" + id, i: 0, trip: 1, approx: 1 }, geometry: { type: "Point", coordinates: c } });
const GEXTRA = [   // well-known places near Chișinău that are not in the POI data; coordinates approximate
  GX("milestii", "Mileștii Mici – galeriile de vinuri", [28.806, 46.910], "winery"),
  GX("capriana", "Mănăstirea Căpriana", [28.513, 47.126]),
  GX("vadul", "Vadul lui Vodă – malul Nistrului", [29.080, 47.090]),
];
const FAR_KM = 8;
const TIERS = { eco: ["Economic", "Budget", 50, 25, 18], mid: ["Mediu", "Mid-range", 100, 55, 35], comf: ["Confortabil", "Comfortable", 200, 110, 60], lux: ["Lux", "Luxury", 1e9, 200, 100] };   // [ro, en, max €/day, €/night, food €/day]
const VISIT_COST = { mus: 4, theatre: 12, cinema: 6, wine: 30, night: 12, kids: 8, sport: 8, trips: 5 };
let GPOOLS = null;
async function guidePools() {
  if (GPOOLS) return GPOOLS;
  const d = (f) => hav(CENTER, f.geometry.coordinates);
  // only places inside the area the map has data for
  const inMap = (f) => { const [x, y] = f.geometry.coordinates; return x > DBOX[0] + 0.01 && x < DBOX[2] - 0.01 && y > DBOX[1] + 0.01 && y < DBOX[3] - 0.01; };
  const all = (await load("pois.geojson")).features.filter((f) => f.properties.n && ((f.properties.i & 1) || d(f) < 35)).concat(GEXTRA).filter(inMap);
  GPOOLS = {};
  const R = { trips: 60, wine: 40, nature: 30, mus: 25, rel: 25, hist: 15, sport: 15, kids: 15, shop: 12, market: 12, park: 8 };
  for (const [k, v] of Object.entries(GI)) {
    const r = R[k] || 4;
    const inMun = (f) => (f.properties.i & 1) || f.properties.trip || ["trips", "wine", "rel", "mus", "nature"].includes(k);
    // central places first, then the best-known far ones (curated, wineries, monasteries) so trips have something to pick
    const score = (f) => d(f) + (f.properties.trip ? -30 : 0) + (k !== "trips" && d(f) > FAR_KM ? 5 : 0);
    const pri = (f) => (k === "wine" ? (f.properties.k === "winery" || /cricova|milestii|bardar|combinat|vinari/.test(deacc(f.properties.n)) ? -100 : 0) : 0);
    GPOOLS[k] = all.filter((f) => v[5](f.properties) && d(f) < r && inMun(f) && (k !== "rel" || d(f) < 4 || /manastir/.test(deacc(f.properties.n)))).sort((a, b) => (k === "trips" ? score(a) - score(b) : pri(a) + d(a) - pri(b) - d(b)));
  }
  return GPOOLS;
}
const gState = () => (SH.g ||= store.get("guide2", { step: 1, days: 3, bmode: null, tier: "mid", eur: 400, ints: ["hist", "mus", "localfood", "cafe", "park", "wine", "trips"] }));
const gSave = () => store.set("guide2", { ...SH.g, plan: undefined });

async function shGuide() {
  const g = gState(), P = await guidePools();
  const nm = (v) => L(v[0], v[1]);
  const steps = [L("Zile", "Days"), L("Buget", "Budget"), L("Interese", "Interests"), L("Planul", "Plan")];
  let h = `<ol class="gsteps">${steps.map((s, i) => `<li class="${i + 1 === g.step ? "on" : i + 1 < g.step ? "done" : ""}"><button type="button" data-gstep="${i + 1}" ${i + 1 > g.step && !(i === 3 && g.plan) ? "disabled" : ""}><b>${i + 1}</b>${s}</button></li>`).join("")}</ol>`;
  if (g.step === 1) {
    h += `<h3>${L("Câte zile stai în Chișinău?", "How many days are you staying in Chișinău?")}</h3>
      <div class="gopts">${[1, 2, 3, 4, 5, 7].map((n) => `<button type="button" class="gopt ${g.days === n ? "on" : ""}" data-gdays="${n}"><b>${n}</b><small>${n === 1 ? L("zi", "day") : L("zile", "days")}</small></button>`).join("")}</div>
      <label class="pjrow"><span>${L("Alt număr de zile", "Another number of days")}</span><input type="number" id="g-days" min="1" max="14" value="${g.days}"></label>
      <p class="small">${L("Pe hartă vezi toate locurile turistice pe care le poate include planul.", "The map shows every tourist place the plan can include.")}</p>
      <div class="btnrow"><button type="button" class="btn" data-gnext="2">${L("Mai departe", "Next")}</button></div>`;
  } else if (g.step === 2) {
    const opt = (k, title, sub) => `<button type="button" class="gopt wide ${g.bmode === k || (g.bmode === "tier" && g.tier === k) ? "on" : ""}" data-gbud="${k}"><b>${title}</b><small>${sub}</small></button>`;
    h += `<h3>${L("Ce buget ai pentru toată șederea?", "What is your budget for the whole stay?")}</h3>
      <div class="gopts">${Object.entries(TIERS).map(([k, v]) => opt(k, nm(v), k === "eco" ? L("sub 50 € pe zi", "under 50 € a day") : k === "lux" ? L("peste 200 € pe zi", "over 200 € a day") : `${Object.values(TIERS)[Object.keys(TIERS).indexOf(k) - 1][2]}–${v[2]} € ${L("pe zi", "a day")}`)).join("")}
      ${opt("none", L("Nu vreau să specific", "I'd rather not say"), L("primești un plan mediu cu costuri orientative", "you get a mid-range plan with rough costs"))}</div>
      <label class="pjrow"><span>${L("Sau o sumă exactă (€)", "Or an exact amount (€)")}</span><input type="number" id="g-eur" min="30" step="10" value="${g.bmode === "exact" ? g.eur : ""}" placeholder="${L("de ex.", "e.g.")} 400"></label>
      <div class="btnrow"><button type="button" class="btn ghost" data-gnext="1">${L("Înapoi", "Back")}</button><button type="button" class="btn" data-gnext="3" ${g.bmode ? "" : "disabled"}>${L("Mai departe", "Next")}</button></div>`;
  } else if (g.step === 3) {
    h += `<h3>${L("Ce te interesează?", "What are you interested in?")}</h3><p class="small">${L("Bifează oricâte. Harta arată locurile din fiecare categorie bifată.", "Tick as many as you like. The map shows the places in each ticked category.")}</p>
      <div class="btnrow"><button type="button" class="btn ghost sm" data-gall="1">${L("Toate", "All")}</button><button type="button" class="btn ghost sm" data-gall="0">${L("Niciuna", "None")}</button></div>
      <div class="gints">${Object.entries(GI).map(([k, v]) => `<label class="gint"><input type="checkbox" data-gint="${k}" ${g.ints.includes(k) ? "checked" : ""}><i style="background:${v[2]}"></i><span>${nm(v)}</span><small>${fmt(P[k].length)}</small></label>`).join("")}</div>
      <div class="btnrow"><button type="button" class="btn ghost" data-gnext="2">${L("Înapoi", "Back")}</button><button type="button" class="btn" id="g-make" ${g.ints.length ? "" : "disabled"}>${L("Creează planul", "Create the plan")}</button></div>`;
  } else h += g.plan ? g.plan.html : "";
  return pageHead(L("Ghid turistic", "Tourist guide"), L("Trei întrebări scurte, apoi un plan pe zile cu toate locurile marcate pe hartă.", "Three short questions, then a day-by-day plan with every place marked on the map."))
    + `<section class="gwiz"><div class="gcard">${h}</div><div class="gmapwrap"><div id="g-map" class="gmap"></div><div id="g-leg" class="gleg"></div></div></section>`;
}
async function guideMap() {
  const el = document.getElementById("g-map"); if (!el) return;
  const g = gState(), P = await guidePools();
  if (!SH.gm || SH.gm.getContainer() !== el) { SH.gm?.remove(); SH.gm = miniMap(el, { zoom: 12.4 }); SH.gmk = []; }
  const m = await SH.gm.ready;
  SH.gmk.forEach((x) => x.remove()); SH.gmk = [];
  const nm = (v) => L(v[0], v[1]);
  const leg = document.getElementById("g-leg");
  if (g.step === 4 && g.plan) {
    m.getSource("gp")?.setData({ type: "FeatureCollection", features: [] });
    const DC = ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#9c36b5", "#0c8599", "#c2255c", "#5c940d", "#3b5bdb", "#d9480f", "#087f5b", "#862e9c", "#1098ad", "#495057"];
    const lines = [];
    g.plan.days.forEach((day, di) => {
      lines.push({ type: "Feature", properties: { col: DC[di % DC.length] }, geometry: { type: "LineString", coordinates: day.map((s) => s.c) } });
      day.forEach((s, j) => {
        const e = document.createElement("button"); e.type = "button"; e.className = "gmk"; e.style.background = DC[di % DC.length]; e.textContent = `${di + 1}.${j + 1}`;
        e.title = s.n;
        e.addEventListener("click", () => new maplibregl.Popup({ offset: 12 }).setLngLat(s.c).setHTML(`<b>${esc(s.n)}</b><br><small>${L("Ziua", "Day")} ${di + 1} · ${esc(nm(GI[s.k]))}</small>`).addTo(m));
        SH.gmk.push(new maplibregl.Marker({ element: e }).setLngLat(s.c).addTo(m));
      });
    });
    if (!m.getSource("gl")) { m.addSource("gl", { type: "geojson", data: { type: "FeatureCollection", features: [] } }); m.addLayer({ id: "gl", type: "line", source: "gl", paint: { "line-color": ["get", "col"], "line-width": 2.5, "line-dasharray": [2, 1.5], "line-opacity": 0.8 } }); }
    m.getSource("gl").setData({ type: "FeatureCollection", features: lines });
    for (const h of g.plan.hotels) {
      const e = document.createElement("div"); e.className = "gmk hotel"; e.textContent = "H"; e.title = h.n;
      SH.gmk.push(new maplibregl.Marker({ element: e }).setLngLat(h.c).setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`<b>${esc(h.n)}</b><br><small>${L("cazare sugerată", "suggested stay")}</small>`)).addTo(m));
    }
    const pts = g.plan.days.flat().map((s) => s.c).concat(g.plan.hotels.map((h) => h.c));
    if (pts.length) { const b = new maplibregl.LngLatBounds(pts[0], pts[0]); pts.forEach((p) => b.extend(p)); m.fitBounds(b, { padding: 40, maxZoom: 15, duration: 0 }); }
    leg.innerHTML = g.plan.days.map((_, di) => `<span><i style="background:${DC[di % DC.length]}"></i>${L("Ziua", "Day")} ${di + 1}</span>`).join("") + `<span><i class="h">H</i>${L("cazare", "stay")}</span>`;
    return;
  }
  m.getSource("gl")?.setData({ type: "FeatureCollection", features: [] });
  const keys = g.step === 3 ? g.ints : Object.keys(GI);
  const seen = new Set(), feats = [];
  for (const k of keys) for (const f of P[k]) { if (seen.has(f.properties.id)) continue; seen.add(f.properties.id); feats.push({ type: "Feature", properties: { n: f.properties.n, col: GI[k][2], k }, geometry: f.geometry }); }
  if (!m.getSource("gp")) {
    m.addSource("gp", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    m.addLayer({ id: "gp", type: "circle", source: "gp", paint: { "circle-color": ["get", "col"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 15, 6], "circle-stroke-color": "#fff", "circle-stroke-width": 1 } });
    m.on("click", "gp", (e) => { const p = e.features[0].properties; new maplibregl.Popup({ offset: 6 }).setLngLat(e.lngLat).setHTML(`<b>${esc(p.n)}</b><br><small>${esc(nm(GI[p.k]))}</small>`).addTo(m); });
    m.on("mouseenter", "gp", () => (m.getCanvas().style.cursor = "pointer")); m.on("mouseleave", "gp", () => (m.getCanvas().style.cursor = ""));
  }
  m.getSource("gp").setData({ type: "FeatureCollection", features: feats });
  if (feats.length && SH.gfit !== keys.join()) {
    SH.gfit = keys.join();
    const b = new maplibregl.LngLatBounds(); feats.forEach((f) => b.extend(f.geometry.coordinates)); m.fitBounds(b, { padding: 30, maxZoom: 14, duration: 0 });
  }
  leg.innerHTML = `<b>${fmt(feats.length)}</b> ${L("locuri", "places")}` + keys.map((k) => `<span><i style="background:${GI[k][2]}"></i>${esc(nm(GI[k]))}</span>`).join("");
}
async function guideMake() {
  const g = gState(), P = await guidePools(), days = g.days;
  const tierK = g.bmode === "exact" ? (Object.entries(TIERS).find(([, v]) => g.eur / days < v[2]) || ["lux"])[0] : g.bmode === "none" ? "mid" : g.tier;
  const T = TIERS[tierK];
  // pick candidates per interest, nearest to the centre first
  const used = new Set(), mk = (k, f) => ({ k, n: f.properties.n, c: f.geometry.coordinates, approx: f.properties.approx, far: hav(CENTER, f.geometry.coordinates) > FAR_KM });
  const take = (f) => { if (used.has(f.properties.id) || used.has(f.properties.n)) return false; used.add(f.properties.id); used.add(f.properties.n); return true; };
  const sec = (c) => { const a = Math.atan2(c[1] - CENTER[1], (c[0] - CENTER[0]) * 0.68); return ((Math.round(a / (Math.PI / 2)) % 4) + 4) % 4; };
  // 1) day trips: everything far away from the chosen interests, grouped by direction (N, E, S, W); one direction per trip day
  const farPool = [];
  for (const k of g.ints) for (const f of P[k]) if (hav(CENTER, f.geometry.coordinates) > FAR_KM) farPool.push({ k, f });
  const famous = (f) => f.properties.approx || /combinatul de vinuri .cricova|castel|cetate/.test(deacc(f.properties.n));
  const prio = (x) => (famous(x.f) ? 0 : x.k === "wine" || x.k === "trips" ? 1 : 2) * 100 + hav(CENTER, x.f.geometry.coordinates);
  farPool.sort((a, b) => prio(a) - prio(b));
  const bySec = [[], [], [], []]; for (const x of farPool) bySec[sec(x.f.geometry.coordinates)].push(x);
  const tripDays = days < 2 ? 0 : Math.min(bySec.filter((x) => x.length).length, Math.max(1, Math.floor(days / 2)));
  const chosen = bySec.map((x, i) => ({ i, x, w: x.slice(0, 6).reduce((a, y) => a + (y.f.properties.approx ? 3 : y.k === "wine" ? 2 : 1), 0) })).filter((x) => x.x.length).sort((a, b) => b.w - a.w).slice(0, tripDays);
  const tripChunks = chosen.map((x) => { const out = []; for (const y of x.x) { if (out.length >= 5) break; if (take(y.f)) out.push(mk(y.k, y.f)); } return out; });
  const cityDays = days - tripDays;
  // 2) city days: nearest places per interest, scaled to ~7 a day
  const cand = [];
  const nearP = Object.fromEntries(g.ints.map((k) => [k, k === "trips" ? [] : P[k].filter((f) => hav(CENTER, f.geometry.coordinates) <= FAR_KM)]));
  const want = Object.fromEntries(g.ints.map((k) => [k, Math.min(GI[k][4], GI[k][3] * cityDays, nearP[k].length)]));
  const sum = Object.values(want).reduce((a, b) => a + b, 0), maxN = cityDays * 7;
  if (sum > maxN) for (const k in want) want[k] = Math.max(want[k] ? 1 : 0, Math.round(want[k] * maxN / sum));
  for (const k of g.ints) { let n = 0; for (const f of nearP[k]) { if (n >= want[k]) break; if (take(f)) { cand.push(mk(k, f)); n++; } } }
  const near = cand;
  // split into days by direction from the centre, then order each day by nearest neighbour; evening places last
  const ang = (c) => Math.atan2(c[1] - CENTER[1], (c[0] - CENTER[0]) * 0.68);
  near.sort((a, b) => ang(a.c) - ang(b.c));
  const chunks = [];
  const perC = Math.ceil(near.length / Math.max(1, cityDays));
  for (let d = 0; d < cityDays; d++) chunks.push(near.slice(d * perC, (d + 1) * perC));
  for (const tc of tripChunks) chunks.push(tc);
  // interleave: city, trip, city, ...
  const order = [], cq = chunks.slice(0, cityDays), tq = chunks.slice(cityDays);
  while (cq.length || tq.length) { if (cq.length) order.push(cq.shift()); if (tq.length) order.push(tq.shift()); }
  const out = [], tripFlag = [];
  for (const chunk of order) {
    tripFlag.push(chunk.length > 0 && chunk.every((s) => s.far));
    if (!chunk.length) { out.push([]); continue; }
    const late = chunk.filter((s) => ["night", "theatre", "cinema"].includes(s.k)), day = chunk.filter((s) => !late.includes(s));
    const ord = []; let cur = day.length ? day.reduce((a, b) => (hav(CENTER, a.c) < hav(CENTER, b.c) ? a : b)) : null;
    while (cur) { ord.push(cur); day.splice(day.indexOf(cur), 1); cur = day.length ? day.reduce((a, b) => (hav(ord.at(-1).c, a.c) < hav(ord.at(-1).c, b.c) ? a : b)) : null; }
    out.push(ord.concat(late));
  }
  const hotelK = tierK === "eco" ? ["hostel", "guest_house"] : ["hotel"];
  const hotels = (await load("pois.geojson")).features.filter((f) => f.properties.c === "hotel" && hotelK.includes(f.properties.k) && f.properties.n && hav(CENTER, f.geometry.coordinates) < 3)
    .sort((a, b) => hav(CENTER, a.geometry.coordinates) - hav(CENTER, b.geometry.coordinates)).slice(0, 3).map((f) => ({ n: f.properties.n, c: f.geometry.coordinates }));
  // costs
  let visits = 0; for (const s of [...cand, ...tripChunks.flat()]) visits += VISIT_COST[s.k] || 0;
  const wineTrip = tripFlag.filter(Boolean).length * (tierK === "eco" ? 8 : tierK === "mid" ? 30 : 60);
  const nights = Math.max(1, days - (days > 1 ? 0 : 0)), stay = T[3] * nights, food = T[4] * days, local = 2 * days;
  const total = stay + food + local + visits + wineTrip, lo = Math.round(total * 0.85), hi = Math.round(total * 1.2);
  const nm = (v) => L(v[0], v[1]), DC = ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#9c36b5", "#0c8599", "#c2255c", "#5c940d", "#3b5bdb", "#d9480f", "#087f5b", "#862e9c", "#1098ad", "#495057"];
  let verdict = "";
  if (g.bmode === "exact") verdict = hi <= g.eur ? `<span class="pill good">${L("în buget", "within budget")}</span>` : lo > g.eur ? `<span class="pill warn">${L("peste buget", "over budget")}</span>` : `<span class="pill">${L("la limita bugetului", "about at budget")}</span>`;
  let h = `<h3>${L("Planul tău", "Your plan")}: ${days} ${days === 1 ? L("zi", "day") : L("zile", "days")} · ${nm(T)}${g.bmode === "none" ? ` (${L("buget nespecificat", "budget not given")})` : g.bmode === "exact" ? ` · ${fmt(g.eur)} €` : ""}</h3>
    <p class="pjtot"><span>${L("Cost estimat", "Estimated cost")}</span><b>${fmt(lo)}–${fmt(hi)} € ${verdict}</b></p>
    <dl class="stats"><dt>${L("Cazare", "Stay")} (${nights} × ~${T[3]} €)</dt><dd>${fmt(stay)} €</dd><dt>${L("Mâncare", "Food")} (~${T[4]} €/${L("zi", "day")})</dt><dd>${fmt(food)} €</dd>
    <dt>${L("Bilete, intrări, degustări", "Tickets, entries, tastings")}</dt><dd>${fmt(visits + local + wineTrip)} €</dd></dl>
    <p class="small">${L("Cazare sugerată", "Suggested stay")}: ${hotels.map((x) => `<button type="button" class="linkbtn" data-fly="${x.c.join(",")}">${esc(x.n)}</button>`).join(", ") || "—"}</p>`;
  out.forEach((day, di) => {
    const trip = tripFlag[di];
    h += `<div class="day ${trip ? "trip" : ""}"><b><i class="dd" style="background:${DC[di % DC.length]}"></i>${L("Ziua", "Day")} ${di + 1}${trip ? ` · ${L("excursie", "day trip")}: ${esc([...new Set([...day].sort((x, y) => (y.approx || /cricova/i.test(y.n) ? 1 : 0) - (x.approx || /cricova/i.test(x.n) ? 1 : 0)).map((s) => s.n.replace(/^Combinatul de Vinuri „Cricova”/, "Cricova").split(/[–(,]/)[0].trim()))].slice(0, 2).join(", "))}` : ""}</b>${trip ? `<p class="small">${tierK === "eco" ? L("Autobuz suburban din Gara Centrală sau de Nord (~1–3 € dus).", "Suburban bus from the Central or North bus station (~1–3 € one way).") : L("Taxi sau excursie organizată (~25–60 € de persoană); degustările se rezervă din timp.", "Taxi or organised tour (~25–60 € per person); book tastings ahead.")} ${L("Distanța", "Distance")}: ~${fmt(Math.max(...day.map((s) => hav(CENTER, s.c))), 0)} km.</p>` : ""}<ol>${day.map((s, j) => `<li><button type="button" class="linkbtn" data-gfly="${di},${j}">${esc(s.n)}</button><span class="small"> · ${esc(nm(GI[s.k]))}${s.far ? ` · ${fmt(hav(CENTER, s.c), 0)} km` : ""}${VISIT_COST[s.k] ? ` · ~${VISIT_COST[s.k]} €` : ""}${s.approx ? ` · ${L("poziție aprox.", "approx. location")}` : ""}</span></li>`).join("") || `<li class="small">${L("Zi liberă", "Free day")}</li>`}</ol></div>`;
  });
  h += `<div class="btnrow"><button type="button" class="btn ghost" data-gnext="1">${L("Modifică răspunsurile", "Change answers")}</button><button type="button" class="btn ghost" id="g-atlas">${L("Arată în atlas", "Show in the atlas")}</button></div>
    <p class="small">${L("Prețurile sunt orientative (2026). Locurile vin din OpenStreetMap; verifică programul înainte de vizită. Galeriile Cricova și Mileștii Mici se vizitează cu rezervare. Locurile marcate „poziție aprox.” au coordonatele aproximative.", "Prices are rough (2026). Places come from OpenStreetMap; check opening hours before visiting. Cricova and Mileștii Mici cellars need booking. Places marked “approx. location” have approximate coordinates.")}</p>`;
  g.plan = { html: h, days: out, hotels }; g.step = 4; gSave();
}
function guideBind(e) {
  const g = gState(), b = e.target.closest("button"); if (!b) return false;
  const ds = b.dataset;
  if (ds.gdays) { g.days = +ds.gdays; }
  else if (ds.gbud) { if (ds.gbud === "none") g.bmode = "none"; else { g.bmode = "tier"; g.tier = ds.gbud; } }
  else if (ds.gnext) { const n = +ds.gnext; if (n === 2) g.days = Math.max(1, Math.min(14, +document.getElementById("g-days")?.value || g.days)); g.step = n; }
  else if (ds.gstep) g.step = +ds.gstep;
  else if (ds.gall) g.ints = ds.gall === "1" ? Object.keys(GI) : [];
  else if (b.id === "g-make") { guideMake().then(() => { shRender(); }); return true; }
  else if (ds.gfly) { const [d, j] = ds.gfly.split(",").map(Number); const s = g.plan.days[d][j]; SH.gm?.flyTo({ center: s.c, zoom: 16 }); return true; }
  else if (b.id === "g-atlas") {
    const fc = { type: "FeatureCollection", features: g.plan.days.flatMap((day, di) => day.map((s, j) => ({ type: "Feature", properties: { t: `${di + 1}.${j + 1}`, n: s.n }, geometry: { type: "Point", coordinates: s.c } }))) };
    shGo("atlas");
    if (!map.getSource("gplan")) {
      map.addSource("gplan", { type: "geojson", data: fc });
      map.addLayer({ id: "gplan", type: "circle", source: "gplan", paint: { "circle-radius": 7, "circle-color": "#e8590c", "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
      map.on("click", "gplan", (ev) => popup(ev.lngLat, `<b>${esc(ev.features[0].properties.t)} · ${esc(ev.features[0].properties.n)}</b>`));
    } else map.getSource("gplan").setData(fc);
    const b2 = new maplibregl.LngLatBounds(); fc.features.forEach((f) => b2.extend(f.geometry.coordinates)); if (fc.features.length) map.fitBounds(b2, { padding: 80, maxZoom: 15 });
    return true;
  } else return false;
  gSave(); shRender(); return true;
}
function guideChange(e) {
  const g = gState();
  if (e.target.dataset.gint) { const k = e.target.dataset.gint; g.ints = e.target.checked ? [...new Set([...g.ints, k])] : g.ints.filter((x) => x !== k); gSave(); document.getElementById("g-make").disabled = !g.ints.length; guideMap(); return true; }
  if (e.target.id === "g-eur") { const v = +e.target.value; if (v > 0) { g.bmode = "exact"; g.eur = v; } gSave(); shRender(); return true; }
  if (e.target.id === "g-days") { g.days = Math.max(1, Math.min(14, +e.target.value || 1)); gSave(); document.querySelectorAll("[data-gdays]").forEach((x) => x.classList.toggle("on", +x.dataset.gdays === g.days)); return true; }
  return false;
}

// ---------------------------------------------------------------- Pagina principală
async function homeMap() {
  const el = document.getElementById("home-map"); if (!el) return;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (!el.isConnected) return;
  SH.hm?.remove(); SH.hm = miniMap(el, { center: [28.86, 47.03], zoom: 9.6, interactive: false });
  const m = await SH.hm.ready; m.resize();
  m.addLayer({ id: "l2", type: "line", source: "adm", filter: ["all", ["==", ["get", "lvl"], 2], ["in", ["get", "sc"], ["literal", [REF(), "both"]]]], paint: { "line-color": pal().line, "line-width": 0.6, "line-opacity": 0.6 } });
  m.fitBounds([[28.6, 46.86], [29.08, 47.17]], { padding: 6, duration: 0 });
}

// ---------------------------------------------------------------- Arhive (public, internal, personal) + search
const ARCH = [
  { id: "a1", y: 2026, cat: "buget", vis: "pub", t: ["Bugetul municipal pe 2026 – decizia CMC din 13 iulie 2026", "2026 municipal budget – council decision of 13 July 2026"], url: "https://www.moldpres.md/rom/economie/bugetul-municipiului-chisinau-pentru-anul-2026-votat-de-cmc" },
  { id: "a2", y: 2024, cat: "buget", vis: "pub", t: ["Proiectul bugetului municipal pe 2024", "Draft municipal budget 2024"], url: "https://new.chisinau.md/en/act_projects_details/preview_attachment/831.pdf" },
  { id: "a3", y: 2025, cat: "statistica", vis: "pub", t: ["Recensământul populației și locuințelor 2024 – rezultate", "Population and Housing Census 2024 – results"], url: "https://statistica.gov.md" },
  { id: "a4", y: 2007, cat: "urbanism", vis: "pub", t: ["Planul Urbanistic General al municipiului Chișinău", "General Urban Plan of Chișinău"], mock: 1 },
  { id: "a5", y: 2026, cat: "admin", vis: "pub", t: ["Unități în proces de amalgamare voluntară (2026–2027)", "Units in voluntary amalgamation (2026–2027)"], url: "https://alegeri.md/w/Unit%C4%83%C8%9Bile_administrativ-teritoriale_aflate_%C3%AEn_proces_de_amalgamare_voluntar%C4%83" },
  { id: "a6", y: 2026, cat: "transport", vis: "pub", t: ["Schema rutelor de troleibuz și autobuz", "Trolleybus and bus route map"], mock: 1 },
  { id: "a7", y: 2026, cat: "urbanism", vis: "pub", t: ["Registrul autorizațiilor de construire", "Register of building permits"], mock: 1 },
  { id: "a8", y: 1817, cat: "istoric", vis: "pub", t: ["Planul orașului Chișinău, 1817 (copie digitizată)", "Plan of Chișinău, 1817 (digitised copy)"], mock: 1 },
  { id: "a9", y: 1936, cat: "istoric", vis: "pub", t: ["Fotografii istorice ale centrului, anii 1930", "Historic photos of the centre, 1930s"], mock: 1 },
  { id: "a10", y: 2025, cat: "mediu", vis: "pub", t: ["Raport privind calitatea aerului", "Air quality report"], mock: 1 },
  { id: "i1", y: 2027, cat: "transport", vis: "int", t: ["Notă internă: graficul reparației străzilor 2027", "Internal note: 2027 street repair schedule"], mock: 1 },
  { id: "i2", y: 2026, cat: "achizitii", vis: "int", t: ["Registrul contractelor de achiziții publice", "Public procurement contracts register"], mock: 1 },
  { id: "i3", y: 2026, cat: "admin", vis: "int", t: ["Corespondența cu primăriile suburbane privind amalgamarea", "Correspondence with suburban mayoralties on amalgamation"], mock: 1 },
];
const ARCH_CAT = { buget: ["Buget", "Budget"], statistica: ["Statistică", "Statistics"], urbanism: ["Urbanism", "Planning"], admin: ["Administrativ", "Administrative"], transport: ["Transport", "Transport"], istoric: ["Istoric", "History"], mediu: ["Mediu", "Environment"], achizitii: ["Achiziții", "Procurement"], personal: ["Personal", "Personal"] };
const myDocs = () => store.get("mydocs", []);
async function searchAll(q) {
  const k = deacc(q.trim()); if (!k) return null;
  const words = k.split(/\s+/).filter(Boolean), hit = (s) => { const d = deacc(s); return words.every((w) => d.includes(w)); };
  const docs = ARCH.filter((a) => (a.vis === "pub" || isOff()) && (hit(a.t[0]) || hit(a.t[1]) || hit(ARCH_CAT[a.cat][0]) || String(a.y) === k)).map((a) => ({ ...a }))
    .concat(myDocs().filter((d) => hit(d.title) || hit(d.note || "")).map((d) => ({ ...d, vis: "me" })));
  const admin = await adminFC();
  const locs = admin.features.filter((f) => [2, 3, "ctx"].includes(f.properties.lvl) && [REF(), "both"].includes(f.properties.sc ?? "both") && (hit(f.properties.ro) || hit(f.properties.en || ""))).slice(0, 10);
  const seenN = new Set();
  const pois = (await load("pois.geojson")).features.filter((f) => f.properties.n && hit(f.properties.n) && !seenN.has(f.properties.n) && seenN.add(f.properties.n)).slice(0, 14);
  const props = Object.values(SH.props || {}).filter((p) => hit(p.title) || hit(p.desc || ""));
  return { docs, locs, pois, props };
}
function docCard(a) {
  const nm = (v) => L(v[0], v[1]);
  if (a.vis === "me") return `<li class="pcard"><div class="pc1"><span class="pill">${L("doar tu", "only you")}</span><b>${esc(a.title)}</b></div>${a.note ? `<p class="small">${esc(a.note)}</p>` : ""}<p class="small">${fmtDate(a.t.slice(0, 10))}${a.file ? ` · ${esc(a.file)}` : ""} <button type="button" class="linkbtn" data-deldoc="${a.id}">${L("șterge", "delete")}</button></p></li>`;
  return `<li class="pcard"><div class="pc1"><span class="pill ${a.vis === "int" ? "warn" : ""}">${a.vis === "int" ? L("intern", "internal") : L("public", "public")}</span><span class="small">${nm(ARCH_CAT[a.cat])} · ${a.y}</span>${a.mock ? demo() : ""}</div><b>${esc(nm(a.t))}</b>${a.url ? `<a class="small" href="${a.url}" target="_blank" rel="noopener">${L("Deschide sursa", "Open source")}</a>` : `<span class="small">${L("Document de exemplu, fără fișier.", "Example document, no file.")}</span>`}</li>`;
}
async function shArchive() {
  const q = SH.q || "", r = q ? await searchAll(q) : null;
  const vis = ARCH.filter((a) => a.vis === "pub" || isOff());
  let res = "";
  if (r) {
    const n = r.docs.length + r.locs.length + r.pois.length + r.props.length;
    res = `<h3>${n} ${L("rezultate pentru", "results for")} „${esc(q)}”</h3>`
      + (r.docs.length ? `<div class="cap">${L("Documente", "Documents")}</div><ul class="plist">${r.docs.map(docCard).join("")}</ul>` : "")
      + (r.locs.length ? `<div class="cap">${L("Localități și cartiere", "Localities and districts")}</div><ul class="rlist">${r.locs.map((f) => `<li><button type="button" class="linkbtn" data-fly="${f.properties.lx},${f.properties.ly}" data-z="13">${esc(nameOf(f.properties))}</button><span class="small"> · ${f.properties.lvl === 3 ? L("cartier / sat", "district / village") : f.properties.lvl === "ctx" ? L("în afara municipiului", "outside the municipality") : L("primărie / sector urban", "mayoralty / urban sector")}${f.properties.pop ? ` · ${fmt(f.properties.pop)} ${L("loc.", "people")}` : ""}</span></li>`).join("")}</ul>` : "")
      + (r.pois.length ? `<div class="cap">${L("Locuri din atlas", "Places in the atlas")}</div><ul class="rlist">${r.pois.map((f) => `<li><button type="button" class="linkbtn" data-fly="${f.geometry.coordinates.join(",")}">${esc(f.properties.n)}</button><span class="small"> · ${esc(t("cat")[f.properties.c] || "")}</span></li>`).join("")}</ul>` : "")
      + (r.props.length ? `<div class="cap">${L("Propuneri și petiții", "Proposals and petitions")}</div><ul class="rlist">${r.props.map((p) => `<li><button type="button" class="linkbtn" data-go="projects">${esc(p.title)}</button></li>`).join("")}</ul>` : "")
      + (n ? "" : `<p class="hint">${L("Nimic găsit. Încearcă alt cuvânt.", "Nothing found. Try another word.")}</p>`);
  }
  return pageHead(L("Documente", "Documents"), L("Documente publice, documente interne (vizibile doar funcționarilor primăriei) și documentele tale personale. Căutarea include și locurile din atlas.", "Public documents, internal documents (visible to city-hall staff only) and your personal documents. Search also covers places in the atlas."))
    + `<form class="hsearch big" data-hsearch="archive"><input type="search" value="${esc(q)}" placeholder="${L("Caută documente, locuri, cartiere, propuneri…", "Search documents, places, districts, proposals…")}"><button class="btn">${L("Caută", "Search")}</button></form>`
    + (res ? `<section>${res}</section>` : "")
    + `<section class="pgrid"><div><h3>${L("Documente publice", "Public documents")}${isOff() ? ` + ${L("interne", "internal")}` : ""}</h3><ul class="plist">${vis.map(docCard).join("")}</ul>
      ${!isOff() ? `<p class="small">${L("Documentele interne apar doar pentru rolul „Funcționar primărie” (vezi Cont).", "Internal documents appear only for the “City-hall official” role (see Account).")}</p>` : ""}</div>
      <div><h3>${L("Documentele mele", "My documents")}</h3><div class="pform">
        <input type="text" class="pjin" id="md-title" placeholder="${L("Titlu", "Title")}">
        <textarea id="md-note" rows="2" class="pjin" placeholder="${L("Notă (opțional)", "Note (optional)")}"></textarea>
        <input type="file" id="md-file">
        <button type="button" class="btn" id="md-add">${L("Adaugă", "Add")}</button>
        <p class="small">${L("Rămân doar în acest browser (prototip). Din fișier se păstrează doar numele.", "They stay in this browser only (prototype). Only the file name is kept.")}</p></div>
        <ul class="plist">${myDocs().map((d) => docCard({ ...d, vis: "me" })).join("") || `<li class="hint">${L("Niciun document.", "No documents.")}</li>`}</ul></div></section>`;
}
async function addMyDoc() {
  const $ = (id) => document.getElementById(id), title = $("md-title").value.trim(), file = $("md-file").files[0];
  if (!title && !file) { $("md-title").focus(); return; }
  const data = null;
  const d = { id: "d" + Date.now().toString(36), title: title || file.name, note: $("md-note").value.trim(), file: file?.name || null, data, t: new Date().toISOString() };
  try { store.set("mydocs", [d, ...myDocs()]); } catch { store.set("mydocs", [{ ...d, data: null }, ...myDocs()]); }
  shRender();
}

// ---------------------------------------------------------------- Asistent (rule-based mock, no AI)
async function answer(q) {
  const k = deacc(q);
  const admin = await adminFC(), s = popScale();
  const feats = admin.features.filter((f) => [1, 2, 3].includes(f.properties.lvl) && [REF(), "both"].includes(f.properties.sc));
  const place = feats.map((f) => ({ f, n: deacc(f.properties.ro).replace(/^chisinau – (sectorul )?/, "").replace(/^sectorul /, "") }))
    .filter((x) => x.n.length > 3 && k.includes(x.n)).sort((a, b) => b.n.length - a.n.length || (a.f.properties.lvl === 2 ? -1 : 1))[0]?.f;
  const mun = admin.features.find((f) => f.properties.lvl === "mun" && [REF(), "both"].includes(f.properties.sc)).properties;
  const fly = (c, label) => `<button type="button" class="linkbtn" data-fly="${c.join(",")}" data-z="13">${esc(label)}</button>`;
  if (/popula|locuitor|cati oameni|câți|how many people|residents/.test(k)) {
    if (place) { const p = place.properties; return `${esc(nameOf(p))}: ${L("aproximativ", "about")} <b>${fmt(p.pop * s)}</b> ${L("locuitori", "residents")} (${fmtDate(S.date)}), ${fmt(p.km2, 1)} km². ${fly([p.lx, p.ly], L("Arată pe hartă", "Show on map"))}`; }
    return L(`Municipiul are aproximativ <b>${fmt(mun.pop * s)}</b> locuitori (${fmtDate(S.date)}). Întreabă și de o localitate anume, de ex. „câți locuitori are Durlești?”.`, `The municipality has about <b>${fmt(mun.pop * s)}</b> residents (${fmtDate(S.date)}). You can also ask about a specific place.`);
  }
  if (/suprafat|km2|km²|area|cat de mare/.test(k)) { const p = place ? place.properties : mun; return `${esc(nameOf(p))}: <b>${fmt(p.km2, 1)} km²</b>.`; }
  if (/vreme|temperatur|grade|weather|frig|cald/.test(k)) { try { const tm = (await load("temp.json")).maps.now; return L(`Acum, în medie <b>${fmt(tm.mean, 1)} °C</b> în municipiu (între ${fmt(tm.min, 1)} și ${fmt(tm.max, 1)} °C). Harta e în Atlas → Vreme.`, `Right now about <b>${fmt(tm.mean, 1)} °C</b> across the municipality (${fmt(tm.min, 1)} to ${fmt(tm.max, 1)} °C). See Atlas → Weather.`); } catch { return L("Nu am date meteo acum.", "No weather data right now."); } }
  if (/bilet|abonament|pret|cost.*(autobuz|troleibuz)|ticket|fare/.test(k)) return L(`Biletul urban costă <b>6 lei</b>, abonamentul lunar <b>300 lei</b>. Le poți cumpăra (de test) în <button type="button" class="linkbtn" data-go="transit">Transport</button>.`, `A city ticket is <b>6 lei</b>, a monthly pass <b>300 lei</b>. Buy (test) tickets in <button type="button" class="linkbtn" data-go="transit">Transport</button>.`);
  if (/buget|budget/.test(k)) { const y = +S.date.slice(0, 4), B = BUDGET[y]; return B ? L(`Bugetul ${y}: venituri <b>${fmt(B.rev, 2)} mld lei</b>, cheltuieli <b>${fmt(B.exp, 2)} mld lei</b>.`, `${y} budget: revenue <b>${fmt(B.rev, 2)} bn lei</b>, spending <b>${fmt(B.exp, 2)} bn lei</b>.`) : L("Nu am bugetul pentru anul ales.", "No budget for the chosen year."); }
  if (/turist|vizit|ce sa vad|ce pot face|itinerar|plan/.test(k)) return L(`Încearcă <button type="button" class="linkbtn" data-go="guide">Ghidul turistic</button>: trei întrebări și primești un plan pe zile.`, `Try the <button type="button" class="linkbtn" data-go="guide">Tourist guide</button>: three questions and you get a day-by-day plan.`);
  if (/petiti|propun|reclamati|sesizar|proiect/.test(k)) return L(`Propunerile și petițiile sunt în <button type="button" class="linkbtn" data-go="projects">Proiecte</button>.`, `Proposals and petitions are in <button type="button" class="linkbtn" data-go="projects">Projects</button>.`);
  if (place) { const p = place.properties; return `${esc(nameOf(p))}: ${fmt(p.pop * s)} ${L("locuitori", "residents")}, ${fmt(p.km2, 1)} km². ${fly([p.lx, p.ly], L("Arată pe hartă", "Show on map"))}`; }
  const term = k.replace(/[?!.,;:„”"']/g, " ").replace(/\b(unde|este|e|gasesc|caut|un|o|cel mai apropiat|cea mai apropiata|where|is|find|the|a)\b/g, " ").trim();
  const r = term.length > 2 ? await searchAll(term) : null;
  if (r && (r.pois.length || r.docs.length)) return L("Am găsit:", "I found:") + `<ul class="rlist">${r.pois.slice(0, 5).map((f) => `<li>${fly(f.geometry.coordinates, f.properties.n)}<span class="small"> · ${esc(t("cat")[f.properties.c] || "")}</span></li>`).join("")}${r.docs.slice(0, 3).map((d) => `<li>${esc(d.t ? L(d.t[0], d.t[1]) : d.title)} <span class="small">· ${L("document", "document")}</span></li>`).join("")}</ul>`;
  return L("Nu știu încă să răspund la asta. Pot spune populația sau suprafața unei localități, vremea, prețul biletelor, bugetul, sau pot căuta un loc („unde e Muzeul de Istorie?”).", "I can't answer that yet. I can tell you a place's population or area, the weather, ticket prices, the budget, or look up a place (“where is the History Museum?”).");
}
// floating assistant: always available
function chatInit() {
  SH.chat ||= [{ me: 0, h: L("Bună! Sunt asistentul aplicației (machetă, fără inteligență artificială reală). Întreabă-mă despre populație, vreme, bilete, buget sau unde se află un loc.", "Hi! I'm the app's assistant (mock-up, no real AI). Ask about population, weather, tickets, the budget or where a place is.") }];
}
function chatRender() {
  chatInit();
  const box = document.getElementById("chatbox"); if (!box || box.hidden) return;
  box.innerHTML = `<header><b>${L("Asistent", "Assistant")}</b><span class="small">${L("machetă", "mock-up")}</span><button type="button" class="closex sm" id="chatclose" aria-label="${L("Închide", "Close")}">×</button></header>
    <ol class="chatlog">${SH.chat.map((m) => `<li class="${m.me ? "me" : "bot"}">${m.h}</li>`).join("")}</ol>
    <div class="chips">${[L("Câți locuitori are Durlești?", "How many people live in Durlești?"), L("Ce vreme e acum?", "What's the weather now?"), L("Cât costă biletul?", "How much is a ticket?"), L("Unde e Muzeul Național de Istorie?", "Where is the National History Museum?")].map((x) => `<button type="button" class="chipck" data-ask="${esc(x)}">${esc(x)}</button>`).join("")}</div>
    <form class="hsearch" id="chatform"><input type="text" id="chat-in" placeholder="${L("Scrie o întrebare…", "Type a question…")}" autocomplete="off"><button class="btn">${L("Trimite", "Send")}</button></form>`;
  const log = box.querySelector(".chatlog"); log.scrollTop = log.scrollHeight;
}
function chatToggle(open) {
  const box = document.getElementById("chatbox"), fab = document.getElementById("chatfab");
  box.hidden = open === undefined ? !box.hidden : !open; fab.setAttribute("aria-expanded", String(!box.hidden));
  if (!box.hidden) { chatRender(); document.getElementById("chat-in")?.focus(); }
}
async function ask(q) {
  if (!q.trim()) return;
  chatInit(); chatToggle(true);
  SH.chat.push({ me: 1, h: esc(q) }); chatRender();
  SH.chat.push({ me: 0, h: await answer(q) }); chatRender(); document.getElementById("chat-in")?.focus();
}
function chatBind() {
  const box = document.getElementById("chatbox");
  document.getElementById("chatfab").addEventListener("click", () => chatToggle());
  box.addEventListener("submit", (e) => { e.preventDefault(); const i = document.getElementById("chat-in"); const q = i.value; i.value = ""; ask(q); });
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "chatclose") chatToggle(false);
    else if (b.dataset.ask) ask(b.dataset.ask);
    else if (b.dataset.go) { const [sec, md] = b.dataset.go.split(":"); shGo(sec); if (md) { S.mode = md; render(); } }
    else if (b.dataset.fly) { const [x, y] = b.dataset.fly.split(",").map(Number); shGo("atlas"); map.flyTo({ center: [x, y], zoom: +b.dataset.z || 16.5 }); popup({ lng: x, lat: y }, `<b>${esc(b.textContent)}</b>`); }
  });
}

// ---------------------------------------------------------------- login (mock) and settings
const user = () => store.get("user", null);
function loginOpen() {
  const d = document.getElementById("logindlg");
  d.innerHTML = `<form method="dialog" class="logincard"><header><b>${L("Autentificare", "Sign in")}</b><button type="button" class="closex sm" value="x" id="loginx" aria-label="${L("Închide", "Close")}">×</button></header>
    <p class="small mock">${L("Machetă: nu se trimite nimic, nu e nevoie de parolă reală.", "Mock-up: nothing is sent, no real password needed.")}</p>
    <div class="seg row3 rolepick">${Object.keys(ROLES).filter((k) => k !== "adm" || SH.canAdmin).map((k) => `<label><input type="radio" name="lrole" value="${k}" ${SH.role === k ? "checked" : ""}><b>${RL(k)}</b><small>${{ cit: L("MPass", "MPass"), biz: L("IDNO al firmei", "company IDNO"), off: L("cont de serviciu", "staff account"), adm: L("moderare și gestionare", "moderation and management") }[k]}</small></label>`).join("")}</div>
    <label class="pjrow"><span>${L("Nume", "Name")}</span><input type="text" id="lname" class="pjin" value="${esc(user()?.name || "")}" placeholder="${L("de ex. Ana Popescu", "e.g. Ana Popescu")}"></label>
    <div class="btnrow"><button type="button" class="btn" id="loginok">${L("Intră", "Sign in")}</button><button type="button" class="btn ghost" id="loginmp">${L("Intră cu MPass (simulat)", "Sign in with MPass (simulated)")}</button></div></form>`;
  d.showModal();
}
function loginBind() {
  const d = document.getElementById("logindlg");
  d.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (e.target === d || b?.id === "loginx") { d.close(); return; }
    if (b?.id === "loginok" || b?.id === "loginmp") {
      const role = d.querySelector("input[name=lrole]:checked")?.value || "cit";
      const name = d.querySelector("#lname").value.trim() || { cit: L("Cetățean", "Citizen"), biz: L("Firma exemplu SRL", "Example Ltd"), off: L("Funcționar", "Official"), adm: "Administrator" }[role];
      store.set("user", { name, role }); SH.role = role; store.set("role", role); d.close(); topbarRender(); if (SH.sec !== "atlas") shRender();
    }
  });
}
function topbarRender() {
  const el = document.getElementById("topbar"); if (!el) return;
  const u = user();
  el.innerHTML = `<span class="tblang" role="group" aria-label="Language">${["ro", "en", "ru"].map((l) => `<button type="button" data-lang="${l}" aria-pressed="${S.lang === l}">${l.toUpperCase()}</button>`).join("")}</span>
    ${u ? `<button type="button" class="tbpill user" id="tb-user" title="${esc(RL(u.role))}"><i>${esc(u.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase())}</i>${esc(u.name)}</button><button type="button" class="tbpill" id="tb-out">${L("Ieșire", "Sign out")}</button>`
      : `<button type="button" class="tbpill primary" id="tb-login">${L("Autentificare", "Sign in")}</button>`}`;
}
function setLang(l) { S.lang = l; try { fillRoutes(); } catch {} render(); topbarRender(); chatRender(); if (SH.sec !== "atlas") shRender(); }
function topbarBind() {
  document.getElementById("topbar").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.lang) setLang(b.dataset.lang);
    else if (b.id === "tb-login") loginOpen();
    else if (b.id === "tb-user") shGo("settings");
    else if (b.id === "tb-out") { store.set("user", null); topbarRender(); if (SH.sec !== "atlas") shRender(); }
  });
  topbarRender();
}
const THEMES = { auto: ["Automat (ca sistemul)", "Automatic (system)"], light: ["Luminoasă", "Light"], dark: ["Întunecată", "Dark"] };
function applyStoredTheme() { const th = store.get("theme", "auto"); if (th === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", th); }
async function shSettings() {
  const u = user(), th = store.get("theme", "auto"), start = store.get("start", "home");
  const radio = (name, val, cur, label) => `<label><input type="radio" name="${name}" value="${val}" ${val === cur ? "checked" : ""}><b>${label}</b></label>`;
  return pageHead(L("Setări", "Settings"), "")
    + `<section class="setgrid">
      <div class="pcard"><h3>${L("Limba", "Language")}</h3><div class="seg row3">${radio("s-lang", "ro", S.lang, "Română")}${radio("s-lang", "en", S.lang, "English")}${radio("s-lang", "ru", S.lang, "Русский")}</div></div>
      <div class="pcard"><h3>${L("Aspect", "Appearance")}</h3><div class="seg row3">${Object.entries(THEMES).map(([k, v]) => radio("s-theme", k, th, L(v[0], v[1]))).join("")}</div></div>
      <div class="pcard"><h3>${L("Pagina de pornire", "Start page")}</h3><div class="seg row2">${radio("s-start", "home", start, L("Acasă", "Home"))}${radio("s-start", "atlas", start, "Atlas")}</div></div>
      <div class="pcard"><h3>${L("Monedă pentru bugete", "Currency for budgets")}</h3><div class="seg row2">${radio("s-cur", "lei", S.cur, "lei")}${radio("s-cur", "eur", S.cur, "EUR")}</div></div>
      <div class="pcard"><h3>${L("Locația ta", "Your location")}</h3><p>📍 <span data-locname>${esc(locLabel())}</span></p><div class="btnrow"><button type="button" class="btn ghost sm" id="s-loc">${L("Actualizează locația", "Update location")}</button></div><p class="small">${L("Folosită pentru căutare, „Lângă mine” și ca loc implicit în propuneri și sesizări. Dacă browserul nu dă acces la locație, aplicația folosește un punct din centru (machetă).", "Used for search, “Near me” and as the default place in proposals and reports. If the browser does not share your location, the app uses a point in the centre (mock-up).")}</p></div>
      <div class="pcard"><h3>${L("Hartă", "Map")}</h3>
        <label class="check"><input type="checkbox" id="s-names" ${S.names ? "checked" : ""}> ${t("names")}</label>
        <label class="check"><input type="checkbox" id="s-labels" ${S.labels ? "checked" : ""}> ${t("labels")}</label></div>
      <div class="pcard"><h3>${L("Cont", "Account")}</h3>${u ? `<p>${esc(u.name)} · <b>${RL(u.role)}</b></p><div class="btnrow"><button type="button" class="btn ghost sm" id="s-relog">${L("Schimbă rolul", "Change role")}</button><button type="button" class="btn ghost sm" id="s-out">${L("Ieșire", "Sign out")}</button></div>` : `<p class="small">${L("Nu ești autentificat.", "You are not signed in.")}</p><button type="button" class="btn sm" id="s-login">${L("Autentificare", "Sign in")}</button>`}</div>
      <div class="pcard"><h3>${L("Date salvate în acest browser", "Data saved in this browser")}</h3><p class="small">${L("Bilete, documente personale, ghid, preferințe. Proiectele salvate în baza de date nu se șterg.", "Tickets, personal documents, guide, preferences. Projects saved in the database are not deleted.")}</p><button type="button" class="btn ghost sm" id="s-wipe">${L("Șterge datele locale", "Clear local data")}</button></div>
    </section>`;
}
function settingsChange(e) {
  const n = e.target.name, v = e.target.value;
  if (n === "s-lang") { setLang(v); return true; }
  if (n === "s-theme") { store.set("theme", v); applyStoredTheme(); return true; }
  if (n === "s-start") { store.set("start", v); return true; }
  if (n === "s-cur") { S.cur = v; store.set("cur", v); render(); return true; }
  if (e.target.id === "s-names") { S.names = e.target.checked; render(); return true; }
  if (e.target.id === "s-labels") { S.labels = e.target.checked; render(); return true; }
  return false;
}
function settingsClick(b) {
  if (b.id === "s-login" || b.id === "s-relog") { loginOpen(); return true; }
  if (b.id === "s-loc") { requestLoc(true).then(() => toast(locLabel())); return true; }
  if (b.id === "s-out") { store.set("user", null); topbarRender(); shRender(); return true; }
  if (b.id === "s-wipe") { if (confirm(L("Ștergi biletele, documentele personale și preferințele din acest browser?", "Clear tickets, personal documents and preferences from this browser?"))) { for (const k of ["tickets", "mydocs", "guide2", "user", "theme", "start", "role"]) { try { localStorage.removeItem("chi-atlas2-" + k); } catch {} } location.reload(); } return true; }
  return false;
}

// ---------------------------------------------------------------- journey planner (like a rail app): from stop → to stop, options with times, transfers, price
let STOPG = null;
async function stopGroups() {
  if (STOPG) return STOPG;
  const [stops, admin] = await Promise.all([load("stops.geojson"), load("admin.geojson")]);
  const groups = [];
  for (const f of stops.features) {
    const p = f.properties, c = f.geometry.coordinates; if (!p.n) continue;
    let g = groups.find((x) => x.name === p.n && hav(x.c, c) < 0.6);
    if (!g) groups.push(g = { name: p.n, c: [...c], pts: [], routes: new Set(), train: false });
    g.pts.push(c); (p.r || []).forEach((r) => g.routes.add(r)); if (p.k === "train") g.train = true;
  }
  for (const g of groups) g.c = [g.pts.reduce((a, q) => a + q[0], 0) / g.pts.length, g.pts.reduce((a, q) => a + q[1], 0) / g.pts.length];
  // name duplicates get the locality in brackets
  const units = admin.features.filter((f) => (f.properties.lvl === 2 || f.properties.lvl === "ctx") && [REF(), "both", undefined].includes(f.properties.sc)).map((f) => ({ n: f.properties.ro.replace(/^Chișinău – (sectorul )?/, "Chișinău "), pg: prepGeom(f.geometry) }));
  const cnt = {}; groups.forEach((g) => (cnt[g.name] = (cnt[g.name] || 0) + 1));
  for (const g of groups) {
    const u = units.find((x) => x.pg.has(g.c[0], g.c[1]));
    g.loc = u?.n || null;
    g.label = shortName(g.name) + (g.train ? " 🚆" : "") + (cnt[g.name] > 1 || (u && !/^Chișinău/.test(u.n)) ? ` (${u?.n || L("în afara hărții", "off map")})` : "");
  }
  const seen = {}; for (const g of groups) { if (seen[g.label]) g.label += ` #${++seen[g.label]}`; else seen[g.label] = 1; }
  const idx = {}; groups.forEach((g, i) => g.routes.forEach((r) => (idx[r] ||= []).push(i)));
  return STOPG = { groups, idx };
}
const RMODE = (r) => r.split(":")[0];
const URBAN = (r) => /^(trolleybus:|bus:([0-9]+|[A-Z])$|minibus:[0-9]+$)/.test(r);
const SPEED = { trolleybus: 15, bus: 18, minibus: 21, train: 45 };
const hash = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
function nextDep(route, tMin) {   // minutes after midnight
  const h = hash(route), mode = RMODE(route);
  if (mode === "train") { const slots = [6 * 60 + 40, 10 * 60 + 15, 14 * 60 + 30, 18 * 60 + 5].map((x) => x + (h % 25)); return slots.find((x) => x >= tMin) ?? slots[0] + 1440; }
  const hw = URBAN(route) ? (mode === "trolleybus" ? 8 : mode === "minibus" ? 7 : 12) + (h % 7) : 35 + (h % 40);
  const first = 5 * 60 + 30 + (h % hw);
  if (tMin < first) return first;
  const k = Math.ceil((tMin - first) / hw), d = first + k * hw;
  return d > 23 * 60 ? first + 1440 : d;
}
const legPrice = (r, km) => (URBAN(r) ? 6 : Math.max(6, Math.round(km * (RMODE(r) === "train" ? 0.55 : 0.9))));
const rideMin = (r, km) => Math.max(2, Math.round((km * 1.35) / SPEED[RMODE(r)] * 60 + 1));
async function planTrips(ai, bi, tMin) {
  const { groups, idx } = await stopGroups(), A = groups[ai], B = groups[bi];
  const direct = A.c && B.c ? hav(A.c, B.c) : 0, its = [];
  for (const r of A.routes) if (B.routes.has(r)) its.push([{ r, a: A, b: B }]);
  if (its.length < 4) {
    const best = {};
    for (const r1 of A.routes) for (const r2 of B.routes) {
      if (r1 === r2 || B.routes.has(r1) || A.routes.has(r2)) continue;
      for (const xi of idx[r1] || []) { const X = groups[xi], dAX = hav(A.c, X.c); if (dAX + hav(X.c, B.c) > direct * 1.7 + 0.5) continue;
        for (const yi of idx[r2] || []) { const Y = groups[yi], w = hav(X.c, Y.c); if (w > 0.3) continue;
          const tot = dAX + w * 3 + hav(Y.c, B.c), key = r1 + "|" + r2;
          if (!best[key] || tot < best[key].tot) best[key] = { tot, legs: [{ r: r1, a: A, b: X }, { r: r2, a: Y, b: B, walk: w }] };
        } }
    }
    Object.values(best).sort((a, b) => a.tot - b.tot).slice(0, 8).forEach((x) => its.push(x.legs));
  }
  const opts = [];
  for (const legs of its) for (let rep = 0; rep < 2; rep++) {
    let t = tMin, dep0 = null, price = 0; const out = [];
    for (const [i, l] of legs.entries()) {
      const km = hav(l.a.c, l.b.c), walk = l.walk ? Math.max(2, Math.round(l.walk * 1000 / 70)) : 0;
      t += walk;
      let d = nextDep(l.r, t + (i === 0 && rep ? 1 : 0)); if (i === 0 && rep) d = nextDep(l.r, (opts.at(-1)?.dep ?? t) + 1);
      const arr = d + rideMin(l.r, km); price += legPrice(l.r, km);
      out.push({ ...l, dep: d, arr, km, walk }); if (dep0 == null) dep0 = d; t = arr;
    }
    opts.push({ legs: out, dep: dep0, arr: t, price, ch: legs.length - 1 });
  }
  const uniq = new Map();
  for (const o of opts) { const k = o.dep + "|" + o.legs.map((l) => l.r).join(); if (!uniq.has(k)) uniq.set(k, o); }
  return [...uniq.values()].sort((a, b) => a.arr - b.arr || a.ch - b.ch).slice(0, 6);
}
const hm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
function lineBadge(r) {
  const P = pal(), mode = RMODE(r), ref = r.split(":").slice(1).join(":");
  const short = /^Chișinău-/.test(ref) ? ref.replace(/^Chișinău-/, "→ ") : ref;
  const icon = { trolleybus: "T", bus: "A", minibus: "R", train: "🚆" }[mode];
  return `<span class="lbadge" style="background:${P.mode[mode] || "#555"}">${icon} ${esc(short)}</span>`;
}
async function journeyHtml() {
  const { groups } = await stopGroups(), J = SH.j ||= {};
  const opts = groups.map((g, i) => [g.label, i]).sort((a, b) => a[0].localeCompare(b[0], "ro"));
  const now = new Date(), dt = J.dt || new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  let res = "";
  if (J.res) {
    res = J.res.length ? `<ol class="jres">${J.res.map((o, i) => `<li class="jopt ${J.open === i ? "open" : ""}"><button type="button" class="jhead" data-jopen="${i}">
        <span class="jt"><b>${hm(o.dep)}</b> → <b>${hm(o.arr)}</b></span><span class="small">${o.arr - o.dep} min · ${o.ch ? `${o.ch} ${L("schimbare", "change")}` : L("direct", "direct")}</span>
        <span class="jl">${o.legs.map((l) => lineBadge(l.r)).join(" ")}</span><span class="jp">${o.price} lei</span></button>
        ${J.open === i ? `<ol class="jsteps">${o.legs.map((l) => `${l.walk ? `<li class="walk">${L("Mergi pe jos", "Walk")} ~${fmt(l.walk * 1000, 0)} m · ${Math.max(2, Math.round(l.walk * 1000 / 70))} min</li>` : ""}<li><b>${hm(l.dep)}</b> ${esc(l.a.label)}<br>${lineBadge(l.r)} <span class="small">${fmt(l.km * 1.35, 1)} km · ${l.arr - l.dep} min · ${legPrice(l.r, l.km)} lei</span><br><b>${hm(l.arr)}</b> ${esc(l.b.label)}</li>`).join("")}</ol>
        <button type="button" class="btn" data-jbuy="${i}">${L("Cumpără", "Buy")} ${o.legs.length > 1 ? `${o.legs.length} ${L("bilete", "tickets")}` : L("biletul", "the ticket")} · ${o.price} lei</button>` : ""}</li>`).join("")}</ol>
      <p class="small">${L("Orele sunt simulate din frecvența obișnuită a liniilor (prototip); traseele și stațiile sunt reale (OpenStreetMap). În oraș, fiecare urcare costă 6 lei.", "Times are simulated from typical line frequency (prototype); routes and stops are real (OpenStreetMap). In the city, each boarding costs 6 lei.")}</p>`
      : `<p class="hint">${L("Nu am găsit legături directe sau cu o schimbare între aceste stații.", "No direct or one-change connections between these stops.")}</p>`;
  }
  return `<div class="pform jform">
    <datalist id="stoplist">${opts.map(([l]) => `<option value="${esc(l)}">`).join("")}</datalist>
    <label class="jrow"><span>${L("De la", "From")}</span><input list="stoplist" id="j-a" value="${esc(J.a || "")}" placeholder="${L("Stația de plecare", "Departure stop")}" autocomplete="off"></label>
    <button type="button" class="jswap" id="j-swap" aria-label="${L("Inversează", "Swap")}">⇅</button>
    <label class="jrow"><span>${L("Până la", "To")}</span><input list="stoplist" id="j-b" value="${esc(J.b || "")}" placeholder="${L("Stația de sosire", "Arrival stop")}" autocomplete="off"></label>
    <label class="jrow"><span>${L("Plecare", "Depart")}</span><input type="datetime-local" id="j-dt" value="${dt}"></label>
    <button type="button" class="btn" id="j-go">${L("Caută legături", "Find connections")}</button>
    <p class="small" id="j-msg">${J.msg || ""}</p></div>${res}`;
}
async function journeySearch() {
  const { groups } = await stopGroups(), J = SH.j ||= {};
  J.a = document.getElementById("j-a").value.trim(); J.b = document.getElementById("j-b").value.trim(); J.dt = document.getElementById("j-dt").value; J.open = null;
  const find = (v) => { let i = groups.findIndex((g) => g.label === v); if (i < 0) { const k = deacc(v); i = groups.findIndex((g) => deacc(g.label).startsWith(k)); if (i < 0) i = groups.findIndex((g) => deacc(g.label).includes(k)); } return i; };
  const ai = find(J.a), bi = find(J.b);
  if (!J.a || !J.b || ai < 0 || bi < 0) { J.msg = L("Alege stațiile din listă.", "Pick the stops from the list."); J.res = null; return shRender(); }
  if (ai === bi) { J.msg = L("Stația de plecare și cea de sosire sunt aceleași.", "Departure and arrival are the same stop."); J.res = null; return shRender(); }
  J.a = groups[ai].label; J.b = groups[bi].label; J.msg = "";
  const d = new Date(J.dt || Date.now()), tMin = d.getHours() * 60 + d.getMinutes();
  J.res = await planTrips(ai, bi, tMin); J.open = J.res.length ? 0 : null;
  shRender();
}
function journeyClick(b) {
  const J = SH.j ||= {};
  if (b.id === "j-go") { journeySearch(); return true; }
  if (b.id === "j-swap") { const a = document.getElementById("j-a"), c = document.getElementById("j-b"); [a.value, c.value] = [c.value, a.value]; return true; }
  if (b.dataset.jopen != null) { J.open = J.open === +b.dataset.jopen ? null : +b.dataset.jopen; shRender(); return true; }
  if (b.dataset.jbuy != null) {
    const o = J.res[+b.dataset.jbuy];
    buyTicket(`${J.a} → ${J.b} · ${o.legs.map((l) => l.r.split(":").slice(1).join(":")).join(" + ")} · ${hm(o.dep)}`, o.price, o.arr - o.dep + 60);
    return true;
  }
  return false;
}
