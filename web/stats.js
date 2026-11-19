// ================================================================== ALL IN CHIȘINĂU — "Statistici": access & environment maps (+ ratio of any two)
// Data: data/statgrid.json (scripts/build_stats.py): scores 0–100 on the 150 m grid, computed from walking distance on the
// street & path network to ALL facilities around (gravity sum with distance decay), plus residents and jobs per cell.
const STK = {
  green:   { ro: "Acces la spații verzi", en: "Access to green space", ru: "Доступ к зелёным зонам", ic: "🌳", q: 1,
    d: ["Câte spații verzi publice (parcuri, scuaruri, păduri) sunt la îndemână pe jos.", "How much public green space (parks, squares, forests) is within walking reach.", "Сколько общественных зелёных зон (парки, скверы, леса) в пешей доступности."] },
  transit: { ro: "Acces la transport public", en: "Access to public transport", ru: "Доступ к общественному транспорту", ic: "🚎", q: 1,
    d: ["Cât de aproape sunt stațiile de troleibuz și autobuz și câte linii trec prin ele.", "How close trolleybus and bus stops are and how many lines serve them.", "Насколько близко остановки троллейбуса и автобуса и сколько линий через них проходит."] },
  air:     { ro: "Calitatea aerului (estimare)", en: "Air quality (estimate)", ru: "Качество воздуха (оценка)", ic: "💨", q: 1,
    d: ["Indice estimat: cât de departe ești de trafic intens și de zone industriale. 100 = aer mai curat.", "Estimated index: distance from heavy traffic and industrial areas. 100 = cleaner air.", "Оценочный индекс: удалённость от интенсивного движения и промзон. 100 = чище воздух."] },
  health:  { ro: "Acces la unități medicale", en: "Access to healthcare", ru: "Доступ к медицине", ic: "🏥", q: 1,
    d: ["Spitale, policlinici, centre medicale și cabinete accesibile pe jos.", "Hospitals, polyclinics, health centres and practices within walking reach.", "Больницы, поликлиники, медцентры и кабинеты в пешей доступности."] },
  school:  { ro: "Acces la școli", en: "Access to schools", ru: "Доступ к школам", ic: "🏫", q: 1,
    d: ["Școli și licee accesibile pe jos.", "Schools and lyceums within walking reach.", "Школы и лицеи в пешей доступности."] },
  pop:     { ro: "Populație", en: "Population", ru: "Население", ic: "👥", q: -1,
    d: ["Locuitori pe km² (recensământul 2024).", "Residents per km² (2024 census).", "Жителей на км² (перепись 2024)."] },
  jobs:    { ro: "Locuri de muncă", en: "Jobs", ru: "Рабочие места", ic: "💼", q: -1,
    d: ["Locuri de muncă pe km² (estimare).", "Jobs per km² (estimate).", "Рабочих мест на км² (оценка)."] },
};
Object.assign(T.ro, { stats: "Statistici", showloc: "Arată locația mea pe hartă" }); Object.assign(T.en, { stats: "Statistics", showloc: "Show my location on the map" }); if (T.ru) Object.assign(T.ru, { stats: "Статистика", showloc: "Показывать моё местоположение на карте" });
const STN = (k) => L(STK[k].ro, STK[k].en, STK[k].ru);
const ST_HOW = {
  green: ["Toate parcurile, grădinile publice, bazele de odihnă și pădurile din jur, nu doar cel mai apropiat. Se ignoră spațiile private și petele mici de iarbă (sub 0,3 ha; păduri sub 1 ha). Fiecare hectar contează mai puțin cu cât e mai departe pe jos (la 400 m contează ~37%, peste 1,6 km nu mai contează).", "All parks, public gardens, recreation grounds and forests around, not only the nearest. Private gardens and small grass patches are ignored (under 0.3 ha; forests under 1 ha). Each hectare counts less the further it is on foot (~37% at 400 m, nothing beyond 1.6 km).", "Все парки, общественные сады, зоны отдыха и леса вокруг, а не только ближайший. Частные участки и мелкие газоны не учитываются (меньше 0,3 га; леса меньше 1 га). Каждый гектар весит тем меньше, чем дальше пешком (~37% на 400 м, дальше 1,6 км не учитывается)."],
  transit: ["Toate stațiile de troleibuz și autobuz (inclusiv rutiere) din jur. Fiecare stație cântărește după numărul de linii care o deservesc (maxim 12) și scade cu distanța pe jos (la 250 m ~37%, peste 1 km nu mai contează). Trenul nu e inclus.", "All trolleybus and bus (incl. minibus) stops around. Each stop weighs by the number of lines serving it (max 12) and fades with walking distance (~37% at 250 m, nothing beyond 1 km). Trains are not included.", "Все остановки троллейбусов и автобусов (вкл. маршрутки) вокруг. Каждая весит по числу линий (макс. 12) и убывает с расстоянием пешком (~37% на 250 м, дальше 1 км не учитывается). Поезд не включён."],
  health: ["Toate unitățile medicale din jur: spital = 4, policlinică / centru medical = 2, cabinet = 1,5, stomatologie sau laborator = 0,5. Distanța pe jos reduce greutatea (la 700 m ~37%, peste 3 km nu mai contează). Farmaciile nu sunt incluse.", "All health facilities around: hospital = 4, polyclinic / health centre = 2, doctor's practice = 1.5, dentist or lab = 0.5. Walking distance lowers the weight (~37% at 700 m, nothing beyond 3 km). Pharmacies are not included.", "Все медучреждения вокруг: больница = 4, поликлиника / медцентр = 2, кабинет = 1,5, стоматология или лаборатория = 0,5. Расстояние пешком снижает вес (~37% на 700 м, дальше 3 км не учитывается). Аптеки не включены."],
  school: ["Toate școlile și liceele din jur, fiecare cu aceeași greutate, care scade cu distanța pe jos (la 600 m ~37%, peste 2,5 km nu mai contează). O școală la ~500 m dă ~42 de puncte; două, ~66; trei, ~80.", "All schools and lyceums around, equal weight, fading with walking distance (~37% at 600 m, nothing beyond 2.5 km). One school ~500 m away gives ~42 points; two ~66; three ~80.", "Все школы и лицеи вокруг, одинаковый вес, убывающий с расстоянием пешком (~37% на 600 м, дальше 2,5 км не учитывается). Одна школа в ~500 м даёт ~42 балла, две — ~66, три — ~80."],
  air: ["Nu există măsurători ale aerului pe cartiere, deci indicele e un model: traficul estimat al fiecărui drum (categoria drumului × benzi) scade cu distanța (la 120 m ~37%), plus zonele industriale (la 400 m ~37%). E o comparație relativă între zone, nu o valoare în µg/m³; vântul și încălzirea caselor nu sunt incluse.", "There are no air measurements by neighbourhood, so this is a model: each road's estimated traffic (road class × lanes) fades with distance (~37% at 120 m), plus industrial land (~37% at 400 m). It compares areas; it is not a µg/m³ value; wind and home heating are not included.", "Измерений воздуха по районам нет, поэтому это модель: оценочный трафик каждой дороги (категория × полосы) убывает с расстоянием (~37% на 120 м), плюс промзоны (~37% на 400 м). Это сравнение районов, а не значение в мкг/м³; ветер и отопление домов не учтены."],
};
const ST_COMMON = () => L("Distanța se măsoară pe străzi, trotuare și poteci (OpenStreetMap), nu în linie dreaptă: un parc de peste calea ferată sau un râu poate fi departe chiar dacă pare aproape. Scorul 0–100 crește repede la început și apoi se plafonează: încă o stație lângă zece altele nu schimbă mult. Media pe unități e ponderată cu numărul de locuitori.",
  "Distance is measured along streets, sidewalks and paths (OpenStreetMap), not in a straight line: a park across a railway or a river can be far even if it looks close. The 0–100 score rises fast at first and then levels off: one more stop next to ten others changes little. Unit averages are weighted by residents.",
  "Расстояние считается по улицам, тротуарам и дорожкам (OpenStreetMap), а не по прямой: парк за железной дорогой или рекой может быть далеко, даже если кажется близким. Балл 0–100 сначала растёт быстро, затем выходит на плато: ещё одна остановка рядом с десятью другими мало что меняет. Средние по единицам взвешены по числу жителей.");
