// ================================================================== ALL IN CHIȘINĂU — AI assistant (Claude via the `sample` capability) with page tools
// It reads the app's data and can act: navigate, search, plan trips, edit planning projects (merge, rename, move),
// build districts and roads, and file proposals. Falls back to the rule-based answers when Claude is unavailable.
let AI = null, AI_CTL = null;
const aiNs = () => (AI ??= (async () => {
  try {
    const s = window.claude?.use ? await window.claude.use("sample") : null; if (!s) return null;
    const lim = await s.limits().catch(() => null);
    SH.aiOn = !!lim?.tools?.maxCount;
    return { s, maxTools: lim?.tools?.maxCount || 0 };
  } catch { return null; }
})());
const lvlWord = (l) => ({ 1: "sector", 2: "mayoralty/urban sector", 3: "neighbourhood/village", 4: "sub-neighbourhood", ctx: "outside locality", mun: "municipality" }[l] || l);

// ---------------------------------------------------------------- helpers to find things by name
async function featsAt(level) {
  const admin = await adminFC();
  return admin.features.filter((f) => [REF(), "both", undefined].includes(f.properties.sc) && (level == null || f.properties.lvl === level || (level === 3 && f.properties.lvl === "ctx")));
}
function pickByName(feats, name) {
  const k = deacc(String(name || "")).replace(/^(sectorul |chisinau – (sectorul )?)/, "").trim();
  const n = (f) => deacc(f.properties.ro).replace(/^(sectorul |chisinau – (sectorul )?)/, "").trim();
  let hit = feats.filter((f) => n(f) === k);
  if (!hit.length) hit = feats.filter((f) => n(f).includes(k) || k.includes(n(f)));
  if (!hit.length) throw new Error(`No match for "${name}". Some names at this level: ${feats.slice(0, 40).map((f) => f.properties.ro).join(", ")}`);
  if (hit.length > 1 && !hit.every((f) => f.properties.ro === hit[0].properties.ro)) throw new Error(`"${name}" is ambiguous: ${hit.map((f) => f.properties.ro).join(", ")}`);
  const rank = { mun: 0, 1: 1, 2: 2, 3: 3, 4: 4, ctx: 5 };   // same name on several levels: the larger area first
  return hit.sort((a, b) => (rank[a.properties.lvl] ?? 9) - (rank[b.properties.lvl] ?? 9))[0];
}
async function placePoint(q) {
  if (Array.isArray(q) && q.length === 2) return { c: q.map(Number), n: q.join(",") };
  const s = String(q || "");
  const m = s.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/); if (m) return { c: [+m[1], +m[3]], n: s };
  try { const f = pickByName(await featsAt(null), s); return { c: [f.properties.lx, f.properties.ly], n: f.properties.ro }; } catch {}
  const r = await runSearch(s); if (!r.length) throw new Error(`Place "${s}" not found.`);
  return { c: r[0].x.c, n: r[0].x.n };
}
async function ensureProject(name) {
  if (PJ.cur) return PJ.cur;
  const ex = Object.values(PJ.list || {}).find((p) => !name || deacc(p.name) === deacc(name));
  if (ex && name) { await pjOpen(ex.id); return PJ.cur; }
  const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  PJ.list[id] = { id, name: name || L("Proiect creat de asistent", "Project created by the assistant"), created: new Date().toISOString(), updated: new Date().toISOString(), base: REF(), blk: {}, units: {}, sectors: {}, names: {}, roads: [], log: [], hist: [] };
  await pjOpen(id, true); return PJ.cur;
}
const aiNote = (txt) => { const i = SH.chat.findIndex((m) => m.live), m = { me: 0, tool: 1, h: "🔧 " + esc(txt) }; i >= 0 ? SH.chat.splice(i, 0, m) : SH.chat.push(m); chatRender(); };

