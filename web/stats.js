// ================================================================== ALL IN CHIȘINĂU — "Statistici": access & environment maps (+ ratio of any two)
// Data: data/statgrid.json (scripts/build_stats.py): scores 0–100 on the 150 m grid, computed from walking distance on the
// street & path network to ALL facilities around (gravity sum with distance decay), plus residents and jobs per cell.
const STK = {
  green:   { ro: "Acces la spații verzi", en: "Access to green space", ru: "Доступ к зелёным зонам", q: 1,
    d: ["Câte spații verzi publice (parcuri, scuaruri, păduri) sunt la îndemână pe jos.", "How much public green space (parks, squares, forests) is within walking reach.", "Сколько общественных зелёных зон (парки, скверы, леса) в пешей доступности."] },
  transit: { ro: "Acces la transport public", en: "Access to public transport", ru: "Доступ к общественному транспорту", q: 1,
    d: ["Cât de aproape sunt stațiile de troleibuz și autobuz și câte linii trec prin ele.", "How close trolleybus and bus stops are and how many lines serve them.", "Насколько близко остановки троллейбуса и автобуса и сколько линий через них проходит."] },
  air:     { ro: "Calitatea aerului (estimare)", en: "Air quality (estimate)", ru: "Качество воздуха (оценка)", q: 1,
    d: ["Indice estimat: cât de departe ești de trafic intens și de zone industriale. 100 = aer mai curat.", "Estimated index: distance from heavy traffic and industrial areas. 100 = cleaner air.", "Оценочный индекс: удалённость от интенсивного движения и промзон. 100 = чище воздух."] },
  health:  { ro: "Acces la unități medicale", en: "Access to healthcare", ru: "Доступ к медицине", q: 1,
    d: ["Spitale, policlinici, centre medicale și cabinete accesibile pe jos.", "Hospitals, polyclinics, health centres and practices within walking reach.", "Больницы, поликлиники, медцентры и кабинеты в пешей доступности."] },
  school:  { ro: "Acces la școli", en: "Access to schools", ru: "Доступ к школам", q: 1,
    d: ["Școli și licee accesibile pe jos.", "Schools and lyceums within walking reach.", "Школы и лицеи в пешей доступности."] },
  slope:   { ro: "Panta terenului", en: "Terrain slope", ru: "Уклон местности", q: 1,
    d: ["Cât de abrupt e terenul: unde se poate construi ușor (plat) și unde e nevoie de terasări, ziduri de sprijin sau e risc de alunecări.", "How steep the ground is: where building is easy (flat) and where terracing, retaining walls are needed or landslides are a risk.", "Насколько крутой рельеф: где строить легко (ровно), а где нужны террасы, подпорные стены или есть риск оползней."],
    cls: [["Foarte abrupt", "Very steep", "Очень крутой"], ["Abrupt", "Steep", "Крутой"], ["Moderat", "Moderate", "Умеренный"], ["Ușor înclinat", "Gentle", "Пологий"], ["Plat", "Flat", "Ровный"]],
    sub: ["> 25%", "15–25%", "10–15%", "5–10%", "< 5%"], poor: ["dintre locuitori stau pe pante de peste 15%", "of residents live on slopes over 15%", "жителей живут на склонах круче 15%"] },
  flood:   { ro: "Risc de inundații (estimare)", en: "Flood risk (estimate)", ru: "Риск наводнений (оценка)", q: 1,
    d: ["Cât de expus e terenul la inundații de la râuri și pâraie, după cât de sus e față de apa în care se scurge. 100 = risc foarte mic.", "How exposed the ground is to river and stream floods, by how high it lies above the water it drains into. 100 = very low risk.", "Насколько участок подвержен наводнениям от рек и ручьёв — по высоте над водотоком, куда стекает вода. 100 = очень низкий риск."],
    cls: [["Risc foarte mare", "Very high risk", "Очень высокий риск"], ["Risc mare", "High risk", "Высокий риск"], ["Risc moderat", "Moderate risk", "Умеренный риск"], ["Risc mic", "Low risk", "Низкий риск"], ["Risc foarte mic", "Very low risk", "Очень низкий риск"]],
    sub: ["< 0,7 m deasupra apei", "0,7–1,5 m", "1,5–3 m", "3–6 m", "> 6 m"], poor: ["dintre locuitori stau în zone cu risc mare sau foarte mare", "of residents live in high or very high risk areas", "жителей живут в зонах высокого или очень высокого риска"] },
  height:  { ro: "Înălțimea clădirilor", en: "Building height", ru: "Высота зданий", q: -1,
    d: ["Înălțimea medie a clădirilor (ponderată cu suprafața lor) în fiecare zonă de 150 m.", "Average building height (weighted by footprint) in each 150 m square.", "Средняя высота зданий (взвешенная по площади) в каждом квадрате 150 м."] },
  age:     { ro: "Vechimea clădirilor", en: "Building age", ru: "Возраст зданий", q: 0,
    d: ["Perioada în care au fost construite clădirile.", "When the buildings were built.", "Когда построены здания."] },
  pop:     { ro: "Populație", en: "Population", ru: "Население", q: -1,
    d: ["Locuitori pe km² (recensământul 2024).", "Residents per km² (2024 census).", "Жителей на км² (перепись 2024)."] },
  jobs:    { ro: "Locuri de muncă", en: "Jobs", ru: "Рабочие места", q: -1,
    d: ["Locuri de muncă pe km² (estimare).", "Jobs per km² (estimate).", "Рабочих мест на км² (оценка)."] },
};
Object.assign(T.ro, { stats: "Statistici", showloc: "Arată locația mea pe hartă" }); Object.assign(T.en, { stats: "Statistics", showloc: "Show my location on the map" }); if (T.ru) Object.assign(T.ru, { stats: "Статистика", showloc: "Показывать моё местоположение на карте" });
const STN = (k) => L(STK[k].ro, STK[k].en, STK[k].ru);
const ST_HOW = {
  green: ["Toate parcurile, grădinile publice, bazele de odihnă și pădurile până la 2 km pe jos (parcurile se folosesc aproape de casă). Se ignoră spațiile private și petele mici de iarbă (sub 0,3 ha; păduri sub 1 ha). Se adună hectarele la 500 m, 1 km și 2 km, fiecare hectar după cât de amenajat e (amenajat 100%, semi-amenajat 50%, natural 20%, vezi mai jos); fiecare sumă trece printr-un logaritm, cu ponderile 1 · 0,5 · 0,25: un scuar de 2 ha contează, un parc de 100 ha contează mai mult, dar nu de 50 de ori.", "All parks, public gardens, recreation grounds and forests up to 2 km on foot (parks are used close to home). Private gardens and small grass patches are ignored (under 0.3 ha; forests under 1 ha). Hectares within 500 m, 1 km and 2 km are added up, each by how landscaped it is (landscaped 100%, semi 50%, natural 20%, see below); each sum goes through a logarithm, weighted 1 · 0.5 · 0.25: a 2 ha square counts, a 100 ha park counts more, but not 50 times more.", "Все парки, общественные сады, зоны отдыха и леса до 2 км пешком (парками пользуются рядом с домом). Частные участки и мелкие газоны не учитываются (меньше 0,3 га; леса меньше 1 га). Суммируются гектары в пределах 500 м, 1 и 2 км, каждый по благоустройству (благоустроенный 100%, частично 50%, естественный 20%, см. ниже); каждая сумма проходит через логарифм, веса 1 · 0,5 · 0,25: сквер в 2 га учитывается, парк в 100 га — больше, но не в 50 раз."],
  transit: ["Fiecare linie de autobuz, troleibuz sau rutieră se numără o singură dată, la stația ei cea mai apropiată de tine (pe jos). Se numără câte linii diferite ai la 300 m, 500 m, 1 km și 2 km; fiecare număr trece printr-un logaritm, cu ponderile 1 · 0,6 · 0,25 · 0,05. Așa, mai multe linii aproape dau o valoare mai mare, dar a 30-a linie adaugă mai puțin decât a doua. Trenul nu e inclus; frecvența curselor nu e cunoscută, deci toate liniile cântăresc la fel.", "Each bus, trolleybus or minibus line counts once, at its stop nearest to you (on foot). It counts how many different lines you have within 300 m, 500 m, 1 km and 2 km; each count goes through a logarithm, weighted 1 · 0.6 · 0.25 · 0.05. So more lines nearby give a higher value, but the 30th line adds less than the second. Trains are not included; service frequency is unknown, so all lines weigh the same.", "Каждая линия автобуса, троллейбуса или маршрутки считается один раз — у ближайшей к вам остановки (пешком). Считается, сколько разных линий в пределах 300 м, 500 м, 1 и 2 км; каждое число проходит через логарифм, веса 1 · 0,6 · 0,25 · 0,05. Больше линий рядом — выше значение, но 30-я линия добавляет меньше второй. Поезд не включён; частота рейсов неизвестна, поэтому все линии весят одинаково."],
  health: ["Spital = 4, policlinică / centru medical = 2, cabinet = 1,5, stomatologie sau laborator = 0,5. Se numără câte obiective sunt la 500 m, 1 km, 2 km, 5 km și 10 km pe jos. Pentru fiecare rază, numărul trece printr-un logaritm (primul obiectiv contează mult, al 100-lea foarte puțin), iar razele au ponderi 1 · 0,5 · 0,25 · 0,1 · 0,04. Un obiectiv apropiat intră în toate razele, deci valorează cel mai mult; sute de obiective la 5–10 km nu pot întrece unul aflat la 500 m. Farmaciile nu sunt incluse.", "Hospital = 4, polyclinic / health centre = 2, doctor's practice = 1.5, dentist or lab = 0.5. It counts how many facilities are within 500 m, 1 km, 2 km, 5 km and 10 km on foot. For each radius the count goes through a logarithm (the first facility counts a lot, the 100th very little) and the radii are weighted 1 · 0.5 · 0.25 · 0.1 · 0.04. A facility close by falls in every radius, so it weighs most; hundreds of facilities 5–10 km away cannot outweigh one within 500 m. Pharmacies are not included.", "Больница = 4, поликлиника / медцентр = 2, кабинет = 1,5, стоматология или лаборатория = 0,5. Считается, сколько объектов в пределах 500 м, 1, 2, 5 и 10 км пешком. Для каждого радиуса число проходит через логарифм (первый объект весит много, сотый — очень мало), радиусы имеют веса 1 · 0,5 · 0,25 · 0,1 · 0,04. Близкий объект попадает во все радиусы и весит больше всего; сотни объектов в 5–10 км не перевесят один в 500 м. Аптеки не включены."],
  school: ["Școli primare, gimnazii și licee (fără școli sportive, de arte, de limbi străine sau grădinițe), fiecare după capacitatea estimată: 500 de locuri = 1, 1.000 de locuri = 2. Capacitatea e estimată din suprafața clădirilor din curtea școlii (aria × etaje ÷ ~10 m² pe elev), pentru că nu există date publice pe școli. Se numără câte obiective sunt la 500 m, 1 km, 2 km, 5 km și 10 km pe jos. Pentru fiecare rază, numărul trece printr-un logaritm (primul obiectiv contează mult, al 100-lea foarte puțin), iar razele au ponderi 1 · 0,5 · 0,25 · 0,1 · 0,04. Un obiectiv apropiat intră în toate razele, deci valorează cel mai mult; sute de obiective la 5–10 km nu pot întrece unul aflat la 500 m.", "Primary schools, gymnasiums and lyceums (not sports, art or language schools, nor kindergartens), each by estimated capacity: 500 places = 1, 1,000 places = 2. Capacity is estimated from the floor area of the buildings on the school grounds (area × floors ÷ ~10 m² per pupil), as there is no public per-school data. It counts how many facilities are within 500 m, 1 km, 2 km, 5 km and 10 km on foot. For each radius the count goes through a logarithm (the first facility counts a lot, the 100th very little) and the radii are weighted 1 · 0.5 · 0.25 · 0.1 · 0.04. A facility close by falls in every radius, so it weighs most; hundreds of facilities 5–10 km away cannot outweigh one within 500 m.", "Начальные школы, гимназии и лицеи (без спортивных, художественных, языковых школ и детсадов), каждая по оценочной вместимости: 500 мест = 1, 1000 мест = 2. Вместимость оценена по площади зданий на территории школы (площадь × этажи ÷ ~10 м² на ученика), так как публичных данных по школам нет. Считается, сколько объектов в пределах 500 м, 1, 2, 5 и 10 км пешком. Для каждого радиуса число проходит через логарифм (первый объект весит много, сотый — очень мало), радиусы имеют веса 1 · 0,5 · 0,25 · 0,1 · 0,04. Близкий объект попадает во все радиусы и весит больше всего; сотни объектов в 5–10 км не перевесят один в 500 м."],
  air: ["Nu există măsurători ale aerului pe cartiere, deci indicele e un model: traficul estimat al fiecărui drum (categoria drumului × benzi) scade cu distanța (la 120 m ~37%), plus zonele industriale (la 400 m ~37%). E o comparație relativă între zone, nu o valoare în µg/m³; vântul și încălzirea caselor nu sunt incluse.", "There are no air measurements by neighbourhood, so this is a model: each road's estimated traffic (road class × lanes) fades with distance (~37% at 120 m), plus industrial land (~37% at 400 m). It compares areas; it is not a µg/m³ value; wind and home heating are not included.", "Измерений воздуха по районам нет, поэтому это модель: оценочный трафик каждой дороги (категория × полосы) убывает с расстоянием (~37% на 120 м), плюс промзоны (~37% на 400 м). Это сравнение районов, а не значение в мкг/м³; ветер и отопление домов не учтены."],
};
Object.assign(ST_HOW, {
  slope: ["Panta e calculată din altitudinea terenului (model digital al reliefului, ~50 m, SRTM / Terrain Tiles), apoi mediată pe fiecare pătrat de 150 m. Pragurile urmează practica obișnuită în urbanism: sub 5% se construiește fără probleme, 5–10% cu mici adaptări, 10–15% cu costuri mai mari, 15–25% cere terasări și ziduri de sprijin, peste 25% e nepotrivit și poate avea risc de alunecări. Relieful are rezoluție de ~50 m: un taluz mic sau o râpă îngustă nu se văd.", "Slope comes from the terrain elevation model (~50 m, SRTM / Terrain Tiles), averaged over each 150 m square. Thresholds follow common planning practice: under 5% building is easy, 5–10% needs small adaptations, 10–15% costs more, 15–25% needs terracing and retaining walls, over 25% is unsuitable and may be landslide-prone. The terrain model is ~50 m: a small embankment or a narrow ravine does not show.", "Уклон рассчитан по цифровой модели рельефа (~50 м, SRTM / Terrain Tiles) и усреднён по квадратам 150 м. Пороги — обычная градостроительная практика: до 5% строить легко, 5–10% — небольшие доработки, 10–15% — дороже, 15–25% — террасы и подпорные стены, свыше 25% — непригодно и возможны оползни. Разрешение ~50 м: небольшой откос или узкий овраг не видны."],
  flood: ["Nu există o hartă oficială a zonelor inundabile accesibilă aici, deci riscul e estimat cu metoda HAND (înălțimea deasupra rețelei de drenaj): pe relieful de ~50 m, apa e urmărită la vale pe panta cea mai mare până ajunge într-un râu sau pârâu (OpenStreetMap), iar fiecare loc primește înălțimea sa deasupra acelui curs de apă. Pâraiele mici duc mai puțină apă, deci la ele aceeași înălțime contează de 3 ori mai puțin. Gropile închise unde se adună apa de ploaie (mai adânci de 2,5 m) sunt marcate cel puțin cu risc moderat. Nu sunt incluse digurile, canalizarea pluvială sau inundațiile istorice; e o estimare pentru planificare, nu o hartă oficială de risc.", "No official flood-zone map is reachable here, so the risk is estimated with HAND (Height Above Nearest Drainage): on the ~50 m terrain, water is followed downhill along the steepest slope until it reaches a river or stream (OpenStreetMap), and every place gets its height above that watercourse. Small streams carry less water, so there the same height counts three times less. Closed hollows where rain water collects (deeper than 2.5 m) are marked at least moderate. Dykes, storm drains and past floods are not included; it is a planning estimate, not an official risk map.", "Официальной карты зон затопления здесь нет, поэтому риск оценён методом HAND (высота над ближайшим водотоком): по рельефу ~50 м вода прослеживается вниз по наибольшему уклону до реки или ручья (OpenStreetMap), и каждое место получает высоту над этим водотоком. Малые ручьи несут меньше воды, поэтому у них та же высота весит втрое меньше. Замкнутые понижения, где собирается дождевая вода (глубже 2,5 м), отмечены как минимум умеренным риском. Дамбы, ливнёвка и прошлые наводнения не учтены; это оценка для планирования, не официальная карта риска."],
  height: ["Unde OpenStreetMap are înălțimea sau numărul de etaje, se folosește valoarea exactă. Pentru restul clădirilor, înălțimea e estimată de un model învățat pe clădirile din Chișinău cu înălțime cunoscută: folosește înălțimea medie măsurată din satelit (GHSL Built-Height 2018, Comisia Europeană, pătrate de ~90 m), înălțimile clădirilor vecine cunoscute, suprafața și forma clădirii, tipul ei și distanța față de centru.", "Where OpenStreetMap has the height or number of floors, that exact value is used. For the other buildings the height is estimated by a model trained on Chișinău buildings of known height: it uses the satellite-measured average height (GHSL Built-Height 2018, European Commission, ~90 m squares), the known heights of neighbouring buildings, the footprint size and shape, the building type and the distance from the centre.", "Где в OpenStreetMap указана высота или этажность, используется точное значение. Для остальных зданий высота оценена моделью, обученной на кишинёвских зданиях с известной высотой: средняя высота со спутника (GHSL Built-Height 2018, Еврокомиссия, квадраты ~90 м), известные высоты соседних зданий, площадь и форма здания, его тип и расстояние до центра."],
});
const ST_COMMON = () => L("Până la 2 km distanța se măsoară pe străzi, trotuare și poteci (OpenStreetMap), nu în linie dreaptă: un obiectiv de peste calea ferată sau un râu poate fi departe chiar dacă pare aproape. La 5 și 10 km, unde contează puțin, se folosește linia dreaptă × 1,3 (ocolișul obișnuit). Scorul 0–100 nu are plafon artificial: 100 = nivelul celor mai bine serviți 1% dintre locuitori, iar restul e proporțional. Media pe unități e ponderată cu numărul de locuitori.",
  "Up to 2 km, distance is measured along streets, sidewalks and paths (OpenStreetMap), not in a straight line: a facility across a railway or a river can be far even if it looks close. At 5 and 10 km, where it matters little, the straight line × 1.3 (usual detour) is used. The 0–100 score has no artificial ceiling: 100 = the level of the best-served 1% of residents, the rest is proportional. Unit averages are weighted by residents.",
  "До 2 км расстояние считается по улицам, тротуарам и дорожкам (OpenStreetMap), а не по прямой: объект за железной дорогой или рекой может быть далеко, даже если кажется близким. На 5 и 10 км, где вклад мал, берётся прямая × 1,3 (обычный крюк). Балл 0–100 без искусственного потолка: 100 = уровень лучше всего обеспеченного 1% жителей, остальное пропорционально. Средние по единицам взвешены по жителям.");
