// ================================================================== ALL IN CHIȘINĂU — app shell (prototype / mock-up)
// Sections: Atlas (the map), Proiecte & petiții, Transport public, Ghid turistic, Noutăți, Cont (mock role).
const SH = { sec: store.get("start", "home") || "home", role: store.get("role", "cit"), tickets: store.get("tickets", []), props: {}, sim: null };
const ROLES = { cit: ["Cetățean", "Citizen"], biz: ["Agent economic", "Business"], off: ["Funcționar primărie", "City-hall official"] };
const RL = (k) => ROLES[k][S.lang === "ro" ? 0 : 1];

function shGo(sec) {
  SH.sec = sec;
  document.querySelectorAll("#rail [data-sec]").forEach((b) => b.setAttribute("aria-current", b.dataset.sec === sec ? "page" : "false"));
  const page = document.getElementById("page");
  page.hidden = sec === "atlas"; document.body.dataset.sec = sec;
  if (sec !== "atlas") { page.scrollTop = 0; shRender(); }
}
async function shRender() {
  const el = document.getElementById("pagebody");
  const f = { home: shHome, projects: shProjects, transit: shTransit, guide: shGuide, news: shNews, settings: shSettings, archive: shArchive }[SH.sec];
  if (!f) return;
  if (SH.sec === "home" && !Object.keys(SH.props || {}).length) { try { await shProposals(); } catch {} }
  const sec = SH.sec, h = await f();
  if (SH.sec !== sec) return;
  el.innerHTML = h; shAfter();
}
const demo = () => `<span class="pill warn">${L("exemplu", "example")}</span>`;
const pageHead = (title, sub) => `<header class="phead"><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}<p class="small mock">${L("Machetă de prototip: datele introduse aici sunt de test, nu au efect real.", "Prototype mock-up: anything entered here is test data with no real effect.")}</p></header>`;