const ST_CLS = [[0, 20, "#c0272d"], [20, 40, "#f07b3f"], [40, 60, "#f6c85f"], [60, 80, "#8cc665"], [80, 101, "#1f8a4c"]];
const ST_CLN = () => [L("Foarte slab", "Very poor", "Очень плохо"), L("Slab", "Poor", "Плохо"), L("Mediu", "Fair", "Средне"), L("Bun", "Good", "Хорошо"), L("Foarte bun", "Very good", "Очень хорошо")];
const ST_STOPS = [[0, [165, 0, 38]], [20, [227, 74, 51]], [40, [253, 174, 97]], [55, [254, 224, 139]], [70, [166, 217, 106]], [85, [26, 152, 80]], [100, [0, 104, 55]]];
const lerpStops = (st, v) => { if (v <= st[0][0]) return st[0][1]; for (let i = 1; i < st.length; i++) if (v <= st[i][0]) { const [a, p] = st[i - 1], [b, c] = st[i], t = (v - a) / (b - a); return p.map((x, k) => x + (c[k] - x) * t); } return st.at(-1)[1]; };
const RT_GOOD = [[-2, [165, 0, 38]], [-1, [240, 123, 63]], [0, [250, 240, 200]], [1, [140, 198, 101]], [2, [0, 104, 55]]];
const RT_NEU = [[-2, [94, 60, 153]], [-1, [178, 171, 210]], [0, [247, 247, 247]], [1, [253, 184, 99]], [2, [230, 97, 1]]];
const rgbHex = (c) => "#" + c.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
Object.assign(S, { stat: store.get("stat", "green"), stRatio: store.get("stRatio", false), stA: store.get("stA", "green"), stB: store.get("stB", "pop"), stView: store.get("stView", "heat") });

