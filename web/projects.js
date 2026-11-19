// ================================================================== PROJECTS
// A project = a saved set of edits on top of the atlas: administrative re-mapping (level-3 blocks are the
// building blocks) and new roads. Stored in the artifact's shared database (db capability), or in this
// browser when the database is not available.
// Russian strings are added at build time (third argument) or looked up in RUX by the Romanian text
const RUX = {};
const L = (ro, en, ru) => (S.lang === "ro" ? ro : S.lang === "ru" ? (ru ?? RUX[ro] ?? en) : en);
const ROAD_COST_M2 = 190;   // € per m² of carriageway — Centura Chișinău concept (2014): segment 6, 86.7 M€ / 32 km / 4 lanes
const LANE_W = 3.5;         // m per lane
const NEWSEC_COL = ["#0ca678", "#f76707", "#ae3ec9", "#1098ad", "#d6336c", "#74b816", "#4263eb", "#f59f00"];

const PJ = {
  db: null, ready: false, list: {}, cur: null, saving: false, dirty: false, timer: 0, local: false,
  admin: null, blocks: null, sel: [], tool: null, draft: null, roadsOn: true,
};

// ---------------------------------------------------------------- storage
function pjLocalAll() { try { return JSON.parse(localStorage.getItem("chi-atlas-projects") || "{}"); } catch { return {}; } }
function pjLocalPut(p) { try { const a = pjLocalAll(); a[p.id] = p; localStorage.setItem("chi-atlas-projects", JSON.stringify(a)); } catch {} }
async function pjInit() {
  try { PJ.db = await (window.claude?.use ? window.claude.use("db") : null); } catch { PJ.db = null; }
  if (!PJ.db) { PJ.local = true; PJ.list = pjLocalAll(); PJ.ready = true; pjRenderList(); return; }
  const timer = setTimeout(() => { if (!PJ.ready) { PJ.ready = true; PJ.loadNote = L("Proiectele nu pot fi încărcate încă.", "Projects cannot be reached yet."); pjRenderList(); } }, 10000);
  PJ.db.collection("projects").onSnapshot((snap) => {
    clearTimeout(timer); PJ.ready = true; PJ.loadNote = null;
    const list = {};
    snap.docs.forEach((d) => { const v = d.data(); if (v) list[d.id] = { ...v, id: d.id }; });
    PJ.list = list;
    // another viewer changed the open project: adopt it unless we have unsaved edits
    if (PJ.cur && list[PJ.cur.id] && !PJ.dirty && !PJ.saving && list[PJ.cur.id].updated !== PJ.cur.updated) {
      PJ.cur = structuredClone(list[PJ.cur.id]); pjRebuild();
    }
    pjRenderList();
  }, () => { clearTimeout(timer); PJ.db = null; PJ.local = true; PJ.list = pjLocalAll(); PJ.ready = true; pjRenderList(); });
}
function pjSave() {
  if (!PJ.cur) return;
  PJ.cur.updated = new Date().toISOString();
  PJ.dirty = true; pjStatus();
  clearTimeout(PJ.timer);
  PJ.timer = setTimeout(pjFlush, 700);
}
async function pjFlush() {
  if (!PJ.cur) return;
  if (PJ.saving) { clearTimeout(PJ.timer); PJ.timer = setTimeout(pjFlush, 400); return; }
  const body = structuredClone(PJ.cur); delete body.id;
  PJ.saving = true; pjStatus();
  try {
    if (PJ.db) await PJ.db.collection("projects").doc(PJ.cur.id).set(body);
    else pjLocalPut(PJ.cur);
    PJ.dirty = false; PJ.err = null;
  } catch (e) {
    PJ.err = e?.code === "quota_exceeded" ? L("Spațiul de stocare e plin.", "Storage is full.")
      : e?.code === "invalid_argument" ? L("Nu ai drept de scriere: modificările rămân doar în această vizită.", "You can't write here: changes stay in this visit only.")
      : L("Nu s-a putut salva; reîncerc la următoarea modificare.", "Could not save; will retry on the next change.");
  }
  PJ.saving = false; pjStatus();
}
function pjNew(name) {
  const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const p = { id, name: name || L("Proiect nou", "New project"), created: new Date().toISOString(), updated: new Date().toISOString(),
    base: REF(), blk: {}, units: {}, sectors: {}, names: {}, grp: {}, roads: [], log: [], hist: [] };
  PJ.list[id] = p; pjOpen(id, true);
}
async function pjOpen(id, fresh) {
  PJ.cur = structuredClone(PJ.list[id]); PJ.sel = []; PJ.tool = null; PJ.draft = null;
  document.body.classList.add("inproj");
  document.getElementById("projlist").hidden = true; document.getElementById("projnew").hidden = true;
  if (fresh) pjSave();
  await pjRebuild(); pjEnsureNbLayers(); nbData();
  S.mode = "admin"; pjBuildTab("admin", true); render();
}
function pjClose() {
  if (PJ.dirty) pjFlush();
  PJ.cur = null; PJ.admin = null; PJ.sel = []; pjEndRoadTool();
  document.body.classList.remove("inproj");
  load("admin.geojson").then((a) => { map.getSource("admin").setData(a); });
  map.getSource("projroads")?.setData({ type: "FeatureCollection", features: [] });
  map.getSource("projnb")?.setData({ type: "FeatureCollection", features: [] });
  document.getElementById("buildpanel").hidden = true; document.getElementById("buildbtn").setAttribute("aria-expanded", "false");
  clearSel(); render();
}
function pjStatus() {
  const el = document.getElementById("projstatus"); if (!el || !PJ.cur) return;
  el.textContent = PJ.err ? PJ.err : PJ.saving || PJ.dirty ? L("Se salvează…", "Saving…") : PJ.local ? L("Salvat în acest browser", "Saved in this browser") : L("Salvat", "Saved");
  el.classList.toggle("warn", !!PJ.err);
  document.getElementById("projname").textContent = PJ.cur.name;
}

// ---------------------------------------------------------------- turf (loaded on first use)
let TURF = null;
function loadTurf() {
  return TURF ??= new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@turf/turf@7.1.0/turf.min.js";
    s.onload = () => res(window.turf); s.onerror = rej; document.head.appendChild(s);
  });
}