// ---------------------------------------------------------------- Proiecte & petiții
async function shProposals() {
  if (PJ.db) {
    try { const s = await PJ.db.collection("proposals").get(); const o = {}; s.docs.forEach((d) => (o[d.id] = { ...d.data(), id: d.id })); SH.props = o; return; } catch {}
  }
  SH.props = store.get("proposals", {});
}
async function shSaveProposal(p) {
  SH.props[p.id] = p;
  if (PJ.db) { try { const b = { ...p }; delete b.id; await PJ.db.collection("proposals").doc(p.id).set(b); return; } catch {} }
  store.set("proposals", SH.props);
}
const DEMO_EXEC = [
  { t: ["Reabilitarea unei străzi din Botanica", "Rehabilitation of a street in Botanica"], who: "SRL Exemplu Drum", pct: 60, cost: 1.2 },
  { t: ["Grădiniță nouă în Durlești", "New kindergarten in Durlești"], who: "SA Exemplu Construct", pct: 35, cost: 2.1 },
  { t: ["Iluminat public LED, Ciocana", "LED street lighting, Ciocana"], who: "SRL Exemplu Lumină", pct: 85, cost: 0.4 },
];
async function shProjects() {
  await shProposals();
  const list = Object.values(SH.props).sort((a, b) => (b.t || "").localeCompare(a.t || ""));
  const card = (p) => {
    const st = { new: L("în așteptare", "pending"), ok: L("aprobat", "approved"), no: L("respins", "rejected"), run: L("în execuție", "in progress") }[p.status || "new"];
    let act = "";
    if (SH.role === "cit" && p.type === "petition" && p.status !== "no") act += `<button class="btn ghost sm" data-sign="${p.id}">${L("Semnează", "Sign")} (${p.sig || 0})</button>`;
    if (SH.role === "off" && (p.status || "new") === "new") act += `<button class="btn sm" data-approve="${p.id}">${L("Aprobă", "Approve")}</button><button class="btn ghost sm" data-reject="${p.id}">${L("Respinge", "Reject")}</button>`;
    if (SH.role === "biz" && p.status === "ok") act += `<button class="btn sm" data-offer="${p.id}">${L("Oferă servicii", "Offer services")}</button>`;
    if (SH.role === "off" && p.status === "ok" && (p.offers || []).length) act += (p.offers || []).map((o, i) => `<button class="btn ghost sm" data-pick="${p.id}" data-i="${i}">${L("Alege", "Pick")}: ${esc(o.firm)} · ${fmt(o.price)} €</button>`).join("");
    return `<li class="pcard"><div class="pc1"><span class="pill ${p.status === "ok" || p.status === "run" ? "good" : p.status === "no" ? "warn" : ""}">${st}</span><span class="small">${p.type === "petition" ? L("Petiție", "Petition") : L("Propunere de proiect", "Project proposal")} · ${RL(p.role || "cit")}</span></div>
      <b>${esc(p.title)}</b><p class="small">${esc(p.desc || "")}</p>${p.contractor ? `<p class="small">${L("Executant", "Contractor")}: <b>${esc(p.contractor)}</b></p>` : ""}
      ${(p.offers || []).length && !p.contractor ? `<p class="small">${(p.offers || []).length} ${L("oferte de la firme", "offers from firms")}</p>` : ""}<div class="btnrow">${act}</div></li>`;
  };
  return pageHead(L("Proiecte și petiții", "Projects & petitions"), L(`Rol curent: <b>${RL(SH.role)}</b> (schimbă-l din „Cont”). Cetățenii propun și semnează, primăria aprobă și alege executantul, firmele oferă servicii.`, `Current role: <b>${RL(SH.role)}</b> (change it under “Account”). Citizens propose and sign, the city hall approves and picks contractors, firms make offers.`))
    + `<section class="pgrid"><div><h3>${L("Propune", "Propose")}</h3>
      <div class="pform"><select id="pr-type"><option value="project">${L("Propunere de proiect", "Project proposal")}</option><option value="petition">${L("Petiție", "Petition")}</option></select>
      <input id="pr-title" class="pjin" maxlength="120" placeholder="${L("Titlu", "Title")}"><textarea id="pr-desc" class="pjin" rows="3" maxlength="800" placeholder="${L("Descriere", "Description")}"></textarea>
      <button class="btn" id="pr-send">${L("Trimite", "Submit")}</button></div>
      <h3>${L("Propuneri și petiții", "Proposals and petitions")} (${list.length})</h3>
      ${list.length ? `<ul class="plist">${list.map(card).join("")}</ul>` : `<p class="hint">${L("Încă nimic. Trimite prima propunere.", "Nothing yet. Submit the first one.")}</p>`}</div>
      <div><h3>${L("Proiecte în execuție", "Projects in progress")}</h3><ul class="plist">${DEMO_EXEC.map((d) => `<li class="pcard"><div class="pc1">${demo()}<span class="small">${L("Executant", "Contractor")}: ${d.who}</span></div><b>${d.t[S.lang === "ro" ? 0 : 1]}</b>
        <div class="bar"><i style="width:${d.pct}%"></i></div><p class="small">${d.pct}% · ${fmt(d.cost, 1)} mil. €</p></li>`).join("")}</ul>
      <h3>${L("Proiecte de planificare din atlas", "Planning projects in the atlas")}</h3>
      <ul class="plist">${Object.values(PJ.list).map((p) => `<li class="pcard"><b>${esc(p.name)}</b><p class="small">${(p.log || []).length} ${L("modificări", "changes")} · ${(p.roads || []).length} ${L("drumuri", "roads")} · ${(p.nbs || []).length} ${L("cartiere", "districts")}</p><button class="btn ghost sm" data-openproj="${p.id}">${L("Deschide în atlas", "Open in the atlas")}</button></li>`).join("") || `<p class="hint">${L("Niciun proiect.", "No projects.")}</p>`}</ul></div></section>`;
}

