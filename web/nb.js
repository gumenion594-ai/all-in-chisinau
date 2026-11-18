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

function nbCompute(nb) {
  const T = NB_TYPES[nb.type], ha = nb.ha, ov = nb.ov || {};
  const r = { items: [], pub: [0, 0], priv: [0, 0], pop: 0, jobs: 0, warn: null };
  const add = (key, ro, en, n, unit, lo, hi, pub) => {
    r.items.push({ key, ro, en, n, unit, lo, hi });
    const tgt = pub ? r.pub : r.priv; tgt[0] += lo; tgt[1] += hi;
  };
  const km2 = ha / 100;
  // streets and networks
  const roadKm = ov.roadKm ?? Math.round(km2 * T.road * 100) / 100;
  add("roads", "Străzi (2 benzi + trotuare)", "Streets (2 lanes + sidewalks)", roadKm, "km", roadKm * 1000 * 10 * 150, roadKm * 1000 * 10 * 230, true);
  if (nb.type !== "park") {
    add("sewer", "Canalizare", "Sewer", roadKm, "km", roadKm * 1000 * 300, roadKm * 1000 * 500, true);
    add("water", "Rețea de apă", "Water mains", roadKm, "km", roadKm * 1000 * 150, roadKm * 1000 * 250, true);
    add("power", "Rețea electrică și iluminat", "Power and lighting", roadKm, "km", roadKm * 1000 * 80, roadKm * 1000 * 150, true);
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
    const sch = ov.schools ?? (pop * 0.11 > 150 ? Math.ceil(pop * 0.11 / 1000) : 0);
    const kg = ov.kinder ?? (pop * 0.055 > 40 ? Math.ceil(pop * 0.055 / 200) : 0);
    const cl = ov.clinics ?? (pop > 3000 ? Math.ceil(pop / 15000) : 0);
    add("schools", "Școli (≈1.000 de elevi)", "Schools (≈1,000 pupils)", sch, L("școli", "schools"), sch * 8e6, sch * 12e6, true);
    add("kinder", "Grădinițe (≈200 de copii)", "Kindergartens (≈200 children)", kg, L("grădinițe", "kindergartens"), kg * 1.5e6, kg * 2.5e6, true);
    add("clinics", "Centre de sănătate", "Health centres", cl, L("centre", "centres"), cl * 2e6, cl * 4e6, true);
    const green = Math.min(ha * 1e4 * 0.15, pop * 8);
    add("green", "Spații verzi și locuri de joacă", "Green space and playgrounds", Math.round(green), "m²", green * 20, green * 50, true);
    r.pop = pop; r.dw = dw; r.fl = fl;
  } else if (T.far) {
    const gfa = ha * 1e4 * 0.6 * T.far;
    add("bld", nb.type === "office" ? "Clădiri de birouri" : "Hale și depozite", nb.type === "office" ? "Office buildings" : "Halls and warehouses", Math.round(gfa), "m²", gfa * T.cost[0], gfa * T.cost[1], false);
    r.jobs = Math.round(gfa / T.jobs);
  } else if (T.park) {
    const m2 = ha * 1e4 * 0.9;
    add("park", "Amenajare parc (alei, plantări, mobilier, iluminat)", "Park works (paths, planting, furniture, lighting)", Math.round(m2), "m²", m2 * T.park[0], m2 * T.park[1], true);
  }
  // duration and workforce
  const mid = (r.pub[0] + r.pub[1] + r.priv[0] + r.priv[1]) / 2;
  const months = T.park ? 6 + ha / 3 : 12 + 9 * Math.log2(1 + mid / 15e6);
  r.months = [Math.round(months * 0.8), Math.round(months * 1.3)];
  const pm = (mid * (T.park ? 0.45 : 0.35)) / 1100;                   // labour share of cost / average monthly labour cost (€)
  r.workers = Math.round(pm / months);
  r.qual = (T.park ? QUAL.park : QUAL.build).map(([ro, en, s]) => ({ ro, en, n: Math.max(1, Math.round(r.workers * s)) }));
  r.mid = mid;
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
function nbFinish() {
  const d = PJ.nbDraft; if (!d || d.pts.length < 3) { nbEnd(); nbRender(); return; }
  const ring = [...d.pts, d.pts[0]].map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6]);
  const geom = { type: "Polygon", coordinates: [ring] };
  const type = document.getElementById("nb-type").value, T = NB_TYPES[type];
  const nb = { id: "n" + Date.now().toString(36), name: (document.getElementById("nb-name").value || "").trim() || L("Cartier nou", "New district") + " " + ((PJ.cur.nbs || []).length + 1),
    type, dens: T.res ? +document.getElementById("nb-dens").value || T.dens : null, ring, ha: Math.round(geomArea(geom) / 100) / 100, ov: {}, t: new Date().toISOString() };
  nb.est = nbCompute(nb);
  PJ.cur.nbs = [...(PJ.cur.nbs || []), nb];
  PJ.cur.log = [...(PJ.cur.log || []), { t: nb.t, what: `${L("Cartier nou", "New district")}: ${nb.name} (${T[S.lang === "ro" ? "ro" : "en"]}, ${fmt(nb.ha, 1)} ha)` }].slice(-60);
  PJ.nbOpen = nb.id;
  nbEnd(); pjSave(); pjRebuild(); nbRender();
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
    popup(e.lngLat, `<b>${esc(nb.name)}</b><br>${esc(NB_TYPES[nb.type][S.lang === "ro" ? "ro" : "en"])} · ${fmt(nb.ha, 1)} ha${nb.est.pop ? `<br>${fmt(nb.est.pop)} ${L("locuitori (capacitate)", "residents (capacity)")}` : ""}<br>${fmt(nb.est.pub[0] / 1e6 + nb.est.priv[0] / 1e6, 0)}–${fmt(nb.est.pub[1] / 1e6 + nb.est.priv[1] / 1e6, 0)} mil. €`);
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
    <label class="pjrow nbtype"><span>${L("Tipul", "Type")}</span><select id="nb-type">${Object.entries(NB_TYPES).map(([k, v]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${esc(v[S.lang === "ro" ? "ro" : "en"])}</option>`).join("")}</select></label>
    ${T.res ? `<label class="pjrow"><span>${L("Densitate (loc./ha)", "Density (people/ha)")}: <b id="nb-dv">${PJ.nbDens?.[cur] ?? T.dens}</b></span><input type="range" id="nb-dens" min="${T.min}" max="${T.max}" step="5" value="${PJ.nbDens?.[cur] ?? T.dens}"></label>` : `<p class="small">${T.park ? L("Nu adaugă locuitori; costul depinde de suprafață.", "Adds no residents; cost depends on the area.") : L("Nu adaugă locuitori; locurile de muncă și costul se calculează din suprafață.", "Adds no residents; jobs and cost are derived from the area.")}</p>`}
    ${PJ.tool === "nb" ? `<p class="small">${L("Apasă pe hartă colțurile zonei. Clic dreapta sau dublu-clic închide zona.", "Tap the map for the corners. Right-click or double-click closes the area.")}</p>
      <div class="btnrow"><button type="button" class="btn" data-nb="finish">${L("Gata", "Done")}</button><button type="button" class="btn ghost" data-nb="cancel">${L("Renunță", "Cancel")}</button></div>`
      : `<button type="button" class="btn" data-nb="start">${L("Desenează zona", "Draw the area")}</button>`}</div>`;
  const nbs = PJ.cur.nbs || [];
  h += `<div class="cap">${L("Cartiere în proiect", "Districts in the project")} (${nbs.length})</div>`;
  for (const nb of nbs) {
    const e = nb.est, Tn = NB_TYPES[nb.type], open = PJ.nbOpen === nb.id;
    h += `<div class="nbcard"><button type="button" class="nbhead" data-nbopen="${nb.id}" aria-expanded="${open}"><b>${esc(nb.name)}</b><small>${esc(Tn[S.lang === "ro" ? "ro" : "en"])} · ${fmt(nb.ha, 1)} ha${e.pop ? ` · ${fmt(e.pop)} ${L("loc.", "people")}` : ""}${e.jobs ? ` · ${fmt(e.jobs)} ${L("locuri de muncă", "jobs")}` : ""}</small><span>${eurRange(e.pub[0] + e.priv[0], e.pub[1] + e.priv[1])}</span></button>`;
    if (open) {
      if (e.warn) h += `<p class="small warn">${e.warn}</p>`;
      h += `<table class="nbt"><tbody>${e.items.map((it) => {
        const editable = { houses: 1, blocks: 1, schools: 1, kinder: 1, clinics: 1 }[it.key];
        return `<tr><td>${esc(it[S.lang === "ro" ? "ro" : "en"])}</td><td>${editable ? `<input type="number" min="0" class="nbin" data-ov="${it.key}" data-nb="${nb.id}" value="${it.n}">` : `${fmt(it.n, it.unit === "km" ? 2 : 0)}`} <small>${esc(it.unit)}</small></td><td>${eurRange(it.lo, it.hi)}</td></tr>`;
      }).join("")}
        ${e.fl ? `<tr><td>${L("Etaje", "Floors")}</td><td><input type="number" min="1" max="30" class="nbin" data-ov="floors" data-nb="${nb.id}" value="${e.fl}"></td><td></td></tr>` : ""}</tbody></table>
        <dl class="stats"><dt>${L("Public (străzi, rețele, școli, grădinițe, sănătate, spații verzi)", "Public (streets, networks, schools, kindergartens, health, green)")}</dt><dd>${eurRange(e.pub[0], e.pub[1])}</dd>
        <dt>${L("Privat / investitori (clădiri)", "Private / investors (buildings)")}</dt><dd>${eurRange(e.priv[0], e.priv[1])}</dd>
        <dt>${L("Durată estimată", "Estimated duration")}</dt><dd>${e.months[0]}–${e.months[1]} ${L("luni", "months")}</dd>
        <dt>${L("Muncitori (în medie pe șantier)", "Workers (average on site)")}</dt><dd>≈ ${fmt(e.workers)}</dd>
        ${e.pop ? `<dt>${L("Locuitori adăugați la populație", "Residents added to population")} (${Math.round(NB_OCC * 100)}%)</dt><dd>${fmt(Math.round(e.pop * NB_OCC))}</dd>` : ""}</dl>
        <div class="cap">${L("Calificări necesare", "Skills needed")}</div><ul class="qual">${e.qual.map((q) => `<li><span>${esc(q[S.lang === "ro" ? "ro" : "en"])}</span><b>${fmt(q.n)}</b></li>`).join("")}</ul>
        <div class="btnrow"><button type="button" class="btn ghost sm" data-nbreset="${nb.id}">${L("Revino la estimare", "Reset to estimate")}</button><button type="button" class="btn ghost sm" data-nbdel="${nb.id}">${L("Șterge cartierul", "Delete district")}</button></div>`;
    }
    h += `</div>`;
  }
  if (!nbs.length) h += `<p class="hint">${L("Niciun cartier încă.", "No districts yet.")}</p>`;
  h += `<p class="small">${L(`Estimări orientative pentru planificare: ${fmt(HH, 1)} persoane pe locuință, 25 m² de locuit pe persoană, o școală la 1.000 de elevi (11% din populație), o grădiniță la 200 de copii (5,5%), un centru de sănătate la 15.000 de locuitori; costuri pe m² din piața din Moldova (2025–2026). La populație se adaugă ${Math.round(NB_OCC * 100)}% din capacitate (gradul estimat de ocupare).`,
    `Planning estimates: ${fmt(HH, 1)} people per dwelling, 25 m² living space per person, one school per 1,000 pupils (11% of residents), one kindergarten per 200 children (5.5%), one health centre per 15,000 residents; costs per m² from the Moldovan market (2025–2026). ${Math.round(NB_OCC * 100)}% of capacity is added to the population (expected occupancy).`)}</p>`;
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
