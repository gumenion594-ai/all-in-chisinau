// ================================================================== NEIGHBOURHOOD BUILDER (construction menu, prototype estimates)
const NB_TYPES = {
  res_houses: { ro: "Locativ – case individuale", en: "Residential – detached houses", dens: 40, min: 10, max: 80, fl: [1, 2], cov: 0.25, road: 14, cost: [450, 650], zone: "residential", res: true },
  res_low:    { ro: "Locativ – blocuri mici (3–5 etaje)", en: "Residential – low blocks (3–5 floors)", dens: 150, min: 60, max: 260, fl: [3, 5], cov: 0.25, road: 12, cost: [520, 720], zone: "residential", res: true },
  res_mid:    { ro: "Locativ – blocuri medii (6–9 etaje)", en: "Residential – mid-rise (6–9 floors)", dens: 260, min: 150, max: 420, fl: [6, 9], cov: 0.22, road: 10, cost: [550, 780], zone: "residential", res: true },
  res_high:   { ro: "Locativ – blocuri înalte (10–16 etaje)", en: "Residential – high-rise (10–16 floors)", dens: 420, min: 250, max: 650, fl: [10, 16], cov: 0.18, road: 9, cost: [620, 880], zone: "residential", res: true },
  mixed:      { ro: "Mixt (locuințe + comerț la parter)", en: "Mixed (housing + ground-floor retail)", dens: 220, min: 100, max: 450, fl: [4, 9], cov: 0.3, road: 12, cost: [580, 820], zone: "commercial", res: true, retail: 0.2 },
  office:     { ro: "Birouri / servicii", en: "Offices / services", far: 1.8, road: 8, cost: [700, 1000], zone: "commercial", jobs: 15 },
  industrial: { ro: "Industrial / logistică", en: "Industrial / logistics", far: 0.5, road: 6, cost: [350, 550], zone: "industrial", jobs: 60 },
  park:       { ro: "Parc / spațiu verde", en: "Park / green space", road: 3, zone: "park", park: [20, 50] },
};
const NB_OCC = 0.7;            // share of housing capacity counted as new residents
const HH = 2.5;                // persons per dwelling (Census 2024 average household ≈ 2.5)
const QUAL = {
  build: [["Zidari, betoniști, fierari-betoniști", "Masons, concrete & rebar workers", 0.27], ["Dulgheri, cofrari, montatori", "Carpenters, formwork, assemblers", 0.13], ["Instalatori (apă, canal, încălzire)", "Plumbers (water, sewer, heating)", 0.1],
    ["Electricieni", "Electricians", 0.08], ["Finisori (tencuieli, zugrăveli, pardoseli)", "Finishers (plaster, paint, floors)", 0.14], ["Operatori de utilaje, șoferi", "Machine operators, drivers", 0.08],
    ["Muncitori necalificați", "General labourers", 0.15], ["Ingineri, diriginți de șantier, topografi", "Engineers, site managers, surveyors", 0.05]],
  park: [["Grădinari, peisagiști", "Gardeners, landscapers", 0.45], ["Muncitori necalificați", "General labourers", 0.3], ["Operatori de utilaje", "Machine operators", 0.1], ["Electricieni (iluminat)", "Electricians (lighting)", 0.08], ["Ingineri, arhitecți peisagiști", "Engineers, landscape architects", 0.07]],
};

