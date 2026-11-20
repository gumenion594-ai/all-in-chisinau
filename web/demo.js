// ================================================================== Demography (Population tab → "Demografie") from the 2024 census
// Data: web/data/demo.json (BNS, final census results): age groups and sex for the five city sectors and every locality.
Object.assign(T.ro, { pw_demo: "Demografie" }); Object.assign(T.en, { pw_demo: "Demographics" }); if (T.ru) Object.assign(T.ru, { pw_demo: "Демография" });
S.demo = store.get("demo", "old");
const DEMO = {   // indicator → [ro, en, ru, value(u), unit, palette]
  kids: ["Copii (0–15 ani)", "Children (0–15)", "Дети (0–15 лет)", (u) => (u.a0 / u.pop) * 100, "%", "#0b7285"],
  work: ["Vârsta aptă de muncă", "Working age", "Трудоспособный возраст", (u) => (u.a1 / u.pop) * 100, "%", "#2b8a3e"],
  old: ["Peste vârsta aptă de muncă", "Above working age", "Старше трудоспособного", (u) => (u.a2 / u.pop) * 100, "%", "#862e9c"],
  dep: ["Raport de dependență demografică", "Age dependency ratio", "Коэффициент демографической нагрузки", (u) => ((u.a0 + u.a2) / u.a1) * 100, L("la 100 de adulți", "per 100 adults"), "#c92a2a"],
  ageing: ["Indice de îmbătrânire", "Ageing index", "Индекс старения", (u) => (u.a2 / Math.max(1, u.a0)) * 100, L("vârstnici la 100 de copii", "elderly per 100 children"), "#5f3dc4"],
  fem: ["Femei la 100 de bărbați", "Women per 100 men", "Женщин на 100 мужчин", (u) => (u.f / Math.max(1, u.m)) * 100, "", "#d6336c"],
};
const demoName = (k) => L(DEMO[k][0], DEMO[k][1], DEMO[k][2]);
const isDemo = () => S.popWhat === "demo";
function mix(c, t) {   // white → colour
  const h = (x) => parseInt(c.slice(x, x + 2), 16), r = [h(1), h(3), h(5)].map((v) => Math.round(255 + (v - 255) * t));
  return "#" + r.map((v) => v.toString(16).padStart(2, "0")).join("");
}
let DEMO_D = null;
async function demoData() {
  if (DEMO_D) return DEMO_D;
  const d = await load("demo.json"), admin = await adminFC();
  // level 1 (whole sectors with their suburbs) = sum of their level-2 units; level 3 / 4: villages have their own figures,
  // city neighbourhoods take their sector's (the census publishes the city only by sector)
  const by = {};
  for (const f of admin.features) {
    const p = f.properties; let u = null, inh = false;
    if (p.lvl === 2) u = d.u["2|" + p.ro];
    else if (p.lvl === 3 || p.lvl === 4) { u = d.u["3|" + (p.lvl === 4 ? p.grp || p.ro : p.ro)] || d.u["3|" + p.ro]; if (!u && p.unit) { u = d.u["2|" + p.unit]; inh = !!u; } }
    if (u) by[p.id] = { u, inh };
  }
  for (const f of admin.features) {
    const p = f.properties; if (p.lvl !== 1) continue;
    const parts = admin.features.filter((g) => g.properties.lvl === 2 && g.properties.sector === p.sector && [p.sc, "both"].includes(g.properties.sc) && d.u["2|" + g.properties.ro]);
    if (!parts.length) continue;
    const s = { pop: 0, a0: 0, a1: 0, a2: 0, m: 0, f: 0 };
    for (const g of parts) { const u = d.u["2|" + g.properties.ro]; for (const k in s) s[k] += u[k] || 0; }
    by[p.id] = { u: s, inh: false };
  }
  return (DEMO_D = { d, by });
}
async function demoApply() {
  const { by } = await demoData(), admin = await adminFC(), f = DEMO[S.demo][3];
  const vals = [];
  for (const g of admin.features) { const p = g.properties, x = by[p.id]; p.dm = x && x.u.pop ? Math.round(f(x.u) * 10) / 10 : null; p.dmi = x?.inh ? 1 : 0; if (p.lvl === 2 && p.dm != null) vals.push(p.dm); }
  vals.sort((a, b) => a - b);
  const q = (t) => vals[Math.min(vals.length - 1, Math.floor(vals.length * t))];
  const B = [q(0), q(0.2), q(0.4), q(0.6), q(0.8)]; for (let i = 1; i < B.length; i++) B[i] = Math.max(B[i], B[i - 1] + 0.1);
  DEMO_D.br = B;
  const c = DEMO[S.demo][5], cols = [0.12, 0.3, 0.5, 0.72, 1].map((t) => mix(c, t));
  DEMO_D.cols = cols;
  map.getSource("admin")?.setData(admin);
  const col = ["step", ["coalesce", ["get", "dm"], -1], "#e9ecef", B[0] - 1e-6, cols[0]]; B.slice(1).forEach((v, i) => col.push(v, cols[i + 1]));
  map.setPaintProperty("admin-fill", "fill-color", ["case", ["==", ["get", "lvl"], "ctx"], pal().line, ["==", ["get", "dm"], null], "#e9ecef", col]);
  map.setPaintProperty("admin-fill", "fill-opacity", ["case", ["==", ["get", "lvl"], "ctx"], 0.05, ["==", ["get", "dmi"], 1], 0.45, 0.82]);
}
function demoLegend() {
  if (!DEMO_D?.br) { demoData().then(() => renderLegend()); return `<li class="loading"><span class="spin"></span>…</li>`; }
  const { d, br, cols } = DEMO_D, mu = d.mun, k = S.demo, f = DEMO[k][3], unit = DEMO[k][4];
  const pc = (x) => fmt((x / mu.pop) * 100, 1) + "%";
  const L2 = Object.entries(d.u).filter(([n]) => n.startsWith("2|")).map(([n, u]) => [n.slice(2).replace(/^Chișinău – sectorul /, L("Sectorul ", "Sector ")), f(u)]).sort((a, b) => b[1] - a[1]);
  const bar = (lab, v, c) => `<div class="stbar"><i style="background:${c}"></i><span class="stl">${lab}</span><span class="stb"><b style="width:${(v / mu.pop) * 100 / 0.7}%;background:${c}"></b></span><span class="stp">${pc(v)}</span></div>`;
  return `<li><select id="demosel" class="stpoisel" style="margin:0;width:100%" aria-label="${L("Indicator", "Indicator", "Показатель")}">${Object.keys(DEMO).map((x) => `<option value="${x}" ${x === k ? "selected" : ""}>${esc(demoName(x))}</option>`).join("")}</select></li>`
    + `<li class="stkpi"><div><b style="color:${DEMO[k][5]}">${fmt(f(mu), 1)}${unit === "%" ? "%" : ""}</b><span>${esc(demoName(k))}${unit && unit !== "%" ? " (" + unit + ")" : ""} · ${L("municipiul", "municipality", "муниципий")}</span></div></li>`
    + br.map((v, i) => `<li><i style="background:${cols[i]}"></i>${fmt(v, 1)}${br[i + 1] != null ? "–" + fmt(br[i + 1], 1) : "+"}</li>`).join("")
    + `<li class="cap">${L("Structura pe vârste a municipiului", "Age structure of the municipality", "Возрастная структура муниципия")}</li><li class="stbars">`
    + bar(L("0–15 ani", "0–15", "0–15 лет"), mu.a0, "#0b7285") + bar(L("vârsta aptă (16–62 b. / 16–59 f.)", "working age (16–62 m / 16–59 f)", "трудоспособные (16–62 м / 16–59 ж)"), mu.a1, "#2b8a3e") + bar(L("peste (63+ b. / 60+ f.)", "above (63+ m / 60+ f)", "старше (63+ м / 60+ ж)"), mu.a2, "#862e9c") + `</li>`
    + `<li class="small">${L(`Femei: ${pc(mu.f)} · bărbați: ${pc(mu.m)}. Gospodării: ${fmt(mu.hh)}, în medie ${fmt(mu.hh_avg, 2)} persoane; ${fmt((mu.hh1 / mu.hh) * 100, 0)}% sunt persoane singure, ${fmt((mu.hh_kids / mu.hh) * 100, 0)}% au copii sub 18 ani.`,
        `Women: ${pc(mu.f)} · men: ${pc(mu.m)}. Households: ${fmt(mu.hh)}, ${fmt(mu.hh_avg, 2)} people on average; ${fmt((mu.hh1 / mu.hh) * 100, 0)}% are people living alone, ${fmt((mu.hh_kids / mu.hh) * 100, 0)}% have children under 18.`)}</li>`
    + `<li class="cap">${L("Cele mai mari valori", "Highest", "Наибольшие значения")}</li><li class="lglist">${L2.slice(0, 5).map(([n, v]) => `<button type="button" disabled><span class="zl">${esc(n)}</span><span class="za">${fmt(v, 1)}</span></button>`).join("")}</li>`
    + `<li class="cap">${L("Cele mai mici valori", "Lowest", "Наименьшие значения")}</li><li class="lglist">${L2.slice(-5).reverse().map(([n, v]) => `<button type="button" disabled><span class="zl">${esc(n)}</span><span class="za">${fmt(v, 1)}</span></button>`).join("")}</li>`
    + `<li class="small">${L("Sursa: BNS, Recensământul Populației și Locuințelor 2024 (rezultate finale). Orașul Chișinău e publicat doar pe sectoare, deci cartierele lui (nivelurile 3–4) primesc valoarea sectorului și apar mai palid; satele și orașele din jur au cifrele lor.", "Source: NBS, 2024 Population and Housing Census (final results). Chișinău city is published only by sector, so its neighbourhoods (levels 3–4) take their sector's value and are paler; the surrounding towns and villages have their own figures.", "Источник: НБС, перепись населения и жилищ 2024 (окончательные итоги). Город Кишинёв опубликован только по секторам, поэтому его районы (уровни 3–4) получают значение сектора и показаны бледнее; окрестные города и сёла имеют свои данные.")}</li>`;
}
document.getElementById("legend").addEventListener("change", (e) => {
  if (e.target.id === "demosel") { S.demo = e.target.value; store.set("demo", S.demo); render(); }
});