// ---------------------------------------------------------------- grid
let SG = null;
async function statGrid() {
  if (SG) return SG;
  const g = await load("statgrid.json"), { W, H, dx, dy, kx0, ky0 } = g, n = W * H;
  const box = (a) => { const o = new Float32Array(n); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let s = 0, c = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const ii = i + u, jj = j + v; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const w = u || v ? 1 : 2; s += a[jj * W + ii] * w; c += w; } o[j * W + i] = s / c; } return o; };
  const cellKm2 = (dx * 111.32 * Math.cos((47 * Math.PI) / 180)) * (dy * 110.57);
  const inside = new Float32Array(n), pop = Float32Array.from(g.pop), jobs = Float32Array.from(g.jobs);
  for (let k = 0; k < n; k++) inside[k] = g.s.green[k] >= 0 ? 1 : 0;
  const act = box(Float32Array.from(pop, (p, k) => p + jobs[k] * 0.5));
  const mask = Float32Array.from(inside, (v, k) => v * (act[k] >= 1.5 ? 1 : 0.3));
  const vals = {};
  for (const k in g.s) vals[k] = Float32Array.from(g.s[k], (v) => (v < 0 ? 0 : v));
  vals.pop = Float32Array.from(box(pop), (v, k) => (v / cellKm2) * inside[k]);
  vals.jobs = Float32Array.from(box(jobs), (v, k) => (v / cellKm2) * inside[k]);
  // municipal reference for the ratio: resident-weighted average for scores, average density where people live or work
  const ref = {}; let pw = 0; for (let k = 0; k < n; k++) pw += pop[k] * inside[k];
  for (const k in vals) { let s = 0; if (STK[k].q > 0) { for (let i = 0; i < n; i++) s += vals[k][i] * pop[i] * inside[i]; ref[k] = s / pw; } else { let c = 0; for (let i = 0; i < n; i++) if (mask[i] === 1) { s += vals[k][i]; c++; } ref[k] = s / c; } }
  // resident-weighted distribution of every statistic → percentile (position in the city's ranking)
  const dist = {};
  for (const k in vals) { const idx = []; for (let i = 0; i < n; i++) if (inside[i] && pop[i] > 0) idx.push(i); idx.sort((a, b) => vals[k][a] - vals[k][b]); let c = 0; const v = new Float32Array(idx.length), cw = new Float32Array(idx.length); idx.forEach((i, t) => { c += pop[i]; v[t] = vals[k][i]; cw[t] = c; }); dist[k] = { v, cw, tot: c }; }
  SG = { box, dist, W, H, dx, dy, kx0, ky0, x0: (kx0 + 0.5) * dx, y0: (ky0 + 0.5) * dy, n, inside, mask, pop, jobs, vals, ref, near: g.near, cum: g.cum, cellKm2 };
  return SG;
}
const stLog = (a, b) => Math.max(-3, Math.min(3, Math.log2(Math.max(a, 1e-3) / Math.max(b, 1e-3))));
function stPct(k, x) {   // share of residents living where the value is lower than x (ties count half)
  const D = SG.dist[k], v = D.v; let lo = 0, hi = v.length; while (lo < hi) { const m = (lo + hi) >> 1; if (v[m] < x) lo = m + 1; else hi = m; }
  let up = lo; while (up < v.length && v[up] <= x) up++;
  const below = lo ? D.cw[lo - 1] : 0, eq = (up ? D.cw[up - 1] : 0) - below;
  return (below + eq / 2) / D.tot;
}
const stTrue = (A, B) => STK[A].q < 0 && STK[B].q < 0;   // residents vs jobs: a real ratio (like commuting)
// value on a ±2 scale: real ratio → log2 vs the city's usual ratio; otherwise the gap between the two rankings (2 = 50 points)
function stRatioVal(A, B, a, b) { return stTrue(A, B) ? Math.max(-2.5, Math.min(2.5, stLog(a / SG.ref[A], b / SG.ref[B]))) : Math.max(-2, Math.min(2, (stPct(A, a) - stPct(B, b)) * 4)); }
const stRatioFmt = (A, B, v) => (stTrue(A, B) ? (v < 0 ? "÷" : "×") + fmt(2 ** Math.abs(v), 1) : (v > 0 ? "+" : "−") + fmt(Math.abs(v) * 25, 0) + " p");
const stPol = (A, B) => (STK[A].q === STK[B].q ? 0 : STK[A].q);   // +1: high ratio is good; -1: high is bad; 0: neutral
function stField(key) {   // key: "green" | "pop" | "r~A~B" → Float32Array of values (scores, densities or log2 ratios)
  const G = SG; G.f ??= {};
  if (G.f[key]) return G.f[key];
  if (key.startsWith("r~")) { const [, A, B] = key.split("~"), a = G.vals[A], b = G.vals[B]; const r = Float32Array.from(a, (v, i) => (G.inside[i] ? stRatioVal(A, B, v, b[i]) : 0)); return (G.f[key] = G.box(r)); }
  return (G.f[key] = G.vals[key]);
}
function stSample(F, lon, lat) {   // normalized bilinear sampling (cells outside the municipality do not bleed in)
  const G = SG, fx = (lon - G.x0) / G.dx, fy = (lat - G.y0) / G.dy;
  if (!(fx >= 0 && fy >= 0 && fx < G.W - 1 && fy < G.H - 1)) return [0, 0];
  const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, w = fy - j, k = j * G.W + i, M = G.mask, I = G.inside;
  const ws = [(1 - u) * (1 - w), u * (1 - w), (1 - u) * w, u * w], ks = [k, k + 1, k + G.W, k + G.W + 1];
  let s = 0, m = 0, a = 0; for (let t = 0; t < 4; t++) { const q = ws[t] * I[ks[t]]; s += F[ks[t]] * q; m += q; a += ws[t] * M[ks[t]]; }
  return m > 0.05 ? [s / m, a] : [0, 0];
}
function stColour(key, v) {
  if (key.startsWith("r~")) { const [, A, B] = key.split("~"), p = stPol(A, B); return lerpStops(p === 0 ? RT_NEU : RT_GOOD, p < 0 ? -v : v); }
  if (STK[key].q < 0) return hillCol(v);
  return lerpStops(ST_STOPS, v);
}
function stHeight(key, v, sq) {
  if (key.startsWith("r~")) return v * 260;
  if (STK[key].q < 0) return hillH(v, sq);
  return sq ? Math.sqrt(v / 100) * 1200 : v * 12;
}
async function stTile(url, dem) {
  const [key, mode, ...zxy] = url.split("/"), [z, x, y] = zxy.map(Number);
  await statGrid(); const F = stField(key), dens = !key.startsWith("r~") && STK[key].q < 0;
  const N = 256, cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(N, N) : Object.assign(document.createElement("canvas"), { width: N, height: N });
  const ctx = cv.getContext("2d"), img = ctx.createImageData(N, N), a = img.data, n = 2 ** z;
  for (let py = 0; py < N; py++) {
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + (py + 0.5) / N)) / n))) * 180) / Math.PI;
    for (let px = 0; px < N; px++) {
      const lon = ((x + (px + 0.5) / N) / n) * 360 - 180, [v, m] = stSample(F, lon, lat), o = (py * N + px) * 4;
      if (dem) { const h = (m > 0 ? stHeight(key, v, mode === "sqrt") * (dens ? 1 : Math.min(1, m)) : 0) + 32768; a[o] = Math.floor(h / 256); a[o + 1] = Math.floor(h) % 256; a[o + 2] = Math.floor((h % 1) * 256); a[o + 3] = 255; continue; }
      if (m <= 0) { a[o + 3] = 0; continue; }
      const c = stColour(key, v); a[o] = c[0]; a[o + 1] = c[1]; a[o + 2] = c[2];
      a[o + 3] = dens ? (c[3] ?? 200) : Math.round(215 * Math.min(1, m));
    }
  }
  ctx.putImageData(img, 0, 0);
  const blob = cv.convertToBlob ? await cv.convertToBlob({ type: "image/png" }) : await new Promise((r) => cv.toBlob(r, "image/png"));
  return { data: await blob.arrayBuffer() };
}
maplibregl.addProtocol("stcol", (p) => stTile(p.url.replace("stcol://", ""), false));
maplibregl.addProtocol("stdem", (p) => stTile(p.url.replace("stdem://", ""), true));
const stKey = () => (S.stRatio ? `r~${S.stA}~${S.stB}` : S.stat);