// ---------------------------------------------------------------- site analysis: what is already there and around (1 km)
const HEALTH_K = new Set(["clinic", "hospital", "doctors"]);
const MAIN_C = new Set(["motorway", "trunk", "primary", "secondary", "tertiary"]);
let NB_CAL = null;
async function nbSite(ring) {
  const D = await statData(), T = await loadTurf();
  const geom = { type: "Polygon", coordinates: [ring] };
  const st = await computeStats(geom);
  // calibration over the whole data extent: places per facility assuming facilities are on average fully used
  if (!NB_CAL) {
    let pop = 0; for (let i = 0; i < D.bp.length; i++) pop += D.bp[i]; for (const e of D.extra) pop += e[2];
    const n = (f) => D.pois.filter(f).length;
    NB_CAL = { school: (pop * 0.11) / n((f) => f.properties.c === "school"), kinder: (pop * 0.055) / n((f) => f.properties.c === "kindergarten"),
      clinic: pop / n((f) => f.properties.c === "health" && HEALTH_K.has(f.properties.k)) };
  }
  const buf = T.buffer({ type: "Feature", geometry: geom }, 1, { units: "kilometers" }).geometry;
  const pb = prepGeom(buf), around = { pop: 0, school: 0, kinder: 0, clinic: 0, names: { school: [], kinder: [], clinic: [] } };
  for (let i = 0; i < D.bx.length; i++) if (pb.has(D.bx[i], D.by[i])) around.pop += D.bp[i];
  for (const e of D.extra) if (pb.has(e[0], e[1])) around.pop += e[2];
  for (const f of D.pois) {
    const c = f.geometry.coordinates, p = f.properties; if (!pb.has(c[0], c[1])) continue;
    const k = p.c === "school" ? "school" : p.c === "kindergarten" ? "kinder" : p.c === "health" && HEALTH_K.has(p.k) ? "clinic" : null;
    if (k) { around[k]++; if (p.n && around.names[k].length < 4) around.names[k].push(p.n); }
  }
  const spare = { school: around.school * NB_CAL.school - around.pop * 0.11, kinder: around.kinder * NB_CAL.kinder - around.pop * 0.055, clinic: around.clinic * NB_CAL.clinic - around.pop };
  // land use inside: sample a grid of points
  const lu = await load("landuse.geojson"), pg = prepGeom(geom), [x0, y0, x1, y1] = pg.bbox;
  const cand = lu.features.filter((f) => { const b = T.bbox(f); return !(b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1); }).map((f) => ({ z: f.properties.z, pg: prepGeom(f.geometry) }));
  const step = Math.max((x1 - x0), (y1 - y0)) / 40, cnt = {}; let tot = 0;
  for (let x = x0 + step / 2; x < x1; x += step) for (let y = y0 + step / 2; y < y1; y += step * 0.68) {
    if (!pg.has(x, y)) continue; tot++;
    const hit = cand.find((c) => c.pg.has(x, y)); const z = hit ? hit.z : "free"; cnt[z] = (cnt[z] || 0) + 1;
  }
  const share = Object.fromEntries(Object.entries(cnt).map(([k, v]) => [k, v / (tot || 1)]));
  // distances: nearest stop and nearest main road (km, 0 if inside)
  const cen = T.centroid(geom).geometry.coordinates, rEq = Math.sqrt(geomArea(geom) / Math.PI) / 1000;
  let stopD = 1e9; for (const c of D.stopPts) { if (pg.has(c[0], c[1])) { stopD = 0; break; } stopD = Math.min(stopD, hav(c, cen)); }
  stopD = Math.max(0, stopD - (stopD ? rEq * 0.8 : 0));
  let mainD = 1e9; const verts = ring.slice(0, -1);
  for (const f of D.roads) {
    if (!MAIN_C.has(f.properties.c)) continue;
    const g = f.geometry, lines = g.type === "LineString" ? [g.coordinates] : g.coordinates;
    for (const l of lines) for (const c of l) {
      if (Math.abs(c[0] - cen[0]) > 0.06 || Math.abs(c[1] - cen[1]) > 0.04) continue;
      if (pg.has(c[0], c[1])) { mainD = 0; break; }
      for (const v of verts) { const d = hav(c, v); if (d < mainD) mainD = d; }
    }
    if (mainD === 0) break;
  }
  const relief = st.eMax != null ? st.eMax - st.eMin : 0;
  const slope = relief ? Math.round((relief / (2 * rEq * 1000)) * 1000) / 10 : 0;   // relief across the area's diameter, %
  return { pop: Math.round(st.pop), bld: st.bld, roadKm: Math.round(st.roadKm * 100) / 100, eMin: st.eMin, eMax: st.eMax, slope,
    lu: share, stopKm: stopD > 50 ? null : Math.round(stopD * 100) / 100, mainKm: mainD > 50 ? null : Math.round(mainD * 100) / 100,
    around: { pop: Math.round(around.pop), school: around.school, kinder: around.kinder, clinic: around.clinic, names: around.names },
    spare: { school: Math.round(spare.school), kinder: Math.round(spare.kinder), clinic: Math.round(spare.clinic) } };
}
const BUILT_Z = ["residential", "commercial", "industrial", "public", "military", "transport"];
const NOGO_Z = ["water", "wetland", "forest", "cemetery"];