// ---------------------------------------------------------------- Transport public
async function shTransit() {
  const routes = await load("routes.json");
  const seen = new Set(), rs = routes.filter((r) => r.mode !== "train" && !seen.has(r.key) && seen.add(r.key));
  const admin = await load("admin.geojson");
  const locs = [...new Set(admin.features.filter((f) => f.properties.lvl === 2 || f.properties.lvl === "ctx").map((f) => nameOf(f.properties).replace(/^Chișinău – (sectorul )?/, "Chișinău – ")))].sort((a, b) => a.localeCompare(b, "ro"));
  const tk = SH.tickets.filter((x) => Date.now() < x.until).slice(-4).reverse();
  return pageHead(L("Transport public", "Public transport"), L("Bilete urbane și interurbane și urmărirea vehiculelor (simulare).", "Urban and intercity tickets and vehicle tracking (simulation)."))
    + `<section class="pgrid"><div><h3>${L("Planifică o călătorie și cumpără biletul", "Plan a trip and buy the ticket")}</h3>${await journeyHtml()}
      <h3>${L("Bilet simplu sau abonament", "Single ticket or pass")}</h3><div class="pform">
      <select id="tk-route">${rs.map((r) => `<option value="${esc(r.key)}">${t(r.mode)} ${esc(r.ref)}${r.from && r.to ? " · " + esc(r.from) + " – " + esc(r.to) : ""}</option>`).join("")}</select>
      <label class="pjrow"><span>${L("Tip", "Type")}</span><select id="tk-kind"><option value="1">${L("O călătorie · 6 lei", "Single trip · 6 lei")}</option><option value="30">${L("Abonament lunar · 300 lei", "Monthly pass · 300 lei")}</option></select></label>
      <button class="btn" id="tk-buy">${L("Cumpără (demonstrație)", "Buy (demo)")}</button></div></div>
      <div><h3>${L("Biletele mele", "My tickets")}</h3>${tk.length ? tk.map((x) => `<div class="ticket"><canvas data-qr="${x.code}" width="84" height="84"></canvas><div><b>${esc(x.what)}</b><p class="small">${L("Valabil până la", "Valid until")} ${new Date(x.until).toLocaleString(loc(), { dateStyle: "short", timeStyle: "short" })}</p><p class="small">${L("Cod", "Code")}: ${x.code} · ${x.price} lei</p>${demo()}</div></div>`).join("") : `<p class="hint">${L("Niciun bilet activ.", "No active tickets.")}</p>`}
      <h3>${L("Vehicule pe hartă", "Vehicles on the map")}</h3><p class="small">${L("Pozițiile sunt simulate de-a lungul rutelor reale; în aplicația reală ar veni de la GPS-ul vehiculelor.", "Positions are simulated along the real routes; in the real app they would come from the vehicles' GPS.")}</p>
      <button class="btn" id="sim-go">${L("Arată vehiculele (simulare)", "Show vehicles (simulation)")}</button></div></section>`;
}
function qr(cv, code) {
  const g = cv.getContext("2d"), n = 21, s = cv.width / n; let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = "#111";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const fin = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    const on = fin ? (x % 6 === 0 || y % 6 === 0 || (x % 7 > 1 && x % 7 < 5 && y % 7 > 1 && y % 7 < 5)) : (h >> 16) & 1;
    if (on) g.fillRect(x * s, y * s, s, s);
  }
}
function buyTicket(what, price, minutes) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  SH.tickets = [...SH.tickets.filter((x) => Date.now() < x.until), { what, price, code, until: Date.now() + minutes * 60000 }];
  store.set("tickets", SH.tickets); shRender();
}
async function simVehicles(on) {
  if (!on) { cancelAnimationFrame(SH.sim?.raf); SH.sim = null; map.getSource("vehsim")?.setData({ type: "FeatureCollection", features: [] }); return; }
  const lines = (await load("transit_lines.geojson")).features.filter((f) => f.geometry.type === "LineString" && lineLen(f.geometry.coordinates) > 0.4);
  const P = pal(), pick = [];
  for (let i = 0; i < 160 && lines.length; i++) pick.push(lines[(i * 7919) % lines.length]);
  if (!map.getSource("vehsim")) {
    map.addSource("vehsim", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "vehsim", type: "circle", source: "vehsim", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 15, 7],
      "circle-color": ["match", ["get", "m"], "trolleybus", P.mode.trolleybus, "minibus", P.mode.minibus, P.mode.bus], "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });
  }
  const veh = pick.map((f, i) => ({ c: f.geometry.coordinates, m: f.properties.m[0], r: f.properties.r[0], len: lineLen(f.geometry.coordinates), s: (i * 0.37) % 1, v: 0.00004 + (i % 5) * 0.00001 }));
  const at = (c, d) => { let acc = 0; for (let i = 1; i < c.length; i++) { const l = hav(c[i - 1], c[i]); if (acc + l >= d) { const k = (d - acc) / l; return [c[i - 1][0] + (c[i][0] - c[i - 1][0]) * k, c[i - 1][1] + (c[i][1] - c[i - 1][1]) * k]; } acc += l; } return c[c.length - 1]; };
  let last = 0;
  const step = (ts) => {
    if (ts - last > 120) {
      last = ts;
      veh.forEach((v) => { v.s = (v.s + v.v * 2) % 2; });
      map.getSource("vehsim").setData({ type: "FeatureCollection", features: veh.map((v) => ({ type: "Feature", properties: { m: v.m, r: v.r },
        geometry: { type: "Point", coordinates: at(v.c, (v.s < 1 ? v.s : 2 - v.s) * v.len) } })) });
    }
    SH.sim.raf = requestAnimationFrame(step);
  };
  SH.sim = { raf: requestAnimationFrame(step) };
}