// red–yellow–green with strong lightness contrast: dark ends, bright middle
const ST_CLS = [[0, 20, "#9b0d23"], [20, 40, "#ef6a2f"], [40, 60, "#fbe36b"], [60, 80, "#7cc24a"], [80, 101, "#0b6b2e"]];
const stInk = (c) => (c === 2 ? "#3a2c00" : "#fff");   // text on a class colour
const ST_CLN = () => [L("Foarte slab", "Very poor", "Очень плохо"), L("Slab", "Poor", "Плохо"), L("Mediu", "Fair", "Средне"), L("Bun", "Good", "Хорошо"), L("Foarte bun", "Very good", "Очень хорошо")];
const ST_STOPS = [[0, [110, 0, 30]], [15, [185, 20, 40]], [30, [240, 100, 45]], [45, [252, 190, 80]], [55, [253, 236, 120]], [65, [175, 220, 110]], [80, [70, 165, 75]], [100, [0, 85, 40]]];
const lerpStops = (st, v) => { if (v <= st[0][0]) return st[0][1]; for (let i = 1; i < st.length; i++) if (v <= st[i][0]) { const [a, p] = st[i - 1], [b, c] = st[i], t = (v - a) / (b - a); return p.map((x, k) => x + (c[k] - x) * t); } return st.at(-1)[1]; };
const RT_GOOD = [[-2, [110, 0, 30]], [-1, [240, 100, 45]], [0, [253, 240, 180]], [1, [120, 195, 90]], [2, [0, 85, 40]]];
const RT_NEU = [[-2, [94, 60, 153]], [-1, [178, 171, 210]], [0, [247, 247, 247]], [1, [253, 184, 99]], [2, [230, 97, 1]]];
const HT_STOPS = [[0, [255, 255, 255, 0]], [2, [255, 243, 176, 150]], [6, [253, 211, 106, 190]], [10, [249, 160, 63, 205]], [16, [231, 111, 81, 215]], [25, [181, 23, 158, 225]], [40, [106, 13, 173, 235]], [60, [45, 0, 96, 240]]];
const htCol = (v) => lerpStops(HT_STOPS, v);
const HT_BR = [0, 6, 12, 20, 30, 1000];
const rgbHex = (c) => "#" + c.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
Object.assign(S, { stat: store.get("stat", "green"), stRatio: store.get("stRatio", false), stA: store.get("stA", "green"), stB: store.get("stB", "pop"), stView: store.get("stView", "heat"), stEmpty: store.get("stEmpty", false) });

