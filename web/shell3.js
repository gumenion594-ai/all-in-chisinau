// ================================================================== ALL IN CHIȘINĂU — participation: proposals (support / oppose), reports, my neighbourhood (prototype)
const VID = (() => { let v = store.get("vid", null); if (!v) { v = "v" + Math.random().toString(36).slice(2, 10); store.set("vid", v); } return v; })();
const PCAT = { roads: ["Drumuri și trotuare", "Roads & sidewalks"], green: ["Parcuri și spații verzi", "Parks & green space"], transport: ["Transport public", "Public transport"],
  edu: ["Școli și grădinițe", "Schools & kindergartens"], social: ["Social și sănătate", "Social & health"], culture: ["Cultură și sport", "Culture & sport"],
  clean: ["Curățenie și deșeuri", "Cleaning & waste"], safety: ["Siguranță și iluminat", "Safety & lighting"], other: ["Altele", "Other"] };
const OBJ = { cost: ["Costă prea mult", "Too expensive"], env: ["Afectează mediul / spațiile verzi", "Harms the environment / green space"], traffic: ["Trafic sau parcare", "Traffic or parking"],
  place: ["Alt amplasament ar fi mai bun", "A different location would be better"], prio: ["Nu e o prioritate acum", "Not a priority now"], noise: ["Zgomot / disconfort pentru vecini", "Noise / nuisance for neighbours"], other: ["Alt motiv", "Other reason"] };
const RCAT = { pothole: ["Groapă în drum", "Pothole"], light: ["Iluminat stradal defect", "Broken street light"], trash: ["Gunoi / pubele pline", "Rubbish / full bins"], tree: ["Copac căzut sau periculos", "Fallen or dangerous tree"],
  water: ["Apă sau canalizare", "Water or sewer"], transit: ["Stație sau transport public", "Stop or public transport"], sidewalk: ["Trotuar deteriorat", "Damaged sidewalk"], other: ["Altceva", "Something else"] };
const RTO = { pothole: "Î.M. Exdrupo", sidewalk: "Î.M. Exdrupo", light: "Î.M. Lumteh", trash: "Î.M. Regia Autosalubritate", tree: "Î.M. Asociația Spații Verzi", water: "S.A. Apă-Canal Chișinău", transit: "Direcția transport public", other: "Primăria – registratura" };
const PETITION_GOAL = 1000;
const MODR = { joke: ["Nu este serioasă", "Not serious"], abuse: ["Limbaj jignitor sau discriminatoriu", "Offensive or discriminatory language"], spam: ["Spam sau reclamă", "Spam or advertising"],
  dup: ["Duplicat al altei propuneri", "Duplicate of another proposal"], scope: ["Nu ține de competența primăriei", "Not within the city hall's remit"], personal: ["Conține date personale", "Contains personal data"], other: ["Nu respectă regulile", "Breaks the rules"] };