// ---------------------------------------------------------------- Noutăți (from the public sources used in the atlas)
function shNewsItems() {
  return [
    ["2026-11-17", L("Cursul oficial BNM: 1 € = 20,17 lei", "Official NBM rate: 1 € = 20.17 lei"), L("Folosit pentru conversiile din atlas.", "Used for the atlas's conversions."), "https://www.bnm.md"],
    ["2026-09-01", L("Salariul mediu brut în Chișinău: 19.834 lei (semestrul I 2026)", "Average gross wage in Chișinău: 19,834 lei (H1 2026)"), L("Cu 17% peste media națională.", "17% above the national average."), "https://bani.md/salariul-mediu-in-chisinau-a-sarit-de-19-mii-de-lei-cu-173-peste-media-pe-tara/"],
    ["2026-08-31", L("S-a încheiat etapa de amalgamare voluntară", "Voluntary amalgamation stage ended"), L("Bubuieci, Budești și Ciorescu se extind cu localități din Anenii Noi și Criuleni.", "Bubuieci, Budești and Ciorescu grow with villages from Anenii Noi and Criuleni."), "https://alegeri.md/w/Unit%C4%83%C8%9Bile_administrativ-teritoriale_aflate_%C3%AEn_proces_de_amalgamare_voluntar%C4%83"],
    ["2026-07-13", L("CMC a aprobat bugetul municipal pe 2026", "Council adopted the 2026 municipal budget"), L("Venituri 9,6 mld lei, cheltuieli 10,8 mld lei.", "Revenue 9.6 bn lei, expenditure 10.8 bn lei."), "https://www.moldpres.md/rom/economie/bugetul-municipiului-chisinau-pentru-anul-2026-votat-de-cmc"],
    ["2025-05-06", L("Moldova: IDU 0,785, locul 86 din 193", "Moldova: HDI 0.785, rank 86 of 193"), L("Raportul PNUD privind dezvoltarea umană 2025.", "UNDP Human Development Report 2025."), "https://www.undp.org/moldova/press-releases/age-ai-moldova-faces-key-choices-ensure-human-development-progress-says-new-undp-report"],
  ].filter((n) => n[0] <= S.date);
}
function shNews() {
  const N = shNewsItems();
  return pageHead(L("Noutăți", "News"), L("Știri din sursele publice folosite în aplicație.", "News from the public sources used in the app."))
    + `<ul class="plist news">${N.map((n) => `<li class="pcard"><span class="small">${fmtDate(n[0])}</span><b>${n[1]}</b><p class="small">${n[2]}</p><a href="${n[3]}" target="_blank" rel="noopener" class="small">${L("Sursa", "Source")}</a></li>`).join("")}</ul>`;
}