// ---------------------------------------------------------------- grid
let SG = null;
async function statGrid() {
  if (SG) return SG;
  const g = await load("statgrid.json"), { W, H, dx, dy, kx0, ky0 } = g, n = W * H;
  const box = (a) => { const o = new Float32Array(n); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let s = 0, c = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const ii = i + u, jj = j + v; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const w = u || v ? 1 : 2; s += a[jj * W + ii] * w; c += w; } o[j * W + i] = s / c; } return o; };
  const cellKm2 = (dx * 111.32 * Math.cos((47 * Math.PI) / 180)) * (dy * 110.57);
  const inside = new Float32Array(n), pop = Float32Array.from(g.pop), jobs = Float32Array.from(g.jobs);
  for (let k = 0; k < n; k++) inside[k] = g.s.green[k] >= 0 ? 1 : 0;
  const muni = g.mun ? Float32Array.from(g.mun, (v, k) => v * inside[k]) : inside;   // municipality only: legend shares, rankings, averages
  const act = box(Float32Array.from(pop, (p, k) => p + jobs[k] * 0.5));
  const mask = Float32Array.from(inside, (v, k) => v * (act[k] >= 1.5 ? 1 : 0));   // where people live or work
  const vals = {};
  for (const k in g.s) vals[k] = Float32Array.from(g.s[k], (v) => (v < 0 ? 0 : v));
  if (vals.height) for (let i = 0; i < n; i++) vals.height[i] /= 10;
  vals.pop = Float32Array.from(box(pop), (v, k) => (v / cellKm2) * inside[k]);
  vals.jobs = Float32Array.from(box(jobs), (v, k) => (v / cellKm2) * inside[k]);
  // municipal reference for the ratio: resident-weighted average for scores, average density where people live or work
  const ref = {}; let pw = 0; for (let k = 0; k < n; k++) pw += pop[k] * muni[k];
  for (const k in vals) { let s = 0; if (STK[k].q > 0) { for (let i = 0; i < n; i++) s += vals[k][i] * pop[i] * muni[i]; ref[k] = s / pw; } else { let c = 0; for (let i = 0; i < n; i++) if (mask[i] === 1) { s += vals[k][i]; c++; } ref[k] = s / c; } }
  // resident-weighted distribution of every statistic → percentile (position in the city's ranking)
  const dist = {};
  for (const k in vals) { const idx = []; for (let i = 0; i < n; i++) if (muni[i] && pop[i] > 0) idx.push(i); idx.sort((a, b) => vals[k][a] - vals[k][b]); let c = 0; const v = new Float32Array(idx.length), cw = new Float32Array(idx.length); idx.forEach((i, t) => { c += pop[i]; v[t] = vals[k][i]; cw[t] = c; }); dist[k] = { v, cw, tot: c }; }
  SG = { muni, slopep: g.slope_pct, hand: g.hand, wdist: g.wdist, hmax: g.hmax, hsrc: g.hsrc, g, box, dist, W, H, dx, dy, kx0, ky0, x0: (kx0 + 0.5) * dx, y0: (ky0 + 0.5) * dy, n, inside, mask, pop, jobs, vals, ref, near: g.near, cum: g.cum, cellKm2 };
  if (g.green?.areas) await greenLoadCfg();
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
function stSample(F, lon, lat, M = SG.mask) {   // normalized bilinear sampling (cells outside the municipality do not bleed in)
  const G = SG, fx = (lon - G.x0) / G.dx, fy = (lat - G.y0) / G.dy;
  if (!(fx >= 0 && fy >= 0 && fx < G.W - 1 && fy < G.H - 1)) return [0, 0];
  const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, w = fy - j, k = j * G.W + i, I = G.inside;
  const ws = [(1 - u) * (1 - w), u * (1 - w), (1 - u) * w, u * w], ks = [k, k + 1, k + G.W, k + G.W + 1];
  let s = 0, m = 0, a = 0; for (let t = 0; t < 4; t++) { const q = ws[t] * I[ks[t]]; s += F[ks[t]] * q; m += q; a += ws[t] * M[ks[t]]; }
  return m > 0.05 ? [s / m, a] : [0, 0];
}
function stColour(key, v) {
  if (key.startsWith("r~")) { const [, A, B] = key.split("~"), p = stPol(A, B); return lerpStops(p === 0 ? RT_NEU : RT_GOOD, p < 0 ? -v : v); }
  if (key === "height") return htCol(v);
  if (STK[key].q < 0) return hillCol(v);
  return lerpStops(ST_STOPS, v);
}
function stHeight(key, v, sq) {
  if (key.startsWith("r~")) return v * 260;
  if (key === "height") return v * 22;
  if (key === "flood") return (100 - v) * 12;   // flood risk: the riskier, the higher the hill
  if (STK[key].q < 0) return hillH(v, sq);
  return sq ? Math.sqrt(v / 100) * 1200 : v * 12;
}
async function stTile(url, dem) {
  const [key0, mode, ...zxy] = url.split("/"), [z, x, y] = zxy.map(Number), all = key0.endsWith("~e"), key = all ? key0.slice(0, -2) : key0;
  await statGrid(); const F = stField(key), dens = !key.startsWith("r~") && STK[key].q < 0, M = all ? SG.inside : SG.mask;
  const N = 256, cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(N, N) : Object.assign(document.createElement("canvas"), { width: N, height: N });
  const ctx = cv.getContext("2d"), img = ctx.createImageData(N, N), a = img.data, n = 2 ** z;
  for (let py = 0; py < N; py++) {
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + (py + 0.5) / N)) / n))) * 180) / Math.PI;
    for (let px = 0; px < N; px++) {
      const lon = ((x + (px + 0.5) / N) / n) * 360 - 180, [v, m] = stSample(F, lon, lat, M), o = (py * N + px) * 4;
      if (dem) { const h = (m > 0 ? stHeight(key, v, mode === "sqrt") * (dens ? 1 : Math.min(1, m)) : 0) + 32768; a[o] = Math.floor(h / 256); a[o + 1] = Math.floor(h) % 256; a[o + 2] = Math.floor((h % 1) * 256); a[o + 3] = 255; continue; }
      if (m <= 0) { a[o + 3] = 0; continue; }
      const c = stColour(key, v); a[o] = c[0]; a[o + 1] = c[1]; a[o + 2] = c[2];
      a[o + 3] = dens ? (c[3] ?? 200) : Math.round(232 * Math.min(1, m));
    }
  }
  ctx.putImageData(img, 0, 0);
  const blob = cv.convertToBlob ? await cv.convertToBlob({ type: "image/png" }) : await new Promise((r) => cv.toBlob(r, "image/png"));
  return { data: await blob.arrayBuffer() };
}
maplibregl.addProtocol("stcol", (p) => stTile(p.url.replace("stcol://", ""), false));
maplibregl.addProtocol("stdem", (p) => stTile(p.url.replace("stdem://", ""), true));
const statAge = () => S.stat === "age" && !S.stRatio;
if (S.mode === "age") { S.mode = "stats"; S.stat = "age"; }   // the old Building age tab now lives in Statistics
const stKey = () => (S.stRatio ? `r~${S.stA}~${S.stB}` : S.stat);
// "show uninhabited land too": only for access / environment statistics (residents and jobs are simply 0 there)
const stEmptyOk = () => (S.stRatio ? STK[S.stA].q > 0 && STK[S.stB].q > 0 : STK[S.stat].q > 0);
const stTileKey = () => stKey() + (S.stEmpty && stEmptyOk() ? "~e" : "");

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
      for (const s of ["green", "transit", "air", "health", "school", "slope", "flood", "height"]) { if (!G.vals[s]) continue; acc[s] ??= [0, 0]; acc[s][0] += G.vals[s][k] * w; acc[s][1] += G.vals[s][k]; }
      for (const s in G.near) { near[s] ??= 0; near[s] += Math.min(3000, G.near[s][k]) * w; }
    }
    if (!wa) continue;
    ST_CELLS.set(p.id, Int32Array.from(mine));
    for (const s in acc) p["st_" + s] = s === "height" ? Math.round((wp > 0 ? acc[s][0] / wp : acc[s][1] / wa) * 10) / 10 : Math.round(wp > 0 ? acc[s][0] / wp : acc[s][1] / wa);
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
  const prop = S.stRatio ? "st_r" : S.stat === "pop" || S.stat === "jobs" || S.stat === "height" ? null : "st_" + S.stat;
  let col;
  if (prop) {
    const stops = S.stRatio ? (stPol(A, B) === 0 ? RT_NEU : RT_GOOD) : ST_STOPS, flip = S.stRatio && stPol(A, B) < 0;
    col = ["interpolate", ["linear"], ["*", flip ? -1 : 1, ["to-number", ["get", prop]]], ...stops.flatMap(([v, c]) => [v, rgbHex(c)])];
    col = ["case", ["has", prop], ["case", ["==", ["get", prop], null], "#cccccc", col], "#cccccc"];
  } else if (S.stat === "pop") { const s = popScale(), br = [0, 100, 500, 1500, 4000, 8000]; col = ["step", ["*", s, ["coalesce", ["get", "dens"], 0]], pal().pop[0]]; br.slice(1).forEach((v, i) => col.push(v, pal().pop[i + 1])); }
  else if (S.stat === "height") col = ["interpolate", ["linear"], ["coalesce", ["get", "st_height"], 0], ...HT_STOPS.slice(1).flatMap(([v, c]) => [v, rgbHex(c.slice(0, 3))])];
  else { col = ["step", ["coalesce", ["get", "jdens"], 0], JOBCOL[0]]; JOBBR.slice(1).forEach((v, i) => col.push(v, JOBCOL[i + 1])); }
  map.setPaintProperty("admin-fill", "fill-color", col);
  map.setPaintProperty("admin-fill", "fill-opacity", ["case", ["==", ["get", "lvl"], "ctx"], 0.55, 0.78]);   // neighbouring localities too
  return key;
}
// layers (heat = flat colours, hills = same colours on a terrain made from the values)
async function statsRender(on, only) {
  document.getElementById("as-q")?.setAttribute("placeholder", L("Caută o stradă sau un loc…", "Search a street or a place…", "Найти улицу или место…"));
  if (bm(S.mode) === "stats") { const el = document.getElementById("stpanel"), sig = [S.lang, S.stat, S.stRatio, S.stA, S.stB, S.stView, S.stEmpty].join("|"); if (el && el.dataset.sig !== sig) { statsPanel(); el.dataset.sig = sig; } }
  if (statAge()) on = false;   // building age uses its own layers (app.js)
  const key = stTileKey(), view = S.stView, sq = S.hillSqrt && !key.startsWith("r~") ? "sqrt" : "lin";
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
  let tot = 0; for (let k = 0; k < G.n; k++) tot += G.pop[k] * G.muni[k];
  const share = (lo, hi) => { let s = 0; for (let k = 0; k < G.n; k++) if (G.muni[k] && F[k] >= lo && F[k] < hi) s += G.pop[k]; return s / tot; };
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
  h += `<li class="cap">${esc(STN(k))}</li><li class="small">${L(...st.d)}</li>`;
  h += `<li class="small muted">${L("Harta acoperă și localitățile din jurul municipiului; cifrele și graficele de mai jos sunt doar pentru municipiu.", "The map also covers the localities around the municipality; the figures and charts below are for the municipality only.", "Карта охватывает и населённые пункты вокруг муниципия; цифры и графики ниже — только по муниципию.")}</li>`;
  if (k === "height") {
    const rows = HT_BR.slice(0, -1).map((lo, i) => { const hi = HT_BR[i + 1]; return [rgbHex(htCol(Math.min(lo + 4, 50)).slice(0, 3)), hi < 1000 ? `${lo}–${hi} m` : `> ${lo} m`, share(lo, hi), hi < 1000 ? `~${Math.max(1, Math.round(lo / 3))}–${Math.round(hi / 3)} ${L("etaje", "floors", "этажей")}` : `${L("peste", "over", "более")} ${Math.round(lo / 3)} ${L("etaje", "floors", "этажей")}`]; });
    const hs = G.hsrc || {}, val = (q) => q.st_height;
    h += `<li class="cap">${L("Locuitori după înălțimea clădirilor din zona lor", "Residents by the height of buildings around them", "Жители по высоте зданий вокруг")}</li>` + stBars(rows)
      + `<li class="small">${L(`Surse: <b>${fmt(hs.osm || 0)}</b> clădiri cu înălțime exactă din OpenStreetMap, <b>${fmt(hs.ghsl || 0)}</b> estimate cu modelul. Testat pe ${fmt(hs.test_n || 0)} clădiri cu înălțime cunoscută (nefolosite la antrenare): eroare medie <b>${fmt(hs.mae || 0, 1)} m</b>, ±3 m în ${hs.within3 || 0}% din cazuri (ghicirea după tipul clădirii: ${fmt(hs.mae_default || 0, 1)} m). Cel mai puțin precis la clădirile foarte înalte.`, `Sources: <b>${fmt(hs.osm || 0)}</b> buildings with exact height from OpenStreetMap, <b>${fmt(hs.ghsl || 0)}</b> estimated by the model. Tested on ${fmt(hs.test_n || 0)} buildings of known height (not used for training): mean error <b>${fmt(hs.mae || 0, 1)} m</b>, within ±3 m in ${hs.within3 || 0}% of cases (guessing by building type: ${fmt(hs.mae_default || 0, 1)} m). Least precise for very tall buildings.`, `Источники: <b>${fmt(hs.osm || 0)}</b> зданий с точной высотой из OpenStreetMap, <b>${fmt(hs.ghsl || 0)}</b> оценены моделью. Проверка на ${fmt(hs.test_n || 0)} зданиях с известной высотой (не использованных при обучении): средняя ошибка <b>${fmt(hs.mae || 0, 1)} м</b>, ±3 м в ${hs.within3 || 0}% случаев (оценка по типу здания: ${fmt(hs.mae_default || 0, 1)} м). Менее точно для очень высоких зданий.`)}</li>`
      + pickHtml(L("Cartierele cu clădirile cele mai înalte", "Neighbourhoods with the tallest buildings", "Районы с самыми высокими зданиями"), pick(val, 4, false), val, (v) => fmt(v, 1) + " m", "")
      + how(k);
    return h;
  }
  if (st.q < 0) {
    const br = k === "pop" ? [0, 1500, 4000, 8000, 15000, 1e9] : [0, 500, 1500, 4000, 10000, 1e9];
    const rows = br.slice(0, -1).map((lo, i) => [rgbHex(hillCol(Math.max(lo, 200) + (Math.min(br[i + 1], 30000) - lo) / 2).slice(0, 3)), `${fmt(lo)}${br[i + 1] < 1e9 ? "–" + fmt(br[i + 1]) : "+"} / km²`, share(lo, br[i + 1])]);
    h += `<li class="cap">${L("Locuitori după densitatea zonei", "Residents by density of their area", "Жители по плотности района")}</li>` + stBars(rows)
      + `<li class="small">${L("Folosește „Raportează” ca să vezi, de exemplu, unde locuiesc mulți oameni dar accesul la parcuri sau stații e slab.", "Use “Ratio” to see, for example, where many people live but access to parks or stops is poor.", "Используйте «Соотношение», чтобы увидеть, например, где живёт много людей, но доступ к паркам или остановкам плохой.")}</li>`;
    return h;
  }
  let avg = 0; for (let i = 0; i < G.n; i++) avg += G.vals[k][i] * G.pop[i] * G.muni[i]; avg /= tot;
  const cls = st.cls ? st.cls.map((x) => L(...x)) : ST_CLN(), rows = ST_CLS.map(([lo, hi, c], i) => [c, cls[i], share(lo, hi), st.sub ? st.sub[i] : `${lo}–${Math.min(hi, 100)}`]).reverse();
  const poor = share(0, 40);
  h += `<li class="stkpi"><div><b style="color:${avg >= 40 && avg < 60 ? "#9a6b00" : rgbHex(lerpStops(ST_STOPS, avg))}">${fmt(avg, 0)}</b><span>${L("scor mediu / 100 (ponderat cu locuitorii)", "average score / 100 (weighted by residents)", "средний балл / 100 (взвешен по жителям)")}</span></div><div><b style="color:${poor > 0.25 ? "#9b0d23" : poor > 0.1 ? "#e8590c" : "#0b6b2e"}">${fmt(poor * 100, 0)}%</b><span>${st.poor ? L(...st.poor) : L("dintre locuitori au acces slab sau foarte slab", "of residents have poor or very poor access", "жителей с плохим или очень плохим доступом")}</span></div></li>`
    + `<li class="cap">${L("Câți locuitori au fiecare nivel", "Residents at each level", "Сколько жителей на каждом уровне")}</li>` + stBars(rows);
  if (G.near[k]) {   // median walking distance to the nearest facility, for residents
    const arr = []; for (let i = 0; i < G.n; i++) if (G.muni[i] && G.pop[i] > 0) arr.push([G.near[k][i], G.pop[i]]);
    arr.sort((a, b) => a[0] - b[0]); let c = 0, med = 0, p90 = 0; for (const [d, w] of arr) { c += w; if (!med && c >= tot / 2) med = d; if (!p90 && c >= tot * 0.9) { p90 = d; break; } }
    const what = { transit: L("o stație", "a stop", "остановка"), green: L("un spațiu verde public", "a public green space", "общественная зелёная зона"), health: L("o unitate medicală", "a health facility", "медучреждение"), school: L("o școală", "a school", "школа") }[k];
    const m = (d) => (d >= 99999 ? (k === "green" ? "> 2 km" : "> 10 km") : d >= 1000 ? fmt(d / 1000, 1) + " km" : fmt(Math.round(d / 10) * 10) + " m");
    h += `<li class="small">${L(`Jumătate dintre locuitori au ${what} la cel mult <b>${m(med)}</b> de mers pe jos; 9 din 10, la cel mult <b>${m(p90)}</b>.`, `Half of residents have ${what} within <b>${m(med)}</b> on foot; 9 in 10 within <b>${m(p90)}</b>.`, `У половины жителей ${what} в пределах <b>${m(med)}</b> пешком; у 9 из 10 — в пределах <b>${m(p90)}</b>.`)}</li>`;
  }
  const val = (q) => q["st_" + k];
  h += pickHtml(L("Cele mai slabe cartiere", "Weakest neighbourhoods", "Самые слабые районы"), pick(val, 4, true), val, (v) => fmt(v), "bad")
    + pickHtml(L("Cele mai bune cartiere", "Best neighbourhoods", "Лучшие районы"), pick(val, 3, false), val, (v) => fmt(v), "good")
    + how(k) + (k === "green" ? greenCfgHtml() : "");
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
  const clsOf = (k, c) => (STK[k].cls ? L(...STK[k].cls[c]) : cls[c]);
  return ["green", "transit", "air", "health", "school", "slope", "flood"].filter((k) => p["st_" + k] != null).map((k) => { const v = p["st_" + k], c = Math.max(0, ST_CLS.findIndex(([lo, hi]) => v >= lo && v < hi));
    return `<dt>${esc(STN(k))}</dt><dd><b class="stpill" style="background:${ST_CLS[c][2]};color:${stInk(c)}">${v}</b> ${clsOf(k, c)}${p["sn_" + k] != null ? `<small class="muted"> · ${L("cel mai aproape", "nearest", "ближайшее")} ~${nm(p["sn_" + k])}</small>` : ""}</dd>`; }).join("")
    + (p.st_height ? `<dt>${esc(STN("height"))}</dt><dd>~${fmt(p.st_height, 1)} m <small class="muted">(~${Math.max(1, Math.round(p.st_height / 3))} ${L("etaje în medie", "floors on average", "этажей в среднем")})</small></dd>` : "");
}
// panel controls
function statsPanel() {
  const opts = Object.keys(STK).filter((k) => k !== "age").map((k) => `<option value="${k}">${esc(STN(k))}</option>`).join("");
  const el = document.getElementById("stpanel"); if (!el) return;
  el.innerHTML = `<div class="seg stlistsel stratiosel"><label class="stratio"><input type="radio" name="stat" value="__ratio" ${S.stRatio ? "checked" : ""}><b>${L("Raportează două statistici", "Ratio of two statistics", "Соотношение двух показателей")}</b></label></div>
    <div class="strat" ${S.stRatio ? "" : "hidden"}><select id="stA" aria-label="A">${opts}</select><span>÷</span><select id="stB" aria-label="B">${opts}</select><button type="button" class="btn ghost sm" id="stswap" title="${L("Inversează", "Swap", "Поменять")}">⇄</button></div>
    <span class="lab">${L("Statistica", "Statistic", "Показатель")}</span>
    <div class="seg stlistsel">${Object.keys(STK).map((k) => `<label><input type="radio" name="stat" value="${k}" ${!S.stRatio && S.stat === k ? "checked" : ""}><b>${esc(STN(k))}</b></label>`).join("")}</div>
    <span class="lab">${t("popview")}</span>
    ${stEmptyOk() ? `<label class="check stempty"><input type="checkbox" id="stempty" ${S.stEmpty ? "checked" : ""}><span>${L("Arată și teritoriile nelocuite", "Also show uninhabited land", "Показывать и незаселённые территории")}<small>${L("Colorează și locurile unde încă nu locuiește nimeni, ca să vezi dacă un teren pentru construcție are deja acces bun. Clic pe hartă pentru valorile din acel punct.", "Also colours places where nobody lives yet, to check whether a building site already has good access. Click the map for the values at that spot.", "Окрашивает и места, где пока никто не живёт, чтобы проверить, есть ли у участка под застройку хороший доступ. Щёлкните по карте, чтобы увидеть значения в точке.")}</small></span></label>` : ""}
    <div class="seg ${statAge() ? "row2" : "row3"}">${(statAge() ? [["heat", L("Hartă 2D", "2D map", "2D-карта")], ["hills", L("Clădiri 3D", "3D buildings", "3D-здания")]] : [["units", t("pv_units")], ["heat", t("pv_heat")], ["hills", t("pv_hills")]]).map(([v, l]) => `<label><input type="radio" name="stview" value="${v}" ${(S.stView === v || (statAge() && v === "heat" && S.stView === "units")) ? "checked" : ""}><b>${l}</b></label>`).join("")}</div>`;
  el.querySelector("#stA").value = S.stA; el.querySelector("#stB").value = S.stB;
}
function statsSave() { for (const k of ["stat", "stRatio", "stA", "stB", "stView", "stEmpty"]) store.set(k, S[k]); }
document.addEventListener("change", (e) => {
  const tg = e.target; if (!tg.closest?.("#stpanel")) return;
  if (tg.name === "stat") { if (tg.value === "__ratio") S.stRatio = true; else { S.stRatio = false; S.stat = tg.value; } }
  if (tg.name === "stview") S.stView = tg.value;
  if (tg.id === "stA") S.stA = tg.value;
  if (tg.id === "stB") S.stB = tg.value;
  if (tg.id === "stempty") S.stEmpty = tg.checked;
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

// ---------------------------------------------------------------- what the statistics are at one spot (e.g. a building site)
async function stPointPopup(ll) {
  await statGrid(); const G = SG, fx = Math.round((ll.lng - G.x0) / G.dx), fy = Math.round((ll.lat - G.y0) / G.dy), k = fy * G.W + fx;
  if (!(fx >= 0 && fy >= 0 && fx < G.W && fy < G.H) || !G.inside[k]) return;
  const cls = ST_CLN(), where = await placeName([ll.lng, ll.lat]);
  const CUT = { transit: 10, green: 2, health: 10, school: 10 };
  const nm = (d, s) => (d >= 99999 ? "> " + fmt(CUT[s], 1) + " km" : d >= 1000 ? fmt(d / 1000, 1) + " km" : fmt(Math.round(d / 10) * 10) + " m");
  const clsOf = (s, c) => (STK[s].cls ? L(...STK[s].cls[c]) : cls[c]);
  const extra = (s) => s === "slope" && G.slopep ? `<br><small class="muted">${L("panta medie", "average slope", "средний уклон")} ~${fmt(G.slopep[k] / 10, 1)}%</small>`
    : s === "flood" && G.hand ? `<br><small class="muted">${G.hand[k] >= 990 ? L("departe de râuri și pâraie", "far from rivers and streams", "далеко от рек и ручьёв") : `~${fmt(G.hand[k] / 10, 1)} m ${L("deasupra cursului de apă", "above the watercourse", "над водотоком")} · ${fmt(G.wdist[k])} m ${L("până la apă", "to the water", "до воды")}`}</small>` : "";
  const rows = ["green", "transit", "air", "health", "school", "slope", "flood"].filter((s) => G.vals[s]).map((s) => { const v = Math.round(stSample(G.vals[s], ll.lng, ll.lat, G.inside)[0]), c = Math.max(0, ST_CLS.findIndex(([lo, hi]) => v >= lo && v < hi));
    return `<tr><td>${esc(STN(s))}</td><td><b class="stpill" style="background:${ST_CLS[c][2]};color:${stInk(c)}">${v}</b> ${clsOf(s, c)}${extra(s)}${G.near[s] ? `<br><small class="muted">${L("cel mai aproape", "nearest", "ближайшее")}: ${nm(G.near[s][k], s)} ${L("pe jos", "on foot", "пешком")}${s === "transit" ? ` · ${G.cum.transit[k]} ${L("linii la ≤ 500 m", "lines within 500 m", "линий в пределах 500 м")}` : s === "school" ? ` · ~${fmt(G.cum.school[k])} ${L("locuri în școli la ≤ 1 km", "school places within 1 km", "мест в школах в пределах 1 км")}` : ""}</small>` : ""}</td></tr>`; }).join("");
  const pd = stSample(G.vals.pop, ll.lng, ll.lat, G.inside)[0] * popScale(), jd = stSample(G.vals.jobs, ll.lng, ll.lat, G.inside)[0];
  popup(ll, `<b>${esc(where || L("Punct pe hartă", "Point on the map", "Точка на карте"))}</b><table class="stpt">${rows}</table>${G.vals.height ? (() => { const hv = stSample(G.vals.height, ll.lng, ll.lat, G.inside)[0]; return hv > 1 ? `<small>${esc(STN("height"))}: ~${fmt(hv, 1)} m ${L("în medie", "on average", "в среднем")}${G.hmax?.[k] ? ` · ${L("cea mai înaltă", "tallest", "самое высокое")} ~${fmt(G.hmax[k])} m` : ""}</small><br>` : ""; })() : ""}<small>${L("Locuitori", "Residents", "Жители")}: ~${fmt(Math.round(pd / 50) * 50)} / km² · ${L("Locuri de muncă", "Jobs", "Рабочие места")}: ~${fmt(Math.round(jd / 50) * 50)} / km²</small>`);
}

// ---------------------------------------------------------------- green space: weights by how landscaped it is (editable by the city hall)
const GCAT = { a: ["Amenajat", "Landscaped", "Благоустроенный", "alei, iluminat, bănci, locuri de joacă", "paths, lighting, benches, playgrounds", "аллеи, освещение, скамейки, площадки"],
  s: ["Semi-amenajat", "Semi-landscaped", "Частично благоустроенный", "poteci, fără dotări", "paths, no facilities", "тропинки, без оснащения"],
  n: ["Natural / neamenajat", "Natural / unlandscaped", "Естественный / неблагоустроенный", "fără poteci", "no paths", "без тропинок"] };
const gName = (c) => L(GCAT[c][0], GCAT[c][1], GCAT[c][2]);
let GCFG = null;
async function greenLoadCfg() {
  const def = SG.g.green.coef; let c = null;
  if (PJ.db) { try { const d = await PJ.db.collection("settings").doc("green").get(); if (d.exists) c = d.data(); } catch {} }
  c ??= store.get("greencfg", null);
  GCFG = { coef: { ...def, ...(c?.coef || {}) }, cat: { ...(c?.cat || {}) }, t: c?.t || null };
  greenApply();
}
function greenApply() {   // value = Σ_r a_r · ln(1 + green ha within r / unit), scaled to the best-served 1% (see build_stats.py)
  const G = SG, gg = G.g.green, n = G.n, N = gg.norm, v = G.vals.green, val = new Float32Array(n);
  for (const [r, a_r] of N.radii) {
    const C = new Float32Array(n);
    for (const c of ["a", "s", "n"]) { const rr = gg.rest[c][r], w = GCFG.coef[c]; for (let i = 0; i < n; i++) C[i] += w * rr[i]; }
    for (const ar of gg.areas) { const w = GCFG.coef[GCFG.cat[ar.id] || ar.cat], vv = ar.v[r]; for (let t = 0; t < ar.k.length; t++) C[ar.k[t]] += w * vv[t]; }
    for (let i = 0; i < n; i++) val[i] += a_r * Math.log1p(C[i] / N.unit);
  }
  for (let i = 0; i < n; i++) v[i] = G.inside[i] ? Math.max(0, Math.min(100, Math.round((100 * val[i]) / N.vmax))) : 0;
  const idx = []; for (let i = 0; i < n; i++) if (G.muni[i] && G.pop[i] > 0) idx.push(i); idx.sort((a, b) => v[a] - v[b]);
  let cc = 0; const dv = new Float32Array(idx.length), cw = new Float32Array(idx.length); idx.forEach((i, t) => { cc += G.pop[i]; dv[t] = v[i]; cw[t] = cc; }); G.dist.green = { v: dv, cw, tot: cc };
  let s = 0; for (let i = 0; i < n; i++) s += v[i] * G.pop[i] * G.muni[i]; G.ref.green = s / cc;
}
async function greenSave() {
  GCFG.t = new Date().toISOString();
  const doc = { coef: GCFG.coef, cat: GCFG.cat, t: GCFG.t };
  store.set("greencfg", doc);
  if (PJ.db) { try { await PJ.db.collection("settings").doc("green").set(doc); } catch {} }
  greenApply(); SG.f = {};
  const admin = await adminFC(); admin.__stats = false;
  for (const l of map.getStyle().layers) if (/^(stc-|sth-).*green/.test(l.id)) map.removeLayer(l.id);
  for (const id of Object.keys(map.getStyle().sources)) if (/^(stc-|std-).*green/.test(id)) map.removeSource(id);
  await render();
}
function greenCfgHtml() {
  const gg = SG?.g?.green; if (!gg?.areas || !GCFG) return "";
  const adm = typeof isOff === "function" && isOff(), pc = (x) => Math.round(x * 100);
  const sum = { a: 0, s: 0, n: 0 }; for (const a of gg.areas) sum[GCFG.cat[a.id] || a.cat] += a.ha;
  const catSel = (a) => { const c = GCFG.cat[a.id] || a.cat; return adm ? `<select data-gcat="${a.id}">${["a", "s", "n"].map((k) => `<option value="${k}" ${k === c ? "selected" : ""}>${gName(k)}</option>`).join("")}</select>` : `<span class="gtag g${c}">${gName(c)}</span>`; };
  return `<li><details class="how gcfg" ${SH.gcfgOpen ? "open" : ""}><summary>${L("Cum se numără spațiile verzi", "How green space is counted", "Как считаются зелёные зоны")}${adm ? ` · ${L("editabil", "editable", "можно менять")}` : ""}</summary>
    <p class="small">${L("Fiecare hectar contează după cât de amenajat e. La spațiile semi-amenajate și naturale se numără doar partea la cel mult 100 m de o potecă sau de margine (interiorul unei păduri mari nu e folosit zilnic). Categoria vine automat din OpenStreetMap (densitatea aleilor, alei iluminate, bănci, locuri de joacă, toalete); primăria o poate corecta.", "Each hectare counts by how landscaped it is. For semi-landscaped and natural areas only the part within 100 m of a path or the edge counts (the inside of a large forest is not used daily). The category comes from OpenStreetMap (path density, lit paths, benches, playgrounds, toilets); the city hall can correct it.", "Каждый гектар учитывается по степени благоустройства. Для частично благоустроенных и естественных зон считается только полоса до 100 м от тропинки или края (глубь большого леса не используется ежедневно). Категория берётся из OpenStreetMap (плотность аллей, освещённые аллеи, скамейки, площадки, туалеты); мэрия может её исправить.")}</p>
    <div class="gcoef">${["a", "s", "n"].map((k) => `<div><span class="gtag g${k}">${gName(k)}</span><small>${L(GCAT[k][3], GCAT[k][4], GCAT[k][5])} · ${fmt(sum[k], 0)} ha ${L("în zonele cu nume", "in named areas", "в именованных зонах")}</small>${adm ? `<label><input type="number" min="0" max="100" step="5" value="${pc(GCFG.coef[k])}" data-gcoef="${k}">%</label>` : `<b>${pc(GCFG.coef[k])}%</b>`}</div>`).join("")}</div>
    <input type="search" class="pjin" id="gfind" placeholder="${L("Caută un parc sau o pădure…", "Find a park or forest…", "Найти парк или лес…")}" value="${esc(SH.gfind || "")}">
    <ol class="glist">${gg.areas.filter((a) => !SH.gfind || deacc(a.n).includes(deacc(SH.gfind))).slice(0, 40).map((a) => `<li><button type="button" class="glink" data-garea="${a.id}">${esc(a.n)}</button><small>${fmt(a.ha, 0)} ha · ${fmt(a.km, 1)} km ${L("alei", "paths", "аллей")}</small>${catSel(a)}</li>`).join("")}</ol>
    ${adm ? `<div class="btnrow"><button type="button" class="btn sm" id="gsave">${L("Aplică și salvează", "Apply and save", "Применить и сохранить")}</button><button type="button" class="btn ghost sm" id="greset">${L("Revino la clasificarea automată", "Back to automatic classification", "Вернуть автоматическую классификацию")}</button></div>` : `<p class="small">${L("Doar primăria (administrator) poate schimba categoriile.", "Only the city hall (administrator) can change the categories.", "Менять категории может только мэрия (администратор).")}</p>`}
    ${GCFG.t ? `<p class="small muted">${L("Ultima modificare", "Last changed", "Последнее изменение")}: ${new Date(GCFG.t).toLocaleString(loc())}</p>` : ""}</details></li>`;
}
document.addEventListener("toggle", (e) => { if (e.target.classList?.contains("gcfg")) SH.gcfgOpen = e.target.open; }, true);
document.addEventListener("input", (e) => {
  if (e.target.id !== "gfind") return;
  SH.gfind = e.target.value; clearTimeout(SH.gft);
  SH.gft = setTimeout(() => { const ol = document.querySelector(".glist"); if (!ol) return; const tmp = document.createElement("div"); tmp.innerHTML = greenCfgHtml(); ol.replaceWith(tmp.querySelector(".glist")); }, 200);
});
document.addEventListener("change", (e) => {
  const d = e.target.dataset || {};
  if (d.gcoef) GCFG.coef[d.gcoef] = Math.max(0, Math.min(100, +e.target.value || 0)) / 100;
  if (d.gcat) { const a = SG.g.green.areas.find((x) => x.id === d.gcat); if (a && e.target.value === a.cat) delete GCFG.cat[d.gcat]; else GCFG.cat[d.gcat] = e.target.value; }
});
document.addEventListener("click", (e) => {
  if (e.target.id === "gsave") { greenSave().then(() => toast(L("Spațiile verzi au fost recalculate.", "Green space recalculated.", "Зелёные зоны пересчитаны."))); return; }
  if (e.target.id === "greset") { GCFG.coef = { ...SG.g.green.coef }; GCFG.cat = {}; greenSave(); return; }
  const a = e.target.closest?.("[data-garea]");
  if (a) { const x = SG.g.green.areas.find((q) => q.id === a.dataset.garea); if (!x) return; const c = GCFG.cat[x.id] || x.cat;
    map.flyTo({ center: x.c, zoom: 14 }); popup({ lng: x.c[0], lat: x.c[1] }, `<b>${esc(x.n)}</b><br><small>${gName(c)} · ${fmt(x.ha, 0)} ha · ${L("se numără", "counted", "учитывается")} ${fmt(x.uha, 0)} ha · ${fmt(x.km, 1)} km ${L("alei", "paths", "аллей")}</small>`); }
});