function nbCompute(nb) {
  const T = NB_TYPES[nb.type], ov = nb.ov || {}, st = nb.site;
  const r = { items: [], pub: [0, 0], priv: [0, 0], pop: 0, jobs: 0, warn: null, warns: [] };
  const sh = (zs) => zs.reduce((a, z) => a + (st?.lu?.[z] || 0), 0);
  const demolish = !!ov.demolish;
  const nogo = sh(NOGO_Z), built = demolish ? 0 : sh(BUILT_Z);
  const ha = Math.max(0.1, nb.ha * (1 - nogo - built));
  r.buildHa = ha;
  if (nogo > 0.05) r.warns.push(L(`${Math.round(nogo * 100)}% din zonă e apă, pădure, zonă umedă sau cimitir și nu se construiește.`, `${Math.round(nogo * 100)}% of the area is water, forest, wetland or cemetery and is left unbuilt.`));
  if (built > 0.05) r.warns.push(L(`${Math.round(built * 100)}% din zonă e deja construită; clădirile existente se păstrează, iar cartierul se face pe restul terenului.`, `${Math.round(built * 100)}% of the area is already built up; existing buildings stay and the district uses the rest of the land.`));
  const add = (key, ro, en, n, unit, lo, hi, pub) => {
    r.items.push({ key, ro, en, n, unit, lo, hi });
    const tgt = pub ? r.pub : r.priv; tgt[0] += lo; tgt[1] += hi;
  };
  const km2 = ha / 100;
  // streets and networks
  const need = Math.round(km2 * T.road * 100) / 100, have = Math.min(need, st?.roadKm || 0);
  const roadKm = ov.roadKm ?? Math.round(Math.max(0, need - have) * 100) / 100;
  r.roadNeed = need; r.roadHave = have;
  add("roads", "Străzi noi (2 benzi + trotuare)", "New streets (2 lanes + sidewalks)", roadKm, "km", roadKm * 1000 * 10 * 150, roadKm * 1000 * 10 * 230, true);
  if (have > 0.05) add("upg", "Modernizarea străzilor existente", "Upgrading existing streets", have, "km", have * 1000 * 8 * 40, have * 1000 * 8 * 80, true);
  if (st?.mainKm > 0.05 && nb.type !== "park") add("link", "Drum de legătură la un drum principal", "Link road to a main road", st.mainKm, "km", st.mainKm * 1000 * 12 * 170, st.mainKm * 1000 * 12 * 250, true);
  if (nb.type !== "park") {
    const net = roadKm + (st?.mainKm || 0) + have * 0.4;   // existing streets: capacity upgrade at ~40% of a new network
    add("sewer", "Canalizare", "Sewer", net, "km", net * 1000 * 300, net * 1000 * 500, true);
    add("water", "Rețea de apă", "Water mains", net, "km", net * 1000 * 150, net * 1000 * 250, true);
    add("power", "Rețea electrică și iluminat", "Power and lighting", net, "km", net * 1000 * 80, net * 1000 * 150, true);
  }
  if (demolish && st?.bld) {
    const dw = Math.round((st.pop || 0) / HH);
    add("demo", `Exproprieri (${fmt(dw)} locuințe) și demolări`, `Expropriation (${fmt(dw)} homes) and demolition`, st.bld, L("clădiri", "buildings"), dw * 40e3 + st.bld * 8e3, dw * 70e3 + st.bld * 15e3, true);
  }
  if (T.res) {
    const pop = Math.round(ha * (nb.dens || T.dens));
    const net = ha * 1e4 * 0.6;                                   // 40% of the land: streets, schools, green space
    const gfa = pop * 25 * 1.25 * (1 + (T.retail || 0));          // 25 m² of living space per person, +25% common areas
    let fl = Math.ceil(gfa / (T.cov * net));
    if (fl > T.fl[1]) r.warn = L(`Densitatea cere ${fl} etaje; pentru acest tip maximul e ${T.fl[1]}. Alege un tip mai înalt sau o densitate mai mică.`, `This density needs ${fl} floors; this type allows at most ${T.fl[1]}. Pick a taller type or a lower density.`);
    fl = ov.floors ?? Math.max(T.fl[0], Math.min(T.fl[1], fl));
    const dw = Math.round(pop / HH);
    if (nb.type === "res_houses") {
      const n = ov.houses ?? dw;
      add("houses", "Case", "Houses", n, L("case", "houses"), n * 110 * T.cost[0], n * 140 * T.cost[1], false);
    } else {
      const apb = fl * 8, n = ov.blocks ?? Math.max(1, Math.ceil(dw / apb));
      const area = n * apb * 62;
      add("blocks", `Blocuri locative de ${fl} etaje`, `${fl}-storey residential blocks`, n, L("blocuri", "blocks"), area * T.cost[0], area * T.cost[1], false);
      if (T.retail) add("retail", "Spații comerciale la parter", "Ground-floor retail", Math.round(area * T.retail), "m²", area * T.retail * 500, area * T.retail * 750, false);
    }
    // nearby spare places (negative = existing shortage that the district makes worse)
    const sp = st?.spare || { school: 0, kinder: 0, clinic: 0 };
    const pupils = Math.max(0, pop * 0.11 - Math.max(0, sp.school)), kids = Math.max(0, pop * 0.055 - Math.max(0, sp.kinder)), pat = Math.max(0, pop - Math.max(0, sp.clinic));
    r.useSpare = { school: Math.min(pop * 0.11, Math.max(0, sp.school)), kinder: Math.min(pop * 0.055, Math.max(0, sp.kinder)), clinic: Math.min(pop, Math.max(0, sp.clinic)) };
    const sch = ov.schools ?? (pupils > 150 ? Math.ceil(pupils / 1000) : 0);
    const kg = ov.kinder ?? (kids > 40 ? Math.ceil(kids / 200) : 0);
    const cl = ov.clinics ?? (pat > 3000 ? Math.ceil(pat / 15000) : 0);
    add("schools", "Școli (≈1.000 de elevi)", "Schools (≈1,000 pupils)", sch, L("școli", "schools"), sch * 8e6, sch * 12e6, true);
    add("kinder", "Grădinițe (≈200 de copii)", "Kindergartens (≈200 children)", kg, L("grădinițe", "kindergartens"), kg * 1.5e6, kg * 2.5e6, true);
    add("clinics", "Centre de sănătate", "Health centres", cl, L("centre", "centres"), cl * 2e6, cl * 4e6, true);
    const green = Math.min(ha * 1e4 * 0.15, pop * 8);
    add("green", "Spații verzi și locuri de joacă", "Green space and playgrounds", Math.round(green), "m²", green * 20, green * 50, true);
    r.pop = pop; r.dw = dw; r.fl = fl;
    if (st?.stopKm > 0.4) add("bus", "Prelungirea unei linii de autobuz (3 autobuze + stații)", "Bus line extension (3 buses + stops)", 1, L("linie", "line"), 0.6e6, 1.1e6, true);
  } else if (T.far) {
    const gfa = ha * 1e4 * 0.6 * T.far;
    add("bld", nb.type === "office" ? "Clădiri de birouri" : "Hale și depozite", nb.type === "office" ? "Office buildings" : "Halls and warehouses", Math.round(gfa), "m²", gfa * T.cost[0], gfa * T.cost[1], false);
    r.jobs = Math.round(gfa / T.jobs);
  } else if (T.park) {
    const m2 = ha * 1e4 * 0.9;
    add("park", "Amenajare parc (alei, plantări, mobilier, iluminat)", "Park works (paths, planting, furniture, lighting)", Math.round(m2), "m²", m2 * T.park[0], m2 * T.park[1], true);
  }
  if (st?.slope > 6) {
    const f = Math.min(0.3, (st.slope - 6) * 0.02), base = [r.pub[0] + r.priv[0], r.pub[1] + r.priv[1]];
    add("earth", `Terasamente și consolidări (pantă ≈ ${fmt(st.slope, 1)}%)`, `Earthworks and retaining (slope ≈ ${fmt(st.slope, 1)}%)`, Math.round(f * 100), "%", base[0] * f, base[1] * f, true);
    if (st.slope > 15) r.warns.push(L("Teren în pantă mare: risc de alunecări de teren, necesită studiu geotehnic.", "Steep terrain: landslide risk, a geotechnical study is required."));
  }
  if (demolish && st?.pop) r.displaced = st.pop;
  // duration and workforce
  const mid = (r.pub[0] + r.pub[1] + r.priv[0] + r.priv[1]) / 2;
  const months = T.park ? 6 + ha / 3 : 12 + 9 * Math.log2(1 + mid / 15e6);
  r.months = [Math.round(months * 0.8), Math.round(months * 1.3)];
  const pm = (mid * (T.park ? 0.45 : 0.35)) / 1100;                   // labour share of cost / average monthly labour cost (€)
  r.workers = Math.round(pm / months);
  r.qual = (T.park ? QUAL.park : QUAL.build).map(([ro, en, s]) => ({ ro, en, n: Math.max(1, Math.round(r.workers * s)) }));
  r.mid = mid;
  r.added = Math.round(r.pop * NB_OCC) - (r.displaced || 0);
  if (r.warn) r.warns.unshift(r.warn);
  return r;
}

