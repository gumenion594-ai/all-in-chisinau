// ================================================================== Heritage ("Patrimoniu") and Industry ("Industrie") maps
Object.assign(T.ro, { her: "Patrimoniu", ind: "Industrie", life_tab: "Nivel de trai" }); Object.assign(T.en, { her: "Heritage", ind: "Industry", life_tab: "Living standard" }); if (T.ru) Object.assign(T.ru, { her: "Наследие", ind: "Промышленность", life_tab: "Уровень жизни" });
if (S.mode === "cmp") S.mode = "admin";   // the old Compare tab now sits under the municipality area
if (S.keep?.cmp) delete S.keep.cmp;

// type → [ro, en, ru, colour, glyph paths, filled]
const HER_T = {
  arc: ["Arhitectură civilă", "Civil architecture", "Гражданская архитектура", "#c2410c", ["M3 9l9-5 9 5", "M5 10v8M9.5 10v8M14.5 10v8M19 10v8", "M3 20.5h18"]],
  rel: ["Arhitectură religioasă", "Religious buildings", "Культовые здания", "#7048e8", ["M12 2v5M10 4h4", "M6 21V12l6-4 6 4v9", "M10 21v-5h4v5"]],
  ist: ["Monumente istorice", "Historic sites", "Исторические памятники", "#1c7ed6", ["M6 21V3.5", "M6 4h11l-2.5 4 2.5 4H6"]],
  art: ["Artă și monumente de for public", "Art and public monuments", "Искусство и памятники", "#d99100", ["M10 3h4l1 15H9z", "M6 21h12", "M7.5 18h9"]],
  arh: ["Situri arheologice", "Archaeological sites", "Археологические памятники", "#8c6d46", ["M9 3h6", "M10 3v3c-2.8 1-4 3.6-4 6.5S8 18.5 12 21c4-2.5 6-5.6 6-8.5S16.8 7 14 6V3", "M8 12h8"]],
  nat: ["Monumente ale naturii", "Natural monuments", "Памятники природы", "#2f9e44", ["M12 3l6 8h-3.5l4 6H5.5l4-6H6z", "M12 17v4"]],
  alt: ["Altele", "Other", "Другое", "#868e96", ["M12 4l2.4 5 5.6.8-4 3.9.9 5.5L12 16.6 7.1 19.2l.9-5.5-4-3.9 5.6-.8z"]],
};
const IND_G = {
  wine: [["M8 3h8c0 5-1.5 8-4 8s-4-3-4-8z", "M12 11v8", "M8.5 20h7"]],
  food: [["M4.5 12a7.5 5 0 0 1 15 0v6h-15z", "M9 9.5v3M12 8.5v4M15 9.5v3"]],
  agri: [["M12 21v-9", "M12 12c0-4 3-6 7-6 0 4-3 6-7 6z", "M12 14.5c0-3-2-5-6-5 0 3 2 5 6 5z"]],
  build: [["M3 6h18v13H3z", "M3 10.5h18M3 15h18", "M9 6v4.5M15 10.5V15M9 15v4"]],
  metal: [["M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z", "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"]],
  text: [["M8 4L3 7l2 4 2-1v10h10V10l2 1 2-4-5-3c0 2-1.8 3-4 3S8 6 8 4z"]],
  wood: [["M6 21V4", "M6 12h11v9", "M17 12V7"]],
  chem: [["M9 3h6", "M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3", "M7.2 15h9.6"]],
  print: [["M7 9V3h10v6", "M4.5 9h15v8h-15z", "M7 14h10v7H7z"]],
  energy: [["M13 2L5 14h6l-1 8 8-12h-6z"], 1],
  other: [["M3 21V10l5 3v-3l5 3v-3l5 3V4h3v17z"], 1],
};
const HI_URL = {};
function hiImage(col, paths, fill, size = 26) {
  const r = 2, c = document.createElement("canvas"); c.width = c.height = size * r;
  const g = c.getContext("2d"); g.scale(r, r);
  g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 1.2, 0, Math.PI * 2);
  g.fillStyle = col; g.fill(); g.lineWidth = 1.6; g.strokeStyle = "#ffffff"; g.stroke();
  g.save(); const s = (size - 9) / 24; g.translate(4.5, 4.5); g.scale(s, s);
  g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineWidth = 2.1; g.lineCap = "round"; g.lineJoin = "round";
  for (const d of paths) { const p = new Path2D(d); fill ? g.fill(p) : g.stroke(p); }
  g.restore();
  return c;
}
function hiAdd(id, col, paths, fill) {
  const c = hiImage(col, paths, fill); HI_URL[id] = c.toDataURL();
  if (!map.hasImage(id)) map.addImage(id, c.getContext("2d").getImageData(0, 0, c.width, c.height), { pixelRatio: 2 });
}
const hiImg = (id) => HI_URL[id] ? `<img class="lgico" src="${HI_URL[id]}" alt="">` : "";
const HSIZE = ["interpolate", ["linear"], ["zoom"], 9, 0.36, 11, 0.5, 14, 0.85, 17, 1.05];
function nameLayer(id, src) {
  map.addLayer({ id, type: "symbol", source: src, minzoom: 14.5,
    layout: { "text-field": ["get", "n"], "text-font": ["Inter Medium"], "text-size": 11.5, "text-offset": [0, 1.35], "text-anchor": "top", "text-max-width": 11, "text-optional": true },
    paint: { "text-color": isDark() ? "#e9ecef" : "#212529", "text-halo-color": isDark() ? "#101318" : "#ffffff", "text-halo-width": 1.4 } }, "draw-fill");
}

