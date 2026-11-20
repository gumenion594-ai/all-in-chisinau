// ================================================================== ALL IN CHIȘINĂU — your location + map search (like a maps app) + home tiles with pictures (prototype)
const MOCK_LOC = { c: [28.8327, 47.0245], name: "Piața Marii Adunări Naționale", src: "mock" };
const myLoc = () => store.get("loc", null);
const myHome = () => myLoc();   // everything "near me" follows your location
let LOCMK = null;
async function placeName(c) {
  const admin = await adminFC();
  const f = admin.features.find((x) => x.properties.lvl === 3 && [REF(), "both"].includes(x.properties.sc) && prepGeom(x.geometry).has(c[0], c[1]));
  return f ? f.properties.ro : null;
}
async function setLoc(c, src) {
  const name = (await placeName(c)) || L("în afara municipiului", "outside the municipality");
  store.set("loc", { c, name, src }); showLocOnMap();
  document.querySelectorAll("[data-locname]").forEach((el) => (el.textContent = locLabel()));
}
const locLabel = () => { const l = myLoc(); return !l ? L("Locație necunoscută", "Unknown location") : l.src === "mock" ? `${l.name} · ${L("locație simulată", "simulated location")}` : l.name; };
function requestLoc(force) {
  return new Promise((res) => {
    const fallback = async () => { if (force || !myLoc()) await setLoc(MOCK_LOC.c, "mock"); res(myLoc()); };
    if (!navigator.geolocation) return fallback();
    navigator.geolocation.getCurrentPosition(async (p) => {
      const c = [Math.round(p.coords.longitude * 1e5) / 1e5, Math.round(p.coords.latitude * 1e5) / 1e5];
      // outside the mapped area the app falls back to a point in the centre (prototype)
      if (c[0] < DBOX[0] || c[0] > DBOX[2] || c[1] < DBOX[1] || c[1] > DBOX[3]) return fallback();
      await setLoc(c, "gps"); res(myLoc());
    }, fallback, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
  });
}
function showLocOnMap() {
  const l = myLoc(); if (!l || typeof map === "undefined") return;
  if (!store.get("showLoc", false)) { LOCMK?.remove(); return; }   // hidden unless turned on in View
  if (!LOCMK) { const e = document.createElement("div"); e.className = "youare"; e.title = L("Ești aici", "You are here"); LOCMK = new maplibregl.Marker({ element: e }); }
  LOCMK.setLngLat(l.c).addTo(map);
}

// ---------------------------------------------------------------- search index: places, streets, stops, localities
let SIDX = null;
async function searchIndex() {
  if (SIDX) return SIDX;
  const [pois, roads, admin, sg] = await Promise.all([load("pois.geojson"), load("roads.geojson"), adminFC(), stopGroups()]);
  const out = [];
  for (const f of admin.features) {
    const p = f.properties; if (![2, 3, 4, "ctx"].includes(p.lvl) || ![REF(), "both", undefined].includes(p.sc)) continue;
    if (p.lvl === 4 && p.grp === p.ro) continue;   // same as its level-3 unit
    out.push({ n: nameOf(p), k: p.lvl === 3 ? "nb" : p.lvl === 4 ? "sub" : p.lvl === "ctx" ? "town" : "unit", c: [p.lx, p.ly], pts: [[p.lx, p.ly]] });
  }
  const streets = {};
  for (const f of roads.features) {
    const n = f.properties.n; if (!n) continue;
    const g = f.geometry, ls = g.type === "LineString" ? [g.coordinates] : g.coordinates, s = (streets[n] ||= { n: shortName(n), full: n, k: "street", pts: [] });
    for (const l of ls) s.pts.push(l[Math.floor(l.length / 2)]);
  }
  for (const s of Object.values(streets)) { s.c = s.pts[0]; out.push(s); }
  for (const g of sg.groups) out.push({ n: g.label, full: g.name, k: "stop", c: g.c, pts: [g.c] });
  for (const f of pois.features) { const p = f.properties; if (p.n) out.push({ n: p.n, k: "poi", cat: p.c, kk: p.k, c: f.geometry.coordinates, pts: [f.geometry.coordinates], f }); }
  for (const x of out) x.d = deacc(x.n + " " + (x.full || ""));
  return (SIDX = out);
}
const QCAT = [
  ["pharmacy", "💊", ["Farmacii", "Pharmacies"], (x) => x.cat === "pharmacy"], ["stop", "🚏", ["Stații", "Stops"], (x) => x.k === "stop"],
  ["food", "🍽️", ["Restaurante", "Restaurants"], (x) => x.cat === "food"], ["cafe", "☕", ["Cafenele", "Cafés"], (x) => x.cat === "cafe"],
  ["shop", "🛒", ["Supermarketuri", "Supermarkets"], (x) => x.kk === "supermarket"], ["park", "🌳", ["Parcuri", "Parks"], (x) => x.cat === "park"],
  ["health", "🏥", ["Spitale și clinici", "Hospitals & clinics"], (x) => x.cat === "health"], ["bank", "🏦", ["Bănci", "Banks"], (x) => x.kk === "bank"],
  ["fuel", "⛽", ["Benzinării", "Fuel"], (x) => x.kk === "fuel"], ["school", "🏫", ["Școli", "Schools"], (x) => x.cat === "school"],
];
const KLABEL = { sub: ["Microcartier", "Sub-neighbourhood"], nb: ["Cartier / sat", "Neighbourhood / village"], town: ["Localitate", "Locality"], unit: ["Primărie / sector", "Mayoralty / sector"], street: ["Stradă", "Street"], stop: ["Stație", "Stop"] };
const fmtKm = (d) => (d < 1 ? `${fmt(Math.round((d * 1000) / 10) * 10)} m` : `${fmt(d, d < 10 ? 1 : 0)} km`);
async function runSearch(q, cat) {
  const idx = await searchIndex(), here = (myLoc() || MOCK_LOC).c;
  const dist = (x) => Math.min(...x.pts.slice(0, 40).map((p) => hav(here, p)));
  let hits;
  if (cat) { const f = QCAT.find((c) => c[0] === cat)[3]; hits = idx.filter(f).map((x) => ({ x, d: dist(x), s: 0 })); hits.sort((a, b) => a.d - b.d); }
  else {
    const k = deacc(q.trim()); if (k.length < 2) return [];
    const words = k.split(/\s+/);
    hits = [];
    for (const x of idx) {
      if (!words.every((w) => x.d.includes(w))) continue;
      const s = (x.d.startsWith(k) ? 0 : x.d.includes(" " + k) ? 1 : 2) + (x.k === "nb" || x.k === "unit" ? -0.5 : 0);
      hits.push({ x, d: dist(x), s });
    }
    hits.sort((a, b) => a.s - b.s || a.d - b.d);
  }
  const seen = new Set();
  return hits.filter((h) => { const key = h.x.k + h.x.n; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 12);
}
function hitHtml(h, i) {
  const x = h.x, sub = x.k === "poi" ? (t("cat")[x.cat] || "") : tr2(KLABEL[x.k]);
  const near = x.pts.reduce((a, p) => (hav((myLoc() || MOCK_LOC).c, p) < hav((myLoc() || MOCK_LOC).c, a) ? p : a), x.pts[0]);
  return `<li><button type="button" class="hit" data-hit="${i}" data-c="${near.join(",")}"><span class="hn">${esc(x.n)}</span><span class="small">${esc(sub)}</span><span class="hd">${fmtKm(h.d)}</span></button></li>`;
}
function searchBox() {
  return `<div class="msearch" role="search">
    <div class="msrow"><span class="mic" aria-hidden="true">🔍</span><input type="search" id="ms-q" autocomplete="off" placeholder="${L("Caută o stradă, un loc, o stație, un cartier…", "Search a street, place, stop, neighbourhood…")}" aria-label="${L("Caută pe hartă", "Search the map")}">
    <button type="button" class="locbtn" id="ms-loc" title="${L("Actualizează locația", "Update location")}">📍 <span data-locname>${esc(locLabel())}</span></button></div>
    <div class="chips qchips">${QCAT.map(([k, ic, n]) => `<button type="button" class="chipck" data-qcat="${k}">${ic} ${esc(tr2(n))}</button>`).join("")}</div>
    <ol class="mres" id="ms-res" hidden></ol></div>`;
}
let SRES = [], STMR = null;
async function searchUpdate(q, cat) {
  const el = document.getElementById("ms-res"); if (!el) return;
  SRES = await runSearch(q, cat);
  if (!q && !cat) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = SRES.length ? `<li class="small cap">${cat ? `${esc(tr2(QCAT.find((c) => c[0] === cat)[2]))} · ${L("cele mai apropiate de tine", "closest to you")}` : L("Rezultate, de la cel mai apropiat", "Results, closest first")}</li>` + SRES.map(hitHtml).join("") : `<li class="hint">${L("Nimic găsit.", "Nothing found.")}</li>`;
}
function searchBind() {
  const page = document.getElementById("page");
  page.addEventListener("input", (e) => { if (e.target.id === "ms-q") { clearTimeout(STMR); if (!e.target.value && document.querySelector("[data-qcat].on")) return; STMR = setTimeout(() => { document.querySelectorAll("[data-qcat]").forEach((b) => b.classList.remove("on")); searchUpdate(e.target.value); }, 160); } });
  page.addEventListener("keydown", (e) => {
    if (e.target.id?.startsWith("cm-") && e.key === "Enter") { e.preventDefault(); document.querySelector(`[data-cadd="${e.target.id.slice(3)}"]`)?.click(); return; }
    if (e.target.id === "ms-q" && e.key === "Enter" && SRES[0]) { e.preventDefault(); openHit(0); }
    const tl = e.target.closest?.(".tile[data-go]"); if (tl && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); tileGo(tl); }
  });
}
function openHit(i) {
  const h = SRES[i]; if (!h) return;
  const near = h.x.pts.reduce((a, p) => (hav((myLoc() || MOCK_LOC).c, p) < hav((myLoc() || MOCK_LOC).c, a) ? p : a), h.x.pts[0]);
  shGo("atlas");
  const z = { sub: 15, nb: 14, unit: 13, town: 13, street: 16.5, stop: 17, poi: 17 }[h.x.k];
  map.flyTo({ center: near, zoom: z });
  popup({ lng: near[0], lat: near[1] }, `<b>${esc(h.x.n)}</b><br><small>${esc(h.x.k === "poi" ? t("cat")[h.x.cat] || "" : tr2(KLABEL[h.x.k]))} · ${fmtKm(h.d)} ${L("de tine", "from you")}</small>`);
}
function searchClick(b) {
  if (b.dataset.qcat) { clearTimeout(STMR); const on = b.classList.contains("on"); document.querySelectorAll("[data-qcat]").forEach((x) => x.classList.remove("on")); if (!on) b.classList.add("on"); const q = document.getElementById("ms-q"); if (q) q.value = ""; searchUpdate("", on ? null : b.dataset.qcat); return true; }
  if (b.dataset.hit != null) { openHit(+b.dataset.hit); return true; }
  if (b.id === "ms-loc") { b.disabled = true; requestLoc(true).then(() => { b.disabled = false; toast(locLabel()); const q = document.getElementById("ms-q"); searchUpdate(q?.value || "", document.querySelector("[data-qcat].on")?.dataset.qcat); }); return true; }
  return false;
}
function tileGo(tl) {
  if (tl.dataset.go === "rewards") { SH.pf = { ...(SH.pf || { show: "all", sort: "new", cat: "", q: "" }), tab: "rewards" }; shGo("projects"); return; }
  const [sec, md] = tl.dataset.go.split(":"); shGo(sec); if (md) { S.mode = md; render(); } }

// ---------------------------------------------------------------- pictures for the home tiles (simple inline drawings)
const ART = {
  weather: `<svg viewBox="0 0 160 90" aria-hidden="true"><circle cx="58" cy="38" r="20" fill="#f6c343"/><g stroke="#f6c343" stroke-width="4" stroke-linecap="round"><path d="M58 8v6M58 62v6M28 38h6M82 38h6M37 17l4 4M75 55l4 4M37 59l4-4M75 21l4-4"/></g><path d="M66 70h58a16 16 0 0 0 0-32 22 22 0 0 0-42-4 15 15 0 0 0-16 36z" fill="#fff" stroke="#c9d3e0" stroke-width="2"/></svg>`,
  transit: `<svg viewBox="0 0 160 90" aria-hidden="true"><path d="M8 14h144" stroke="#8a93a3" stroke-width="2"/><path d="M70 14l12 18M86 14l12 18" stroke="#4a5568" stroke-width="2.5"/><rect x="34" y="32" width="96" height="40" rx="8" fill="#1971c2"/><rect x="42" y="39" width="18" height="14" rx="2" fill="#d6e9fb"/><rect x="64" y="39" width="18" height="14" rx="2" fill="#d6e9fb"/><rect x="86" y="39" width="18" height="14" rx="2" fill="#d6e9fb"/><rect x="108" y="39" width="14" height="24" rx="2" fill="#d6e9fb"/><circle cx="54" cy="74" r="7" fill="#2d3748"/><circle cx="112" cy="74" r="7" fill="#2d3748"/><path d="M8 82h144" stroke="#c9d3e0" stroke-width="3"/></svg>`,
  guide: `<svg viewBox="0 0 160 90" aria-hidden="true"><path d="M8 82h144" stroke="#c9d3e0" stroke-width="3"/><path d="M48 82V36h64v46H98V56a18 18 0 0 0-36 0v26z" fill="#e8dcc4" stroke="#b49a6a" stroke-width="2"/><rect x="44" y="26" width="72" height="12" fill="#d8c7a3" stroke="#b49a6a" stroke-width="2"/><rect x="52" y="18" width="56" height="8" fill="#e8dcc4" stroke="#b49a6a" stroke-width="2"/><path d="M128 30c-8 0-14 6-14 14 0 10 14 24 14 24s14-14 14-24c0-8-6-14-14-14z" fill="#e8590c"/><circle cx="128" cy="44" r="5" fill="#fff"/></svg>`,
  projects: `<svg viewBox="0 0 160 90" aria-hidden="true"><circle cx="46" cy="40" r="10" fill="#f0a868"/><path d="M28 80a18 18 0 0 1 36 0z" fill="#2f9e44"/><circle cx="80" cy="34" r="11" fill="#c98b5a"/><path d="M60 80a20 20 0 0 1 40 0z" fill="#1971c2"/><circle cx="114" cy="40" r="10" fill="#e8b48a"/><path d="M96 80a18 18 0 0 1 36 0z" fill="#e8590c"/><rect x="92" y="6" width="50" height="24" rx="8" fill="#fff" stroke="#c9d3e0" stroke-width="2"/><path d="M104 30l-4 8 10-8" fill="#fff" stroke="#c9d3e0" stroke-width="2"/><text x="117" y="23" text-anchor="middle" font-size="14">👍</text></svg>`,
  budget: `<svg viewBox="0 0 160 90" aria-hidden="true"><rect x="96" y="44" width="12" height="34" rx="2" fill="#74c0fc"/><rect x="114" y="30" width="12" height="48" rx="2" fill="#4dabf7"/><rect x="132" y="18" width="12" height="60" rx="2" fill="#1c7ed6"/><g fill="#f6c343" stroke="#c8962e" stroke-width="2"><ellipse cx="50" cy="74" rx="26" ry="7"/><ellipse cx="50" cy="64" rx="26" ry="7"/><ellipse cx="50" cy="54" rx="26" ry="7"/><ellipse cx="50" cy="44" rx="26" ry="7"/></g><text x="50" y="49" text-anchor="middle" font-size="11" font-weight="700" fill="#8a5a00">lei</text></svg>`,
  news: `<svg viewBox="0 0 160 90" aria-hidden="true"><rect x="34" y="12" width="96" height="70" rx="4" fill="#fff" stroke="#c9d3e0" stroke-width="2"/><rect x="44" y="22" width="76" height="10" rx="2" fill="#2d3748"/><rect x="44" y="38" width="34" height="26" rx="2" fill="#a5d8ff"/><g stroke="#a0aec0" stroke-width="3" stroke-linecap="round"><path d="M86 40h34M86 48h34M86 56h26M44 72h76"/></g></svg>`,
  discount: `<svg viewBox="0 0 160 90" aria-hidden="true"><path d="M40 20h52l30 28-30 28H40a6 6 0 0 1-6-6V26a6 6 0 0 1 6-6z" fill="#e8590c"/><circle cx="96" cy="48" r="6" fill="#fff"/><text x="64" y="57" text-anchor="middle" font-size="24" font-weight="800" fill="#fff">%</text><g fill="#f6c343"><path d="M128 14l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/><path d="M140 52l2 4 4 .6-3 3 .7 4-3.7-2-3.7 2 .7-4-3-3 4-.6z"/></g></svg>`,
  docs: `<svg viewBox="0 0 160 90" aria-hidden="true"><rect x="58" y="10" width="54" height="62" rx="3" fill="#fff" stroke="#c9d3e0" stroke-width="2" transform="rotate(8 85 41)"/><rect x="50" y="12" width="54" height="62" rx="3" fill="#fff" stroke="#c9d3e0" stroke-width="2"/><g stroke="#a0aec0" stroke-width="3" stroke-linecap="round"><path d="M60 26h34M60 34h34M60 42h24"/></g><path d="M30 40h34l8 8h58v34H30z" fill="#f6c343" stroke="#c8962e" stroke-width="2"/></svg>`,
};

async function shHome() {
  const admin = await adminFC(), s = popScale();
  const mun = admin.features.find((f) => f.properties.lvl === "mun" && [REF(), "both"].includes(f.properties.sc)).properties;
  const nLoc = admin.features.filter((f) => f.properties.lvl === 2 && [REF(), "both"].includes(f.properties.sc)).length;
  let temp = null; try { temp = (await load("temp.json")).maps?.now; } catch {}
  const props = Object.values(SH.props || {}).filter((p) => p.status !== "removed"), y = +S.date.slice(0, 4), B = BUDGET[y];
  const live = SH.tickets.filter((x) => x.until > Date.now()).length;
  const news = shNewsItems()[0];
  const tile = (go, cls, title, art, foot) => `<article class="tile ${cls}" data-go="${go}" role="link" tabindex="0" aria-label="${esc(title)}"><h3>${title}</h3>${art ? `<div class="art">${art}</div>` : ""}${foot ? `<p class="tfoot">${foot}</p>` : ""}</article>`;
  return `<header class="phead home"><h2>${user() ? `${L("Bună", "Hi")}, ${esc(user().name.split(" ")[0])}!` : L("Bun venit în All in Chișinău", "Welcome to All in Chișinău")}</h2><p>${fmtDate(S.date)} · ${L("prototip", "prototype")}</p></header>
  ${searchBox()}
  <div class="tiles">
    ${tile("atlas", "big", L("Atlasul municipiului", "Municipality atlas"), `<div id="home-map" class="hmap"></div>`, `<b>${fmt(mun.pop * s)}</b> ${L("locuitori", "residents")} · <b>${fmt(mun.km2, 0)} km²</b> · <b>${nLoc}</b> ${L("localități și sectoare", "localities & sectors")}`)}
    ${tile("atlas:temp", "sky", L("Vremea acum", "Weather now"), ART.weather, temp ? `<span class="bigt">${fmt(temp.mean, 1)} °C</span>` : "")}
    ${tile("transit", "blue", L("Transport public", "Public transport"), ART.transit, live ? `${live} ${L("bilete active", "active tickets")}` : L("Bilete, trasee, vehicule live", "Tickets, routes, live vehicles"))}
    ${tile("guide", "sand", L("Ghid turistic", "Tourist guide"), ART.guide, L("Planifică vizita", "Plan a visit"))}
    ${tile("projects", "green", L("Proiecte și petiții", "Projects & petitions"), ART.projects, `<b>${props.length}</b> ${L("proiecte, petiții și propuneri", "projects, petitions and proposals")}`)}
    ${tile("rewards", "gold", L("Reduceri", "Discounts"), ART.discount, `⭐ <b>${fmt(civic().pts)}</b> ${L("puncte civice · transport, muzee, parcare", "civic points · transport, museums, parking")}`)}
    ${tile("news", "", L("Noutăți", "News"), ART.news, news ? esc(news[1]) : "")}
    ${tile("archive", "", L("Documente", "Documents"), ART.docs, `${fmt(ARCH.filter((a) => a.vis === "pub").length)} ${L("documente publice", "public documents")}`)}
    ${B ? tile("atlas", "sand", `${L("Bugetul municipal", "Municipal budget")} ${y}`, ART.budget, `<b>${fmt(B.exp, 1)}</b> ${L("mld lei cheltuieli", "bn lei spending")}`) : ""}
  </div>`;
}

// ---------------------------------------------------------------- atlas search bar (streets, places, stops, neighbourhoods)
let ASRES = [], ASTMR = null, ASON = -1;
const asEl = (id) => document.getElementById(id);
function asRender() {
  const el = asEl("as-res"), q = asEl("as-q").value.trim();
  if (!q) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = ASRES.length ? ASRES.map((h, i) => hitHtml(h, i).replace('data-hit=', 'data-ahit=').replace('class="hit"', `class="hit${i === ASON ? " on" : ""}"`)).join("")
    : `<li class="hint" style="padding:8px">${L("Nimic găsit.", "Nothing found.", "Ничего не найдено.")}</li>`;
}
async function asPick(i) {
  const h = ASRES[i]; if (!h) return;
  const x = h.x; asEl("as-res").hidden = true; asEl("as-q").value = x.n; asEl("as-x").hidden = false; asEl("as-q").blur();
  try {
    if (x.k === "street") {   // the same name exists in several villages: keep the segments around the chosen result
      const here = (myLoc() || MOCK_LOC).c, near = x.pts.reduce((a, p) => (hav(here, p) < hav(here, a) ? p : a), x.pts[0]);
      const segs = (await load("roads.geojson")).features.filter((f) => f.properties.n === (x.full || x.n));
      const mid = (f) => { const c = f.geometry.type === "LineString" ? f.geometry.coordinates : f.geometry.coordinates[0]; return c[Math.floor(c.length / 2)]; };
      let keep = segs.filter((f) => hav(near, mid(f)) < 0.6);
      for (let grow = true; grow;) { grow = false; for (const f of segs) if (!keep.includes(f) && keep.some((k) => hav(mid(k), mid(f)) < 0.7)) { keep.push(f); grow = true; } }
      const draw = keep.map((f) => ({ type: "Feature", properties: { k: "street", n: x.full || x.n }, geometry: f.geometry }));
      const km = keep.reduce((a, f) => a + (f.geometry.type === "LineString" ? lineLen(f.geometry.coordinates) : f.geometry.coordinates.reduce((u, c) => u + lineLen(c), 0)), 0);
      shGo("atlas"); aiDraw(draw, false); aiFit(draw);
      const where = await placeName(near);
      popup({ lng: near[0], lat: near[1] }, `<b>${esc(x.full || x.n)}</b><br><small>${L("Stradă", "Street", "Улица")}${where ? " · " + esc(where) : ""} · ${fmt(km, 2)} km</small>`); return; }
    if (["nb", "sub", "unit", "town"].includes(x.k)) { const g = await aiGeom("area", x.n); aiDraw(g.draw, false); aiFit(g.draw); return; }
  } catch {}
  const c = x.c, sub = x.k === "poi" ? (t("cat")[x.cat] || "") : tr2(KLABEL[x.k]);
  aiDraw([{ type: "Feature", properties: { k: "pt", n: x.n }, geometry: { type: "Point", coordinates: c } }], false);
  map.flyTo({ center: c, zoom: x.k === "stop" ? 17 : 17, duration: 900 });
  popup({ lng: c[0], lat: c[1] }, `<b>${esc(x.n)}</b><br><small>${esc(sub)}${x.f?.properties?.k && x.k === "poi" ? "" : ""}</small>`);
}
function asClear() { asEl("as-q").value = ""; asEl("as-x").hidden = true; asEl("as-res").hidden = true; ASRES = []; if (map.getSource("aihl")) aiDraw([], false); }
function atlasSearchBind() {
  const q = asEl("as-q"); if (!q) return;
  // menus that open from the toolbar sit just below it, also when it wraps onto two rows
  const tb = document.getElementById("toolbar");
  if (tb && window.ResizeObserver) new ResizeObserver(() => document.documentElement.style.setProperty("--tbh", tb.offsetHeight + "px")).observe(tb);
  q.placeholder = L("Caută o stradă sau un loc…", "Search a street or a place…", "Найти улицу или место…");
  asEl("as-x").setAttribute("aria-label", L("Șterge căutarea", "Clear search", "Очистить поиск"));
  q.addEventListener("input", () => { asEl("as-x").hidden = !q.value; clearTimeout(ASTMR); ASTMR = setTimeout(async () => { ASRES = await runSearch(q.value); ASON = -1; asRender(); }, 140); });
  q.addEventListener("focus", () => { if (q.value && ASRES.length) asRender(); });
  q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!ASRES.length) return; ASON = (ASON + (e.key === "ArrowDown" ? 1 : -1) + ASRES.length) % ASRES.length; asRender(); }
    else if (e.key === "Enter") { e.preventDefault(); asPick(ASON >= 0 ? ASON : 0); }
    else if (e.key === "Escape") { asEl("as-res").hidden = true; q.blur(); }
  });
  asEl("as-x").addEventListener("click", asClear);
  asEl("as-res").addEventListener("click", (e) => { const b = e.target.closest("[data-ahit]"); if (b) asPick(+b.dataset.ahit); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".asearch")) asEl("as-res").hidden = true; });
  const sl = asEl("showloc"); sl.checked = store.get("showLoc", false);
  sl.addEventListener("change", () => { store.set("showLoc", sl.checked); if (sl.checked && !myLoc()) requestLoc(false).then(showLocOnMap); else showLocOnMap(); });
}
