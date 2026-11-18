// ================================================================== ALL IN CHIȘINĂU — home, guide wizard, archives, assistant (prototype)
const CENTER = [28.8327, 47.0245];
const deacc = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---------------------------------------------------------------- small read-only map used on pages
function miniMap(el, { center = CENTER, zoom = 12, interactive = true } = {}) {
  const P = pal();
  const m = new maplibregl.Map({ container: el, center, zoom, interactive, attributionControl: false, maxBounds: BOUNDS, minZoom: 8.6, maxZoom: 18,
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
  hist: ["Istorie și monumente", "History & monuments", "#c2410c", 2, 99, (p) => p.c === "monument" && ["monument", "building", "castle", "ruins", "archaeological_site", "church", "yes"].includes(p.k)],
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
  wine: ["Vin și degustări", "Wine & tastings", "#7f1d1d", 1, 3, (p) => p.k === "winery" || p.k === "wine" || (p.c === "food" && /wine|vin/.test(deacc(p.n)))],
  night: ["Baruri și cluburi", "Bars & clubs", "#4338ca", 1, 99, (p) => p.k === "nightclub" || p.k === "pub" || p.k === "bar"],
  shop: ["Cumpărături (mall-uri)", "Shopping (malls)", "#0e7490", 1, 2, (p) => p.c === "mall"],
  market: ["Piețe", "Markets", "#ca8a04", 1, 2, (p) => p.k === "marketplace"],
  sport: ["Sport și mișcare", "Sport & fitness", "#0f766e", 1, 2, (p) => p.k === "sports_centre"],
  kids: ["Cu copiii", "With kids", "#2563eb", 1, 3, (p) => /copii|family|kids|aventur|zoo|circ|joac/.test(deacc(p.n))],
  gov: ["Clădiri publice și ambasade", "Public buildings & embassies", "#475569", 1, 3, (p) => p.k === "townhall" && /chisinau|primaria municipiului/.test(deacc(p.n)) || p.k === "diplomatic"],
};
const GEXTRA = [   // wineries in the municipality that are not POIs (village centre, approximate)
  { type: "Feature", properties: { c: "business", k: "winery", n: "Cricova – galeriile de vinuri (aprox.)", id: "x-cricova", i: 1 }, geometry: { type: "Point", coordinates: [28.862, 47.137] } },
  { type: "Feature", properties: { c: "business", k: "winery", n: "Mileștii Mici – galeriile de vinuri (aprox.)", id: "x-milestii", i: 1 }, geometry: { type: "Point", coordinates: [28.808, 46.908] } },
];
const TIERS = { eco: ["Economic", "Budget", 50, 25, 18], mid: ["Mediu", "Mid-range", 100, 55, 35], comf: ["Confortabil", "Comfortable", 200, 110, 60], lux: ["Lux", "Luxury", 1e9, 200, 100] };   // [ro, en, max €/day, €/night, food €/day]
const VISIT_COST = { mus: 4, theatre: 12, cinema: 6, wine: 35, night: 12, kids: 8, sport: 8 };
let GPOOLS = null;
async function guidePools() {
  if (GPOOLS) return GPOOLS;
  const all = (await load("pois.geojson")).features.filter((f) => f.properties.n && (f.properties.i & 1)).concat(GEXTRA);
  const d = (f) => hav(CENTER, f.geometry.coordinates);
  GPOOLS = {};
  for (const [k, v] of Object.entries(GI)) {
    const far = ["nature", "wine", "sport", "kids", "shop", "market"].includes(k);
    GPOOLS[k] = all.filter((f) => v[5](f.properties) && (far ? d(f) < 20 : d(f) < (k === "park" ? 5 : 3.5))).sort((a, b) => d(a) - d(b));
  }
  return GPOOLS;
}
const gState = () => (SH.g ||= store.get("guide2", { step: 1, days: 3, bmode: null, tier: "mid", eur: 400, ints: ["hist", "mus", "localfood", "cafe", "park", "wine"] }));
const gSave = () => store.set("guide2", { ...SH.g, plan: undefined });

async function shGuide() {
  const g = gState(), P = await guidePools();
  const nm = (v) => v[S.lang === "ro" ? 0 : 1];
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
  const nm = (v) => v[S.lang === "ro" ? 0 : 1];
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
  leg.innerHTML = `<b>${fmt(feats.length)}</b> ${L("locuri", "places")}` + keys.map((k) => `<span><i style="background:${GI[k][2]}"></i>${esc(nm(GI[k]))}</span>`).join("");
}
async function guideMake() {
  const g = gState(), P = await guidePools(), days = g.days;
  const tierK = g.bmode === "exact" ? (Object.entries(TIERS).find(([, v]) => g.eur / days < v[2]) || ["lux"])[0] : g.bmode === "none" ? "mid" : g.tier;
  const T = TIERS[tierK];
  // pick candidates per interest, nearest to the centre first
  const used = new Set(), cand = [];
  const want = Object.fromEntries(g.ints.map((k) => [k, Math.min(GI[k][4], GI[k][3] * days, P[k].length)]));
  const sum = Object.values(want).reduce((a, b) => a + b, 0), maxN = days * 6;
  if (sum > maxN) for (const k in want) want[k] = Math.max(1, Math.round(want[k] * maxN / sum));
  for (const k of g.ints) {
    const n = want[k];
    for (const f of P[k]) { if (cand.filter((c) => c.k === k).length >= n) break; if (used.has(f.properties.id)) continue; used.add(f.properties.id); cand.push({ k, n: f.properties.n, c: f.geometry.coordinates }); }
  }
  // split into days by direction from the centre, then order each day by nearest neighbour; evening places last
  const ang = (c) => Math.atan2(c[1] - CENTER[1], (c[0] - CENTER[0]) * 0.68);
  cand.sort((a, b) => ang(a.c) - ang(b.c));
  const per = Math.ceil(cand.length / days), out = [];
  for (let d = 0; d < days; d++) {
    const chunk = cand.slice(d * per, (d + 1) * per); if (!chunk.length) { out.push([]); continue; }
    const late = chunk.filter((s) => ["night", "theatre", "cinema"].includes(s.k)), day = chunk.filter((s) => !late.includes(s));
    const ord = []; let cur = day.length ? day.reduce((a, b) => (hav(CENTER, a.c) < hav(CENTER, b.c) ? a : b)) : null;
    while (cur) { ord.push(cur); day.splice(day.indexOf(cur), 1); cur = day.length ? day.reduce((a, b) => (hav(ord.at(-1).c, a.c) < hav(ord.at(-1).c, b.c) ? a : b)) : null; }
    out.push(ord.concat(late));
  }
  const hotelK = tierK === "eco" ? ["hostel", "guest_house"] : ["hotel"];
  const hotels = (await load("pois.geojson")).features.filter((f) => f.properties.c === "hotel" && hotelK.includes(f.properties.k) && f.properties.n && hav(CENTER, f.geometry.coordinates) < 3)
    .sort((a, b) => hav(CENTER, a.geometry.coordinates) - hav(CENTER, b.geometry.coordinates)).slice(0, 3).map((f) => ({ n: f.properties.n, c: f.geometry.coordinates }));
  // costs
  let visits = 0; for (const s of cand) visits += VISIT_COST[s.k] || 0;
  const wineTrip = cand.some((s) => s.k === "wine" && hav(CENTER, s.c) > 8) ? 30 : 0;
  const nights = Math.max(1, days - (days > 1 ? 0 : 0)), stay = T[3] * nights, food = T[4] * days, local = 2 * days;
  const total = stay + food + local + visits + wineTrip, lo = Math.round(total * 0.85), hi = Math.round(total * 1.2);
  const nm = (v) => v[S.lang === "ro" ? 0 : 1], DC = ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#9c36b5", "#0c8599", "#c2255c", "#5c940d", "#3b5bdb", "#d9480f", "#087f5b", "#862e9c", "#1098ad", "#495057"];
  let verdict = "";
  if (g.bmode === "exact") verdict = hi <= g.eur ? `<span class="pill good">${L("în buget", "within budget")}</span>` : lo > g.eur ? `<span class="pill warn">${L("peste buget", "over budget")}</span>` : `<span class="pill">${L("la limita bugetului", "about at budget")}</span>`;
  let h = `<h3>${L("Planul tău", "Your plan")}: ${days} ${days === 1 ? L("zi", "day") : L("zile", "days")} · ${nm(T)}${g.bmode === "none" ? ` (${L("buget nespecificat", "budget not given")})` : g.bmode === "exact" ? ` · ${fmt(g.eur)} €` : ""}</h3>
    <p class="pjtot"><span>${L("Cost estimat", "Estimated cost")}</span><b>${fmt(lo)}–${fmt(hi)} € ${verdict}</b></p>
    <dl class="stats"><dt>${L("Cazare", "Stay")} (${nights} × ~${T[3]} €)</dt><dd>${fmt(stay)} €</dd><dt>${L("Mâncare", "Food")} (~${T[4]} €/${L("zi", "day")})</dt><dd>${fmt(food)} €</dd>
    <dt>${L("Bilete, intrări, degustări", "Tickets, entries, tastings")}</dt><dd>${fmt(visits + local + wineTrip)} €</dd></dl>
    <p class="small">${L("Cazare sugerată", "Suggested stay")}: ${hotels.map((x) => `<button type="button" class="linkbtn" data-fly="${x.c.join(",")}">${esc(x.n)}</button>`).join(", ") || "—"}</p>`;
  out.forEach((day, di) => {
    h += `<div class="day"><b><i class="dd" style="background:${DC[di % DC.length]}"></i>${L("Ziua", "Day")} ${di + 1}</b><ol>${day.map((s, j) => `<li><button type="button" class="linkbtn" data-gfly="${di},${j}">${esc(s.n)}</button><span class="small"> · ${esc(nm(GI[s.k]))}${VISIT_COST[s.k] ? ` · ~${VISIT_COST[s.k]} €` : ""}</span></li>`).join("") || `<li class="small">${L("Zi liberă", "Free day")}</li>`}</ol></div>`;
  });
  h += `<div class="btnrow"><button type="button" class="btn ghost" data-gnext="1">${L("Modifică răspunsurile", "Change answers")}</button><button type="button" class="btn ghost" id="g-atlas">${L("Arată în atlas", "Show in the atlas")}</button></div>
    <p class="small">${L("Prețurile sunt orientative (2026). Locurile vin din OpenStreetMap; verifică programul înainte de vizită. Galeriile Cricova și Mileștii Mici se vizitează cu rezervare.", "Prices are rough (2026). Places come from OpenStreetMap; check opening hours before visiting. Cricova and Mileștii Mici cellars need booking.")}</p>`;
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
async function shHome() {
  const admin = await adminFC(), s = popScale();
  const mun = admin.features.find((f) => f.properties.lvl === "mun" && [REF(), "both"].includes(f.properties.sc)).properties;
  const nLoc = admin.features.filter((f) => f.properties.lvl === 2 && [REF(), "both"].includes(f.properties.sc)).length;
  let temp = null; try { temp = (await load("temp.json")).maps?.now; } catch {}
  const props = Object.values(SH.props || {}), y = +S.date.slice(0, 4), B = BUDGET[y];
  const live = SH.tickets.filter((x) => x.until > Date.now()).length;
  const projN = Object.keys(PJ.list || {}).length;
  const news = shNewsItems().slice(0, 3);
  const tile = (sec, cls, title, body, cta) => `<article class="tile ${cls}"><header><h3>${title}</h3></header><div class="tb">${body}</div>${cta ? `<button type="button" class="btn ghost sm" data-go="${sec}">${cta}</button>` : ""}</article>`;
  return `<header class="phead home"><h2>${L("Bun venit în All in Chișinău", "Welcome to All in Chișinău")}</h2><p>${fmtDate(S.date)} · ${L("prototip", "prototype")}</p></header>
  <div class="tiles">
    ${tile("atlas", "big", L("Atlasul municipiului", "Municipality atlas"), `<div class="kpis"><div><b>${fmt(mun.pop * s)}</b><span>${L("locuitori", "residents")}</span></div><div><b>${fmt(mun.km2, 0)} km²</b><span>${L("suprafață", "area")}</span></div><div><b>${nLoc}</b><span>${L("localități și sectoare", "localities & sectors")}</span></div></div><div id="home-map" class="hmap"></div>`, L("Deschide atlasul", "Open the atlas"))}
    ${tile("atlas:temp", "", L("Vremea acum", "Weather now"), temp ? `<p class="big">${fmt(temp.mean, 1)} °C</p><p class="small">${L("în municipiu", "across the municipality")}: ${fmt(temp.min, 1)} … ${fmt(temp.max, 1)} °C</p>` : `<p class="small">—</p>`, L("Harta temperaturii", "Temperature map"))}
    ${tile("transit", "", L("Transport public", "Public transport"), `<p>${L("Bilet urban", "City ticket")}: <b>6 lei</b> · ${L("abonament", "monthly pass")}: <b>300 lei</b></p><p class="small">${live ? `${live} ${L("bilete active", "active tickets")}` : L("Niciun bilet activ", "No active ticket")}</p>`, L("Bilete și trasee live", "Tickets & live tracking"))}
    ${tile("guide", "", L("Ghid turistic", "Tourist guide"), `<p>${L("Trei întrebări și primești un plan pe zile, cu toate locurile pe hartă.", "Three questions and you get a day-by-day plan with every place on a map.")}</p>`, L("Planifică vizita", "Plan a visit"))}
    ${tile("projects", "", L("Proiecte și petiții", "Projects & petitions"), `<p><b>${props.length}</b> ${L("propuneri", "proposals")} · <b>${props.filter((p) => p.status === "run").length + 3}</b> ${L("în execuție", "in progress")}</p><p class="small">${projN} ${L("proiecte de planificare în atlas", "planning projects in the atlas")}</p>`, L("Vezi proiectele", "See projects"))}
    ${B ? tile("atlas", "", `${L("Bugetul municipal", "Municipal budget")} ${y}`, `<p>${L("Venituri", "Revenue")} <b>${fmt(B.rev, 2)} ${L("mld lei", "bn lei")}</b></p><p>${L("Cheltuieli", "Spending")} <b>${fmt(B.exp, 2)} ${L("mld lei", "bn lei")}</b></p>`, "") : ""}
    ${tile("news", "", L("Noutăți", "News"), `<ul class="hnews">${news.map((n) => `<li><span class="small">${fmtDate(n[0])}</span>${n[1]}</li>`).join("")}</ul>`, L("Toate noutățile", "All news"))}
    ${tile("archive", "", L("Arhive", "Archives"), `<form class="hsearch" data-hsearch="archive"><input type="search" placeholder="${L("Caută documente, locuri, cartiere…", "Search documents, places, districts…")}"><button class="btn sm">${L("Caută", "Search")}</button></form>`, "")}
    ${tile("chat", "", L("Asistent", "Assistant"), `<form class="hsearch" data-hsearch="chat"><input type="search" placeholder="${L("Întreabă ceva, de ex. câți locuitori are Durlești?", "Ask something, e.g. how many people live in Durlești?")}"><button class="btn sm">${L("Întreabă", "Ask")}</button></form>`, "")}
    ${tile("account", "", L("Contul tău", "Your account"), `<p>${L("Rol", "Role")}: <b>${RL(SH.role)}</b></p>`, L("Schimbă rolul", "Change role"))}
  </div>`;
}
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
  const docs = ARCH.filter((a) => (a.vis === "pub" || SH.role === "off") && (hit(a.t[0]) || hit(a.t[1]) || hit(ARCH_CAT[a.cat][0]) || String(a.y) === k)).map((a) => ({ ...a }))
    .concat(myDocs().filter((d) => hit(d.title) || hit(d.note || "")).map((d) => ({ ...d, vis: "me" })));
  const admin = await adminFC();
  const locs = admin.features.filter((f) => [2, 3, "ctx"].includes(f.properties.lvl) && [REF(), "both"].includes(f.properties.sc ?? "both") && (hit(f.properties.ro) || hit(f.properties.en || ""))).slice(0, 10);
  const seenN = new Set();
  const pois = (await load("pois.geojson")).features.filter((f) => f.properties.n && hit(f.properties.n) && !seenN.has(f.properties.n) && seenN.add(f.properties.n)).slice(0, 14);
  const props = Object.values(SH.props || {}).filter((p) => hit(p.title) || hit(p.desc || ""));
  return { docs, locs, pois, props };
}
function docCard(a) {
  const nm = (v) => v[S.lang === "ro" ? 0 : 1];
  if (a.vis === "me") return `<li class="pcard"><div class="pc1"><span class="pill">${L("doar tu", "only you")}</span><b>${esc(a.title)}</b></div>${a.note ? `<p class="small">${esc(a.note)}</p>` : ""}<p class="small">${fmtDate(a.t.slice(0, 10))}${a.file ? ` · ${esc(a.file)}` : ""} <button type="button" class="linkbtn" data-deldoc="${a.id}">${L("șterge", "delete")}</button></p></li>`;
  return `<li class="pcard"><div class="pc1"><span class="pill ${a.vis === "int" ? "warn" : ""}">${a.vis === "int" ? L("intern", "internal") : L("public", "public")}</span><span class="small">${nm(ARCH_CAT[a.cat])} · ${a.y}</span>${a.mock ? demo() : ""}</div><b>${esc(nm(a.t))}</b>${a.url ? `<a class="small" href="${a.url}" target="_blank" rel="noopener">${L("Deschide sursa", "Open source")}</a>` : `<span class="small">${L("Document de exemplu, fără fișier.", "Example document, no file.")}</span>`}</li>`;
}
async function shArchive() {
  const q = SH.q || "", r = q ? await searchAll(q) : null;
  const vis = ARCH.filter((a) => a.vis === "pub" || SH.role === "off");
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
  return pageHead(L("Arhive", "Archives"), L("Documente publice, documente interne (vizibile doar funcționarilor primăriei) și documentele tale personale. Căutarea include și locurile din atlas.", "Public documents, internal documents (visible to city-hall staff only) and your personal documents. Search also covers places in the atlas."))
    + `<form class="hsearch big" data-hsearch="archive"><input type="search" value="${esc(q)}" placeholder="${L("Caută documente, locuri, cartiere, propuneri…", "Search documents, places, districts, proposals…")}"><button class="btn">${L("Caută", "Search")}</button></form>`
    + (res ? `<section>${res}</section>` : "")
    + `<section class="pgrid"><div><h3>${L("Arhiva publică", "Public archive")}${SH.role === "off" ? ` + ${L("internă", "internal")}` : ""}</h3><ul class="plist">${vis.map(docCard).join("")}</ul>
      ${SH.role !== "off" ? `<p class="small">${L("Documentele interne apar doar pentru rolul „Funcționar primărie” (vezi Cont).", "Internal documents appear only for the “City-hall official” role (see Account).")}</p>` : ""}</div>
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
  if (r && (r.pois.length || r.docs.length)) return L("Am găsit:", "I found:") + `<ul class="rlist">${r.pois.slice(0, 5).map((f) => `<li>${fly(f.geometry.coordinates, f.properties.n)}<span class="small"> · ${esc(t("cat")[f.properties.c] || "")}</span></li>`).join("")}${r.docs.slice(0, 3).map((d) => `<li>${esc(d.t ? d.t[S.lang === "ro" ? 0 : 1] : d.title)} <span class="small">· ${L("document", "document")}</span></li>`).join("")}</ul>`;
  return L("Nu știu încă să răspund la asta. Pot spune populația sau suprafața unei localități, vremea, prețul biletelor, bugetul, sau pot căuta un loc („unde e Muzeul de Istorie?”).", "I can't answer that yet. I can tell you a place's population or area, the weather, ticket prices, the budget, or look up a place (“where is the History Museum?”).");
}
async function shChat() {
  SH.chat ||= [{ me: 0, h: L("Bună! Sunt asistentul aplicației (machetă, fără inteligență artificială reală). Întreabă-mă despre populație, vreme, bilete, buget sau unde se află un loc.", "Hi! I'm the app's assistant (mock-up, no real AI). Ask about population, weather, tickets, the budget or where a place is.") }];
  return pageHead(L("Asistent", "Assistant"), L("Răspunsuri din datele aplicației. Într-o versiune viitoare, aici ar fi un asistent AI.", "Answers from the app's data. A future version would put an AI assistant here."))
    + `<div class="chat"><ol class="chatlog">${SH.chat.map((m) => `<li class="${m.me ? "me" : "bot"}">${m.h}</li>`).join("")}</ol>
      <form class="hsearch" data-hsearch="chat"><input type="search" id="chat-in" placeholder="${L("Scrie o întrebare…", "Type a question…")}" autocomplete="off"><button class="btn">${L("Trimite", "Send")}</button></form>
      <div class="chips">${[L("Câți locuitori are Durlești?", "How many people live in Durlești?"), L("Ce vreme e acum?", "What's the weather now?"), L("Cât costă biletul?", "How much is a ticket?"), L("Unde e Muzeul Național de Istorie?", "Where is the National History Museum?")].map((x) => `<button type="button" class="chipck" data-ask="${esc(x)}">${esc(x)}</button>`).join("")}</div></div>`;
}
async function ask(q) {
  if (!q.trim()) return;
  SH.chat.push({ me: 1, h: esc(q) }); SH.chat.push({ me: 0, h: await answer(q) });
  await shRender(); document.getElementById("chat-in")?.focus();
  const log = document.querySelector(".chatlog"); if (log) log.scrollTop = log.scrollHeight;
}