const isOff = () => SH.role === "off" || SH.role === "adm";
const isMod = () => SH.role === "adm";
// civic points (prototype: kept in this browser)
const REWARDS = [
  { k: "ride", pts: 20, t: ["Bilet de transport la jumătate de preț", "Half-price transport ticket"], d: ["Se aplică automat la următorul bilet cumpărat.", "Applied automatically to your next ticket."] },
  { k: "museum", pts: 40, t: ["Intrare gratuită la un muzeu municipal", "Free entry to a municipal museum"], d: ["Cod valabil 30 de zile.", "Code valid for 30 days."] },
  { k: "parking", pts: 30, t: ["2 ore de parcare municipală gratuită", "2 hours of free municipal parking"], d: ["Cod valabil 30 de zile.", "Code valid for 30 days."] },
  { k: "theatre", pts: 60, t: ["Reducere de 20% la un teatru municipal", "20% off at a municipal theatre"], d: ["Cod valabil 60 de zile.", "Code valid for 60 days."] },
  { k: "pass", pts: 120, t: ["Reducere de 10% la abonamentul lunar", "10% off the monthly pass"], d: ["Se aplică la următorul abonament.", "Applied to your next monthly pass."] },
  { k: "tree", pts: 80, t: ["Un copac plantat în numele tău în cartier", "A tree planted in your name in your area"], d: ["Primăria îți trimite locul pe hartă.", "The city hall sends you its spot on the map."] },
];
const PTS = { vote: 1, propose: 10, report: 5, oppose: 2, plus: 1 };
const civic = () => store.get("civic", { pts: 0, earned: 0, log: [], codes: [], day: "", votes: 0 });
function award(kind, what) {
  const c = civic(), today = todayISO();
  if (c.day !== today) { c.day = today; c.votes = 0; }
  if ((kind === "vote" || kind === "oppose" || kind === "plus") && ++c.votes > 15) { store.set("civic", c); return; }   // daily cap on quick actions
  c.pts += PTS[kind]; c.earned += PTS[kind]; c.log = [{ t: new Date().toISOString(), k: kind, n: PTS[kind], what: String(what || "").slice(0, 80) }, ...c.log].slice(0, 40);
  store.set("civic", c); toast(`+${PTS[kind]} ${L("puncte civice", "civic points")}`);
}
const LEVELS = [[0, ["Începător", "Newcomer"]], [30, ["Vecin implicat", "Engaged neighbour"]], [100, ["Cetățean activ", "Active citizen"]], [250, ["Ambasador al cartierului", "Neighbourhood ambassador"]]];
const levelOf = (e) => LEVELS.filter(([n]) => e >= n).at(-1);
function toast(msg) {
  let el = document.getElementById("toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = msg; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2200);
}
const tr2 = (v) => L(v[0], v[1]);
const follows = () => store.get("follows", []);
const nearKm = (c, km = 2) => { const h = myHome(); return !!(h && c && hav(h.c, c) <= km); };

// ---------------------------------------------------------------- votes
const tally = (p) => { let y = 0, n = 0; for (const v of Object.values(p.votes || {})) v > 0 ? y++ : n++; return { y: y + (p.sig || 0), n }; };
async function vote(id, val, reason, txt) {
  const p = SH.props[id], votes = { ...(p.votes || {}) }, mine = votes[VID];
  let objs = (p.objs || []).filter((o) => o.v !== VID);
  if (mine === val && !reason) delete votes[VID]; else { votes[VID] = val; if (!mine) award(val > 0 ? "vote" : "oppose", p.title); }
  if (val < 0 && reason) objs = [...objs, { v: VID, r: reason, txt: (txt || "").slice(0, 300), t: new Date().toISOString() }];
  await shSaveProposal({ ...p, votes, objs });
}
function objSummary(p) {
  const c = {}; for (const o of p.objs || []) c[o.r] = (c[o.r] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

// ---------------------------------------------------------------- proposals page
async function shProjects() {
  await shProposals();
  const F = (SH.pf ||= { tab: "run", show: "all", sort: "new", cat: "", q: "" });
  if (F.tab === "props" && F.show === "near" && false) F.show = "all";
  const all = Object.values(SH.props), live = all.filter((p) => p.status !== "removed");
  const flagged = all.filter((p) => p.status !== "removed" && (p.flags || []).length).length + Object.values(SH.reps || {}).filter((r) => r.st !== "removed" && (r.flags || []).length).length;
  const c = civic(), lv = levelOf(c.earned);
  const tabs = [["run", L("Proiecte în execuție", "Projects in progress"), live.filter((p) => p.status === "run").length], ["props", L("Proiecte propuse", "Proposed projects"), live.filter((p) => p.type !== "petition" && p.status !== "run").length],
    ["pet", L("Petiții", "Petitions"), live.filter((p) => p.type === "petition").length], ["reports", L("Sesizări", "Reports"), null], ["rewards", L("Puncte și reduceri", "Points & rewards"), null]];
  if (isMod()) tabs.push(["mod", L("Moderare", "Moderation"), flagged || null]);
  let h = pageHead(L("Proiecte și petiții", "Projects & petitions"), L(`Rol curent: <b>${RL(SH.role)}</b>. Cetățenii propun, susțin sau contestă și semnalează probleme; primăria răspunde, aprobă și alege executantul; firmele fac oferte.`, `Current role: <b>${RL(SH.role)}</b>. Citizens propose, support or oppose and report problems; the city hall answers, approves and picks contractors; firms make offers.`))
    + `<div class="civicbar"><span>⭐ <b>${fmt(c.pts)}</b> ${L("puncte civice", "civic points")} · ${esc(tr2(lv[1]))}</span><button type="button" class="linkbtn small" data-ptab="rewards">${L("Ce pot primi?", "What can I get?")}</button></div>`
    + `<nav class="ptabs" role="tablist">${tabs.map(([k, v, n]) => `<button type="button" role="tab" data-ptab="${k}" aria-selected="${F.tab === k}">${v}${n ? ` <span class="tcount">${n}</span>` : ""}</button>`).join("")}</nav>`;
  if (F.tab === "reports") return h + (await reportsHtml());
  if (F.tab === "rewards") return h + rewardsHtml();
  if (F.tab === "mod" && isMod()) return h + (await modHtml());
  let list = live.filter((p) => (F.tab === "run" ? p.status === "run" : F.tab === "pet" ? p.type === "petition" : p.type !== "petition" && p.status !== "run"));
  const total = list.length;
  if (F.show === "near") list = list.filter((p) => nearKm(p.loc?.c));
  if (F.show === "follow") list = list.filter((p) => follows().includes(p.id));
  if (F.show === "mine") list = list.filter((p) => p.author === VID || p.votes?.[VID]);
  if (F.cat) list = list.filter((p) => p.cat === F.cat);
  if (F.q) { const q = deacc(F.q); list = list.filter((p) => deacc(p.title + " " + (p.desc || "")).includes(q)); }
  const sk = { new: (p) => -Date.parse(p.t || 0), top: (p) => -tally(p).y, contested: (p) => -tally(p).n }[F.sort];
  list.sort((a, b) => sk(a) - sk(b));
  const mineRemoved = F.show === "mine" ? all.filter((p) => p.status === "removed" && p.author === VID) : [];
  h += `<section class="pgrid wide"><div>
    <div class="pfilter">
      <div class="chips">${[["all", L("Toate", "All")], ["near", L("Lângă mine", "Near me")], ["follow", L("Urmărite", "Following")], ["mine", L("Ale mele", "Mine")]].map(([k, v]) => `<button type="button" class="chipck ${F.show === k ? "on" : ""}" data-pshow="${k}">${v}</button>`).join("")}</div>
      <div class="frow"><input type="text" id="pf-q" class="pjin" value="${esc(F.q)}" placeholder="${L("Filtrează după cuvânt", "Filter by word")}">
      <select id="pf-cat"><option value="">${L("Toate categoriile", "All categories")}</option>${Object.entries(PCAT).map(([k, v]) => `<option value="${k}" ${F.cat === k ? "selected" : ""}>${esc(tr2(v))}</option>`).join("")}</select>
      <select id="pf-sort">${[["new", L("Cele mai noi", "Newest")], ["top", L("Cele mai susținute", "Most supported")], ["contested", L("Cele mai contestate", "Most opposed")]].map(([k, v]) => `<option value="${k}" ${F.sort === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      ${F.show === "near" && !myHome() ? `<p class="small warn">${L("Permite accesul la locație (butonul 📍 de pe pagina principală) ca să vezi ce e lângă tine.", "Allow location access (the 📍 button on Home) to see what is near you.")}</p>` : ""}
    </div>
    <h3>${list.length} ${L("din", "of")} ${total}</h3>
    ${list.length ? `<ul class="plist">${list.map(propCard).join("")}</ul>` : `<p class="hint">${total ? L("Nimic pentru acest filtru.", "Nothing for this filter.") : F.tab === "run" ? L("Niciun proiect în execuție.", "No projects in progress.") : L("Încă nimic. Trimite prima propunere.", "Nothing yet. Submit the first one.")}</p>`}
    ${mineRemoved.map((p) => `<div class="pcard removed"><b>${esc(p.title)}</b><p class="small">${L("Eliminată de moderator", "Removed by a moderator")}: ${esc(tr2(MODR[p.removed?.r] || MODR.other))}</p></div>`).join("")}
  </div><div>${isOff() ? officeSummary() : ""}${F.tab === "run" ? runSide() : `<h3>${F.tab === "pet" ? L("Pornește o petiție", "Start a petition") : L("Propune un proiect", "Propose a project")}</h3>${await proposalForm(F.tab === "pet" ? "petition" : "project")}
    <p class="small">${L("Propunerile sunt verificate de moderatori. Cele care nu sunt serioase, sunt jignitoare, conțin reclame sau date personale ori nu țin de primărie se elimină.", "Moderators check proposals. Those that are not serious, offensive, advertising, contain personal data or are outside the city hall's remit are removed.")}</p>`}</div></section>`;
  return h;
}
function runSide() {
  return `<h3>${L("Proiecte de planificare din atlas", "Planning projects in the atlas")}</h3>
    <ul class="plist">${Object.values(PJ.list).map((p) => `<li class="pcard"><b>${esc(p.name)}</b><p class="small">${(p.log || []).length} ${L("modificări", "changes")} · ${(p.roads || []).length} ${L("drumuri", "roads")} · ${(p.nbs || []).length} ${L("cartiere", "districts")}</p><button class="btn ghost sm" data-openproj="${p.id}">${L("Deschide în atlas", "Open in the atlas")}</button></li>`).join("") || `<p class="hint">${L("Niciun proiect.", "No projects.")}</p>`}</ul>
    <p class="small">${L("Votul tău la proiectele în execuție ajunge la primărie ca evaluare a lucrării (calitate, termene, deranj).", "Your vote on projects in progress reaches the city hall as feedback on the works (quality, deadlines, disruption).")}</p>`;
}
const STEPS = [["Propus", "Proposed"], ["Aprobat", "Approved"], ["Licitație", "Tender"], ["Execuție", "Works"], ["Recepție", "Handover"]];
function timeline(p) {
  const at = p.status === "run" ? (p.pct >= 100 ? 4 : 3) : p.status === "ok" ? ((p.offers || []).length ? 2 : 1) : 0;
  return `<ol class="tline">${STEPS.map((x, i) => `<li class="${i < at ? "done" : i === at ? "now" : ""}">${esc(tr2(x))}</li>`).join("")}</ol>`;
}
function propCard(p) {
  const st = { new: L("în așteptare", "pending"), ok: L("aprobat", "approved"), no: L("respins", "rejected"), run: L("în execuție", "in progress") }[p.status || "new"];
  const t = tally(p), mine = p.votes?.[VID] || 0, pct = t.y + t.n ? Math.round((t.y / (t.y + t.n)) * 100) : 0, fol = follows().includes(p.id);
  const canVote = !isOff() && p.status !== "no";
  const os = objSummary(p);
  let act = "";
  if (isOff() && (p.status || "new") === "new") act += `<button class="btn sm" data-approve="${p.id}">${L("Aprobă", "Approve")}</button><button class="btn ghost sm" data-reject="${p.id}">${L("Respinge", "Reject")}</button>`;
  if (SH.role === "biz" && p.status === "ok") act += `<button class="btn sm" data-offer="${p.id}">${L("Oferă servicii", "Offer services")}</button>`;
  if (isOff() && p.status === "ok" && (p.offers || []).length) act += (p.offers || []).map((o, i) => `<button class="btn ghost sm" data-pick="${p.id}" data-i="${i}">${L("Alege", "Pick")}: ${esc(o.firm)} · ${fmt(o.price)} €</button>`).join("");
  if (isMod() && p.status !== "run" && p.status !== "ok") act += `<button class="btn ghost sm danger" data-modopen="${p.id}">${L("Elimină", "Remove")}</button>`;
  const opening = SH.oppose === p.id, modding = SH.modp === p.id, flagged = (p.flags || []).includes(VID);
  return `<li class="pcard" id="p-${p.id}"><div class="pc1"><span class="pill ${p.status === "ok" || p.status === "run" ? "good" : p.status === "no" ? "warn" : ""}">${st}</span>
      <span class="small">${p.type === "petition" ? L("Petiție", "Petition") : L("Propunere", "Proposal")}${p.cat ? " · " + esc(tr2(PCAT[p.cat] || PCAT.other)) : ""}${p.loc?.label ? " · " + esc(p.loc.label) : ""}</span>
      <button type="button" class="follow ${fol ? "on" : ""}" data-follow="${p.id}" aria-pressed="${fol}" title="${fol ? L("Nu mai urmări", "Unfollow") : L("Urmărește", "Follow")}">${fol ? "★" : "☆"}</button></div>
    ${p.img || p.imgData ? `<img class="pimg" src="${p.img ? "/_blob/" + p.img : p.imgData}" alt="${esc(p.title)}" loading="lazy" onerror="this.remove()">` : ""}
    <b>${esc(p.title_ro ? L(p.title_ro, p.title_en || p.title_ro) : p.title)}${p.demo ? " " + demo() : ""}</b><p class="small">${esc(p.desc || "")}</p>
    ${p.status === "run" ? `${p.pct != null ? `<div class="bar"><i style="width:${p.pct}%"></i></div><p class="small">${p.pct}% ${L("realizat", "done")}${p.cost ? ` · ${fmt(p.cost, 1)} mil. €` : ""}${p.end ? ` · ${L("termen", "deadline")}: ${esc(p.end)}` : ""}</p>` : ""}` : ""}
    ${p.type !== "petition" ? timeline(p) : ""}
    ${(p.docs || []).length ? `<ul class="pdocs">${p.docs.map((d, i) => `<li>${d.id ? `<button type="button" class="linkbtn" data-doc="${p.id}" data-i="${i}">` : "<span>"}<i>${docIcon(d.type)}</i>${esc(d.name)}${d.id ? "</button>" : "</span>"}<span class="small"> · ${fsize(d.size)}</span></li>`).join("")}</ul>` : ""}
    <div class="vbar" title="${pct}%"><i style="width:${pct}%"></i></div>
    <div class="votes">
      <button type="button" class="vbtn yes ${mine > 0 ? "on" : ""}" data-vote="${p.id}" data-v="1" ${canVote ? "" : "disabled"} aria-pressed="${mine > 0}">👍 ${p.type === "petition" ? L("Semnez", "Sign") : p.status === "run" ? L("Îmi place", "Like") : L("Susțin", "Support")} <b>${fmt(t.y)}</b></button>
      <button type="button" class="vbtn no ${mine < 0 ? "on" : ""}" data-vote="${p.id}" data-v="-1" ${canVote ? "" : "disabled"} aria-pressed="${mine < 0}">👎 ${p.status === "run" ? L("Nu-mi place", "Dislike") : L("Nu susțin", "Oppose")} <b>${fmt(t.n)}</b></button>
      ${p.loc?.c ? `<button type="button" class="linkbtn small" data-fly="${p.loc.c.join(",")}">${L("pe hartă", "on the map")}</button>` : ""}
      ${!isOff() && p.author !== VID ? `<button type="button" class="flag ${flagged ? "on" : ""}" data-flag="${p.id}" title="${L("Semnalează moderatorului (nu e serioasă, e jignitoare…)", "Report to a moderator (not serious, offensive…)")}" aria-pressed="${flagged}">⚑ ${flagged ? L("Semnalată", "Reported") : L("Semnalează", "Report")}</button>` : ""}
    </div>
    ${modding ? modForm(p.id, "p") : ""}
    ${p.type === "petition" ? `<div class="small">${fmt(t.y)} / ${fmt(PETITION_GOAL)} ${L("semnături pentru răspuns obligatoriu de la primărie", "signatures for a mandatory reply from the city hall")}<div class="bar"><i style="width:${Math.min(100, (t.y / PETITION_GOAL) * 100)}%"></i></div></div>` : ""}
    ${opening ? `<div class="oppose"><b class="small">${L("De ce nu susții?", "Why do you oppose?")}</b><div class="chips">${Object.entries(OBJ).map(([k, v]) => `<label class="chipck"><input type="radio" name="obj" value="${k}"><span>${esc(tr2(v))}</span></label>`).join("")}</div>
      <textarea id="obj-txt" class="pjin" rows="2" maxlength="300" placeholder="${L("Explică pe scurt sau propune o alternativă (opțional)", "Explain briefly or suggest an alternative (optional)")}"></textarea>
      <div class="btnrow"><button type="button" class="btn sm" data-objsend="${p.id}">${L("Trimite", "Submit")}</button><button type="button" class="btn ghost sm" data-objcancel="1">${L("Renunță", "Cancel")}</button></div></div>` : ""}
    ${os.length ? `<p class="small objs">${L("Motive de dezacord", "Reasons for opposing")}: ${os.map(([k, n]) => `${esc(tr2(OBJ[k] || OBJ.other))} (${n})`).join(" · ")}</p>` : ""}
    ${(p.objs || []).filter((o) => o.txt).slice(-2).map((o) => `<blockquote class="small">„${esc(o.txt)}”</blockquote>`).join("")}
    ${p.reply ? `<div class="reply"><b class="small">${L("Răspunsul primăriei", "City hall reply")}</b><p class="small">${esc(p.reply)}</p></div>` : ""}
    ${isOff() ? `<div class="frow"><input type="text" class="pjin" id="rep-${p.id}" placeholder="${L("Răspuns public al primăriei", "Public reply from the city hall")}" value="${esc(p.reply || "")}"><button type="button" class="btn ghost sm" data-reply="${p.id}">${L("Publică", "Publish")}</button></div>` : ""}
    ${isMod() && (p.flags || []).length ? `<p class="small warn">⚑ ${(p.flags || []).length} ${L("semnalări de la utilizatori", "user reports")}</p>` : ""}
    ${p.contractor ? `<p class="small">${L("Executant", "Contractor")}: <b>${esc(p.contractor)}</b></p>` : ""}
    ${(p.offers || []).length && !p.contractor ? `<p class="small">${(p.offers || []).length} ${L("oferte de la firme", "offers from firms")}</p>` : ""}
    ${act ? `<div class="btnrow">${act}</div>` : ""}</li>`;
}
function officeSummary() {
  const ps = Object.values(SH.props), pend = ps.filter((p) => (p.status || "new") === "new");
  const top = [...ps].sort((a, b) => tally(b).n - tally(a).n).filter((p) => tally(p).n).slice(0, 3);
  return `<div class="pcard office"><b>${L("Pentru primărie", "For the city hall")}</b>
    <p class="small">${pend.length} ${L("propuneri așteaptă decizie", "proposals awaiting a decision")} · ${ps.filter((p) => p.type === "petition" && tally(p).y >= PETITION_GOAL && !p.reply).length} ${L("petiții cer răspuns", "petitions need a reply")}</p>
    ${top.length ? `<p class="small">${L("Cele mai contestate", "Most opposed")}: ${top.map((p) => `${esc(p.title)} (${tally(p).n})`).join(" · ")}</p>` : ""}</div>`;
}
async function proposalForm(type) {
  const h = myHome();
  return `<div class="pform"><input type="hidden" id="pr-type" value="${type}">
    <select id="pr-cat">${Object.entries(PCAT).map(([k, v]) => `<option value="${k}">${esc(tr2(v))}</option>`).join("")}</select>
    <input id="pr-title" class="pjin" maxlength="120" placeholder="${L("Titlu", "Title")}"><textarea id="pr-desc" class="pjin" rows="3" maxlength="800" placeholder="${L("Descriere", "Description")}"></textarea>
    <div class="upl"><span>${L("Unde? Apasă pe hartă (opțional)", "Where? Tap the map (optional)")}</span><div id="pr-map" class="pickmap"></div><span class="small" id="pr-where">${h ? L(`Implicit: ${esc(h.name)}`, `Default: ${esc(h.name)}`) : ""}</span></div>
    <label class="upl"><span>${L("Imagine reprezentativă", "Representative image")}</span><input type="file" id="pr-img" accept="image/png,image/jpeg,image/webp,image/gif"><img id="pr-prev" alt="" hidden></label>
    <label class="upl"><span>${L("Documente (PDF, imagini, text)", "Documents (PDF, images, text)")}</span><input type="file" id="pr-docs" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.md,.json"></label>
    <p class="small">${(await assetsNs()) ? L("Fișierele se păstrează împreună cu aplicația și le vede oricine deschide propunerea.", "Files are stored with the app and anyone who opens the proposal can see them.") : L("În această vizualizare încărcarea fișierelor nu e disponibilă: imaginea se păstrează micșorată, iar din documente doar numele.", "File upload is not available in this view: the image is kept at a smaller size and only document names are kept.")}</p>
    <p class="small warn" id="pr-msg" role="status"></p>
    <button class="btn" id="pr-send">${L("Trimite", "Submit")}</button></div>`;
}
function modForm(id, kind) {
  return `<div class="oppose"><b class="small">${L("Motivul eliminării (autorul îl vede)", "Reason for removal (the author sees it)")}</b><div class="chips">${Object.entries(MODR).map(([k, v], i) => `<label class="chipck"><input type="radio" name="modr" value="${k}" ${i === 0 ? "checked" : ""}><span>${esc(tr2(v))}</span></label>`).join("")}</div>
    <div class="btnrow"><button type="button" class="btn sm danger" data-modsend="${id}" data-kind="${kind}">${L("Elimină definitiv", "Remove for good")}</button><button type="button" class="btn ghost sm" data-modcancel="1">${L("Renunță", "Cancel")}</button></div></div>`;
}
async function modHtml() {
  if (!SH.reps) await reportsLoad();
  const ps = Object.values(SH.props).filter((p) => p.status !== "removed"), rs = Object.values(SH.reps || {}).filter((r) => r.st !== "removed");
  const fl = ps.filter((p) => (p.flags || []).length).sort((a, b) => b.flags.length - a.flags.length);
  const pend = ps.filter((p) => (p.status || "new") === "new" && !(p.flags || []).length);
  const flr = rs.filter((r) => (r.flags || []).length);
  const removed = Object.values(SH.props).filter((p) => p.status === "removed").concat(Object.values(SH.reps || {}).filter((r) => r.st === "removed"));
  return `<section class="pgrid wide"><div>
    <h3>${L("Semnalate de utilizatori", "Reported by users")} (${fl.length + flr.length})</h3>
    ${fl.length || flr.length ? `<ul class="plist">${fl.map(propCard).join("")}${flr.map((r) => `<li class="pcard"><b>${esc(tr2(RCAT[r.cat] || RCAT.other))}</b><p class="small">${esc(r.desc || "")}</p><p class="small warn">⚑ ${r.flags.length}</p>
      ${SH.modp === r.id ? modForm(r.id, "r") : `<div class="btnrow"><button class="btn ghost sm danger" data-modopen="${r.id}">${L("Elimină", "Remove")}</button><button class="btn ghost sm" data-unflag="${r.id}" data-kind="r">${L("E în regulă", "It's fine")}</button></div>`}</li>`).join("")}</ul>` : `<p class="hint">${L("Nimic semnalat.", "Nothing reported.")}</p>`}
    <h3>${L("Așteaptă verificare", "Awaiting review")} (${pend.length})</h3>
    ${pend.length ? `<ul class="plist">${pend.map(propCard).join("")}</ul>` : `<p class="hint">${L("Nimic de verificat.", "Nothing to review.")}</p>`}
  </div><div><div class="pcard office"><b>${L("Reguli pentru propuneri", "Rules for proposals")}</b><ul class="small">${Object.values(MODR).slice(0, 6).map((v) => `<li>${esc(tr2(v))} → ${L("se elimină", "removed")}</li>`).join("")}</ul></div>
    <h3>${L("Eliminate", "Removed")} (${removed.length})</h3><ul class="plist">${removed.slice(0, 20).map((x) => `<li class="pcard removed"><b>${esc(x.title || tr2(RCAT[x.cat] || RCAT.other))}</b><p class="small">${esc(tr2(MODR[x.removed?.r] || MODR.other))} · ${x.removed?.t ? fmtDate(x.removed.t.slice(0, 10)) : ""}</p><button class="btn ghost sm" data-restore="${x.id}" data-kind="${x.title ? "p" : "r"}">${L("Restabilește", "Restore")}</button></li>`).join("") || `<p class="hint">—</p>`}</ul></div></section>`;
}
function rewardsHtml() {
  const c = civic(), lv = levelOf(c.earned), next = LEVELS.find(([n]) => n > c.earned);
  return `<section class="pgrid wide"><div>
    <div class="pcard civic"><div class="pc1"><span class="bigpts">⭐ ${fmt(c.pts)}</span><span>${L("puncte disponibile", "points available")}<br><b>${esc(tr2(lv[1]))}</b>${next ? ` · ${L("încă", "another")} ${next[0] - c.earned} ${L("până la", "to")} „${esc(tr2(next[1]))}”` : ""}</span></div>
      ${next ? `<div class="bar"><i style="width:${Math.round(((c.earned - lv[0]) / (next[0] - lv[0])) * 100)}%"></i></div>` : ""}</div>
    <h3>${L("Schimbă punctele", "Redeem points")}</h3>
    <ul class="plist rewards">${REWARDS.map((r) => `<li class="pcard"><div class="pc1"><b>${esc(tr2(r.t))}</b><span class="pill">⭐ ${r.pts}</span></div><p class="small">${esc(tr2(r.d))}</p>
      <button type="button" class="btn sm" data-redeem="${r.k}" ${c.pts < r.pts ? "disabled" : ""}>${c.pts < r.pts ? `${L("Îți mai trebuie", "You need")} ${r.pts - c.pts}` : L("Primește", "Get it")}</button></li>`).join("")}</ul>
  </div><div>
    <h3>${L("Cum câștigi puncte", "How to earn points")}</h3>
    <ul class="mini"><li><b>+${PTS.vote}</b> ${L("susții, semnezi sau dai like", "support, sign or like")}</li><li><b>+${PTS.oppose}</b> ${L("nu susții, cu motiv", "oppose, with a reason")}</li><li><b>+${PTS.report}</b> ${L("trimiți o sesizare", "send a report")}</li><li><b>+${PTS.plus}</b> ${L("confirmi sesizarea altcuiva", "confirm someone else's report")}</li><li><b>+${PTS.propose}</b> ${L("propui un proiect sau o petiție", "propose a project or petition")}</li></ul>
    <p class="small">${L("Maximum 15 acțiuni rapide pe zi aduc puncte, ca să nu se poată „cumpăra” reduceri cu voturi în masă. Propunerile eliminate de moderatori nu aduc puncte.", "At most 15 quick actions a day earn points, so discounts cannot be farmed with mass voting. Proposals removed by moderators earn nothing.")}</p>
    ${c.codes.length ? `<h3>${L("Codurile tale", "Your codes")}</h3><ul class="plist">${c.codes.slice(0, 8).map((x) => `<li class="ticket"><canvas data-qr="${x.code}" width="64" height="64"></canvas><div><b>${esc(tr2((REWARDS.find((r) => r.k === x.k) || REWARDS[0]).t))}</b><p class="small">${L("Cod", "Code")}: ${x.code}${x.used ? " · " + L("folosit", "used") : ""}</p>${demo()}</div></li>`).join("")}</ul>` : ""}
    <h3>${L("Istoric", "History")}</h3><ul class="mini">${c.log.slice(0, 12).map((x) => `<li><b>${x.n > 0 ? "+" : ""}${x.n}</b> ${esc(x.what)} <span class="small">${new Date(x.t).toLocaleDateString(loc())}</span></li>`).join("") || `<li class="small">${L("Încă nimic. Votează sau trimite o sesizare.", "Nothing yet. Vote or send a report.")}</li>`}</ul>
  </div></section>`;
}
// ---------------------------------------------------------------- location picker (shared by proposals and reports)
async function pickMap(id, labelId) {
  const el = document.getElementById(id); if (!el) return;
  SH.pick = null;
  SH.pm?.remove(); const h = myHome();
  SH.pm = miniMap(el, { center: h?.c || CENTER, zoom: h ? 14 : 12 });
  const m = await SH.pm.ready; let mk = null;
  const admin = await adminFC();
  const l3 = admin.features.filter((f) => f.properties.lvl === 3 && [REF(), "both"].includes(f.properties.sc)).map((f) => ({ n: f.properties.ro, pg: prepGeom(f.geometry) }));
  m.on("click", (e) => {
    const c = [Math.round(e.lngLat.lng * 1e5) / 1e5, Math.round(e.lngLat.lat * 1e5) / 1e5];
    const u = l3.find((x) => x.pg.has(c[0], c[1]));
    SH.pick = { c, label: u?.n || null };
    mk?.remove(); mk = new maplibregl.Marker({ color: "#e8590c" }).setLngLat(c).addTo(m);
    const w = document.getElementById(labelId); if (w) w.textContent = u ? u.n : L("punct ales pe hartă", "point picked on the map");
  });
}
const pickedLoc = () => SH.pick || (myHome() ? { c: myHome().c, label: myHome().name } : null);

// ---------------------------------------------------------------- reports (sesizări)
async function reportsLoad() {
  if (PJ.db) { try { const s = await PJ.db.collection("reports").get(); const o = {}; s.docs.forEach((d) => (o[d.id] = { ...d.data(), id: d.id })); return (SH.reps = o); } catch {} }
  return (SH.reps = store.get("reports", {}));
}
async function reportSave(r) {
  SH.reps[r.id] = r;
  if (PJ.db) { try { const b = { ...r }; delete b.id; await PJ.db.collection("reports").doc(r.id).set(b); return; } catch {} }
  store.set("reports", SH.reps);
}
const RST = { new: ["Nouă", "New", ""], sent: ["Repartizată", "Assigned", ""], fixed: ["Rezolvată", "Fixed", "good"] };
async function reportsHtml() {
  const reps = Object.values(await reportsLoad()).filter((r) => r.st !== "removed").sort((a, b) => Date.parse(b.t) - Date.parse(a.t));
  const mine = reps.filter((r) => r.author === VID);
  return `<section class="pgrid wide"><div>
    <h3>${L("Semnalează o problemă", "Report a problem")}</h3><div class="pform">
      <div class="chips">${Object.entries(RCAT).map(([k, v], i) => `<label class="chipck"><input type="radio" name="rcat" value="${k}" ${i === 0 ? "checked" : ""}><span>${esc(tr2(v))}</span></label>`).join("")}</div>
      <div class="upl"><span>${L("Unde? Apasă pe hartă", "Where? Tap the map")}</span><div id="rp-map" class="pickmap"></div><span class="small" id="rp-where">${myHome() ? L(`Implicit: ${esc(myHome().name)}`, `Default: ${esc(myHome().name)}`) : L("Niciun loc ales încă.", "No place picked yet.")}</span></div>
      <textarea id="rp-desc" class="pjin" rows="2" maxlength="400" placeholder="${L("Ce s-a întâmplat? (opțional)", "What happened? (optional)")}"></textarea>
      <label class="upl"><span>${L("Fotografie (opțional)", "Photo (optional)")}</span><input type="file" id="rp-img" accept="image/png,image/jpeg,image/webp"></label>
      <p class="small warn" id="rp-msg" role="status"></p>
      <button type="button" class="btn" id="rp-send">${L("Trimite sesizarea", "Send the report")}</button>
      <p class="small">${L("Sesizarea ajunge automat la serviciul responsabil (de ex. gropile la Exdrupo, iluminatul la Lumteh). Primești statusul aici.", "The report goes straight to the responsible service (e.g. potholes to Exdrupo, lighting to Lumteh). You get the status here.")}</p></div>
  </div><div>
    <h3>${L("Toate sesizările", "All reports")} (${reps.length})${mine.length ? ` · ${mine.length} ${L("ale tale", "yours")}` : ""}</h3>
    <div id="rp-all" class="pickmap tall"></div>
    <ul class="plist">${reps.slice(0, 40).map((r) => `<li class="pcard"><div class="pc1"><span class="pill ${RST[r.st || "new"][2]}">${tr2(RST[r.st || "new"])}</span><span class="small">${esc(tr2(RCAT[r.cat] || RCAT.other))} · ${fmtDate(r.t.slice(0, 10))}${r.author === VID ? " · " + L("a ta", "yours") : ""}</span></div>
      ${r.img || r.imgData ? `<img class="pimg sm" src="${r.img ? "/_blob/" + r.img : r.imgData}" alt="" loading="lazy" onerror="this.remove()">` : ""}
      ${r.desc ? `<p class="small">${esc(r.desc)}</p>` : ""}${SH.modp === r.id ? modForm(r.id, "r") : ""}<p class="small">${r.loc?.label ? esc(r.loc.label) + " · " : ""}${L("Responsabil", "Handled by")}: <b>${esc(RTO[r.cat] || RTO.other)}</b></p>
      <div class="btnrow">${r.loc?.c ? `<button type="button" class="linkbtn small" data-fly="${r.loc.c.join(",")}">${L("pe hartă", "on the map")}</button>` : ""}
      <button type="button" class="vbtn ${r.plus?.includes(VID) ? "on" : ""}" data-rplus="${r.id}">${L("Și eu am observat", "I noticed it too")} <b>${(r.plus || []).length}</b></button>
      ${isMod() ? `<button type="button" class="btn ghost sm danger" data-modopen="${r.id}">${L("Elimină", "Remove")}</button>` : ""}${!isOff() && r.author !== VID ? `<button type="button" class="flag ${(r.flags || []).includes(VID) ? "on" : ""}" data-rflag="${r.id}">⚑</button>` : ""}${isOff() ? Object.keys(RST).filter((k) => k !== (r.st || "new")).map((k) => `<button type="button" class="btn ghost sm" data-rst="${r.id}" data-k="${k}">→ ${tr2(RST[k])}</button>`).join("") : ""}</div></li>`).join("") || `<p class="hint">${L("Nicio sesizare încă.", "No reports yet.")}</p>`}</ul>
  </div></section>`;
}
async function reportsMap() {
  const el = document.getElementById("rp-all"); if (!el) return;
  SH.rm?.remove(); SH.rm = miniMap(el, { zoom: 11.5 });
  const m = await SH.rm.ready;
  const fs = Object.values(SH.reps || {}).filter((r) => r.loc?.c && r.st !== "removed").map((r) => ({ type: "Feature", properties: { st: r.st || "new", n: tr2(RCAT[r.cat] || RCAT.other) }, geometry: { type: "Point", coordinates: r.loc.c } }));
  m.addSource("rp", { type: "geojson", data: { type: "FeatureCollection", features: fs } });
  m.addLayer({ id: "rp", type: "circle", source: "rp", paint: { "circle-radius": 6, "circle-color": ["match", ["get", "st"], "fixed", "#2f9e44", "sent", "#f08c00", "#e03131"], "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });
  m.on("click", "rp", (e) => new maplibregl.Popup({ offset: 8 }).setLngLat(e.lngLat).setHTML(`<b>${esc(e.features[0].properties.n)}</b>`).addTo(m));
  if (fs.length) { const b = new maplibregl.LngLatBounds(); fs.forEach((f) => b.extend(f.geometry.coordinates)); m.fitBounds(b, { padding: 40, maxZoom: 15, duration: 0 }); }
}
async function sendReport(b) {
  const $ = (id) => document.getElementById(id), msg = $("rp-msg");
  const loc = pickedLoc(); if (!loc) { msg.textContent = L("Apasă pe hartă ca să arăți unde e problema.", "Tap the map to show where the problem is."); return; }
  b.disabled = true;
  const r = { id: "r" + Date.now().toString(36), cat: document.querySelector("input[name=rcat]:checked")?.value || "other", desc: $("rp-desc").value.trim(), loc, st: "new", author: VID, plus: [], t: new Date().toISOString() };
  const f = $("rp-img").files[0];
  if (f) {
    try { const A = await assetsNs(); if (A) { const sm = await shrinkImage(f, 1600, 0.85); r.img = (await A.upload(sm.blob, { type: "image/jpeg" })).id; } else r.imgData = (await shrinkImage(f, 640, 0.7)).data(); }
    catch { msg.textContent = L("Fotografia nu s-a putut încărca; sesizarea se trimite fără ea.", "The photo could not be uploaded; the report is sent without it."); }
  }
  await reportSave(r); award("report", tr2(RCAT[r.cat] || RCAT.other)); shRender();
}

// ---------------------------------------------------------------- events
function participClick(b) {
  const ds = b.dataset, F = (SH.pf ||= { tab: "run", show: "all", sort: "new", cat: "", q: "" });
  if (ds.flag) { const p = SH.props[ds.flag], f = p.flags || []; shSaveProposal({ ...p, flags: f.includes(VID) ? f.filter((x) => x !== VID) : [...f, VID] }).then(() => { toast(L("Mulțumim, moderatorii vor verifica.", "Thanks, moderators will review it.")); shRender(); }); return true; }
  if (ds.rflag) { const r = SH.reps[ds.rflag], f = r.flags || []; reportSave({ ...r, flags: f.includes(VID) ? f.filter((x) => x !== VID) : [...f, VID] }).then(shRender); return true; }
  if (ds.modopen) { SH.modp = ds.modopen; shRender(); return true; }
  if (ds.modcancel) { SH.modp = null; shRender(); return true; }
  if (ds.modsend) {
    const r = document.querySelector("input[name=modr]:checked")?.value || "other", rm = { r, t: new Date().toISOString() }; SH.modp = null;
    (ds.kind === "r" ? reportSave({ ...SH.reps[ds.modsend], st: "removed", removed: rm }) : shSaveProposal({ ...SH.props[ds.modsend], status: "removed", removed: rm })).then(() => { toast(L("Eliminat.", "Removed.")); shRender(); });
    return true;
  }
  if (ds.restore) { (ds.kind === "r" ? reportSave({ ...SH.reps[ds.restore], st: "new", removed: null, flags: [] }) : shSaveProposal({ ...SH.props[ds.restore], status: "new", removed: null, flags: [] })).then(shRender); return true; }
  if (ds.unflag) { reportSave({ ...SH.reps[ds.unflag], flags: [] }).then(shRender); return true; }
  if (ds.redeem) {
    const c = civic(), rw = REWARDS.find((x) => x.k === ds.redeem); if (!rw || c.pts < rw.pts) return true;
    const code = "CIV-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    c.pts -= rw.pts; c.codes = [{ k: rw.k, code, t: new Date().toISOString() }, ...c.codes]; c.log = [{ t: new Date().toISOString(), k: "redeem", n: -rw.pts, what: tr2(rw.t) }, ...c.log].slice(0, 40);
    if (rw.k === "ride") store.set("disc_ride", 0.5); if (rw.k === "pass") store.set("disc_pass", 0.9);
    store.set("civic", c); toast(L("Gata! Codul e în lista ta.", "Done! The code is in your list.")); shRender(); return true;
  }
  if (ds.ptab) { F.tab = ds.ptab; shRender(); return true; }
  if (ds.pshow) { F.show = ds.pshow; shRender(); return true; }
  if (ds.follow) { const f = follows(), id = ds.follow; store.set("follows", f.includes(id) ? f.filter((x) => x !== id) : [...f, id]); shRender(); return true; }
  if (ds.vote) {
    const id = ds.vote, v = +ds.v, mine = SH.props[id].votes?.[VID];
    if (v < 0 && mine !== -1) { SH.oppose = id; shRender().then(() => document.getElementById("p-" + id)?.querySelector(".oppose")?.scrollIntoView({ block: "nearest" })); return true; }
    SH.oppose = null; vote(id, v).then(shRender); return true;
  }
  if (ds.objsend) { const r = document.querySelector("input[name=obj]:checked")?.value || "other"; const txt = document.getElementById("obj-txt").value; SH.oppose = null; vote(ds.objsend, -1, r, txt).then(shRender); return true; }
  if (ds.objcancel) { SH.oppose = null; shRender(); return true; }
  if (ds.reply) { const p = SH.props[ds.reply]; shSaveProposal({ ...p, reply: document.getElementById("rep-" + p.id).value.trim() }).then(shRender); return true; }
  if (b.id === "rp-send") { sendReport(b); return true; }
  if (ds.rplus) { const r = SH.reps[ds.rplus], pl = r.plus || []; if (!pl.includes(VID)) award("plus", tr2(RCAT[r.cat] || RCAT.other)); reportSave({ ...r, plus: pl.includes(VID) ? pl.filter((x) => x !== VID) : [...pl, VID] }).then(shRender); return true; }
  if (ds.rst) { reportSave({ ...SH.reps[ds.rst], st: ds.k }).then(shRender); return true; }
  if (ds.go2) { SH.pf = { ...F, tab: ds.go2 === "report" ? "reports" : "props", show: ds.go2 === "near" ? "near" : F.show }; shGo("projects"); return true; }
  return false;
}
function participChange(e) {
  const F = (SH.pf ||= { tab: "run", show: "all", sort: "new", cat: "", q: "" }), id = e.target.id;
  if (id === "pf-cat") { F.cat = e.target.value; shRender(); return true; }
  if (id === "pf-sort") { F.sort = e.target.value; shRender(); return true; }
  if (id === "pf-q") { F.q = e.target.value; shRender(); return true; }
  return false;
}
function participAfter() {
  if (document.getElementById("pr-map")) pickMap("pr-map", "pr-where");
  if (document.getElementById("rp-map")) pickMap("rp-map", "rp-where");
  reportsMap();
}