// ---------------------------------------------------------------- tools
function aiTools() {
  return [
    { name: "list_areas", description: "List administrative areas with population, area (km²) and parent. level 1 = the 5 sectors, 2 = mayoralties and Chișinău's urban sectors, 3 = neighbourhoods and villages, 4 = sub-neighbourhoods (the building blocks; each has a level-3 group). Reflects the open planning project if one is open. Optional filter: parent name.",
      inputSchema: { type: "object", properties: { level: { type: "integer", enum: [1, 2, 3, 4] }, parent: { type: "string" } }, required: ["level"] },
      async execute({ level, parent }) {
        let fs = await featsAt(Number(level));
        if (parent) { const k = deacc(parent); fs = fs.filter((f) => deacc(`${f.properties.sector || ""} ${f.properties.unit || ""}`).includes(k)); }
        return fs.filter((f) => f.properties.lvl !== "ctx").slice(0, 160).map((f) => ({ name: f.properties.ro, pop: Math.round((f.properties.pop || 0) * popScale()), km2: f.properties.km2, sector: f.properties.sector, mayoralty: f.properties.unit, neighbourhood: f.properties.lvl === 4 ? f.properties.grp : undefined, parts: f.properties.parts }));
      } },
    { name: "area_details", description: "Details of one named area (any level): population at the selected date, area, density, estimated jobs and jobs per resident (commuting balance), sector, mayoralty, source.",
      inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
      async execute({ name }) { await ensureJobs(); const p = pickByName(await featsAt(null), name).properties; return { name: p.ro, level: lvlWord(p.lvl), pop: Math.round((p.pop || 0) * popScale()), km2: p.km2, density: p.dens, jobs_estimate: p.jobs, jobs_per_resident: p.jr != null ? Math.round((p.jr / popScale()) * 100) / 100 : null, sector: p.sector, mayoralty: p.unit, source: p.src, date: S.date }; } },
    { name: "infrastructure_stats", description: "Measured totals for the whole municipality or one named area (any level): road km by class and traffic-lane km, bike tracks and bike lanes km, pedestrian streets km, railway km, public transport stops and lines, road projects under construction / proposed (km), buildings, estimated residents and jobs, and counts of places (shops, schools, hospitals, parks…). From OpenStreetMap as of 17 Nov 2026.",
      inputSchema: { type: "object", properties: { area: { type: "string", description: "area name; omit for the whole municipality" } } },
      async execute({ area }) {
        const admin = await adminFC();
        const f = area ? pickByName(await featsAt(null), area) : admin.features.find((x) => x.properties.lvl === "mun" && [REF(), "both"].includes(x.properties.sc));
        const g = f.geometry, pg = prepGeom(g), st = await computeStats(g);
        const [bike, proj, roads, routes] = await Promise.all([load("bike.geojson"), load("projects.geojson"), load("roads.geojson"), load("routes.json")]);
        const km = {}, add = (k, v) => (km[k] = (km[k] || 0) + v);
        sumLines(roads.features, pg, (p, d) => add("road_" + ({ motorway: "national", trunk: "national", trunk_link: "national", primary: "main", primary_link: "main", secondary: "secondary", secondary_link: "secondary", tertiary: "tertiary", tertiary_link: "tertiary", pedestrian: "pedestrian" }[p.c] || "local"), d));
        sumLines(bike.features, pg, (p, d) => add(p.b === "track" || p.b === "path" ? "bike_track" : "bike_lane", d));
        sumLines(proj.features, pg, (p, d) => add(p.st === "construction" ? "proj_construction" : "proj_proposed", d));
        const r1 = (v) => Math.round((v || 0) * 10) / 10;
        const routeKeys = new Set(); for (const s2 of (await load("stops.geojson")).features) { const c = s2.geometry.coordinates; if (pg.has(c[0], c[1])) (s2.properties.r || []).forEach((r) => routeKeys.add(r)); }
        const modes = {}; for (const k of routeKeys) { const m = k.split(":")[0]; modes[m] = (modes[m] || 0) + 1; }
        await ensureJobs();
        return {
          area: f.properties.ro, km2: f.properties.km2, residents: Math.round((f.properties.pop || 0) * popScale()), jobs_estimate: f.properties.jobs, buildings: st.bld,
          roads_km: { total: r1(st.roadKm), national: r1(km.road_national), main: r1(km.road_main), secondary: r1(km.road_secondary), tertiary: r1(km.road_tertiary), local_and_residential: r1(km.road_local) },
          traffic_lanes_km: r1(st.laneKm), pedestrian_streets_km: r1(km.road_pedestrian), bike_tracks_km: r1(km.bike_track), bike_lanes_shared_km: r1(km.bike_lane),
          railway_km: r1(st.trackKm), road_projects_km: { under_construction: r1(km.proj_construction), proposed: r1(km.proj_proposed) },
          transit: { stops: st.stops, lines_serving_area: modes },
          places: Object.fromEntries(Object.entries(st.cats).filter(([, v]) => v)),
          note: "OpenStreetMap data (17 Nov 2026); lanes are estimated where OSM has no lane count; jobs are an estimate",
        };
      } },
    { name: "search_places", description: "Search streets, stops, neighbourhoods and points of interest by text, or by category (pharmacy, stop, food, cafe, shop, park, health, bank, fuel, school). Results are sorted by distance from the user's location and include the distance in km.",
      inputSchema: { type: "object", properties: { query: { type: "string" }, category: { type: "string" } } },
      async execute({ query, category }) { const r = await runSearch(String(query || ""), category ? String(category) : null); return r.slice(0, 8).map((h) => ({ name: h.x.n, kind: h.x.k === "poi" ? h.x.cat : h.x.k, km: Math.round(h.d * 100) / 100, lon: h.x.c[0], lat: h.x.c[1] })); } },
    { name: "show", description: "Show something to the user: open an app section (home, atlas, projects, transit, guide, news, archive, settings), optionally an atlas map layer (admin, pop, zone, age, temp, cmp, transit, roads), and/or fly the map to a place name or 'lon,lat'.",
      inputSchema: { type: "object", properties: { section: { type: "string" }, layer: { type: "string" }, place: { type: "string" }, zoom: { type: "number" } } },
      async execute({ section, layer, place, zoom }) {
        const sec = place || layer ? "atlas" : String(section || "atlas"); shGo(sec);
        if (layer && MAPS.includes(String(layer))) { S.mode = String(layer); await render(); }
        if (place) { const p = await placePoint(place); map.flyTo({ center: p.c, zoom: Number(zoom) || 14 }); return `Showing ${p.n}`; }
        return `Opened ${sec}${layer ? " / " + layer : ""}`;
      } },
    { name: "city_info", description: "Facts the app holds: topic budget (municipal budget for the selected year), weather (current temperatures), tickets (fares), news (latest items), proposals (citizen proposals, petitions and projects in progress with votes), reports (citizen problem reports), location (the user's location).",
      inputSchema: { type: "object", properties: { topic: { type: "string", enum: ["budget", "weather", "tickets", "news", "proposals", "reports", "location"] } }, required: ["topic"] },
      async execute({ topic }) {
        if (topic === "budget") { const y = +S.date.slice(0, 4), B = BUDGET[y]; return B ? { year: y, revenue_bn_lei: B.rev, spending_bn_lei: B.exp, transfers_bn_lei: B.tr, approved: B.approved || null } : "No budget data for this year"; }
        if (topic === "weather") { const tj = await load("temp.json"); return { now: tj.maps?.now ? { mean: tj.maps.now.mean, min: tj.maps.now.min, max: tj.maps.now.max } : null, updated: tj.updated }; }
        if (topic === "tickets") return { city_single_lei: 6, monthly_pass_lei: 300, note: "each boarding in the city costs 6 lei; suburban and train fares depend on distance" };
        if (topic === "news") return shNewsItems().slice(0, 5).map((n) => ({ date: n[0], title: n[1], text: n[2] }));
        if (topic === "proposals") { await shProposals(); return Object.values(SH.props).filter((p) => p.status !== "removed").slice(0, 40).map((p) => ({ title: p.title_ro || p.title, type: p.type, status: p.status, support: tally(p).y, oppose: tally(p).n, place: p.loc?.label })); }
        if (topic === "reports") { await reportsLoad(); return Object.values(SH.reps || {}).filter((r) => r.st !== "removed").slice(0, 40).map((r) => ({ category: r.cat, status: r.st, place: r.loc?.label, text: r.desc })); }
        return myLoc() || "unknown";
      } },
    { name: "plan_trip", description: "Public transport connections between two stops (names as on the map). Returns up to 3 options with departure, arrival, lines and price in lei. Use the user's chosen time or now.",
      inputSchema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } }, required: ["from", "to"] },
      async execute({ from, to }) {
        const { groups } = await stopGroups(), f = (v) => { const k = deacc(v); let i = groups.findIndex((g) => deacc(g.label) === k); if (i < 0) i = groups.findIndex((g) => deacc(g.label).includes(k)); if (i < 0) throw new Error(`Stop "${v}" not found`); return i; };
        const a = f(String(from)), b = f(String(to)), d = new Date();
        const res = await planTrips(a, b, d.getHours() * 60 + d.getMinutes());
        SH.j = { a: groups[a].label, b: groups[b].label, res, open: 0 };
        return res.slice(0, 3).map((o) => ({ depart: hm(o.dep), arrive: hm(o.arr), changes: o.ch, lines: o.legs.map((l) => l.r), price_lei: o.price }));
      } },
    { name: "edit_project", description: "Change administrative borders in the open planning project (one is created if none is open; every change can be undone). actions: merge_mayoralties (items = level-2 names, new_name optional), merge_sectors (level-1 names), merge_neighbourhoods (level-3 names into one, new_name), move_to_neighbourhood (level-4 sub-neighbourhoods, target = level-3 neighbourhood or a new name), rename (one item, any level, new_name), move_to_mayoralty (level-3 or level-4 items, target = mayoralty name or 'new' with new_name), move_to_sector (level-2 items, target = sector name or 'new' with new_name), remove_from_municipality (level-3 or 4 items), add_to_municipality (outside localities, target mayoralty), undo.",
      inputSchema: { type: "object", properties: { action: { type: "string" }, items: { type: "array", items: { type: "string" } }, target: { type: "string" }, new_name: { type: "string" } }, required: ["action"] },
      async execute({ action, items = [], target, new_name }) {
        await ensureProject(); const nm = String(new_name || "");
        if (action === "undo") { pjUndo(); return "Undone"; }
        const lvl = { merge_mayoralties: 2, merge_sectors: 1, merge_neighbourhoods: 3, move_to_neighbourhood: 4, move_to_mayoralty: 3, move_to_sector: 2, remove_from_municipality: 3, add_to_municipality: 3 }[action];
        let sel;
        const any34 = async (n) => { try { return pickByName(await featsAt(lvl), n).properties; } catch (e) { if (lvl === 3) return pickByName(await featsAt(4), n).properties; throw e; } };
        if (action === "rename") { sel = [pickByName(await featsAt(null), items[0]).properties]; }
        else sel = await Promise.all(items.map(any34));
        if (!sel.length) throw new Error("No items");
        PJ.sel = sel; aiNote(`${action}: ${sel.map((p) => p.ro).join(", ")}${nm ? " → " + nm : ""}`);
        if (action === "merge_mayoralties") pjAction("merge-units", { name: nm });
        else if (action === "merge_sectors") pjAction("merge-sectors", { name: nm });
        else if (action === "rename") pjAction("rename", { name: nm });
        else if (action === "remove_from_municipality") pjAction("remove-blocks", {});
        else if (action === "move_to_sector") {
          const sk = !target || /^(new|nou)$/i.test(target) ? "__new" : pickByName(await featsAt(1), target).properties.skey;
          pjAction("move-units", { sector: sk, name: nm });
        } else if (action === "merge_neighbourhoods") pjAction("set-group", { name: nm });
        else if (action === "move_to_neighbourhood") {
          let tgt = String(target || nm || ""); try { const f = pickByName(await featsAt(3), tgt).properties; tgt = f.ro; PJ.sel = sel.map((p) => ({ ...p, ukey: f.ukey })); } catch {}
          pjAction("set-group", { name: tgt });
        } else if (action === "move_to_mayoralty" || action === "add_to_municipality") {
          const uk = !target || /^(new|nou)$/i.test(target) ? "__new" : pickByName(await featsAt(2), target).properties.ukey;
          pjAction("move-blocks", { unit: uk, name: nm });
        } else throw new Error("Unknown action " + action);
        PJ.sel = []; await new Promise((r) => setTimeout(r, 400)); await pjRebuild();
        return `Done in project "${PJ.cur.name}". Last change: ${PJ.cur.log.at(-1)?.what}`;
      } },
    { name: "build_district", description: "Build a new district in the open planning project (created if needed): a square of area_ha hectares centred on a place. type: res_houses, res_low, res_mid, res_high, mixed, office, industrial, park. Returns the estimate: residents, dwellings, schools, kindergartens, cost range, duration, workers.",
      inputSchema: { type: "object", properties: { place: { type: "string" }, type: { type: "string" }, area_ha: { type: "number" }, density: { type: "number" }, name: { type: "string" } }, required: ["place", "type", "area_ha"] },
      async execute({ place, type, area_ha, density, name }) {
        const T = NB_TYPES[String(type)]; if (!T) throw new Error("type must be one of " + Object.keys(NB_TYPES).join(", "));
        await ensureProject(); const p = await placePoint(place);
        const side = Math.sqrt(Math.max(1, Math.min(500, Number(area_ha))) * 1e4) / 2, dy = side / 111320, dx = side / (111320 * Math.cos((p.c[1] * Math.PI) / 180));
        const [x, y] = p.c, ring = [[x - dx, y - dy], [x + dx, y - dy], [x + dx, y + dy], [x - dx, y + dy], [x - dx, y - dy]].map(([a, b]) => [Math.round(a * 1e6) / 1e6, Math.round(b * 1e6) / 1e6]);
        aiNote(`${L("Construiesc", "Building")} ${L(T.ro, T.en)} · ${p.n}`);
        const nb = { id: "n" + Date.now().toString(36), name: String(name || "") || `${L(T.ro, T.en)} · ${p.n}`, type: String(type), dens: T.res ? Number(density) || T.dens : null, ring, ha: Math.round(geomArea({ type: "Polygon", coordinates: [ring] }) / 100) / 100, ov: {}, t: new Date().toISOString() };
        try { nb.site = await nbSite(ring); } catch { nb.site = null; }
        nb.est = nbCompute(nb);
        PJ.cur.nbs = [...(PJ.cur.nbs || []), nb];
        PJ.cur.log = [...(PJ.cur.log || []), { t: nb.t, what: `${L("Cartier nou", "New district")}: ${nb.name}` }].slice(-60);
        pjEnsureNbLayers(); nbData(); pjSave(); await pjRebuild();
        shGo("atlas"); map.flyTo({ center: p.c, zoom: 14.5 });
        const e = nb.est;
        return { name: nb.name, ha: nb.ha, residents_capacity: e.pop, population_added: e.added, dwellings: e.dw, floors: e.fl, cost_million_eur: [Math.round((e.pub[0] + e.priv[0]) / 1e5) / 10, Math.round((e.pub[1] + e.priv[1]) / 1e5) / 10], public_million_eur: [Math.round(e.pub[0] / 1e5) / 10, Math.round(e.pub[1] / 1e5) / 10], months: e.months, workers: e.workers, items: e.items.map((i) => `${i.en}: ${Math.round(i.n * 100) / 100} ${i.unit}`), warnings: e.warns };
      } },
    { name: "build_road", description: "Add a new road to the open planning project (created if needed), straight between two places (names or 'lon,lat'), optionally through via points. Returns length, lanes and cost.",
      inputSchema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, via: { type: "array", items: { type: "string" } }, lanes: { type: "integer" }, name: { type: "string" } }, required: ["from", "to"] },
      async execute({ from, to, via = [], lanes = 2, name }) {
        await ensureProject();
        const pts = [await placePoint(from), ...(await Promise.all(via.map(placePoint))), await placePoint(to)];
        const coords = chaikin(pts.map((p) => p.c), 3).map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6]);
        const ln = Math.max(1, Math.min(8, Number(lanes) || 2)), km = lineLen(coords), width = ln * LANE_W;
        const x = (await pjIntersections(coords)).map(([a, b]) => [Math.round(a * 1e6) / 1e6, Math.round(b * 1e6) / 1e6]);
        const r = { id: "r" + Date.now().toString(36), name: String(name || "") || `${pts[0].n} – ${pts.at(-1).n}`, lanes: ln, km: Math.round(km * 1000) / 1000, width, costM2: ROAD_COST_M2, cost: Math.round(km * 1000 * width * ROAD_COST_M2), coords, x, from: pts[0].n, to: pts.at(-1).n, t: new Date().toISOString() };
        aiNote(`${L("Drum nou", "New road")}: ${r.name}`);
        PJ.cur.roads = [...(PJ.cur.roads || []), r];
        PJ.cur.log = [...(PJ.cur.log || []), { t: r.t, what: L("Drum nou", "New road") + `: ${r.name}` }].slice(-60);
        pjSave(); pjEnsureRoadLayers(); pjRoadsData(); shGo("atlas"); map.fitBounds(coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0])), { padding: 80 });
        return { name: r.name, km: r.km, lanes: ln, intersections: x.length, cost_million_eur: Math.round(r.cost / 1e5) / 10 };
      } },
    { name: "submit_proposal", description: "File a citizen proposal or petition in the user's name, publicly visible. Only when the user clearly asks to submit one.",
      inputSchema: { type: "object", properties: { type: { type: "string", enum: ["project", "petition"] }, title: { type: "string" }, description: { type: "string" }, category: { type: "string" }, place: { type: "string" } }, required: ["type", "title"] },
      async execute({ type, title, description, category, place }) {
        const p = { id: "x" + Date.now().toString(36), type: type === "petition" ? "petition" : "project", cat: PCAT[category] ? category : "other", title: String(title).slice(0, 120), desc: String(description || "").slice(0, 800), role: SH.role, author: VID, votes: { [VID]: 1 }, status: "new", sig: 0, offers: [], t: new Date().toISOString() };
        if (place) { const pt = await placePoint(place); p.loc = { c: pt.c, label: pt.n }; }
        await shProposals(); await shSaveProposal(p); award("propose", p.title);
        return `Submitted "${p.title}" (status: pending moderation)`;
      } },
  ];
}
async function aiContext() {
  const l2 = (await featsAt(2)).filter((f) => f.properties.lvl === 2).map((f) => `${f.properties.ro} (${fmt(Math.round(f.properties.pop * popScale()))})`).join("; ");
  const l1 = [...new Set((await featsAt(1)).map((f) => f.properties.ro + (SECDIR[f.properties.sector] ? ` (${SECDIR[f.properties.sector][1]})` : "")))].join(", ");
  return `You are the assistant inside "All in Chișinău", a prototype city app for Chișinău municipality (Moldova): atlas with population, land use, building age, weather, transport and roads maps; planning projects (border changes, new roads, new districts with cost estimates); projects & petitions with votes; problem reports; tickets and journey planner; tourist guide; news; documents.
Reply in ${{ ro: "Romanian", en: "English", ru: "Russian" }[S.lang]}, briefly and concretely. Use the tools to read real data before giving numbers, and to act when the user asks (navigate, build, merge, rename…). After an action, say what changed and that it can be undone in the construction menu. If something cannot be done, say so plainly. This is a prototype: never claim real-world effects.
Current state: date ${S.date}; section ${SH.sec}; user role ${RL(SH.role)}; user location ${locLabel()}; ${PJ.cur ? `open planning project "${PJ.cur.name}"` : "no planning project open"}.
Sectors (level 1): ${l1}.
Mayoralties and urban sectors (level 2, population): ${l2}.`;
}
async function aiAsk(q) {
  const A = await aiNs();
  if (!A || !A.maxTools) return false;
  SH.aiTurns ||= [];
  SH.aiTurns.push({ role: "user", content: q });
  const turns = [{ role: "user", content: await aiContext() }, ...SH.aiTurns.slice(-12)];
  const msg = { me: 0, h: `<span class="think">${L("Mă gândesc…", "Thinking…")}</span>`, live: 1 }; SH.chat.push(msg); chatRender();
  AI_CTL = new AbortController(); chatRender();
  try {
    const { text } = await A.s(turns, { tools: aiTools().slice(0, A.maxTools), signal: AI_CTL.signal, onText: ({ text }) => { msg.h = mdLite(text); chatRender(); } });
    msg.h = mdLite(text); SH.aiTurns.push({ role: "assistant", content: text });
  } catch (e) {
    if (e?.code === "not_granted" || e?.code === "sampling_disabled" || e?.code === "tools_unavailable" || e?.code === "not_declared") { AI = Promise.resolve(null); msg.h = await answer(q); }
    else msg.h = (e?.text ? mdLite(e.text) + "<br>" : "") + `<span class="small warn">${e?.code === "cancelled" ? L("Oprit.", "Stopped.") : e?.code === "rate_limited" ? L("Prea multe cereri; încearcă puțin mai târziu.", "Too many requests; try again a bit later.") : L("Asistentul nu a putut răspunde acum.", "The assistant could not answer right now.")}</span>`;
    SH.aiTurns.pop();
  }
  delete msg.live; AI_CTL = null; chatRender();
  return true;
}
// minimal, safe formatting for Claude's text (escape first, then bold, lists, line breaks)
function mdLite(t) {
  return esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/^\s*[-•]\s+(.*)$/gm, "• $1").replace(/\n/g, "<br>");
}