// ---------------------------------------------------------------- drawing
function nbStart() {
  pjEnsureNbLayers();
  if (PJ.tool) pjEndRoadTool();
  PJ.tool = "nb"; PJ.nbDraft = { pts: [], hover: null };
  map.getCanvas().style.cursor = "crosshair"; map.doubleClickZoom.disable(); nbRender();
}
function nbEnd() { PJ.tool = null; PJ.nbDraft = null; map.getCanvas().style.cursor = ""; map.doubleClickZoom.enable(); nbData(); }
async function nbFinish() {
  const d = PJ.nbDraft; if (!d || d.pts.length < 3) { nbEnd(); nbRender(); return; }
  const ring = [...d.pts, d.pts[0]].map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6]);
  const geom = { type: "Polygon", coordinates: [ring] };
  const type = document.getElementById("nb-type").value, T = NB_TYPES[type];
  const nb = { id: "n" + Date.now().toString(36), name: (document.getElementById("nb-name").value || "").trim() || L("Cartier nou", "New district") + " " + ((PJ.cur.nbs || []).length + 1),
    type, dens: T.res ? +document.getElementById("nb-dens").value || T.dens : null, ring, ha: Math.round(geomArea(geom) / 100) / 100, ov: {}, t: new Date().toISOString() };
  nbEnd(); PJ.nbBusy = true; nbRender();
  try { nb.site = await nbSite(ring); } catch (err) { console.error(err); nb.site = null; }
  PJ.nbBusy = false;
  nb.est = nbCompute(nb);
  PJ.cur.nbs = [...(PJ.cur.nbs || []), nb];
  PJ.cur.log = [...(PJ.cur.log || []), { t: nb.t, what: `${L("Cartier nou", "New district")}: ${nb.name} (${L(T.ro, T.en)}, ${fmt(nb.ha, 1)} ha)` }].slice(-60);
  PJ.nbOpen = nb.id;
  nbData(); pjSave(); pjRebuild(); nbRender();
}
function pjEnsureNbLayers() {
  if (map.getSource("projnb")) return;
  map.addSource("projnb", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  const P = pal();
  map.addLayer({ id: "pj-nb", type: "fill", source: "projnb", filter: ["==", ["get", "k"], "nb"],
    paint: { "fill-color": ["match", ["get", "z"], ...Object.entries(P.zone).flat(), "#e5484d"], "fill-opacity": 0.85 } }, "admin-fill");
  map.addLayer({ id: "pj-nb-line", type: "line", source: "projnb", paint: { "line-color": "#f59f00", "line-width": 2.4, "line-dasharray": [2, 1] } }, "draw-fill");
  map.addLayer({ id: "pj-nb-pts", type: "circle", source: "projnb", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 4.5, "circle-color": "#fff", "circle-stroke-color": "#f59f00", "circle-stroke-width": 2.5 } }, "draw-fill");
  map.on("click", "pj-nb", (e) => {
    if (PJ.tool) return;
    const nb = (PJ.cur?.nbs || []).find((x) => x.id === e.features[0].properties.id); if (!nb) return;
    popup(e.lngLat, `<b>${esc(nb.name)}</b><br>${esc(L(NB_TYPES[nb.type].ro, NB_TYPES[nb.type].en))} · ${fmt(nb.ha, 1)} ha${nb.est.pop ? `<br>${fmt(nb.est.pop)} ${L("locuitori (capacitate)", "residents (capacity)")}` : ""}<br>${fmt(nb.est.pub[0] / 1e6 + nb.est.priv[0] / 1e6, 0)}–${fmt(nb.est.pub[1] / 1e6 + nb.est.priv[1] / 1e6, 0)} mil. €`);
  });
}
function nbData() {
  const fs = (PJ.cur?.nbs || []).map((nb) => ({ type: "Feature", properties: { k: "nb", id: nb.id, z: NB_TYPES[nb.type].zone }, geometry: { type: "Polygon", coordinates: [nb.ring] } }));
  const d = PJ.nbDraft;
  if (d && d.pts.length) {
    const pts = d.hover ? [...d.pts, d.hover] : d.pts;
    if (pts.length >= 3) fs.push({ type: "Feature", properties: { k: "draft" }, geometry: { type: "Polygon", coordinates: [[...pts, pts[0]]] } });
    else fs.push({ type: "Feature", properties: { k: "draft" }, geometry: { type: "LineString", coordinates: pts } });
    d.pts.forEach((c) => fs.push({ type: "Feature", properties: { k: "v" }, geometry: { type: "Point", coordinates: c } }));
  }
  map.getSource("projnb")?.setData({ type: "FeatureCollection", features: fs });
}