// ---------------------------------------------------------------- per unit (resident-weighted averages)
const ST_CELLS = new Map();   // admin id → grid cells with residents
async function ensureStats() {
  const admin = await adminFC(); if (admin.__stats) return admin;
  const G = await statGrid(); await ensureJobs();
  for (const f of admin.features) {
    const p = f.properties; if (!f.geometry) continue;
    const pg = prepGeom(f.geometry), [x0, y0, x1, y1] = pg.bbox;
    const i0 = Math.max(0, Math.floor((x0 - G.x0) / G.dx)), i1 = Math.min(G.W - 1, Math.ceil((x1 - G.x0) / G.dx)), j0 = Math.max(0, Math.floor((y0 - G.y0) / G.dy)), j1 = Math.min(G.H - 1, Math.ceil((y1 - G.y0) / G.dy));
    const acc = {}, near = {}, mine = []; let wp = 0, wa = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * G.W + i; if (!G.inside[k] || !pg.has(G.x0 + i * G.dx, G.y0 + j * G.dy)) continue;
      const w = G.pop[k] > 0 ? G.pop[k] : 0; wp += w; wa += 1; if (w > 0) mine.push(k);
      for (const s of ["green", "transit", "air", "health", "school"]) { acc[s] ??= [0, 0]; acc[s][0] += G.vals[s][k] * w; acc[s][1] += G.vals[s][k]; }
      for (const s in G.near) { near[s] ??= 0; near[s] += Math.min(3000, G.near[s][k]) * w; }
    }
    if (!wa) continue;
    ST_CELLS.set(p.id, Int32Array.from(mine));
    for (const s in acc) p["st_" + s] = Math.round(wp > 0 ? acc[s][0] / wp : acc[s][1] / wa);
    if (wp > 0) for (const s in near) p["sn_" + s] = Math.round(near[s] / wp / 10) * 10;
  }
  admin.__stats = true;
  return admin;
}
const stUnitVal = (p, k) => (k === "pop" ? (p.dens || 0) * popScale() : k === "jobs" ? p.jdens || 0 : p["st_" + k]);
function stUnitRatios(admin) {   // what the unit's residents experience: the map's value averaged over their cells (weighted by residents)
  const F = stField(`r~${S.stA}~${S.stB}`), G = SG;
  for (const f of admin.features) { const p = f.properties, c = ST_CELLS.get(p.id); if (!c || !c.length) { p.st_r = null; continue; } let s = 0, w = 0; for (const k of c) { s += F[k] * G.pop[k]; w += G.pop[k]; } p.st_r = Math.round((s / w) * 100) / 100; }
}
async function stApplyUnits() {
  const admin = await ensureStats(), A = S.stA, B = S.stB, key = stKey();
  if (S.stRatio) stUnitRatios(admin);
  map.getSource("admin")?.setData(admin);
  const prop = S.stRatio ? "st_r" : S.stat === "pop" || S.stat === "jobs" ? null : "st_" + S.stat;
  let col;
  if (prop) {
    const stops = S.stRatio ? (stPol(A, B) === 0 ? RT_NEU : RT_GOOD) : ST_STOPS, flip = S.stRatio && stPol(A, B) < 0;
    col = ["interpolate", ["linear"], ["*", flip ? -1 : 1, ["to-number", ["get", prop]]], ...stops.flatMap(([v, c]) => [v, rgbHex(c)])];
    col = ["case", ["has", prop], ["case", ["==", ["get", prop], null], "#cccccc", col], "#cccccc"];
  } else if (S.stat === "pop") { const s = popScale(), br = [0, 100, 500, 1500, 4000, 8000]; col = ["step", ["*", s, ["coalesce", ["get", "dens"], 0]], pal().pop[0]]; br.slice(1).forEach((v, i) => col.push(v, pal().pop[i + 1])); }
  else { col = ["step", ["coalesce", ["get", "jdens"], 0], JOBCOL[0]]; JOBBR.slice(1).forEach((v, i) => col.push(v, JOBCOL[i + 1])); }
  map.setPaintProperty("admin-fill", "fill-color", ["case", ["==", ["get", "lvl"], "ctx"], pal().line, col]);
  map.setPaintProperty("admin-fill", "fill-opacity", ["case", ["==", ["get", "lvl"], "ctx"], 0.05, 0.78]);
  return key;
}
// layers (heat = flat colours, hills = same colours on a terrain made from the values)
async function statsRender(on, only) {
  document.getElementById("as-q")?.setAttribute("placeholder", L("Caută o stradă sau un loc…", "Search a street or a place…", "Найти улицу или место…"));
  if (bm(S.mode) === "stats") { const el = document.getElementById("stpanel"), sig = [S.lang, S.stat, S.stRatio, S.stA, S.stB, S.stView].join("|"); if (el && el.dataset.sig !== sig) { statsPanel(); el.dataset.sig = sig; } }
  const key = stKey(), view = S.stView, sq = S.hillSqrt && !key.startsWith("r~") ? "sqrt" : "lin";
  const want = on && view !== "units" ? `stc-${key}` : null, wantDem = on && view === "hills" ? `std-${key}-${sq}` : null;
  if (want && !map.getSource(want)) {
    map.addSource(want, { type: "raster", tiles: [`stcol://${key}/c/{z}/{x}/{y}`], tileSize: 256, maxzoom: 13, bounds: DBOX });
    map.addLayer({ id: want, type: "raster", source: want, layout: { visibility: "none" }, paint: { "raster-fade-duration": 0, "raster-opacity": 0.92 } }, "admin-fill");
  }
  if (wantDem && !map.getSource(wantDem)) {
    map.addSource(wantDem, { type: "raster-dem", tiles: [`stdem://${key}/${sq}/{z}/{x}/{y}`], tileSize: 256, encoding: "terrarium", maxzoom: 12, bounds: DBOX });
    map.addLayer({ id: "sth-" + wantDem, type: "hillshade", source: wantDem, layout: { visibility: "none" }, paint: { "hillshade-exaggeration": 0.3, "hillshade-shadow-color": isDark() ? "#000" : "#6d6680", "hillshade-highlight-color": "#fff" } }, "admin-fill");
    map.moveLayer(want, "admin-fill");
  }
  for (const l of map.getStyle().layers) {
    if (l.id.startsWith("stc-")) vis(l.id, l.id === want);
    else if (l.id.startsWith("sth-")) vis(l.id, l.id === "sth-" + wantDem);
  }
  if (on && view === "units") await stApplyUnits();
  return wantDem;
}