// ---------------------------------------------------------------- heritage
S.herT = store.get("herT", null); S.herX = store.get("herX", false);
const herTypes = () => S.herT ?? Object.keys(HER_T);
const HER_BAD = /demol|distrus|destroyed|ruin|abandon|damaged|deterior|proast|partially/i, HER_OK = /restaur|bună|good/i;
function herStateCol(s) { return HER_BAD.test(s) ? "#c92a2a" : HER_OK.test(s) ? "#2b8a3e" : "#e67700"; }
function herStateTxt(s) {
  const M = { "demolished or destroyed": L("demolat sau distrus", "demolished or destroyed"), damaged: L("deteriorat", "damaged"), restored: L("restaurat", "restored"), "partially destroyed": L("parțial distrus", "partially destroyed"),
    "demolat sau distrus": L("demolat sau distrus", "demolished or destroyed"), ruină: L("ruină", "ruin"), abandonat: L("abandonat", "abandoned"), nefolosit: L("nefolosit", "disused") };
  return M[s] || s;
}
async function herRender(on) {
  if (!on && !map.getLayer("her-pts")) return;
  if (!map.getSource("her")) {
    const fc = await load("heritage.json");
    for (const [k, v] of Object.entries(HER_T)) hiAdd("her-" + k, v[3], v[4], k === "alt");
    if (map.getSource("her")) return;
    map.addSource("her", { type: "geojson", data: fc });
    map.addLayer({ id: "her-pts", type: "symbol", source: "her",
      layout: { "icon-image": ["concat", "her-", ["get", "t"]], "icon-allow-overlap": true, "icon-ignore-placement": true, "icon-size": HSIZE,
        "symbol-sort-key": ["match", ["get", "imp"], "nat", 0, 1] },
      paint: { "icon-opacity": ["case", ["has", "x"], 0.5, 1] } }, "draw-fill");
    nameLayer("her-names", "her");
    map.on("click", "her-pts", (e) => { if (S.tool) return; herPopup(e.features[0].properties, e.features[0].geometry.coordinates).catch((x) => console.error("herPopup", x)); });
    pointer("her-pts");
  }
  const f = ["all", ["in", ["get", "t"], ["literal", herTypes()]], S.herX ? true : ["!", ["has", "x"]]];
  map.setFilter("her-pts", f); map.setFilter("her-names", f);
  vis("her-pts", on); vis("her-names", on);
}
const arr = (v) => Array.isArray(v) ? v : typeof v === "string" && v.startsWith("[") ? JSON.parse(v) : v ? [v] : [];
async function herPopup(p, ll) {
  const tp = HER_T[p.t] || HER_T.alt, st = arr(p.s), h = arr(p.h), ar = arr(p.ar);
  const wiki = p.w, wd = p.q ? `https://www.wikidata.org/wiki/${p.q}` : null;
  const state = st.length ? st.map((s) => `<span class="herst" style="background:${herStateCol(s)}">${esc(herStateTxt(s))}</span>`).join(" ")
    : `<span class="small">${L("nu există date publice", "no public data", "нет открытых данных")}</span>`;
  const html = (img) => `<div class="poipop">${img || ""}<b>${esc(p.n)}</b>
    <div class="k" style="color:${tp[3]}">${esc(L(tp[0], tp[1], tp[2]))}${p.imp ? " · " + (p.imp === "nat" ? L("importanță națională", "national importance", "национального значения") : L("importanță locală", "local importance", "местного значения")) : ""}</div>
    ${p.x ? `<div class="k">${L("Scos din registru / fost monument", "Removed from the register", "Исключён из реестра")}</div>` : ""}
    <div>${L("Stare de conservare", "State of conservation", "Состояние")}: ${state}</div>
    ${p.y ? `<div>${L("Anul", "Year", "Год")}: ${esc(p.y)}</div>` : ""}${p.a ? `<div>${t("addr")}: ${esc(p.a)}</div>` : ""}
    ${ar.length ? `<div>${L("Arhitect", "Architect", "Архитектор")}: ${esc(ar.join(", "))}</div>` : ""}
    ${h.length ? `<div class="desc">${esc(h.join(" · "))}</div>` : ""}
    ${wiki || wd ? `<div>${wiki ? `<a href="${esc(wiki)}" target="_blank" rel="noopener">Wikipedia</a>` : ""}${wiki && wd ? " · " : ""}${wd ? `<a href="${wd}" target="_blank" rel="noopener">Wikidata</a>` : ""}</div>` : ""}</div>`;
  const pp = popup(ll, html(p.ph != null ? `<div class="ph phph"></div>` : ""));
  if (p.ph != null) {
    try {
      const src = (await load(`her_ph_${p.ph}.json`))[p.q];
      if (src && pp.isOpen()) pp.setHTML(html(`<img class="ph" src="${src}" alt="${esc(p.n)}"><div class="k">${L("Foto", "Photo", "Фото")}: Wikimedia Commons · <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent((p.f || "").replace(/ /g, "_"))}" target="_blank" rel="noopener">${L("autor și licență", "author and licence", "автор и лицензия")}</a></div>`));
    } catch {}
  }
}
function herLegend() {
  const fc = DATA.__her;
  if (!fc) { load("heritage.json").then((x) => { DATA.__her = x; renderLegend(); }); return `<li class="loading"><span class="spin"></span>…</li>`; }
  const F = fc.features.filter((f) => S.herX || !f.properties.x), on = new Set(herTypes());
  const n = (k) => F.filter((f) => f.properties.t === k).length;
  const st = F.filter((f) => arr(f.properties.s).length), bad = st.filter((f) => arr(f.properties.s).some((s) => HER_BAD.test(s)));
  return `<li class="cap">${L("Tipul monumentului", "Type of monument", "Тип памятника")}</li>`
    + Object.entries(HER_T).filter(([k]) => n(k)).map(([k, v]) => `<li><label><input type="checkbox" data-hert="${k}" ${on.has(k) ? "checked" : ""}>${hiImg("her-" + k)}<span class="zl">${esc(L(v[0], v[1], v[2]))}</span><span class="za">${fmt(n(k))}</span></label></li>`).join("")
    + `<li class="zrow2"><b class="zl">Total</b><b class="za">${fmt(F.length)}</b></li>`
    + `<li><label class="check"><input type="checkbox" data-herx="1" ${S.herX ? "checked" : ""}> ${L("Arată și obiectele scoase din registru", "Also show objects removed from the register", "Показывать и исключённые из реестра")}</label></li>`
    + `<li class="cap">${L("Stare de conservare cunoscută", "Known state of conservation", "Известное состояние")} (${fmt(st.length)})</li>`
    + (bad.length ? `<li class="lglist">${bad.slice(0, 12).map((f) => `<button type="button" data-herfly="${f.geometry.coordinates.join(",")}"><i style="background:#c92a2a;width:9px;height:9px;border-radius:50%"></i><span class="zl">${esc(f.properties.n)}</span><span class="za">${esc(herStateTxt(arr(f.properties.s)[0]))}</span></button>`).join("")}</li>` : "")
    + `<li class="small">${L(`Pentru majoritatea monumentelor starea de conservare nu este publicată în surse deschise; acolo unde se cunoaște (Wikidata, OpenStreetMap) apare în fișa obiectului. ${fmt(F.filter((f) => f.properties.ph != null).length)} au fotografie.`,
        `For most monuments the state of conservation is not published in open sources; where it is known (Wikidata, OpenStreetMap) it is shown in the object's card. ${fmt(F.filter((f) => f.properties.ph != null).length)} have a photo.`)}</li>`
    + `<li class="small">${L("Sursa: Registrul monumentelor ocrotite de stat, prin Wikidata (CC0); fotografii Wikimedia Commons (licența fiecărei imagini e pe pagina ei). Harta include și localitățile din jur.", "Source: the state register of protected monuments, via Wikidata (CC0); photos from Wikimedia Commons (each image's licence is on its page). The map also covers the surrounding localities.")}</li>`;
}