// ---------------------------------------------------------------- administrative model
const bkey = (p) => (p.lvl === "ctx" ? "ctx:" + p.ro : "b:" + p.ro + "|" + (p.unit0 || p.unit));
const ukeyOfName = (n) => "u:" + n;
async function pjBlocks() {
  const admin = await load("admin.geojson");
  const base = PJ.cur.base;
  const out = [];
  for (const f of admin.features) {
    const p = f.properties;
    if (![base, "both"].includes(p.sc)) continue;
    if (p.lvl === 4) {   // sub-neighbourhoods are the building blocks; their level-3 group comes along
      const uname = String(p.unit).split(" (din 2027")[0];
      out.push({ key: bkey(p), f, unit: ukeyOfName(uname), uname, sector: p.sector, kind: uname.startsWith("Chișinău – ") ? "city" : "commune", pop: p.pop || 0, grp: p.grp || p.ro });
    } else if (p.lvl === "ctx") {
      out.push({ key: bkey(p), f, unit: null, uname: p.ro, sector: null, kind: p.kind || "commune", pop: p.pop || 0, ctx: true });
    }
  }
  return out;
}
function pjGrpOf(b) { return PJ.cur.grp?.[b.key] ?? b.grp ?? b.f.properties.ro; }
function pjUnitOf(b) { return Object.prototype.hasOwnProperty.call(PJ.cur.blk, b.key) ? PJ.cur.blk[b.key] : b.unit; }
function pjUnits() {
  const u = {};
  for (const b of PJ.blocks) if (b.unit && !u[b.unit]) u[b.unit] = { ro: b.uname, sector: b.sector, kind: b.kind };
  for (const [k, v] of Object.entries(PJ.cur.units)) u[k] = { ...(u[k] || {}), ...v };
  return u;
}
function pjSectors(units) {
  const s = {};
  for (const v of Object.values(units)) if (v.sector && !s[v.sector]) s[v.sector] = { ro: v.sector.startsWith("s:") ? v.sector : "Sectorul " + v.sector };
  for (const [k, v] of Object.entries(PJ.cur.sectors)) s[k] = { ...(s[k] || {}), ...v };
  return s;
}
function pjSecCol(sk) {
  if (!sk || !sk.startsWith("s:")) return null;
  const keys = Object.keys(PJ.cur.sectors).sort();
  return NEWSEC_COL[Math.max(0, keys.indexOf(sk)) % NEWSEC_COL.length];
}
function dropSlivers(g) {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  const keep = polys.filter((p) => ringArea(p[0]) > 5000).map((p) => [p[0], ...p.slice(1).filter((r) => ringArea(r) > 3000)]);
  return keep.length === 1 ? { type: "Polygon", coordinates: keep[0] } : { type: "MultiPolygon", coordinates: keep };
}
function union(T, feats) {
  if (!feats.length) return null;
  if (feats.length === 1) return feats[0].geometry;
  try { const u = T.union(T.featureCollection(feats.map((g) => ({ type: "Feature", properties: {}, geometry: g.geometry || g })))); return u ? dropSlivers(u.geometry) : null; }
  catch { return feats[0].geometry; }
}
async function pjRebuild() {
  const T = await loadTurf();
  PJ.blocks = await pjBlocks();
  for (const nb of PJ.cur.nbs || []) {   // new districts: part of capacity goes to the L3 block that contains them
    const add = nb.est?.added ?? Math.round((nb.est?.pop || 0) * NB_OCC); if (!add) continue;
    const c = T.centroid({ type: "Feature", geometry: { type: "Polygon", coordinates: [nb.ring] } });
    const b = PJ.blocks.find((x) => T.booleanPointInPolygon(c, x.f)) ||
      PJ.blocks.reduce((a, x) => { const d = T.distance(c, T.pointOnFeature(x.f)); return !a || d < a.d ? { x, d } : a; }, null)?.x;
    if (b) b.pop = Math.max(0, b.pop + add);
  }
  const units = pjUnits(), sectors = pjSectors(units);
  const byUnit = {}, outside = [];
  for (const b of PJ.blocks) { const u = pjUnitOf(b); if (u && units[u]) (byUnit[u] ||= []).push(b); else outside.push(b); }
  const feats = []; let id = 0;
  const label = (g) => {
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    const big = polys.reduce((a, p) => (ringArea(p[0]) > ringArea(a[0]) ? p : a), polys[0]);
    const c = T.pointOnFeature({ type: "Feature", geometry: { type: "Polygon", coordinates: big } }).geometry.coordinates;
    return c;
  };
  const push = (lvl, g, props) => {
    if (!g) return;
    const km2 = geomArea(g) / 1e6; const [lx, ly] = label(g);
    const pr = { id: ++id, lvl, sc: "both", km2: Math.round(km2 * 100) / 100, lx, ly };
    for (const [k, v] of Object.entries(props)) if (v != null) pr[k] = v;
    if (pr.pop && km2) pr.dens = Math.round(pr.pop / km2);
    feats.push({ type: "Feature", properties: pr, geometry: g });
    return pr;
  };
  const secName = (sk) => sectors[sk]?.ro?.replace(/^Sectorul /, "") ?? sk;
  // level 4 (blocks), level 3 (groups of blocks inside the same mayoralty) + outside localities
  PJ.gblocks = {};
  for (const [uk, bs] of Object.entries(byUnit)) {
    const u = units[uk], groups = {};
    for (const b of bs) {
      const p = b.f.properties, g = b.ctx ? (PJ.cur.grp?.[b.key] ?? p.ro) : pjGrpOf(b);
      (groups[g] ||= []).push(b);
      push(4, b.f.geometry, { ro: PJ.cur.names[b.key] || p.ro, en: PJ.cur.names[b.key] || p.en, pop: b.pop, src: p.src, method: p.method, grp: g,
        sector: secName(u.sector), scol: pjSecCol(u.sector), unit: u.ro, bkey: b.key, ukey: uk, skey: u.sector,
        note: b.ctx ? L("Inclus în municipiu în acest proiect", "Added to the municipality in this project") : null });
    }
    for (const [g, gb] of Object.entries(groups)) {
      const gkey = uk + "|" + g; PJ.gblocks[gkey] = gb.map((b) => b.key);
      const one = gb.length === 1;
      push(3, one ? gb[0].f.geometry : union(T, gb.map((b) => b.f)), { ro: g, en: g, pop: gb.reduce((a, b) => a + b.pop, 0), grp: g, gkey,
        parts: one ? null : gb.map((b) => PJ.cur.names[b.key] || b.f.properties.ro).join(", "), src: one ? gb[0].f.properties.src : L("suma microcartierelor (proiect)", "sum of sub-neighbourhoods (project)"),
        sector: secName(u.sector), scol: pjSecCol(u.sector), unit: u.ro, ukey: uk, skey: u.sector, bkey: one ? gb[0].key : null });
    }
  }
  for (const b of outside) {
    const p = b.f.properties;
    push("ctx", b.f.geometry, { ro: p.ro, en: p.en, pop: b.pop || null, src: p.src, kind: p.kind, bkey: b.key,
      note: b.ctx ? p.note : L("Scos din municipiu în acest proiect", "Removed from the municipality in this project") });
  }
  // level 2
  const unitGeom = {};
  for (const [uk, bs] of Object.entries(byUnit)) {
    const u = units[uk], g = union(T, bs.map((b) => b.f));
    unitGeom[uk] = g;
    push(2, g, { ro: u.ro, en: u.ro, pop: bs.reduce((a, b) => a + b.pop, 0), src: L("suma unităților de nivel 3 (proiect)", "sum of level-3 units (project)"),
      sector: secName(u.sector), scol: pjSecCol(u.sector), kind: u.kind, ukey: uk, skey: u.sector });
  }
  // level 1
  const bySec = {};
  for (const [uk, g] of Object.entries(unitGeom)) (bySec[units[uk].sector] ||= []).push({ uk, g });
  const secGeoms = [];
  for (const [sk, us] of Object.entries(bySec)) {
    const g = union(T, us.map((x) => ({ geometry: x.g }))); secGeoms.push(g);
    push(1, g, { ro: sectors[sk]?.ro || sk, en: sectors[sk]?.ro || sk, sector: secName(sk), scol: pjSecCol(sk), skey: sk,
      pop: us.reduce((a, x) => a + byUnit[x.uk].reduce((s, b) => s + b.pop, 0), 0), src: L("suma primăriilor din sector (proiect)", "sum of the sector's mayoralties (project)") });
  }
  const munG = union(T, secGeoms.filter(Boolean).map((g) => ({ geometry: g })));
  push("mun", munG, { ro: L("Municipiul Chișinău (proiect)", "Chișinău Municipality (project)"), en: "Chișinău Municipality (project)",
    pop: Object.values(byUnit).flat().reduce((a, b) => a + b.pop, 0), src: L("proiect", "project") });
  PJ.admin = { type: "FeatureCollection", features: feats, proj: true };
  map.getSource("admin").setData(PJ.admin);
  // admin filters expect sc = REF(); in a project every feature is "both", so they always match
  pjRoadsData();
  if (S.region) applyRegion(false); else if (S.hideOut) applyRegion(false);
  PJ.sel = [];
  if (map.getLayer("admin-sel")) map.setFilter("admin-sel", ["in", ["get", "id"], ["literal", []]]);
  pjStatus(); pjRenderPanel();
}