// ---------------------------------------------------------------- events
function shAfter() {
  guideMap(); homeMap();
  document.querySelectorAll("#pagebody canvas[data-qr]").forEach((c) => qr(c, c.dataset.qr));
  const tp = document.getElementById("ti-price");
  if (tp) {
    const upd = async () => {
      const admin = await adminFC(), find = (n) => admin.features.find((f) => nameOf(f.properties).replace(/^Chișinău – (sectorul )?/, "Chișinău – ") === n);
      const a = find(document.getElementById("ti-a").value), b = find(document.getElementById("ti-b").value);
      const km = a && b ? hav([a.properties.lx, a.properties.ly], [b.properties.lx, b.properties.ly]) * 1.3 : 0;
      SH.ti = { km, price: Math.max(6, Math.round(km * 0.9)) };
      tp.textContent = `≈ ${fmt(km, 1)} km · ${SH.ti.price} lei`;
    };
    document.getElementById("ti-a").addEventListener("change", upd); document.getElementById("ti-b").addEventListener("change", upd); upd();
  }
}
function shBind() {
  const $ = (id) => document.getElementById(id);
  document.querySelectorAll("#rail [data-sec]").forEach((b) => b.addEventListener("click", () => shGo(b.dataset.sec)));
  applyStoredTheme(); chatBind(); loginBind(); topbarBind();
  shGo(SH.sec);
  $("page").addEventListener("change", (e) => { if (guideChange(e) || settingsChange(e)) return; if (e.target.name === "role") { SH.role = e.target.value; store.set("role", SH.role); } });
  $("page").addEventListener("submit", (e) => {
    const f = e.target.closest("[data-hsearch]"); if (!f) return; e.preventDefault();
    const q = f.querySelector("input").value;
    SH.q = q; if (SH.sec !== "archive") shGo("archive"); else shRender();
  });
  $("page").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const ds = b.dataset;
    if (SH.sec === "guide" && guideBind(e)) return;
    if (SH.sec === "settings" && settingsClick(b)) return;
    if (SH.sec === "transit" && journeyClick(b)) return;
    if (ds.go) { const [sec, md] = ds.go.split(":"); shGo(sec); if (md) { S.mode = md; render(); } return; }
    if (ds.ask) { ask(ds.ask); return; }
    if (b.id === "md-add") { addMyDoc(); return; }
    if (ds.deldoc) { store.set("mydocs", myDocs().filter((d) => d.id !== ds.deldoc)); shRender(); return; }
    if (b.id === "pr-send") {
      const title = $("pr-title").value.trim(); if (!title) { $("pr-title").focus(); return; }
      const id = "x" + Date.now().toString(36);
      await shSaveProposal({ id, type: $("pr-type").value, title, desc: $("pr-desc").value.trim(), role: SH.role, status: "new", sig: 0, offers: [], t: new Date().toISOString() });
      shRender();
    } else if (ds.sign) { const p = SH.props[ds.sign]; await shSaveProposal({ ...p, sig: (p.sig || 0) + 1 }); shRender(); }
    else if (ds.approve) { await shSaveProposal({ ...SH.props[ds.approve], status: "ok" }); shRender(); }
    else if (ds.reject) { await shSaveProposal({ ...SH.props[ds.reject], status: "no" }); shRender(); }
    else if (ds.offer) { const p = SH.props[ds.offer]; const price = Math.round((50 + Math.random() * 450) * 1000); await shSaveProposal({ ...p, offers: [...(p.offers || []), { firm: L("Firma ta (exemplu)", "Your firm (example)"), price }] }); shRender(); }
    else if (ds.pick) { const p = SH.props[ds.pick]; await shSaveProposal({ ...p, status: "run", contractor: p.offers[+ds.i].firm }); shRender(); }
    else if (ds.openproj) { shGo("atlas"); pjOpen(ds.openproj); }
    else if (b.id === "tk-buy") { const r = $("tk-route"), k = +$("tk-kind").value; buyTicket(r.options[r.selectedIndex].text.split(" · ")[0], k === 1 ? 6 : 300, k === 1 ? 90 : 30 * 1440); }
    else if (b.id === "ti-buy") { buyTicket(`${$("ti-a").value} → ${$("ti-b").value}`, SH.ti?.price || 6, 24 * 60); }
    else if (b.id === "sim-go") { shGo("atlas"); S.mode = "transit"; await render(); simVehicles(true); }
    else if (ds.fly) { const [x, y] = ds.fly.split(",").map(Number); shGo("atlas"); map.flyTo({ center: [x, y], zoom: +ds.z || 16.5 }); popup({ lng: x, lat: y }, `<b>${esc(b.textContent)}</b>`); }
  });
}