// ---------------------------------------------------------------- industry
S.indB = store.get("indB", null); S.indZ = store.get("indZ", true);
async function indRender(on) {
  if (!on && !map.getLayer("ind-pts")) return;
  if (!map.getSource("ind")) {
    const d = await load("industry.json");
    for (const [k, c] of d.br.map((b) => [b[0], b[1]])) hiAdd("ind-" + k, c, IND_G[k][0], IND_G[k][1]);
    if (map.getSource("ind")) return;
    map.addSource("indz", { type: "geojson", data: d.zones });
    map.addLayer({ id: "indz-fill", type: "fill", source: "indz", paint: { "fill-color": ["match", ["get", "k"], "q", "#a0896b", "#8e7cc3"], "fill-opacity": 0.28 } }, "draw-fill");
    map.addLayer({ id: "indz-line", type: "line", source: "indz", paint: { "line-color": ["match", ["get", "k"], "q", "#7a6548", "#6f5aa8"], "line-width": 0.8, "line-opacity": 0.6 } }, "draw-fill");
    map.addSource("ind", { type: "geojson", data: d.points });
    map.addLayer({ id: "ind-pts", type: "symbol", source: "ind",
      layout: { "icon-image": ["concat", "ind-", ["get", "b"]], "icon-allow-overlap": true, "icon-ignore-placement": true, "icon-size": HSIZE,
        "symbol-sort-key": ["-", 0, ["coalesce", ["get", "a"], 0]] },
      paint: { "icon-opacity": ["case", ["has", "x"], 0.5, 1] } }, "draw-fill");
    nameLayer("ind-names", "ind");
    map.on("click", "ind-pts", (e) => { if (S.tool) return; indPopup(e.features[0].properties, e.features[0].geometry.coordinates).catch((x) => console.error("indPopup", x)); });
    pointer("ind-pts");
  }
  const d = await load("industry.json"), sel = S.indB ?? d.br.map((b) => b[0]);
  const f = ["in", ["get", "b"], ["literal", sel]];
  map.setFilter("ind-pts", f); map.setFilter("ind-names", f);
  vis("ind-pts", on); vis("ind-names", on); vis("indz-fill", on && S.indZ); vis("indz-line", on && S.indZ);
}
async function indPopup(p, ll) {
  const d = await load("industry.json"), b = d.br.find((x) => x[0] === p.b) || d.br[d.br.length - 1];
  const web = p.web ? (p.web.startsWith("http") ? p.web : "https://" + p.web) : null;
  popup(ll, `<div class="poipop"><b>${esc(p.n)}</b>${p.ru ? `<div class="desc">${esc(p.ru)}</div>` : ""}
    <div class="k" style="color:${b[1]}">${esc(L(b[2], b[3]))}</div>
    ${p.x ? `<div class="k">${L("Inactivă / abandonată (după OSM)", "Inactive / abandoned (per OSM)", "Не работает (по OSM)")}</div>` : ""}
    ${p.d ? `<div class="desc">${esc(p.d)}</div>` : ""}${p.pr ? `<div>${L("Produse", "Products", "Продукция")}: ${esc(String(p.pr).replace(/;/g, ", "))}</div>` : ""}
    ${p.op ? `<div>${L("Operator", "Operator", "Оператор")}: ${esc(p.op)}</div>` : ""}${p.ad ? `<div>${t("addr")}: ${esc(p.ad)}</div>` : ""}
    ${p.y ? `<div>${L("Din", "Since", "С")}: ${esc(p.y)}</div>` : ""}${p.a ? `<div>${L("Suprafața terenului", "Site area", "Площадь участка")}: ${fmt(p.a, p.a < 10 ? 1 : 0)} ha</div>` : ""}
    ${web ? `<div>${t("web")}: <a href="${esc(web)}" target="_blank" rel="noopener">${esc(web.replace(/^https?:\/\//, "").slice(0, 40))}</a></div>` : ""}
    <div class="small">${L("Sursa", "Source", "Источник")}: ${p.src === "Wikidata" ? "Wikidata" : "OpenStreetMap"}</div></div>`);
}
function indLegend() {
  const d = DATA.__ind;
  if (!d) { load("industry.json").then((x) => { DATA.__ind = x; renderLegend(); }); return `<li class="loading"><span class="spin"></span>…</li>`; }
  const F = d.points.features, sel = new Set(S.indB ?? d.br.map((b) => b[0]));
  const n = (k) => F.filter((f) => f.properties.b === k).length;
  const big = F.filter((f) => sel.has(f.properties.b) && f.properties.a && !/^(Carier|Parc fotovoltaic|Întreprindere$)/.test(f.properties.n)).sort((a, b) => b.properties.a - a.properties.a).slice(0, 10);
  return `<li class="cap">${L("Ramura de producție", "Branch of production", "Отрасль")}</li>`
    + d.br.filter(([k]) => n(k)).map(([k, c, ro, en]) => `<li><label><input type="checkbox" data-indb="${k}" ${sel.has(k) ? "checked" : ""}>${hiImg("ind-" + k)}<span class="zl">${esc(L(ro, en))}</span><span class="za">${fmt(n(k))}</span></label></li>`).join("")
    + `<li class="zrow2"><b class="zl">Total</b><b class="za">${fmt(F.length)}</b></li>`
    + `<li><label class="check"><input type="checkbox" data-indz="1" ${S.indZ ? "checked" : ""}> <i style="background:#8e7cc3;opacity:.6;width:12px;height:12px;display:inline-block;border-radius:2px"></i> ${L("Zone industriale și cariere (suprafețe)", "Industrial zones and quarries (areas)", "Промзоны и карьеры")}</label></li>`
    + (big.length ? `<li class="cap">${L("Cele mai mari după suprafața terenului", "Largest by site area", "Крупнейшие по площади")}</li><li class="lglist">${big.map((f) => `<button type="button" data-herfly="${f.geometry.coordinates.join(",")}">${hiImg("ind-" + f.properties.b)}<span class="zl">${esc(f.properties.n)}</span><span class="za">${fmt(f.properties.a, 0)} ha</span></button>`).join("")}</li>` : "")
    + `<li class="small">${L("Întreprinderile sunt clasificate după etichetele și numele din OpenStreetMap și Wikidata; „Alte întreprinderi” sunt cele al căror profil nu reiese din date. Iconițele transparente sunt întreprinderi închise sau abandonate. Harta include și localitățile din jur.",
        "Enterprises are classified from their OpenStreetMap and Wikidata tags and names; \"Other enterprises\" are those whose activity the data does not state. Faded icons are closed or abandoned sites. The map also covers the surrounding localities.")}</li>`;
}

// ---------------------------------------------------------------- legend controls
document.getElementById("legend").addEventListener("change", (e) => {
  const d = e.target.dataset;
  if (d.hert) { S.herT = [...document.querySelectorAll("[data-hert]")].filter((c) => c.checked).map((c) => c.dataset.hert); store.set("herT", S.herT); render(); }
  if (d.herx) { S.herX = e.target.checked; store.set("herX", S.herX); render(); }
  if (d.indb) { S.indB = [...document.querySelectorAll("[data-indb]")].filter((c) => c.checked).map((c) => c.dataset.indb); store.set("indB", S.indB); render(); }
  if (d.indz) { S.indZ = e.target.checked; store.set("indZ", S.indZ); render(); }
});
document.getElementById("legend").addEventListener("click", (e) => {
  const v = e.target.closest?.("[data-herfly]")?.dataset.herfly;
  if (v) { const [x, y] = v.split(",").map(Number); map.flyTo({ center: [x, y], zoom: Math.max(map.getZoom(), 15.5) }); }
});