// ---------------------------------------------------------------- admin edits
function pjCommit(label, fn) {
  const snap = { blk: PJ.cur.blk, units: PJ.cur.units, sectors: PJ.cur.sectors, names: PJ.cur.names, grp: PJ.cur.grp || {} };
  PJ.cur.hist = [...(PJ.cur.hist || []).slice(-24), structuredClone(snap)];
  fn();
  PJ.cur.log = [...(PJ.cur.log || []), { t: new Date().toISOString(), what: label }].slice(-60);
  pjSave(); pjRebuild().then(() => { renderLabels(); renderInfo(); });
}
function pjUndo() {
  const h = PJ.cur.hist || []; if (!h.length) return;
  const s = h[h.length - 1];
  PJ.cur.hist = h.slice(0, -1);
  Object.assign(PJ.cur, structuredClone(s));
  PJ.cur.log = [...(PJ.cur.log || []), { t: new Date().toISOString(), what: L("Anulat: ultima modificare", "Undone: last change") }].slice(-60);
  pjSave(); pjRebuild().then(() => { renderLabels(); renderInfo(); });
}
function pjToggleSel(props) {
  const i = PJ.sel.findIndex((x) => x.id === props.id);
  if (i >= 0) PJ.sel.splice(i, 1);
  else {
    const blk = (l) => l === 3 || l === 4 || l === "ctx";
    if (PJ.sel.length && PJ.sel[0].lvl !== props.lvl && !(blk(PJ.sel[0].lvl) && blk(props.lvl) && (PJ.sel[0].lvl === "ctx" || props.lvl === "ctx"))) PJ.sel = [];
    PJ.sel.push(props);
  }
  map.setFilter("admin-sel", ["in", ["get", "id"], ["literal", PJ.sel.map((x) => x.id)]]);
  pjRenderPanel();
}
function pjBlockKeysOf(sel) {
  // level-3 / outside selection: their own keys; level 2: all blocks of those units; level 1: all blocks of those sectors
  const keys = new Set();
  for (const p of sel) {
    if (p.gkey && PJ.gblocks?.[p.gkey]) PJ.gblocks[p.gkey].forEach((k) => keys.add(k));
    else if (p.bkey) keys.add(p.bkey);
    else if (p.ukey) PJ.blocks.forEach((b) => { if (pjUnitOf(b) === p.ukey) keys.add(b.key); });
  }
  return [...keys];
}
function pjAction(kind, opts) {
  const sel = PJ.sel, units = pjUnits();
  const nm = (opts.name || "").trim();
  if (kind === "move-blocks") {
    let uk = opts.unit;
    pjCommit(L("Reatribuire", "Reassigned") + `: ${sel.map((p) => p.ro).join(", ")} → ${uk === "__new" ? nm : units[uk]?.ro}`, () => {
      if (uk === "__new") {
        uk = "n:" + Date.now().toString(36);
        PJ.cur.units = { ...PJ.cur.units, [uk]: { ro: nm || L("Primărie nouă", "New mayoralty"), sector: opts.sector || units[sel[0].ukey]?.sector || "Centru", kind: "commune" } };
      }
      const blk = { ...PJ.cur.blk }; pjBlockKeysOf(sel).forEach((k) => (blk[k] = uk)); PJ.cur.blk = blk;
    });
  } else if (kind === "remove-blocks") {
    pjCommit(L("Scos din municipiu", "Removed from the municipality") + ": " + sel.map((p) => p.ro).join(", "), () => {
      const blk = { ...PJ.cur.blk }; pjBlockKeysOf(sel).forEach((k) => (blk[k] = null)); PJ.cur.blk = blk;
    });
  } else if (kind === "rename") {
    const p = sel[0]; if (!nm) return;
    pjCommit(L("Redenumit", "Renamed") + `: ${p.ro} → ${nm}`, () => {
      if (p.lvl === 4 || p.lvl === "ctx" || (p.lvl === 3 && !p.gkey)) PJ.cur.names = { ...PJ.cur.names, [p.bkey]: nm };
      else if (p.lvl === 3) { const g = { ...(PJ.cur.grp || {}) }; pjBlockKeysOf([p]).forEach((k) => (g[k] = nm)); PJ.cur.grp = g; }
      else if (p.lvl === 2) PJ.cur.units = { ...PJ.cur.units, [p.ukey]: { ...(PJ.cur.units[p.ukey] || {}), ro: nm } };
      else if (p.lvl === 1) PJ.cur.sectors = { ...PJ.cur.sectors, [p.skey]: { ro: nm } };
    });
  } else if (kind === "set-group") {
    // level 3: merge the selected neighbourhoods into one; level 4: put the selected sub-neighbourhoods into a neighbourhood (existing or new)
    const keys = pjBlockKeysOf(sel), g0 = nm || sel[0].grp || sel[0].ro, uk = sel[0].ukey;
    pjCommit((sel[0].lvl === 3 ? L("Cartiere unite", "Neighbourhoods merged") : L("Microcartiere grupate", "Sub-neighbourhoods grouped")) + `: ${sel.map((p) => p.ro).join(" + ")} → ${g0}`, () => {
      const g = { ...(PJ.cur.grp || {}) }, blk = { ...PJ.cur.blk };
      keys.forEach((k) => { g[k] = g0; if (uk) blk[k] = uk; });
      PJ.cur.grp = g; PJ.cur.blk = blk;
    });
  } else if (kind === "merge-units") {
    const [a, ...rest] = sel;
    pjCommit(L("Primării unite", "Mayoralties merged") + `: ${sel.map((p) => p.ro).join(" + ")}${nm ? " → " + nm : ""}`, () => {
      const blk = { ...PJ.cur.blk };
      PJ.blocks.forEach((b) => { if (rest.some((r) => r.ukey === pjUnitOf(b))) blk[b.key] = a.ukey; });
      PJ.cur.blk = blk;
      if (nm) PJ.cur.units = { ...PJ.cur.units, [a.ukey]: { ...(PJ.cur.units[a.ukey] || {}), ro: nm } };
    });
  } else if (kind === "move-units") {
    let sk = opts.sector;
    pjCommit(L("Mutat în sector", "Moved to sector") + `: ${sel.map((p) => p.ro).join(", ")}`, () => {
      if (sk === "__new") { sk = "s:" + Date.now().toString(36); PJ.cur.sectors = { ...PJ.cur.sectors, [sk]: { ro: nm || L("Sector nou", "New sector") } }; }
      const u = { ...PJ.cur.units }; sel.forEach((p) => (u[p.ukey] = { ...(u[p.ukey] || {}), sector: sk })); PJ.cur.units = u;
    });
  } else if (kind === "merge-sectors") {
    const [a, ...rest] = sel;
    pjCommit(L("Sectoare unite", "Sectors merged") + `: ${sel.map((p) => p.ro).join(" + ")}${nm ? " → " + nm : ""}`, () => {
      const u = { ...PJ.cur.units };
      for (const [k, v] of Object.entries(units)) if (rest.some((r) => r.skey === v.sector)) u[k] = { ...(u[k] || {}), sector: a.skey };
      PJ.cur.units = u;
      if (nm) PJ.cur.sectors = { ...PJ.cur.sectors, [a.skey]: { ro: nm } };
    });
  }
}