// ---------------------------------------------------------------- panel
const LU_NAME = (z) => (z === "free" ? L("teren liber / nemapat", "open / unmapped land") : t("z")[z] || z);
function nbSiteHtml(nb) {
  const s = nb.site; if (!s) return `<p class="small">${L("Analiza terenului nu e disponibilă.", "Site analysis unavailable.")}</p>`;
  const lu = Object.entries(s.lu || {}).sort((a, b) => b[1] - a[1]).filter(([, v]) => v >= 0.03).slice(0, 5)
    .map(([z, v]) => `${esc(LU_NAME(z))} ${Math.round(v * 100)}%`).join(" · ");
  const bal = (k, unit, people) => {
    const v = s.spare[k], n = s.around[k], r = fmt(Math.round(Math.abs(v) / 10) * 10);
    const what = people ? L("locuitori", "residents") : L("locuri", "places");
    return `${fmt(n)}${unit ? " " + unit : ""} · ${v >= 0 ? L(`liber ≈ ${r} ${what}`, `spare ≈ ${r} ${what}`) : `<span class="warn">${L(`deficit ≈ ${r} ${what}`, `shortage ≈ ${r} ${what}`)}</span>`}`;
  };
  const ov = nb.ov || {};
  return `<div class="cap">${L("Ce există acum", "What is there now")}</div>
  <dl class="stats site">
    <dt>${L("În zonă", "Inside")}</dt><dd>${fmt(s.bld)} ${L("clădiri", "buildings")} · ${fmt(s.pop)} ${L("locuitori", "residents")}</dd>
    <dt>${L("Folosința terenului", "Land use")}</dt><dd>${lu || "—"}</dd>
    <dt>${L("Străzi existente", "Existing streets")}</dt><dd>${fmt(s.roadKm, 2)} km ${L("din", "of")} ${fmt(nb.est.roadNeed || 0, 2)} km ${L("necesari", "needed")}</dd>
    <dt>${L("Relief", "Terrain")}</dt><dd>${s.eMin != null ? `${fmt(s.eMin)}–${fmt(s.eMax)} m · ${L("pantă medie", "average slope")} ≈ ${fmt(s.slope, 1)}%` : "—"}</dd>
    <dt>${L("Cea mai apropiată stație", "Nearest stop")}</dt><dd>${s.stopKm == null ? "—" : s.stopKm === 0 ? L("în zonă", "inside") : fmt(s.stopKm * 1000, 0) + " m"}</dd>
    <dt>${L("Drum principal", "Main road")}</dt><dd>${s.mainKm == null ? "—" : s.mainKm === 0 ? L("trece prin zonă", "crosses the area") : fmt(s.mainKm * 1000, 0) + " m"}</dd>
  </dl>
  <div class="cap">${L("În jur (1 km)", "Around (1 km)")} · ${fmt(s.around.pop)} ${L("locuitori", "residents")}</div>
  <dl class="stats site">
    <dt>${L("Școli", "Schools")}</dt><dd>${bal("school", L("școli", "schools"))}</dd>
    <dt>${L("Grădinițe", "Kindergartens")}</dt><dd>${bal("kinder", L("grădinițe", "kindergartens"))}</dd>
    <dt>${L("Clinici, spitale, cabinete", "Clinics, hospitals, practices")}</dt><dd>${bal("clinic", "", true)}</dd>
  </dl>
  ${s.bld ? `<label class="chk"><input type="checkbox" data-nbdemo="${nb.id}" ${ov.demolish ? "checked" : ""}> ${L("Demolează construcțiile existente (exproprieri, locuitorii se mută)", "Demolish existing buildings (expropriation, residents move out)")}</label>` : ""}`;
}
const eurRange = (a, b) => `${fmt(a / 1e6, a < 1e7 ? 1 : 0)}–${fmt(b / 1e6, b < 1e7 ? 1 : 0)} mil. €`;
function pjTotals() {
  const roads = (PJ.cur?.roads || []).reduce((a, r) => a + r.cost, 0);
  let lo = roads, hi = roads, pubLo = roads, pubHi = roads;
  for (const nb of PJ.cur?.nbs || []) { lo += nb.est.pub[0] + nb.est.priv[0]; hi += nb.est.pub[1] + nb.est.priv[1]; pubLo += nb.est.pub[0]; pubHi += nb.est.pub[1]; }
  return { lo, hi, pubLo, pubHi, roads };
}
function nbRender() {
  const el = document.getElementById("projnb"); if (!el || !PJ.cur) return;
  const cur = document.getElementById("nb-type")?.value || PJ.nbType || "res_mid", T = NB_TYPES[cur];
  let h = `<div class="pjact"><b>${L("Cartier nou", "New district")}</b>
    <input type="text" class="pjin" id="nb-name" placeholder="${esc(L("Numele cartierului (opțional)", "District name (optional)"))}">
    <label class="pjrow nbtype"><span>${L("Tipul", "Type")}</span><select id="nb-type">${Object.entries(NB_TYPES).map(([k, v]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${esc(L(v.ro, v.en))}</option>`).join("")}</select></label>
    ${T.res ? `<label class="pjrow"><span>${L("Densitate (loc./ha)", "Density (people/ha)")}: <b id="nb-dv">${PJ.nbDens?.[cur] ?? T.dens}</b></span><input type="range" id="nb-dens" min="${T.min}" max="${T.max}" step="5" value="${PJ.nbDens?.[cur] ?? T.dens}"></label>` : `<p class="small">${T.park ? L("Nu adaugă locuitori; costul depinde de suprafață.", "Adds no residents; cost depends on the area.") : L("Nu adaugă locuitori; locurile de muncă și costul se calculează din suprafață.", "Adds no residents; jobs and cost are derived from the area.")}</p>`}
    ${PJ.tool === "nb" ? `<p class="small">${L("Apasă pe hartă colțurile zonei. Clic dreapta sau dublu-clic închide zona.", "Tap the map for the corners. Right-click or double-click closes the area.")}</p>
      <div class="btnrow"><button type="button" class="btn" data-nb="finish">${L("Gata", "Done")}</button><button type="button" class="btn ghost" data-nb="cancel">${L("Renunță", "Cancel")}</button></div>`
      : `<button type="button" class="btn" data-nb="start">${L("Desenează zona", "Draw the area")}</button>`}</div>`;
  const nbs = PJ.cur.nbs || [];
  h += `<div class="cap">${L("Cartiere în proiect", "Districts in the project")} (${nbs.length})</div>`;
  for (const nb of nbs) {
    if (nb.site === undefined && !nb._busy) {   // districts saved before the site analysis existed
      nb._busy = true;
      nbSite(nb.ring).then((st) => { nb.site = st; }).catch(() => { nb.site = null; }).finally(() => { delete nb._busy; nb.est = nbCompute(nb); pjSave(); pjRebuild(); nbRender(); });
    }
    const e = nb.est, Tn = NB_TYPES[nb.type], open = PJ.nbOpen === nb.id;
    h += `<div class="nbcard"><button type="button" class="nbhead" data-nbopen="${nb.id}" aria-expanded="${open}"><b>${esc(nb.name)}</b><small>${esc(L(Tn.ro, Tn.en))} · ${fmt(nb.ha, 1)} ha${e.pop ? ` · ${fmt(e.pop)} ${L("loc.", "people")}` : ""}${e.jobs ? ` · ${fmt(e.jobs)} ${L("locuri de muncă", "jobs")}` : ""}</small><span>${eurRange(e.pub[0] + e.priv[0], e.pub[1] + e.priv[1])}</span></button>`;
    if (open) {
      h += nbSiteHtml(nb);
      (e.warns || []).forEach((w) => (h += `<p class="small warn">${w}</p>`));
      h += `<table class="nbt"><tbody>${e.items.map((it) => {
        const editable = { houses: 1, blocks: 1, schools: 1, kinder: 1, clinics: 1 }[it.key];
        return `<tr><td>${esc(L(it.ro, it.en))}</td><td>${editable ? `<input type="number" min="0" class="nbin" data-ov="${it.key}" data-nb="${nb.id}" value="${it.n}">` : `${fmt(it.n, it.unit === "km" ? 2 : 0)}`} <small>${esc(it.unit)}</small></td><td>${eurRange(it.lo, it.hi)}</td></tr>`;
      }).join("")}
        ${e.fl ? `<tr><td>${L("Etaje", "Floors")}</td><td><input type="number" min="1" max="30" class="nbin" data-ov="floors" data-nb="${nb.id}" value="${e.fl}"></td><td></td></tr>` : ""}</tbody></table>
        <dl class="stats"><dt>${L("Public (străzi, rețele, școli, grădinițe, sănătate, spații verzi)", "Public (streets, networks, schools, kindergartens, health, green)")}</dt><dd>${eurRange(e.pub[0], e.pub[1])}</dd>
        <dt>${L("Privat / investitori (clădiri)", "Private / investors (buildings)")}</dt><dd>${eurRange(e.priv[0], e.priv[1])}</dd>
        <dt>${L("Durată estimată", "Estimated duration")}</dt><dd>${e.months[0]}–${e.months[1]} ${L("luni", "months")}</dd>
        <dt>${L("Muncitori (în medie pe șantier)", "Workers (average on site)")}</dt><dd>≈ ${fmt(e.workers)}</dd>
        ${e.pop || e.displaced ? `<dt>${L("Schimbarea populației", "Population change")} (${Math.round(NB_OCC * 100)}% ${L("din capacitate", "of capacity")}${e.displaced ? L(", minus locuitorii mutați", ", minus displaced residents") : ""})</dt><dd>${e.added >= 0 ? "+" : ""}${fmt(e.added)}</dd>` : ""}</dl>
        <div class="cap">${L("Calificări necesare", "Skills needed")}</div><ul class="qual">${e.qual.map((q) => `<li><span>${esc(L(q.ro, q.en))}</span><b>${fmt(q.n)}</b></li>`).join("")}</ul>
        <div class="btnrow"><button type="button" class="btn ghost sm" data-nbreset="${nb.id}">${L("Revino la estimare", "Reset to estimate")}</button><button type="button" class="btn ghost sm" data-nbdel="${nb.id}">${L("Șterge cartierul", "Delete district")}</button></div>`;
    }
    h += `</div>`;
  }
  if (PJ.nbBusy) h += `<p class="hint">${L("Analizez terenul (clădiri, străzi, relief, școli din jur)…", "Analysing the site (buildings, streets, terrain, nearby schools)…")}</p>`;
  if (!nbs.length && !PJ.nbBusy) h += `<p class="hint">${L("Niciun cartier încă.", "No districts yet.")}</p>`;
  h += `<p class="small">${L(`Estimări orientative pentru planificare: ${fmt(HH, 1)} persoane pe locuință, 25 m² de locuit pe persoană, o școală la 1.000 de elevi (11% din populație), o grădiniță la 200 de copii (5,5%), un centru de sănătate la 15.000 de locuitori; costuri pe m² din piața din Moldova (2025–2026). La populație se adaugă ${Math.round(NB_OCC * 100)}% din capacitate (gradul estimat de ocupare). Locurile libere din școli, grădinițe și clinici pe o rază de 1 km se calculează presupunând că în medie, în tot municipiul, ele sunt ocupate complet; dacă în jur sunt locuri libere, cartierul are nevoie de mai puține clădiri noi. Străzile existente din zonă se modernizează în loc să fie construite din nou.`,
    `Planning estimates: ${fmt(HH, 1)} people per dwelling, 25 m² living space per person, one school per 1,000 pupils (11% of residents), one kindergarten per 200 children (5.5%), one health centre per 15,000 residents; costs per m² from the Moldovan market (2025–2026). ${Math.round(NB_OCC * 100)}% of capacity is added to the population (expected occupancy). Spare places in schools, kindergartens and clinics within 1 km assume that, on average across the municipality, they are fully used; spare places nearby mean fewer new buildings. Existing streets inside the area are upgraded instead of rebuilt.`)}</p>`;
  el.innerHTML = h;
  pjTotalsRender();
}
function pjTotalsRender() {
  const el = document.getElementById("bt-total"); if (!el || !PJ.cur) return;
  const t = pjTotals();
  el.innerHTML = `<span>${L("Cost total proiect", "Project total cost")}</span><b>${eurRange(t.lo, t.hi)}</b><small>${L("din care public", "of which public")}: ${eurRange(t.pubLo, t.pubHi)}</small>`;
}
function nbBind() {
  const box = document.getElementById("projnb");
  box.addEventListener("change", (e) => {
    if (e.target.dataset.nbdemo) {
      const nb = PJ.cur.nbs.find((x) => x.id === e.target.dataset.nbdemo);
      nb.ov = { ...(nb.ov || {}), demolish: e.target.checked }; nb.est = nbCompute(nb); pjSave(); pjRebuild(); nbRender(); return;
    }
    if (e.target.id === "nb-type") { PJ.nbType = e.target.value; nbRender(); }
    const ov = e.target.dataset.ov;
    if (ov) {
      const nb = PJ.cur.nbs.find((x) => x.id === e.target.dataset.nb);
      nb.ov = { ...(nb.ov || {}), [ov]: Math.max(0, +e.target.value || 0) }; nb.est = nbCompute(nb);
      PJ.cur.log = [...(PJ.cur.log || []), { t: new Date().toISOString(), what: `${nb.name}: ${L("ajustat manual", "adjusted manually")} (${ov} = ${nb.ov[ov]})` }].slice(-60);
      pjSave(); pjRebuild(); nbRender();
    }
  });
  box.addEventListener("input", (e) => {
    if (e.target.id === "nb-dens") { PJ.nbDens = { ...(PJ.nbDens || {}), [document.getElementById("nb-type").value]: +e.target.value }; document.getElementById("nb-dv").textContent = e.target.value; }
  });
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.nb === "start") nbStart();
    else if (b.dataset.nb === "finish") nbFinish();
    else if (b.dataset.nb === "cancel") { nbEnd(); nbRender(); }
    else if (b.dataset.nbopen) { PJ.nbOpen = PJ.nbOpen === b.dataset.nbopen ? null : b.dataset.nbopen; nbRender(); }
    else if (b.dataset.nbreset) { const nb = PJ.cur.nbs.find((x) => x.id === b.dataset.nbreset); nb.ov = {}; nb.est = nbCompute(nb); pjSave(); pjRebuild(); nbRender(); }
    else if (b.dataset.nbdel) {
      const nb = PJ.cur.nbs.find((x) => x.id === b.dataset.nbdel);
      PJ.cur.nbs = PJ.cur.nbs.filter((x) => x.id !== nb.id);
      PJ.cur.log = [...(PJ.cur.log || []), { t: new Date().toISOString(), what: L("Cartier șters", "District deleted") + ": " + nb.name }].slice(-60);
      pjSave(); pjRebuild(); nbData(); nbRender();
    }
  });
  map.on("click", (e) => { if (PJ.tool !== "nb") return; PJ.nbDraft.pts.push([e.lngLat.lng, e.lngLat.lat]); nbData(); });
  map.on("mousemove", (e) => { if (PJ.tool !== "nb") return; PJ.nbDraft.hover = [e.lngLat.lng, e.lngLat.lat]; nbData(); });
  map.on("dblclick", (e) => { if (PJ.tool === "nb") { e.preventDefault(); PJ.nbDraft.pts.pop(); nbFinish(); } });
  map.on("contextmenu", (e) => { if (PJ.tool === "nb") { e.preventDefault(); nbFinish(); } });
}