// ---------------------------------------------------------------- legend with charts: share of residents per class, best / worst areas
function stBars(rows) {   // rows: [colour, label, share 0–1, sub]
  const mx = Math.max(...rows.map((r) => r[2]), 0.01);
  return `<li class="stbars">${rows.map(([c, l, v, sub]) => `<div class="stbar"><i style="background:${c}"></i><span class="stl">${l}${sub ? `<small>${sub}</small>` : ""}</span><span class="stb"><b style="width:${(v / mx) * 100}%;background:${c}"></b></span><span class="stp">${fmt(v * 100, 0)}%</span></div>`).join("")}</li>`;
}
async function statsLegendAsync() {
  const G = await statGrid(), admin = await ensureStats(), key = stKey(), F = stField(key);
  let tot = 0; for (let k = 0; k < G.n; k++) tot += G.pop[k] * G.inside[k];
  const share = (lo, hi) => { let s = 0; for (let k = 0; k < G.n; k++) if (G.inside[k] && F[k] >= lo && F[k] < hi) s += G.pop[k]; return s / tot; };
  const units = admin.features.filter((f) => f.properties.lvl === 3 && [REF(), "both"].includes(f.properties.sc) && f.properties.pop * popScale() >= 1500).map((f) => f.properties);
  const pick = (val, n, asc) => units.filter((p) => val(p) != null).sort((a, b) => (asc ? val(a) - val(b) : val(b) - val(a))).slice(0, n);
  const pickHtml = (title, list, val, fmtv, cls) => `<li class="cap">${title}</li><li class="stlist ${cls}">${list.map((p) => `<button type="button" class="stu" data-stunit="${p.id}"><span>${esc(nameOf(p))}</span><b>${fmtv(val(p))}</b></button>`).join("")}</li>`;
  const how = (k) => `<li><details class="how"><summary>${L("Cum se calculează?", "How is it calculated?", "Как считается?")}</summary><p class="small">${L(...ST_HOW[k])}</p><p class="small">${ST_COMMON()}</p></details></li>`;
  let h = "";
  if (S.stRatio) {
    stUnitRatios(admin);
    const A = S.stA, B = S.stB, p = stPol(A, B), nA = STN(A), nB = STN(B);
    const lab = p === 0 ? [L(`mult mai puțin „${nA}”`, `much less “${nA}”`, `намного меньше «${nA}»`), L("mai puțin", "less", "меньше"), L("echilibru (ca media orașului)", "balanced (like the city average)", "баланс (как в среднем по городу)"), L("mai mult", "more", "больше"), L(`mult mai mult „${nA}”`, `much more “${nA}”`, `намного больше «${nA}»`)]
      : STK[A].q > 0 ? [L("mult sub necesar", "far below need", "намного ниже потребности"), L("sub necesar", "below need", "ниже потребности"), L("ca media orașului", "like the city average", "как в среднем"), L("peste necesar", "above need", "выше потребности"), L("mult peste necesar", "far above need", "намного выше потребности")]
      : [L("mult peste capacitate", "far above capacity", "намного выше возможностей"), L("peste capacitate", "above capacity", "выше возможностей"), L("ca media orașului", "like the city average", "как в среднем"), L("sub capacitate", "below capacity", "ниже возможностей"), L("mult sub capacitate", "far below capacity", "намного ниже возможностей")];
    const stops = p === 0 ? RT_NEU : RT_GOOD, br = stTrue(A, B) ? [[-9, -1.25], [-1.25, -0.4], [-0.4, 0.4], [0.4, 1.25], [1.25, 9]] : [[-9, -1.2], [-1.2, -0.4], [-0.4, 0.4], [0.4, 1.2], [1.2, 9]];
    const rng = (lo, hi) => stTrue(A, B) ? `${lo < -5 ? "< " + stRatioFmt(A, B, hi) : hi > 5 ? "> " + stRatioFmt(A, B, lo) : stRatioFmt(A, B, lo) + " … " + stRatioFmt(A, B, hi)}` : `${lo < -5 ? "< " + stRatioFmt(A, B, hi) : hi > 5 ? "> " + stRatioFmt(A, B, lo) : stRatioFmt(A, B, lo) + " … " + stRatioFmt(A, B, hi)}`;
    const rows = br.map(([lo, hi], i) => { const cv = p < 0 ? -((lo + hi) / 2) : (lo + hi) / 2; return [rgbHex(lerpStops(stops, Math.max(-2, Math.min(2, cv)))), lab[i], share(lo, hi), rng(lo, hi)]; });
    if (p < 0) rows.reverse();
    const good = p === 0 ? null : p > 0 ? L("Verde = bine (mai mult decât e nevoie), roșu = problemă.", "Green = good (more than needed), red = a problem.", "Зелёный = хорошо (больше, чем нужно), красный = проблема.") : L("Verde = bine, roșu = problemă (cerere mare, ofertă mică).", "Green = good, red = a problem (high demand, little supply).", "Зелёный = хорошо, красный = проблема (большой спрос, мало предложения).");
    h += `<li class="cap">${esc(nA)} ÷ ${esc(nB)}</li><li class="small">${stTrue(A, B) ? L(`Raport real, comparat cu proporția obișnuită în oraș: unde „${nA}” e mare față de „${nB}”.`, `A real ratio, compared with the city's usual proportion: where “${nA}” is high relative to “${nB}”.`, `Настоящее отношение по сравнению с обычной пропорцией в городе: где «${nA}» велико относительно «${nB}».`)
      : L(`Pentru fiecare loc se compară poziția în clasamentul orașului la „${nA}” cu poziția la „${nB}”. Exemplu: dacă un cartier e printre cele mai populate (locul 90 din 100) dar doar la mijloc la „${nA}” (50 din 100), diferența e −40 de puncte.`, `For each place, its position in the city's ranking for “${nA}” is compared with its position for “${nB}”. Example: an area among the most populated (90th of 100) but only mid-table for “${nA}” (50th) scores −40 points.`, `Для каждого места сравнивается его позиция в рейтинге города по «${nA}» и по «${nB}». Пример: район среди самых населённых (90 из 100), но лишь в середине по «${nA}» (50 из 100) получает −40 пунктов.`)} ${good || ""}</li>`
      + `<li class="cap">${L("Câți locuitori trăiesc în fiecare situație", "How many residents live in each situation", "Сколько жителей в каждой ситуации")}</li>` + stBars(rows);
    const val = (q) => q.st_r;
    if (p !== 0) {
      const bad = pick(val, 5, p > 0), best = pick(val, 3, p < 0), f2 = (v) => stRatioFmt(A, B, v);
      h += pickHtml(L("Zone prioritare (cele mai dezavantajate cartiere)", "Priority areas (most disadvantaged)", "Приоритетные районы (наиболее неблагополучные)"), bad, val, f2, "bad")
        + pickHtml(L("Cele mai bine servite", "Best served", "Лучше всего обеспечены"), best, val, f2, "good");
    }
    h += `<li><details class="how"><summary>${L("Cum se calculează?", "How is it calculated?", "Как считается?")}</summary><p class="small">${L("Un scor de acces (0–100) și o densitate (până la zeci de mii de oameni pe km²) nu se pot împărți direct: densitatea ar domina totul. De aceea fiecare statistică e transformată în percentilă: ce parte din locuitorii orașului stau într-un loc cu valoare mai mică (0 = cel mai jos, 100 = cel mai sus). Harta arată diferența A − B în puncte: −50 sau mai puțin = mult sub, 0 = la fel ca în restul orașului, +50 = mult peste. Doar pentru Populație și Locuri de muncă se folosește raportul real (ca la navetă), comparat cu proporția medie din oraș. Pe unități se folosesc mediile unității (ponderate cu locuitorii).", "An access score (0–100) and a density (up to tens of thousands per km²) cannot be divided directly: density would dominate. So each statistic becomes a percentile: the share of the city's residents living where the value is lower (0 = lowest, 100 = highest). The map shows A − B in points: −50 or less = far below, 0 = in line with the rest of the city, +50 = far above. Only Population vs Jobs uses the real ratio (as in commuting), compared with the city's average proportion. Units use their resident-weighted averages.", "Балл доступа (0–100) и плотность (до десятков тысяч на км²) нельзя делить напрямую: плотность всё перевесит. Поэтому каждый показатель переводится в перцентиль: доля жителей города, живущих там, где значение ниже (0 — минимум, 100 — максимум). Карта показывает A − B в пунктах: −50 и ниже — намного ниже, 0 — как в остальном городе, +50 — намного выше. Только для населения и рабочих мест берётся настоящее отношение (как для поездок на работу) относительно средней пропорции. По единицам — их средние, взвешенные по жителям.")}</p></details></li>`;
    return h;
  }
  const k = S.stat, st = STK[k];
  h += `<li class="cap">${st.ic} ${esc(STN(k))}</li><li class="small">${L(...st.d)}</li>`;
  if (st.q < 0) {
    const br = k === "pop" ? [0, 1500, 4000, 8000, 15000, 1e9] : [0, 500, 1500, 4000, 10000, 1e9];
    const rows = br.slice(0, -1).map((lo, i) => [rgbHex(hillCol(Math.max(lo, 200) + (Math.min(br[i + 1], 30000) - lo) / 2).slice(0, 3)), `${fmt(lo)}${br[i + 1] < 1e9 ? "–" + fmt(br[i + 1]) : "+"} / km²`, share(lo, br[i + 1])]);
    h += `<li class="cap">${L("Locuitori după densitatea zonei", "Residents by density of their area", "Жители по плотности района")}</li>` + stBars(rows)
      + `<li class="small">${L("Folosește „Raportează” ca să vezi, de exemplu, unde locuiesc mulți oameni dar accesul la parcuri sau stații e slab.", "Use “Ratio” to see, for example, where many people live but access to parks or stops is poor.", "Используйте «Соотношение», чтобы увидеть, например, где живёт много людей, но доступ к паркам или остановкам плохой.")}</li>`;
    return h;
  }
  let avg = 0; for (let i = 0; i < G.n; i++) avg += G.vals[k][i] * G.pop[i] * G.inside[i]; avg /= tot;
  const cls = ST_CLN(), rows = ST_CLS.map(([lo, hi, c], i) => [c, cls[i], share(lo, hi), `${lo}–${Math.min(hi, 100)}`]).reverse();
  const poor = share(0, 40);
  h += `<li class="stkpi"><div><b style="color:${rgbHex(lerpStops(ST_STOPS, avg))}">${fmt(avg, 0)}</b><span>${L("scor mediu / 100 (ponderat cu locuitorii)", "average score / 100 (weighted by residents)", "средний балл / 100 (взвешен по жителям)")}</span></div><div><b style="color:${poor > 0.25 ? "#c0272d" : poor > 0.1 ? "#e8590c" : "#1f8a4c"}">${fmt(poor * 100, 0)}%</b><span>${L("dintre locuitori au acces slab sau foarte slab", "of residents have poor or very poor access", "жителей с плохим или очень плохим доступом")}</span></div></li>`
    + `<li class="cap">${L("Câți locuitori au fiecare nivel", "Residents at each level", "Сколько жителей на каждом уровне")}</li>` + stBars(rows);
  if (G.near[k]) {   // median walking distance to the nearest facility, for residents
    const arr = []; for (let i = 0; i < G.n; i++) if (G.inside[i] && G.pop[i] > 0) arr.push([G.near[k][i], G.pop[i]]);
    arr.sort((a, b) => a[0] - b[0]); let c = 0, med = 0, p90 = 0; for (const [d, w] of arr) { c += w; if (!med && c >= tot / 2) med = d; if (!p90 && c >= tot * 0.9) { p90 = d; break; } }
    const what = { transit: L("o stație", "a stop", "остановка"), green: L("un spațiu verde public", "a public green space", "общественная зелёная зона"), health: L("o unitate medicală", "a health facility", "медучреждение"), school: L("o școală", "a school", "школа") }[k];
    const m = (d) => (d >= 9999 ? "> 3 km" : d >= 1000 ? fmt(d / 1000, 1) + " km" : fmt(Math.round(d / 10) * 10) + " m");
    h += `<li class="small">${L(`Jumătate dintre locuitori au ${what} la cel mult <b>${m(med)}</b> de mers pe jos; 9 din 10, la cel mult <b>${m(p90)}</b>.`, `Half of residents have ${what} within <b>${m(med)}</b> on foot; 9 in 10 within <b>${m(p90)}</b>.`, `У половины жителей ${what} в пределах <b>${m(med)}</b> пешком; у 9 из 10 — в пределах <b>${m(p90)}</b>.`)}</li>`;
  }
  const val = (q) => q["st_" + k];
  h += pickHtml(L("Cele mai slabe cartiere", "Weakest neighbourhoods", "Самые слабые районы"), pick(val, 4, true), val, (v) => fmt(v), "bad")
    + pickHtml(L("Cele mai bune cartiere", "Best neighbourhoods", "Лучшие районы"), pick(val, 3, false), val, (v) => fmt(v), "good")
    + how(k);
  return h;
}
function statsLegend() {
  const id = "stleg" + Date.now();
  statsLegendAsync().then((h) => { const el = document.getElementById(id); if (el) el.outerHTML = h; }).catch((e) => { const el = document.getElementById(id); if (el) el.innerHTML = esc(String(e)); });
  return `<li id="${id}" class="loading"><span class="spin"></span>${L("Se calculează…", "Calculating…", "Расчёт…")}</li>`;
}
function statsInfoRows(p) {
  if (p.st_green == null) return "";
  const nm = (d) => (d >= 1000 ? fmt(d / 1000, 1) + " km" : fmt(d) + " m");
  const cls = ST_CLN();
  return ["green", "transit", "air", "health", "school"].map((k) => { const v = p["st_" + k], c = ST_CLS.findIndex(([lo, hi]) => v >= lo && v < hi);
    return `<dt>${STK[k].ic} ${esc(STN(k))}</dt><dd><b class="stpill" style="background:${ST_CLS[c][2]}">${v}</b> ${cls[c]}${p["sn_" + k] != null ? `<small class="muted"> · ${L("cel mai aproape", "nearest", "ближайшее")} ~${nm(p["sn_" + k])}</small>` : ""}</dd>`; }).join("");
}
// panel controls
function statsPanel() {
  const opts = Object.keys(STK).map((k) => `<option value="${k}">${STK[k].ic} ${esc(STN(k))}</option>`).join("");
  const el = document.getElementById("stpanel"); if (!el) return;
  el.innerHTML = `<span class="lab">${L("Statistica", "Statistic", "Показатель")}</span>
    <div class="seg stlistsel">${Object.keys(STK).map((k) => `<label><input type="radio" name="stat" value="${k}" ${!S.stRatio && S.stat === k ? "checked" : ""}><b>${STK[k].ic} ${esc(STN(k))}</b></label>`).join("")}
    <label class="stratio"><input type="radio" name="stat" value="__ratio" ${S.stRatio ? "checked" : ""}><b>➗ ${L("Raportează două statistici", "Ratio of two statistics", "Соотношение двух показателей")}</b></label></div>
    <div class="strat" ${S.stRatio ? "" : "hidden"}><select id="stA" aria-label="A">${opts}</select><span>÷</span><select id="stB" aria-label="B">${opts}</select><button type="button" class="btn ghost sm" id="stswap" title="${L("Inversează", "Swap", "Поменять")}">⇄</button></div>
    <span class="lab">${t("popview")}</span>
    <div class="seg row3">${[["units", t("pv_units")], ["heat", t("pv_heat")], ["hills", t("pv_hills")]].map(([v, l]) => `<label><input type="radio" name="stview" value="${v}" ${S.stView === v ? "checked" : ""}><b>${l}</b></label>`).join("")}</div>`;
  el.querySelector("#stA").value = S.stA; el.querySelector("#stB").value = S.stB;
}
function statsSave() { for (const k of ["stat", "stRatio", "stA", "stB", "stView"]) store.set(k, S[k]); }
document.addEventListener("change", (e) => {
  const tg = e.target; if (!tg.closest?.("#stpanel")) return;
  if (tg.name === "stat") { if (tg.value === "__ratio") S.stRatio = true; else { S.stRatio = false; S.stat = tg.value; } }
  if (tg.name === "stview") S.stView = tg.value;
  if (tg.id === "stA") S.stA = tg.value;
  if (tg.id === "stB") S.stB = tg.value;
  if (S.stRatio && S.stA === S.stB) { S.stB = S.stA === "pop" ? "green" : "pop"; }
  statsSave(); statsPanel(); render().then(() => document.getElementById("legend")?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
});
document.addEventListener("click", (e) => {
  if (e.target.closest?.("#stswap")) { [S.stA, S.stB] = [S.stB, S.stA]; statsSave(); statsPanel(); render(); return; }
  const u = e.target.closest?.("[data-stunit]"); if (!u) return;
  adminFC().then((a) => { const f = a.features.find((x) => String(x.properties.id) === u.dataset.stunit); if (!f) return;
    const b = new maplibregl.LngLatBounds(); (function walk(c) { typeof c[0] === "number" ? b.extend(c) : c.forEach(walk); })(f.geometry.coordinates);
    map.fitBounds(b, { padding: 80, maxZoom: 14 }); map.setFilter("admin-sel", ["==", ["get", "id"], f.properties.id]); select({ kind: "admin", props: f.properties, geom: f.geometry }); });
});