// ---------------------------------------------------------------- panel UI
function pjOptions(obj, cur, extra) {
  return (extra || "") + Object.entries(obj).sort((a, b) => a[1].ro.localeCompare(b[1].ro, "ro")).map(([k, v]) => `<option value="${esc(k)}" ${k === cur ? "selected" : ""}>${esc(v.ro)}</option>`).join("");
}
function pjRenderPanel() {
  const el = document.getElementById("projadmin"); if (!el || !PJ.cur || !PJ.blocks) return;
  const units = pjUnits(), sectors = pjSectors(units);
  const sel = PJ.sel, lvl = sel[0]?.lvl;
  let h = `<p class="small">${L("Apasă pe hartă ca să selectezi una sau mai multe zone de la nivelul ales (apasă din nou ca să le deselectezi), apoi alege acțiunea.",
    "Tap the map to select one or more areas at the chosen level (tap again to deselect), then choose an action.")}</p>`;
  if (!sel.length) h += `<p class="hint">${L("Nimic selectat.", "Nothing selected.")}</p>`;
  else {
    h += `<div class="pjsel">${sel.map((p) => `<span class="keptchip">${esc(p.ro)}</span>`).join("")}<button type="button" class="btn ghost sm" data-pj="clear">${L("Golește", "Clear")}</button></div>`;
    const nameIn = (ph, val) => `<input type="text" class="pjin" id="pjname" placeholder="${esc(ph)}" value="${esc(val || "")}">`;
    if (lvl === 3 || lvl === 4 || lvl === "ctx") {
      const inside = sel.every((p) => p.lvl === 3 || p.lvl === 4);
      h += `<div class="pjact"><b>${inside ? L("Mută în primăria", "Move to mayoralty") : L("Include în municipiu, în primăria", "Add to the municipality, in mayoralty")}</b>
        <select id="pjunit">${pjOptions(units, sel[0].ukey, `<option value="__new">${L("— primărie nouă —", "— new mayoralty —")}</option>`)}</select>
        <div class="pjnew" id="pjnewu" hidden>${nameIn(L("Numele primăriei noi", "Name of the new mayoralty"), sel.length === 1 && lvl === "ctx" ? sel[0].ro : "")}
          <select id="pjnewsec">${pjOptions(sectors, units[sel[0].ukey]?.sector)}</select></div>
        <button type="button" class="btn" data-pj="move-blocks">${L("Aplică", "Apply")}</button></div>`;
      if (sel.length === 1) h += `<div class="pjact"><b>${L("Redenumește", "Rename")}</b><input type="text" class="pjin" id="pjren" value="${esc(sel[0].ro)}"><button type="button" class="btn ghost" data-pj="rename">${L("Redenumește", "Rename")}</button></div>`;
      if (inside && lvl === 3 && sel.length > 1) h += `<div class="pjact"><b>${L("Unește cartierele", "Merge neighbourhoods")}</b><input type="text" class="pjin" id="pjgrp" value="${esc(sel[0].ro)}"><button type="button" class="btn" data-pj="set-group">${L("Unește", "Merge")}</button></div>`;
      if (inside && lvl === 4) h += `<div class="pjact"><b>${L("Pune în cartierul", "Put in neighbourhood")}</b><input type="text" class="pjin" id="pjgrp" list="pjgrps" value="${esc(sel[0].grp || "")}" placeholder="${esc(L("cartier existent sau nume nou", "existing neighbourhood or a new name"))}"><datalist id="pjgrps">${[...new Set((PJ.admin?.features || []).filter((f) => f.properties.lvl === 3 && f.properties.ukey === sel[0].ukey).map((f) => f.properties.ro))].map((n) => `<option value="${esc(n)}">`).join("")}</datalist><button type="button" class="btn" data-pj="set-group">${L("Aplică", "Apply")}</button></div>`;
      if (inside) h += `<div class="pjact"><button type="button" class="btn ghost" data-pj="remove-blocks">${L("Scoate din municipiu", "Remove from the municipality")}</button></div>`;
    } else if (lvl === 2) {
      h += `<div class="pjact"><b>${L("Mută în sectorul", "Move to sector")}</b><select id="pjsec">${pjOptions(sectors, sel[0].skey, `<option value="__new">${L("— sector nou —", "— new sector —")}</option>`)}</select>
        <div class="pjnew" id="pjnews" hidden>${nameIn(L("Numele sectorului nou", "Name of the new sector"))}</div>
        <button type="button" class="btn" data-pj="move-units">${L("Aplică", "Apply")}</button></div>`;
      if (sel.length > 1) h += `<div class="pjact"><b>${L("Unește primăriile", "Merge mayoralties")}</b><input type="text" class="pjin" id="pjmerge" placeholder="${esc(L("Nume (opțional)", "Name (optional)"))}" value="${esc(sel[0].ro)}"><button type="button" class="btn" data-pj="merge-units">${L("Unește", "Merge")}</button></div>`;
      if (sel.length === 1) h += `<div class="pjact"><b>${L("Redenumește", "Rename")}</b><input type="text" class="pjin" id="pjren" value="${esc(sel[0].ro)}"><button type="button" class="btn ghost" data-pj="rename">${L("Redenumește", "Rename")}</button></div>`;
    } else if (lvl === 1) {
      if (sel.length > 1) h += `<div class="pjact"><b>${L("Unește sectoarele", "Merge sectors")}</b><input type="text" class="pjin" id="pjmerge" value="${esc(sel[0].ro)}"><button type="button" class="btn" data-pj="merge-sectors">${L("Unește", "Merge")}</button></div>`;
      if (sel.length === 1) h += `<div class="pjact"><b>${L("Redenumește", "Rename")}</b><input type="text" class="pjin" id="pjren" value="${esc(sel[0].ro)}"><button type="button" class="btn ghost" data-pj="rename">${L("Redenumește", "Rename")}</button></div>`;
    }
  }
  h += `<p class="small">${L("Sectoare noi: la nivelul 2 selectează primăriile și alege „sector nou”. Primării noi: la nivelul 3 sau 4 selectează cartierele, satele sau microcartierele și alege „primărie nouă”. La nivelul 3 poți uni cartiere; la nivelul 4 muți microcartiere dintr-un cartier în altul. Localitățile vecine se selectează la nivelul 3 sau 4.",
    "New sectors: at level 2 select mayoralties and pick “new sector”. New mayoralties: at level 3 or 4 select neighbourhoods, villages or sub-neighbourhoods and pick “new mayoralty”. At level 3 you can merge neighbourhoods; at level 4 you move sub-neighbourhoods between neighbourhoods. Neighbouring localities are selected at level 3 or 4.")}</p>`;
  const log = PJ.cur.log || [];
  h += `<div class="cap">${L("Modificări", "Changes")} (${log.length})</div>`
    + (log.length ? `<ol class="pjlog">${log.slice(-8).reverse().map((x) => `<li>${esc(x.what)}</li>`).join("")}</ol>` : `<p class="hint">${L("Nicio modificare încă.", "No changes yet.")}</p>`)
    + `<button type="button" class="btn ghost sm" data-pj="undo" ${(PJ.cur.hist || []).length ? "" : "disabled"}>${L("Anulează ultima modificare", "Undo last change")}</button>`;
  el.innerHTML = h;
  const sw = (selId, boxId) => { const s = document.getElementById(selId), b = document.getElementById(boxId); if (s && b) { const f = () => (b.hidden = s.value !== "__new"); s.addEventListener("change", f); f(); } };
  sw("pjunit", "pjnewu"); sw("pjsec", "pjnews");
}
function pjRenderList() {
  const el = document.getElementById("projlist"); if (!el) return;
  const items = Object.values(PJ.list).sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
  el.innerHTML = `<div class="cap">${L("Proiecte", "Projects")}</div>`
    + (!PJ.ready ? `<div class="loading"><span class="spin"></span>${L("Se încarcă…", "Loading…")}</div>`
      : items.length ? `<ul class="pjitems">${items.map((p) => `<li><button type="button" data-open="${esc(p.id)}"><b>${esc(p.name)}</b><small>${new Date(p.updated).toLocaleString(loc(), { dateStyle: "medium", timeStyle: "short" })} · ${(p.log || []).length} ${L("modificări", "changes")} · ${(p.roads || []).length} ${L("drumuri", "roads")}</small></button></li>`).join("")}</ul>`
      : `<p class="hint">${L("Încă nu există proiecte. Creează unul cu „Proiect nou”.", "No projects yet. Create one with “New project”.")}</p>`)
    + (PJ.loadNote ? `<p class="small warn">${PJ.loadNote}</p>` : "")
    + `<p class="small">${PJ.local ? L("Proiectele se salvează doar în acest browser.", "Projects are saved in this browser only.") : L("Proiectele se salvează în atlas și le vede oricine are acces la el.", "Projects are saved in the atlas and visible to everyone with access to it.")}</p>`;
}