// ================================================================== "Statistici" tab: indicators after the Eurostat city statistics manual
function lenKm(g) {
  const seg = (c) => { let s = 0; for (let i = 1; i < c.length; i++) { const dx = (c[i][0] - c[i - 1][0]) * 111.32 * Math.cos((47 * Math.PI) / 180), dy = (c[i][1] - c[i - 1][1]) * 110.57; s += Math.hypot(dx, dy); } return s; };
  return g.type === "LineString" ? seg(g.coordinates) : g.type === "MultiLineString" ? g.coordinates.reduce((a, c) => a + seg(c), 0) : 0;
}
async function lifeExtraHtml() {
  const [{ d }, admin, pois, zs, bike, stops] = await Promise.all([demoData(), adminFC(), load("pois.geojson"), load("zone_stats.json"), load("bike.geojson"), load("stops.geojson")]);
  const mu = d.mun, munF = admin.features.find((f) => f.properties.lvl === "mun" && [REF(), "both"].includes(f.properties.sc)).properties;
  const pop = munF.pop * popScale(), Z = zs[REF()], bit = REF() === "ref" ? 2 : 1;
  const inM = pois.features.filter((f) => f.properties.i & bit), n = (c) => inM.filter((f) => [].concat(c).includes(f.properties.c)).length;
  const per10k = (x) => fmt((x / pop) * 10000, 1);
  const row = (a, b, note) => `<dt>${a}</dt><dd>${b}</dd>${note ? `<div class="rownote">${note}</div>` : ""}`;
  const pc = (v) => fmt(v, 1) + "%";
  const cap = inM.filter((f) => f.properties.c === "school" && f.properties.gen !== 0).reduce((s, f) => s + (f.properties.cap || 0), 0);
  const kids = mu.a0 * popScale();
  const bk = (t) => bike.features.filter((f) => t.includes(f.properties.b)).reduce((s, f) => s + lenKm(f.geometry), 0);
  const trol = new Set(), bus = new Set(); for (const f of stops.features) for (const r of f.properties.r || []) (r.startsWith("trolleybus:") ? trol : r.startsWith("bus:") && !r.includes("-") ? bus : new Set()).add(r);
  const sec = (t) => `<p class="cap" style="margin:14px 0 4px">${t}</p>`;
  return sec(L("Locuințe și gospodării (Recensământ 2024)", "Housing and households (2024 census)", "Жильё и домохозяйства (перепись 2024)")) + `<dl class="stats">`
    + row(L("Locuințe ocupate", "Occupied dwellings", "Занятые жилища"), fmt(mu.dw), L(`${pc(mu.blocks)} în blocuri, ${pc(mu.houses + mu.terr)} în case`, `${pc(mu.blocks)} in apartment blocks, ${pc(mu.houses + mu.terr)} in houses`))
    + row(L("Persoane la o locuință", "People per dwelling", "Человек на жилище"), fmt(mu.pop / mu.dw, 2))
    + row(L("Apă de la rețea în locuință", "Mains water inside", "Водопровод в жилище"), pc(mu.water))
    + row(L("Baie sau duș în locuință", "Bath or shower inside", "Ванна или душ в жилище"), pc(mu.bath))
    + row(L("Canalizare centralizată", "Public sewerage", "Централизованная канализация"), pc(mu.sewer))
    + row(L("Termoficare centralizată", "District heating", "Централизованное отопление"), pc(mu.heat_c), L(`sistem propriu ${pc(mu.heat_own)}, sobă ${pc(mu.heat_stove)}`, `own boiler ${pc(mu.heat_own)}, stove ${pc(mu.heat_stove)}`))
    + row(L("Gospodării", "Households", "Домохозяйства"), fmt(mu.hh), L(`în medie ${fmt(mu.hh_avg, 2)} persoane · ${fmt((mu.hh1 / mu.hh) * 100, 0)}% o singură persoană · ${fmt((mu.hh_kids / mu.hh) * 100, 0)}% cu copii`, `${fmt(mu.hh_avg, 2)} people on average · ${fmt((mu.hh1 / mu.hh) * 100, 0)}% one person · ${fmt((mu.hh_kids / mu.hh) * 100, 0)}% with children`))
    + `</dl>` + sec(L("Servicii la 10.000 de locuitori", "Services per 10,000 residents", "Услуги на 10 000 жителей")) + `<dl class="stats">`
    + row(L("Unități medicale", "Health facilities", "Медучреждения"), per10k(n("health"))) + row(L("Farmacii", "Pharmacies", "Аптеки"), per10k(n("pharmacy")))
    + row(L("Școli", "Schools", "Школы"), per10k(n("school")), cap ? L(`~${fmt(cap)} locuri estimate · ~${fmt((cap / kids) * 100, 0)} la 100 de copii de 0–15 ani`, `~${fmt(cap)} estimated places · ~${fmt((cap / kids) * 100, 0)} per 100 children aged 0–15`) : "")
    + row(L("Grădinițe", "Kindergartens", "Детсады"), per10k(n("kindergarten"))) + row(L("Colegii și universități", "Colleges and universities", "Колледжи и вузы"), per10k(n(["college", "university"])))
    + row(L("Muzee", "Museums", "Музеи"), per10k(n("museum"))) + row(L("Sport", "Sport", "Спорт"), per10k(n("sport")))
    + row(L("Restaurante și cafenele", "Restaurants and cafés", "Рестораны и кафе"), per10k(n(["food", "cafe"]))) + row(L("Magazine", "Shops", "Магазины"), per10k(n(["shop", "mall"])))
    + row(L("Hoteluri și cazare", "Hotels and lodging", "Гостиницы"), per10k(n("hotel")))
    + `</dl>` + sec(L("Mediu și teritoriu", "Environment and land", "Среда и территория")) + `<dl class="stats">`
    + row(L("Parcuri și grădini publice", "Parks and public gardens", "Парки и скверы"), `${fmt((Z.z.park * 1e6) / pop, 1)} m²/${L("loc.", "res.", "жит.")}`)
    + row(L("Păduri", "Forests", "Леса"), `${fmt((Z.z.forest * 1e6) / pop, 0)} m²/${L("loc.", "res.", "жит.")}`)
    + row(L("Suprafață construită", "Built-up area", "Застроенная площадь"), pc((Z.built_km2 / Z.total) * 100), L(`${fmt(Z.buildings)} clădiri`, `${fmt(Z.buildings)} buildings`))
    + row(L("Densitatea populației", "Population density", "Плотность населения"), `${fmt(pop / Z.total, 0)} / km²`)
    + `</dl>` + sec(L("Transport", "Transport", "Транспорт")) + `<dl class="stats">`
    + row(L("Stații de transport public", "Public transport stops", "Остановки"), fmt(stops.features.length), L(`${per10k(stops.features.length)} la 10.000 de locuitori`, `${per10k(stops.features.length)} per 10,000 residents`))
    + row(L("Rute de troleibuz / autobuz urban", "Trolleybus / city bus routes", "Маршруты троллейбуса / автобуса"), `${trol.size} / ${bus.size}`)
    + row(L("Piste și trasee pentru biciclete", "Cycle tracks and routes", "Велодорожки и маршруты"), `${fmt(bk(["track", "path"]), 0)} km`, L(`plus ${fmt(bk(["shared"]), 0)} km de bandă comună cu mașinile`, `plus ${fmt(bk(["shared"]), 0)} km shared with cars`))
    + `</dl><p class="small">${L("Indicatorii urmează manualul Eurostat de statistici urbane. Surse: BNS, Recensământul 2024 (locuințe, gospodării, copii); OpenStreetMap (servicii, stații, piste; datele lipsă scad valorile); zonarea atlasului (verde, construit). Locurile în școli sunt estimate din suprafața clădirilor.",
        "Indicators follow the Eurostat city statistics manual. Sources: NBS, 2024 census (housing, households, children); OpenStreetMap (services, stops, cycle routes; missing data lower the values); the atlas zoning (green, built-up). School places are estimated from building floor area.")}</p>`;
}