// ---------------------------------------------------------------- roads
function pjRoadsData() {
  const roads = PJ.cur?.roads || [], fs = [];
  for (const r of roads) {
    fs.push({ type: "Feature", properties: { k: "road", l: r.lanes, n: r.name, id: r.id }, geometry: { type: "LineString", coordinates: r.coords } });
    (r.x || []).forEach((c) => fs.push({ type: "Feature", properties: { k: "x" }, geometry: { type: "Point", coordinates: c } }));
  }
  if (PJ.draft) {
    const d = PJ.draft, pts = d.hover && PJ.tool ? [...d.pts, d.hover] : d.pts;
    if (pts.length > 1) fs.push({ type: "Feature", properties: { k: "draft", l: d.lanes }, geometry: { type: "LineString", coordinates: pts } });
    d.pts.forEach((c, i) => fs.push({ type: "Feature", properties: { k: d.snap[i] ? "snap" : "vtx" }, geometry: { type: "Point", coordinates: c } }));
    (d.x || []).forEach((c) => fs.push({ type: "Feature", properties: { k: "x" }, geometry: { type: "Point", coordinates: c } }));
  }
  const src = map.getSource("projroads");
  if (src) src.setData({ type: "FeatureCollection", features: fs });
}
function pjEnsureRoadLayers() {
  if (map.getSource("projroads")) return;
  map.addSource("projroads", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  const w = (add) => ["interpolate", ["exponential", 1.6], ["zoom"], 10, ["+", add, ["*", 0.5, ["max", 1, ["get", "l"]]]], 13, ["+", add, ["*", 1.2, ["max", 1, ["get", "l"]]]], 16, ["+", add, ["*", 4, ["max", 1, ["get", "l"]]]], 18, ["+", add, ["*", 11, ["max", 1, ["get", "l"]]]]];
  map.addLayer({ id: "pr-casing", type: "line", source: "projroads", filter: ["in", ["get", "k"], ["literal", ["road", "draft"]]], layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#111", "line-width": w(3), "line-opacity": 0.55 } }, "draw-fill");
  map.addLayer({ id: "pr-line", type: "line", source: "projroads", filter: ["in", ["get", "k"], ["literal", ["road", "draft"]]], layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": ["match", ["get", "k"], "draft", "#f59f00", "#ffd43b"], "line-width": w(0) } }, "draw-fill");
  map.addLayer({ id: "pr-dash", type: "line", source: "projroads", filter: ["==", ["get", "k"], "road"],
    paint: { "line-color": "#e8590c", "line-width": 1.6, "line-dasharray": [2, 2] } }, "draw-fill");
  map.addLayer({ id: "pr-pts", type: "circle", source: "projroads", filter: ["in", ["get", "k"], ["literal", ["x", "snap", "vtx"]]],
    paint: { "circle-radius": ["match", ["get", "k"], "x", 5, "snap", 6, 4], "circle-color": ["match", ["get", "k"], "x", "#e03131", "snap", "#2b8a3e", "#fff"],
      "circle-stroke-color": "#fff", "circle-stroke-width": ["match", ["get", "k"], "vtx", 0, 2], "circle-stroke-opacity": 1 } }, "draw-fill");
  map.on("click", "pr-line", (e) => {
    if (PJ.tool) return;
    const p = e.features[0].properties, r = (PJ.cur?.roads || []).find((x) => x.id === p.id); if (!r) return;
    popup(e.lngLat, `<b>${esc(r.name)}</b><br>${fmt(r.km, 2)} km · ${r.lanes} ${L("benzi", "lanes")}<br>${L("Cost estimat", "Estimated cost")}: <b>${fmt(r.cost / 1e6, 1)} mil. €</b>`);
  });
}
function nearestOnRoads(pt) {
  // snap to an existing road (or a project road) within 18 px
  const R = 18, bb = [[pt.x - R, pt.y - R], [pt.x + R, pt.y + R]];
  const layers = ["roads-lanes", "roads-base", "pr-line"].filter((l) => map.getLayer(l) && map.getLayoutProperty(l, "visibility") !== "none");
  let best = null;
  for (const f of map.queryRenderedFeatures(bb, { layers })) {
    if (f.properties.k === "draft") continue;
    const lines = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [];
    for (const c of lines) for (let i = 1; i < c.length; i++) {
      const a = map.project(c[i - 1]), b = map.project(c[i]);
      const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / L2));
      const q = { x: a.x + t * dx, y: a.y + t * dy }, d = Math.hypot(q.x - pt.x, q.y - pt.y);
      if (d <= R && (!best || d < best.d)) best = { d, ll: map.unproject([q.x, q.y]), name: f.properties.n || f.properties.ref || null };
    }
  }
  return best;
}
function chaikin(c, it = 2) {
  let p = c;
  for (let k = 0; k < it; k++) {
    if (p.length < 3) break;
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    q.push(p[p.length - 1]); p = q;
  }
  return p;
}
function segX(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-14) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t > 0 && t < 1 && u >= 0 && u <= 1 ? [a[0] + t * r[0], a[1] + t * r[1]] : null;
}
async function pjIntersections(coords) {
  const roads = (await load("roads.geojson")).features.concat((PJ.cur.roads || []).map((r) => ({ geometry: { type: "LineString", coordinates: r.coords } })));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  coords.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
  const out = [];
  for (const f of roads) {
    const g = f.geometry; const lines = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
    for (const c of lines) {
      if (!c.some(([x, y]) => x >= x0 - 0.01 && x <= x1 + 0.01 && y >= y0 - 0.01 && y <= y1 + 0.01)) continue;
      for (let j = 1; j < c.length; j++) for (let i = 1; i < coords.length; i++) {
        const p = segX(coords[i - 1], coords[i], c[j - 1], c[j]);
        if (p && !out.some((q) => hav(q, p) < 0.015)) out.push(p);
      }
    }
  }
  return out;
}
function pjStartRoad() {
  pjEnsureRoadLayers();
  if (S.tool) setTool(S.tool);
  PJ.tool = "road";
  PJ.draft = { pts: [], snap: [], names: [], lanes: +document.getElementById("pjlanes").value || 2, hover: null, x: [] };
  map.getCanvas().style.cursor = "crosshair"; map.doubleClickZoom.disable();
  pjRenderRoads();
}
function pjEndRoadTool() {
  if (PJ.tool === "nb") return nbEnd();
  PJ.tool = null; PJ.draft = null; map.getCanvas().style.cursor = ""; map.doubleClickZoom.enable(); pjRoadsData();
}
async function pjFinishRoad() {
  const d = PJ.draft; if (!d) return;
  const msg = document.getElementById("pjroadmsg");
  if (d.pts.length < 2) { msg.textContent = L("Adaugă cel puțin două puncte.", "Add at least two points."); return; }
  const coords = chaikin(d.pts, 3).map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6]);
  const km = lineLen(coords), lanes = d.lanes, width = lanes * LANE_W;
  const costM2 = +document.getElementById("pjcost").value || ROAD_COST_M2;
  const x = (await pjIntersections(coords)).map(([a, b]) => [Math.round(a * 1e6) / 1e6, Math.round(b * 1e6) / 1e6]);
  const name = (document.getElementById("pjrname").value || "").trim() || L("Drum nou", "New road") + " " + ((PJ.cur.roads || []).length + 1);
  const r = { id: "r" + Date.now().toString(36), name, lanes, km: Math.round(km * 1000) / 1000, width, costM2, cost: Math.round(km * 1000 * width * costM2), coords, x, from: d.names[0], to: d.names[d.pts.length - 1], t: new Date().toISOString() };
  PJ.cur.roads = [...(PJ.cur.roads || []), r];
  PJ.cur.log = [...(PJ.cur.log || []), { t: r.t, what: L("Drum nou", "New road") + `: ${name} (${fmt(r.km, 2)} km, ${lanes} ${L("benzi", "lanes")})` }].slice(-60);
  pjSave(); pjEndRoadTool(); document.getElementById("pjrname").value = ""; pjRenderRoads(); pjTotalsRender();
}
function pjRenderRoads() {
  const el = document.getElementById("projroads"); if (!el || !PJ.cur) return;
  const roads = PJ.cur.roads || [];
  const tot = roads.reduce((a, r) => a + r.cost, 0), km = roads.reduce((a, r) => a + r.km, 0);
  const money = (eur) => `${fmt(eur / 1e6, 1)} mil. € <small>(${fmt(eur * EUR_RATE / 1e6, 0)} mil. lei)</small>`;
  let h = `<div class="pjact"><b>${L("Drum nou", "New road")}</b>
    <input type="text" class="pjin" id="pjrname" placeholder="${esc(L("Numele drumului (opțional)", "Road name (optional)"))}">
    <label class="pjrow"><span>${L("Benzi", "Lanes")}</span><select id="pjlanes">${[1, 2, 3, 4, 5, 6, 8].map((n) => `<option ${n === (PJ.draft?.lanes || 2) ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    <label class="pjrow"><span>${L("Cost pe m² (€)", "Cost per m² (€)")}</span><input type="number" id="pjcost" min="10" step="10" value="${PJ.costM2 || ROAD_COST_M2}"></label>
    ${PJ.tool ? `<p class="small">${L("Apasă pe hartă pentru puncte. Lângă un drum existent, punctul se lipește de el și devine verde. Intersecțiile apar cu roșu. Clic dreapta sau dublu-clic termină drumul.",
      "Tap the map to add points. Near an existing road a point snaps to it and turns green. Crossings show in red. Right-click or double-click finishes the road.")}</p>
      <div class="btnrow"><button type="button" class="btn" data-pj="road-finish">${L("Finalizează drumul", "Finish road")}</button><button type="button" class="btn ghost" data-pj="road-undo">${L("Șterge ultimul punct", "Remove last point")}</button><button type="button" class="btn ghost" data-pj="road-cancel">${L("Renunță", "Cancel")}</button></div>
      <p class="small warn" id="pjroadmsg"></p>`
    : `<button type="button" class="btn" data-pj="road-start">${L("Desenează drumul", "Draw the road")}</button>`}</div>`;
  h += `<div class="cap">${L("Drumuri în proiect", "Roads in the project")} (${roads.length})</div>`;
  h += roads.length ? `<ul class="pjroads">${roads.map((r) => `<li><div><b>${esc(r.name)}</b><small>${fmt(r.km, 2)} km · ${r.lanes} ${L("benzi", "lanes")} (${fmt(r.width, 1)} m) · ${r.x.length} ${L("intersecții", "crossings")}${r.from || r.to ? ` · ${esc(r.from || "?")} → ${esc(r.to || "?")}` : ""}</small><span>${money(r.cost)}</span></div><button type="button" class="closex sm" data-delroad="${esc(r.id)}" aria-label="${L("Șterge", "Delete")}">×</button></li>`).join("")}</ul>
      <div class="pjtot"><span>${L("Total", "Total")}: ${fmt(km, 2)} km</span><b>${money(tot)}</b></div>` : `<p class="hint">${L("Niciun drum încă.", "No roads yet.")}</p>`;
  h += `<p class="small">${L(`Costul ia în calcul doar lungimea și lățimea carosabilului (${fmt(LANE_W, 1)} m pe bandă). Prețul implicit de ${ROAD_COST_M2} €/m² vine din conceptul Centurii Chișinăului (2014): segmentul 6, 86,7 mil. € pentru 32 km cu 4 benzi. Curs: 1 € = ${fmt(EUR_RATE, 2)} lei.`,
    `The cost only uses the carriageway's length and width (${fmt(LANE_W, 1)} m per lane). The default ${ROAD_COST_M2} €/m² comes from the 2014 Chișinău ring-road concept: segment 6, 86.7 M€ for 32 km with 4 lanes. Rate: 1 € = ${fmt(EUR_RATE, 2)} lei.`)}</p>`;
  el.innerHTML = h;
  document.getElementById("pjlanes").addEventListener("change", (e) => { if (PJ.draft) { PJ.draft.lanes = +e.target.value; pjRoadsData(); } });
  document.getElementById("pjcost").addEventListener("change", (e) => { PJ.costM2 = +e.target.value; });
}

// ---------------------------------------------------------------- construction menu
function pjBuildTab(tab, open) {
  PJ.btab = tab;
  const bp = document.getElementById("buildpanel");
  if (open) { bp.hidden = false; document.getElementById("buildbtn").setAttribute("aria-expanded", "true"); }
  document.querySelectorAll("#buildpanel .btab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.btab === tab)));
  document.getElementById("projadmin").hidden = tab !== "admin";
  document.getElementById("projroads").hidden = tab !== "roads";
  document.getElementById("projnb").hidden = tab !== "nb";
  document.getElementById("blevels").hidden = tab !== "admin";
  document.querySelectorAll("input[name=blevel]").forEach((r) => (r.checked = +r.value === S.level));
  if (tab !== "roads" && PJ.tool === "road") pjEndRoadTool();
  if (tab !== "nb" && PJ.tool === "nb") nbEnd();
  if (tab === "nb") { if (S.mode !== "zone") { S.mode = "zone"; render(); } nbRender(); }
  else if (tab === "admin") { if (PJ.tool) pjEndRoadTool(); if (!["admin", "pop"].includes(S.mode)) { S.mode = "admin"; render(); } pjRenderPanel(); }
  else { if (S.mode !== "roads") { S.mode = "roads"; render(); } pjRenderRoads(); }
  pjTotalsRender();
}
const pjAdminActive = () => PJ.cur && PJ.btab === "admin" && !document.getElementById("buildpanel").hidden;

// ---------------------------------------------------------------- wiring
function pjBind() {
  const $ = (id) => document.getElementById(id);
  $("projbtn").addEventListener("click", () => { $("projnew").hidden = true; $("projlist").hidden = !$("projlist").hidden; pjRenderList(); });
  $("newproj").addEventListener("click", () => { $("projlist").hidden = true; const b = $("projnew"); b.hidden = !b.hidden; if (!b.hidden) $("pjnewname").focus(); });
  $("pjcreate").addEventListener("click", () => pjNew($("pjnewname").value.trim()));
  $("pjnewname").addEventListener("keydown", (e) => { if (e.key === "Enter") pjNew(e.target.value.trim()); });
  $("projlist").addEventListener("click", (e) => { const id = e.target.closest("[data-open]")?.dataset.open; if (id) pjOpen(id); });
  $("projclose").addEventListener("click", pjClose);
  $("projrename").addEventListener("click", () => {
    const b = $("projrenbox"); b.hidden = !b.hidden; if (!b.hidden) { $("pjrenin").value = PJ.cur.name; $("pjrenin").focus(); }
  });
  $("pjrenok").addEventListener("click", () => { const v = $("pjrenin").value.trim(); if (v) { PJ.cur.name = v; pjSave(); } $("projrenbox").hidden = true; });
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-pj]"); if (!b) return;
    const a = b.dataset.pj, v = (id) => document.getElementById(id)?.value;
    if (a === "clear") { PJ.sel = []; map.setFilter("admin-sel", ["in", ["get", "id"], ["literal", []]]); pjRenderPanel(); }
    else if (a === "undo") pjUndo();
    else if (a === "move-blocks") pjAction("move-blocks", { unit: v("pjunit"), name: v("pjname"), sector: v("pjnewsec") });
    else if (a === "remove-blocks") pjAction("remove-blocks", {});
    else if (a === "rename") pjAction("rename", { name: v("pjren") });
    else if (a === "merge-units") pjAction("merge-units", { name: v("pjmerge") });
    else if (a === "set-group") pjAction("set-group", { name: v("pjgrp") });
    else if (a === "move-units") pjAction("move-units", { sector: v("pjsec"), name: v("pjname") });
    else if (a === "merge-sectors") pjAction("merge-sectors", { name: v("pjmerge") });
    else if (a === "road-start") pjStartRoad();
    else if (a === "road-cancel") { pjEndRoadTool(); pjRenderRoads(); }
    else if (a === "road-undo") { if (PJ.draft?.pts.length) { PJ.draft.pts.pop(); PJ.draft.snap.pop(); PJ.draft.names.pop(); pjRoadsData(); } }
    else if (a === "road-finish") pjFinishRoad();
  });
  $("projroads").addEventListener("click", (e) => {
    const id = e.target.closest?.("[data-delroad]")?.dataset.delroad; if (!id) return;
    const r = PJ.cur.roads.find((x) => x.id === id);
    PJ.cur.roads = PJ.cur.roads.filter((x) => x.id !== id);
    PJ.cur.log = [...(PJ.cur.log || []), { t: new Date().toISOString(), what: L("Drum șters", "Road deleted") + ": " + (r?.name || "") }].slice(-60);
    pjSave(); pjRoadsData(); pjRenderRoads();
  });
  // drawing roads
  map.on("click", (e) => {
    if (PJ.tool !== "road") return;
    const s = nearestOnRoads(e.point);
    const c = s ? [s.ll.lng, s.ll.lat] : [e.lngLat.lng, e.lngLat.lat];
    PJ.draft.names ||= [];
    PJ.draft.pts.push(c); PJ.draft.snap.push(!!s); PJ.draft.names.push(s?.name || null);
    if (PJ.draft.pts.length > 1) pjIntersections(PJ.draft.pts).then((x) => { if (PJ.draft) { PJ.draft.x = x; pjRoadsData(); } });
    pjRoadsData();
  });
  map.on("mousemove", (e) => {
    if (PJ.tool !== "road") return;
    const s = nearestOnRoads(e.point);
    PJ.draft.hover = s ? [s.ll.lng, s.ll.lat] : [e.lngLat.lng, e.lngLat.lat];
    map.getCanvas().style.cursor = s ? "copy" : "crosshair";
    pjRoadsData();
  });
  map.on("dblclick", (e) => { if (PJ.tool === "road") { e.preventDefault(); pjFinishRoad(); } });
  map.on("contextmenu", (e) => {
    if (PJ.tool !== "road") return;
    e.preventDefault();
    if (PJ.draft.pts.length >= 2) pjFinishRoad(); else { pjEndRoadTool(); pjRenderRoads(); }
  });
  $("buildbtn").addEventListener("click", () => {
    const bp = $("buildpanel"); bp.hidden = !bp.hidden; $("buildbtn").setAttribute("aria-expanded", String(!bp.hidden));
    if (!bp.hidden) pjBuildTab(PJ.btab || "admin"); else if (PJ.tool) { pjEndRoadTool(); }
  });
  $("buildclose").addEventListener("click", () => { $("buildpanel").hidden = true; $("buildbtn").setAttribute("aria-expanded", "false"); if (PJ.tool) pjEndRoadTool(); });
  document.querySelectorAll("#buildpanel .btab").forEach((b) => b.addEventListener("click", () => pjBuildTab(b.dataset.btab)));
  document.querySelectorAll("input[name=blevel]").forEach((r) => r.addEventListener("change", () => {
    S.level = +r.value; PJ.sel = []; map.setFilter("admin-sel", ["in", ["get", "id"], ["literal", []]]); render(); pjRenderPanel();
  }));
  nbBind();
  pjInit();
}
