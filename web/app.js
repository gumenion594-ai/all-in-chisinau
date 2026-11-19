/* Atlasul Municipiului Chișinău — MapLibre GL app. Data: OpenStreetMap, BNS census 2024, EOX Sentinel-2, AWS terrain. */
(() => {
"use strict";

// ================================================================== i18n
const T = {
  ro: {
    title: "All in Chișinău", sec_home: "Acasă", sec_archive: "Documente", sec_settings: "Setări", sec_chat: "Asistent", sec_atlas: "Atlas", sec_projects: "Proiecte și petiții", sec_transit: "Transport", sec_guide: "Ghid turistic", sec_news: "Noutăți", sec_account: "Cont", admin: "Admin", pop: "Populație", zone: "Zonare", places: "Locuri",
    transit: "Transport", roads: "Drumuri", level: "Nivel administrativ",
    l1: "1 · Sectoare", l1d: "5 sectoare, cu tot teritoriul suburban",
    l2: "2 · Primării și sectoare urbane", l2d: "Orașe, comune și orașul Chișinău pe sectoare",
    l3: "3 · Cartiere și sate", l3d: "Cartiere urbane și din suburbii, sate din comune",
    create: "Creează", project: "Proiect", rename: "Redenumește", closeproj: "Închide proiectul", padmin: "Schimbări administrative", proads: "Drumuri noi", pnb: "Cartier nou", ped: "Zonă pietonală", pjbtn: "Proiecte", build: "Meniu de construcții", buildbtn: "Construcții", age: "Vechime", temp: "Vreme", cmp: "Comparație", cmp_h: "Bifează un oraș: conturul apare la mijlocul hărții, la aceeași scară. Trage de contur (sau de etichetă) ca să-l muți pe hartă.",
    cmp_note: "Contururile sunt limitele administrative din OpenStreetMap, la mărimea reală (proiecție echivalentă). New York City și Manhattan sunt fără ape, după limitele oficiale tăiate pe linia țărmului (NYC Planning). Bălți = municipiul (cu Elizaveta și Sadovoe).",
    cmp_center: "Adu la mijloc", cmp_ref: "Pentru comparație", age_l: "Perioada de construcție a clădirilor", age_n: "clădiri în municipiu", age_load: "Se încarcă clădirile (≈10 MB)…",
    age_note: "Cum e datată fiecare clădire, în ordinea încrederii: (1) anul exact din OpenStreetMap și Wikidata (~330 de clădiri); (2) monumentele ocrotite fără an: Imperiul Rus în Centrul Istoric, perioada românească în rest; (3) casele joase din Centrul Istoric: Imperiul Rus; (4) restul, din imaginile satelitare GHSL (Comisia Europeană) din 1975–2020: ce exista deja în 1975 e încadrat în perioada sovietică (orașul a fost în mare parte reconstruit după 1944), iar ce a apărut după 1990 în perioada independenței. Gri: clădirile pe care sateliții nu le detectează deloc. La zoom mic, harta arată zonele din jurul clădirilor fiecărei perioade.",
    age_replace: "Înlocuiește harta de zonare când sunt afișate împreună.",
    t_now: "Acum în municipiu", t_mean: "medie", t_range: "min–max", t_day: "Media zilei", t_chart: "Temperatura medie zilnică (°C)", t_fc: "prognoză",
    t_nodata: "Nu există hartă de temperatură pentru data aleasă (disponibil: ultimele 30 de zile și prognoza).",
    t_note: "Temperatura actuală și prognoza: MET Norway pe o grilă de 247 de puncte; trecutul: Open-Meteo (Chișinău). Harta combină cele 247 de puncte cu altitudinea (0,65 °C la 100 m). Culorile sunt absolute (albastru la frig, roșu vara); diferențele dintre zone sunt ușor accentuate ca să se vadă. Marcajul de pe scală arată intervalul din municipiu. Noaptea, mai ales toamna și iarna, văile pot fi mai reci decât dealurile (inversiune termică). Datele sunt cele de la publicare și nu se actualizează singure.",
    t_upd: "Actualizat",
    zv_use: "Folosința terenului", zv_built: "Zone construite", built_l: "Zone construite (clădiri + curțile din jur)", built_area: "Suprafață construită",
    built_n: "Clădiri în municipiu", built_share: "din suprafața municipiului", built_note: "Clădiri din OpenStreetMap plus amprentele Microsoft (2026) pentru casele lipsă din OSM; zona include ~20 m în jurul fiecărei clădiri.",
    hideout: "Ascunde tot ce e în afara municipiului", region: "Arată doar regiunea", region_all: "Tot municipiul", region_note: "Restul hărții se ascunde; regiunea urmează limitele alese (azi / 2027).",
    measure: "Măsurare", menu: "Meniu", life: "Nivel de trai", newproj: "Proiect nou", area_mun: "Suprafața municipiului",
    unmapped: "Nemapat / altele", zone_tot: "Suprafață în municipiu (km² · % din total)", only: "Doar această hartă (fără fundal)", keep: "Păstrează harta când schimbi tab-ul (suprapunere)",
    kept_on: "Suprapuse", remove: "Elimină", keep_hint: "Dublu-clic (sau dublu-tap) pe un tab îl păstrează pe hartă când treci la altul; încă un dublu-clic îl scoate.",
    kept_tip_on: "Păstrat pe hartă. Dublu-clic ca să-l scoți.", kept_tip_off: "Dublu-clic ca să păstrezi harta când schimbi tab-ul.", places_v: "Locuri pe hartă (vizibile la orice zoom, ca să vezi densitatea)",
    date: "Data", today: "Azi", plan: "Planificare proiecte", soon: "În curând: planificarea proiectelor municipale",
    auto_b: "După dată", auto_d: (r) => r === "ref" ? "Data aleasă e după alegerile din 2027" : "Data aleasă e înainte de alegerile din 2027",
    popview: "Afișare", pv_units: "Pe unități", pv_heat: "Hartă de căldură", pv_hills: "Dealuri 3D", popwhat: "Ce arăți", pw_pop: "Locuitori", pw_jobs: "Locuri de muncă", pw_ratio: "Navetă (raport)", jobs_note: "Locurile de muncă sunt estimate din clădirile nelocuite (birouri, industrie, comerț, școli, spitale), zonele industriale și comerciale și din locurile din OpenStreetMap; totalul e adus la circa 350.000 în municipiu. Nu există date oficiale pe cartiere.", hills_n: "Înălțimea arată densitatea populației: cu cât mai mulți locuitori, cu atât mai înalt „dealul”. Ține apăsat clic dreapta (sau două degete) ca să rotești și să înclini harta.", heat_l: "Densitatea populației (estimare pe clădiri)", low: "scăzută", high: "ridicată",
    ring: "Inelul de transport planificat (Centura Chișinăului)", ring_ex: "Existent (urmează modernizarea la 4 benzi)", ring_pr: "Propus (în OSM)", ring_ap: "Traseu aproximativ (lipsă din date)",
    elev_l: "Altitudine (m)", snap: "Clădirile, locurile și drumurile sunt cele din OpenStreetMap la 17.11.2026; populația, limitele și bugetul urmează data aleasă.",
    census_d: "Recensământ 2024 → estimări BNS la data aleasă",
    b_title: "Bugetul municipal", b_rev: "Venituri", b_exp: "Cheltuieli", b_bal: "Deficit", b_tr: "din care transferuri de stat", b_pc: "Cheltuieli pe locuitor",
    b_src: "Surse", bln: "mld lei", lei: "lei",
    borders: "Limite", ref_b: "Din 2027", ref_d: "După amalgamare (alegerile locale 2027)", cur_b: "Actuale", cur_d: "Limitele în vigoare azi",
    ctx: "Limitele localităților vecine", scen: "Scenariu populație",
    census: "Recensământ 2024", est: "Estimare BNS 2019", d3: "Clădiri 3D", terrain: "Relief 3D (dealuri și văi)",
    outside_poi: "Arată locurile și din afara municipiului", labels: "Denumiri de localități și cartiere", names: "Denumiri de străzi, parcuri și locuri",
    view: "Vizualizare", basemap: "Hartă de bază", display: "Afișare",
    b_std: "Standard", b_simple: "Simplă", b_sat: "Satelit", b_elev: "Altitudine",
    sat_note: "Imaginea satelitară are rezoluție de 10 m (Sentinel-2, 2023): bună pentru cartiere, nu pentru clădiri individuale.",
    t_line: "Distanță", t_poly: "Suprafață", t_circle: "Cerc", radius: "Raza", finish: "Gata", clear: "Șterge",
    h_line: "Apăsați pe hartă pentru a adăuga puncte. Dublu-clic sau „Gata” pentru a termina.",
    h_poly: "Apăsați pe hartă pentru colțurile zonei. Dublu-clic, clic pe primul punct sau „Gata” pentru a închide.",
    h_circle: "Apăsați pe hartă pentru centrul cercului, apoi ajustați raza.",
    length: "Lungime", areaL: "Suprafață", perim: "Perimetru", see: "Vezi informații", calc: "Se calculează…",
    pop_total: "Total municipiu", popl: "Populație", area: "Suprafață", dens: "Densitate", buildings: "Clădiri",
    src: "Sursa", method: "Limite", sector: "Sector", unit: "Primărie",
    clickhint: "Apăsați pe o zonă pentru populație și detalii, sau folosiți butonul Măsurare din bara de sus.",
    trolleybus: "Troleibuz", bus: "Autobuz", minibus: "Rutieră", train: "Tren",
    stops: "Stații de transport public", route: "Rută", allroutes: "Toate rutele", trainline: "Tren suburban Sîngera – Strășeni",
    lanes: "Lățimea liniei = numărul de benzi", lanes_est: "benzi estimate (fără etichetă OSM)",
    bike: "Piste și benzi pentru biciclete", projects: "Proiecte rutiere în curs (punctat)",
    track: "Pistă separată", lane: "Bandă pe carosabil", construction: "În construcție", proposed: "Propus / planificat",
    density: "Densitate (loc./km²)", persons: "loc.", outside: "în afara municipiului",
    routes_here: "Rute la această stație", none: "—", all: "Toate", none_btn: "Niciuna",
    places_h: "Alegeți ce locuri apar pe hartă. Apăsați pe o pictogramă pentru detalii.",
    s_people: "Oameni și clădiri", s_places: "Locuri", s_mob: "Transport și infrastructură", s_terrain: "Relief",
    road_km: "Drumuri (km)", lane_km: "Benzi de circulație (km)", rail_km: "Cale ferată activă (km)", rail_tr: "Linii de cale ferată (km de șină)",
    elev: "Altitudine min / medie / max", popest: "Populație estimată", pop_note: "estimare după clădirile locuibile, Recensământ 2024",
    lvlname: { mun: "Municipiu", 1: "Sector", 2: "Primărie", 3: "Cartier / sat", ctx: "Localitate vecină", poly: "Zonă desenată", circle: "Cerc", line: "Traseu măsurat" },
    cat: { shop: "Magazine", mall: "Centre comerciale", food: "Restaurante, baruri, fast-food", cafe: "Cafenele", business: "Firme și servicii",
      health: "Spitale, clinici, stomatologii", pharmacy: "Farmacii", gov: "Instituții de stat, primării, poliție", school: "Școli, licee",
      kindergarten: "Grădinițe", college: "Colegii și școli profesionale", university: "Universități", religion: "Biserici și lăcașuri de cult", museum: "Muzee", monument: "Monumente istorice", hotel: "Hoteluri și pensiuni", park: "Parcuri și scuaruri" },
    z: { residential: "Locuințe", commercial: "Comerț / birouri", industrial: "Industrie / depozite", public: "Instituții publice, școli, spitale",
      park: "Parcuri și grădini", sport: "Sport", forest: "Păduri", agri: "Agricol (arabil, livezi, vii)", grass: "Pajiști / tufișuri",
      water: "Ape", wetland: "Zone umede", cemetery: "Cimitire", military: "Militar", transport: "Transport (gări, aeroport)",
      construction: "Șantiere / terenuri libere", quarry: "Cariere / depozite deșeuri", bare: "Teren neacoperit" },
    hours: "Program", addr: "Adresă", web: "Site", photo: "Foto: Wikimedia Commons", elevword: "Altitudine",
    about: "Despre date", lang: "EN", sub: (km, n) => `Atlas · ${km} km² · ${n} localități`,
  },
  en: {
    title: "All in Chișinău", sec_home: "Home", sec_archive: "Documents", sec_settings: "Settings", sec_chat: "Assistant", sec_atlas: "Atlas", sec_projects: "Projects & petitions", sec_transit: "Transport", sec_guide: "Tourist guide", sec_news: "News", sec_account: "Account", admin: "Admin", pop: "Population", zone: "Land use", places: "Places",
    transit: "Transport", roads: "Roads", level: "Administrative level",
    l1: "1 · Sectors", l1d: "5 sectors, including all suburban land",
    l2: "2 · Mayoralties & urban sectors", l2d: "Towns, communes, and Chișinău city by sector",
    l3: "3 · Neighbourhoods & villages", l3d: "City and suburban neighbourhoods, villages within communes",
    create: "Create", project: "Project", rename: "Rename", closeproj: "Close project", padmin: "Administrative changes", proads: "New roads", pnb: "New district", ped: "Pedestrian zone", pjbtn: "Projects", build: "Construction menu", buildbtn: "Construction", age: "Age", temp: "Weather", cmp: "Compare", cmp_h: "Tick a city: its outline appears in the middle of the map at the same scale. Drag the outline (or its label) to move it.",
    cmp_note: "Outlines are OpenStreetMap administrative boundaries at true size (equal-area). New York City and Manhattan are land only, using the official shoreline-clipped boundaries (NYC Planning). Bălți = the municipality (with Elizaveta and Sadovoe).",
    cmp_center: "Bring to centre", cmp_ref: "For comparison", age_l: "Building construction period", age_n: "buildings in the municipality", age_load: "Loading buildings (≈10 MB)…",
    age_note: "How each building is dated, by reliability: (1) exact year from OpenStreetMap and Wikidata (~330 buildings); (2) listed monuments without a year: Russian Empire inside the Historic Centre, Romanian period elsewhere; (3) low-rise houses in the Historic Centre: Russian Empire; (4) the rest from GHSL satellite epochs 1975–2020 (European Commission): anything already standing in 1975 is placed in the Soviet period (the city was largely rebuilt after 1944), anything added after 1990 in the Independence period. Grey: buildings the satellites do not detect at all. Zoomed out, the map shows the areas around each period's buildings.",
    age_replace: "Replaces the land-use map when both are shown.",
    t_now: "Now in the municipality", t_mean: "mean", t_range: "min–max", t_day: "Daily mean", t_chart: "Daily mean temperature (°C)", t_fc: "forecast",
    t_nodata: "No temperature map for the selected date (available: the last 30 days and the forecast).",
    t_note: "Current temperature and forecast: MET Norway on a 247-point grid; past days: Open-Meteo (Chișinău). The map combines the 247 points with altitude (0.65 °C per 100 m). Colours are absolute (blue when cold, red in summer); differences between areas are slightly amplified to stay visible. The marker on the scale shows the range across the municipality. At night, especially in autumn and winter, valleys can be colder than hills (temperature inversion). Data is as of publication and does not update by itself.",
    t_upd: "Updated",
    zv_use: "Land use", zv_built: "Built-up areas", built_l: "Built-up areas (buildings + surrounding yards)", built_area: "Built-up area",
    built_n: "Buildings in the municipality", built_share: "of the municipality's area", built_note: "OpenStreetMap buildings plus Microsoft footprints (2026) for houses missing from OSM; each zone includes ~20 m around every building.",
    hideout: "Hide everything outside the municipality", region: "Show only this region", region_all: "Whole municipality", region_note: "The rest of the map is hidden; the region follows the selected borders (today / 2027).",
    measure: "Measure", menu: "Menu", life: "Living standards", newproj: "New project", area_mun: "Municipality area",
    unmapped: "Unmapped / other", zone_tot: "Area in the municipality (km² · % of total)", only: "Only this map (no background)", keep: "Keep this map when switching tabs (overlay)",
    kept_on: "Overlaid", remove: "Remove", keep_hint: "Double-click (or double-tap) a tab to keep it on the map when you switch; double-click again to remove it.",
    kept_tip_on: "Kept on the map. Double-click to remove.", kept_tip_off: "Double-click to keep this map when switching tabs.", places_v: "Places on the map (shown at every zoom, so you can see their density)",
    date: "Date", today: "Today", plan: "Project planning", soon: "Coming soon: municipal project planning",
    auto_b: "By date", auto_d: (r) => r === "ref" ? "Selected date is after the 2027 elections" : "Selected date is before the 2027 elections",
    popview: "Display", pv_units: "By unit", pv_heat: "Heat map", pv_hills: "3D hills", popwhat: "Show", pw_pop: "Residents", pw_jobs: "Jobs", pw_ratio: "Commuting (ratio)", jobs_note: "Jobs are estimated from non-residential buildings (offices, industry, retail, schools, hospitals), industrial and commercial land and OpenStreetMap places; the total is set to about 350,000 in the municipality. There is no official data by neighbourhood.", hills_n: "Height shows population density: the more residents, the higher the “hill”. Hold the right mouse button (or use two fingers) to rotate and tilt the map.", heat_l: "Population density (building-based estimate)", low: "low", high: "high",
    ring: "Planned transport ring (Centura Chișinăului)", ring_ex: "Existing (to be widened to 4 lanes)", ring_pr: "Proposed (in OSM)", ring_ap: "Approximate route (missing from data)",
    elev_l: "Elevation (m)", snap: "Buildings, places and roads are the OpenStreetMap state of 17 Nov 2026; population, borders and budget follow the selected date.",
    census_d: "2024 Census → NBS estimates at the selected date",
    b_title: "Municipal budget", b_rev: "Revenue", b_exp: "Expenditure", b_bal: "Deficit", b_tr: "of which state transfers", b_pc: "Spending per resident",
    b_src: "Sources", bln: "bn lei", lei: "lei",
    borders: "Borders", ref_b: "From 2027", ref_d: "After amalgamation (2027 local elections)", cur_b: "Current", cur_d: "Borders in force today",
    ctx: "Neighbouring localities' borders", scen: "Population scenario",
    census: "2024 Census", est: "NBS estimate 2019", d3: "3D buildings", terrain: "3D terrain (hills and valleys)",
    outside_poi: "Show places outside the municipality too", labels: "Locality and district names", names: "Street, park and place names",
    view: "View", basemap: "Base map", display: "Display",
    b_std: "Standard", b_simple: "Simple", b_sat: "Satellite", b_elev: "Elevation",
    sat_note: "Satellite imagery is 10 m resolution (Sentinel-2, 2023): good for neighbourhoods, not individual buildings.",
    t_line: "Distance", t_poly: "Area", t_circle: "Circle", radius: "Radius", finish: "Done", clear: "Clear",
    h_line: "Tap the map to add points. Double-click or “Done” to finish.",
    h_poly: "Tap the map to add the corners. Double-click, tap the first point or “Done” to close.",
    h_circle: "Tap the map to place the centre, then adjust the radius.",
    length: "Length", areaL: "Area", perim: "Perimeter", see: "See information", calc: "Calculating…",
    pop_total: "Municipality total", popl: "Population", area: "Area", dens: "Density", buildings: "Buildings",
    src: "Source", method: "Borders", sector: "Sector", unit: "Mayoralty",
    clickhint: "Tap an area for population and details, or use the Measure button in the top bar.",
    trolleybus: "Trolleybus", bus: "Bus", minibus: "Minibus", train: "Train",
    stops: "Public transport stops", route: "Route", allroutes: "All routes", trainline: "Suburban train Sîngera – Strășeni",
    lanes: "Line width = number of lanes", lanes_est: "lanes estimated (no OSM tag)",
    bike: "Bike paths and lanes", projects: "Road projects underway (dotted)",
    track: "Separated track", lane: "On-street lane", construction: "Under construction", proposed: "Proposed / planned",
    density: "Density (people/km²)", persons: "people", outside: "outside the municipality",
    routes_here: "Routes at this stop", none: "—", all: "All", none_btn: "None",
    places_h: "Choose which places appear on the map. Tap an icon for details.",
    s_people: "People and buildings", s_places: "Places", s_mob: "Transport and infrastructure", s_terrain: "Terrain",
    road_km: "Roads (km)", lane_km: "Traffic lanes (km)", rail_km: "Active railway (km)", rail_tr: "Railway track (km of rail)",
    elev: "Elevation min / mean / max", popest: "Estimated population", pop_note: "estimate from residential buildings, 2024 Census",
    lvlname: { mun: "Municipality", 1: "Sector", 2: "Mayoralty", 3: "Neighbourhood / village", ctx: "Neighbouring locality", poly: "Drawn area", circle: "Circle", line: "Measured route" },
    cat: { shop: "Shops", mall: "Shopping malls", food: "Restaurants, bars, fast food", cafe: "Cafés", business: "Businesses and services",
      health: "Hospitals, clinics, dentists", pharmacy: "Pharmacies", gov: "Government, town halls, police", school: "Schools, lyceums",
      kindergarten: "Kindergartens", college: "Colleges and vocational schools", university: "Universities", religion: "Churches and places of worship", museum: "Museums", monument: "Historic monuments", hotel: "Hotels and guesthouses", park: "Parks and squares" },
    z: { residential: "Housing", commercial: "Retail / offices", industrial: "Industry / warehouses", public: "Public institutions, schools, hospitals",
      park: "Parks and gardens", sport: "Sport", forest: "Forest", agri: "Agriculture (fields, orchards, vineyards)", grass: "Meadow / scrub",
      water: "Water", wetland: "Wetland", cemetery: "Cemeteries", military: "Military", transport: "Transport (stations, airport)",
      construction: "Construction / vacant land", quarry: "Quarries / landfills", bare: "Bare ground" },
    hours: "Hours", addr: "Address", web: "Website", photo: "Photo: Wikimedia Commons", elevword: "Elevation",
    about: "About the data", lang: "RO", sub: (km, n) => `Atlas · ${km} km² · ${n} localities`,
  },
};
const ABOUT = {
  ro: `<p><b>Limite:</b> relațiile administrative OpenStreetMap (municipiu, sectoare, orașe/comune, sate). Varianta „Din 2027” aplică deciziile de amalgamare voluntară adoptate în iulie–august 2026 (alegeri.md): Bubuieci + Floreni + Maximovca; Budești + Cruzești + Bălțata + Cimișeni; Ciorescu + Hrușova + Zăicana. Condrița trece la amalgamare normativă, cu partener încă nestabilit, deci rămâne neschimbată. Pe nivelul 3, cartierele sunt delimitate aproximativ după punctele de cartier din OSM, iar terenul extravilan e atribuit satului celui mai apropiat; nu există limite oficiale de cartier.</p>
  <p><b>Populație:</b> Recensământul 2024 (BNS) pe fiecare oraș și sat; orașul Chișinău pe sectoare după ponderile Anuarului BNS 2015; cartierele după suprafața locuibilă a clădirilor (estimare). Fiecare nivel însumează exact nivelul de deasupra. Pentru zonele desenate, populația e estimată din clădirile locuibile. „Estimare BNS 2019” (832 865) scalează toate valorile proporțional.</p>
  <p><b>Transport și drumuri:</b> rute și stații din OSM; trenul Sîngera – Strășeni urmează calea ferată. Lățimea drumurilor după eticheta <i>lanes</i>; unde lipsește, estimată după clasă. Drumurile subterane (ex. galeriile de la Cricova) și cele de serviciu nu sunt numărate. „Cale ferată activă” = lungimea traseului (liniile paralele numărate o dată); „km de șină” = toate liniile, inclusiv cele de garare.</p>`,
  en: `<p><b>Borders:</b> OpenStreetMap administrative relations (municipality, sectors, towns/communes, villages). The “From 2027” option applies the voluntary amalgamation decisions adopted in July–August 2026 (alegeri.md): Bubuieci + Floreni + Maximovca; Budești + Cruzești + Bălțata + Cimișeni; Ciorescu + Hrușova + Zăicana. Condrița goes to compulsory amalgamation with a partner not yet set, so it stays unchanged. At level 3, neighbourhoods are approximate (nearest OSM neighbourhood point) and farmland goes to the nearest village; no official neighbourhood borders exist.</p>
  <p><b>Population:</b> 2024 Census (NBS) for every town and village; Chișinău city split by sector using the 2015 NBS yearbook shares; neighbourhoods by residential floor area (estimate). Every level sums exactly to the level above. For drawn areas, population is estimated from residential buildings. “NBS estimate 2019” (832,865) scales all values proportionally.</p>
  <p><b>Transport and roads:</b> routes and stops from OSM; the Sîngera – Strășeni train follows the railway. Road width from the <i>lanes</i> tag, estimated by road class where missing. Underground roads (e.g. the Cricova wine galleries) and service roads are not counted. “Active railway” = route length (parallel tracks counted once); “km of rail” = all tracks including sidings.</p>`,
};
const store = {
  get(k, d) { try { const v = localStorage.getItem("chi-atlas2-" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("chi-atlas2-" + k, JSON.stringify(v)); } catch {} },
};
const MAPS = ["admin", "pop", "zone", "age", "temp", "cmp", "transit", "roads"];
const SECDIR = { Ciocana: ["Est", "East"], Centru: ["Sud-Vest", "South-West"], "Rîșcani": ["Nord", "North"], Botanica: ["Sud", "South"], Buiucani: ["Nord-Vest", "North-West"] };
const CMP_KEEP = ["nyc", "berlin", "bucuresti", "balti"];
const cmpList = () => load("compare.json").then((l) => l.filter((c) => CMP_KEEP.includes(c.k)));
const CMPCOL = { nyc: "#e8590c", manhattan: "#c2255c", berlin: "#1c7ed6", barcelona: "#2b8a3e", bucuresti: "#7048e8", iasi: "#0c8599", balti: "#5c3d2e", stuttgart: "#d6336c", heilbronn: "#f08c00" };
const AGECOL = ["#b8b8b8", "#f2c418", "#f0782d", "#c2306f", "#5b2a9e"];
const AGE_RO = ["Nedatat", "Imperiul Rus (până în 1918)", "Perioada românească (1918–1941)", "URSS (1941–1991)", "Independența (1991–prezent)"];
const AGE_EN = ["Undated", "Russian Empire (before 1918)", "Romanian rule (1918–1941)", "USSR (1941–1991)", "Independence (1991–present)"];
const AGE_ORDER = [1, 2, 3, 4, 0];
const TEMP_STOPS = [[-20, "#313695"], [-10, "#4575b4"], [-3, "#74add1"], [2, "#abd9e9"], [7, "#e0f3f8"], [12, "#fee090"], [18, "#fdae61"], [24, "#f46d43"], [30, "#d73027"], [35, "#a50026"]];
const CATS = ["shop", "mall", "food", "cafe", "business", "health", "pharmacy", "gov", "school", "kindergarten", "college", "university", "religion", "museum", "monument", "hotel", "park"];
const S = {
  lang: store.get("lang", "ro"), mode: ((m) => (m === "places" ? "admin" : m))(store.get("mode", "admin")), level: store.get("level", 2), ref: ((r) => (r === "cur" ? "auto" : r))(store.get("ref3", "auto")),
  ages: store.get("ages", null),
  zoneView: store.get("zoneView", "use"), region: null, hideOut: store.get("hideOut", false),
  keep: store.get("keep", {}), only: store.get("only", {}),
  cur: store.get("cur", "lei"), date: todayISO(), popView: store.get("popView", "units"), popWhat: store.get("popWhat", "pop"), hillSqrt: store.get("hillSqrt", false), jobTypes: store.get("jobTypes", null),
  ctx: store.get("ctx", true), scen: store.get("scen", "census"), base: store.get("base", "standard"), labels: store.get("labels", true), names: store.get("names", true),
  outside: false, d3: false, terrain: false,
  modes: { trolleybus: true, bus: true, minibus: true, train: true }, route: "", ring: store.get("ring", false), cmp: {},
  zones: null, cats: store.get("cats2", []),
  selected: null, tool: null, draw: { pts: [], done: false, center: null, radius: 1000 },
};
function todayISO() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
const TODAY = todayISO();
const ELECTION = "2027-11-01"; // general local elections, autumn 2027 (approximate day)
const REF = () => (S.ref === "auto" ? (S.date >= ELECTION ? "ref" : "cur") : S.ref);
// municipality population (current borders): census 8 Apr 2024, NBS usual residents 1 Jan 2025 and 1 Jan 2026
const POP_SERIES = [["2024-04-08", 720128], ["2025-01-01", 716740], ["2026-01-01", 714488]];
function popAt(iso) {
  const t = (d) => Date.parse(d + "T00:00:00Z") / 864e5, x = t(iso), P = POP_SERIES.map(([d, v]) => [t(d), v]);
  let a = P[0], b = P[1];
  for (let i = 0; i < P.length - 1; i++) if (x >= P[i][0]) { a = P[i]; b = P[i + 1]; }
  return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
}
// municipal budget by year (billion lei); status depends on the selected date
const BUDGET = {
  2024: { approved: "2024-07-30", rev: 7.565, tr: 3.956, exp: 8.210, note: { ro: "Proiectul de decizie (mai 2024); aprobat de CMC la sfârșitul lui iulie 2024. Cifrele aprobate pot diferi ușor.", en: "Draft decision (May 2024); adopted by the council at the end of July 2024. Adopted figures may differ slightly." },
    src: [["new.chisinau.md – proiect buget 2024", "https://new.chisinau.md/en/act_projects_details/preview_attachment/831.pdf"], ["IPN – consultări buget 2024", "https://ipn.md/en/public-consultations-held-on-draft-municipal-budget-for-2024-7966_1105182.html"]] },
  2025: { approved: null, rev: 8.45, exp: 9.14, note: { ro: "Bugetul pentru 2025 nu a fost aprobat de CMC; orașul a funcționat pe buget provizoriu (dispoziția primarului din 2 ianuarie 2025). Cifrele sunt din proiect.", en: "The 2025 budget was never adopted by the council; the city ran on a provisional budget (mayor's order of 2 Jan 2025). Figures are from the draft." },
    src: [["Primăria Mea – bugetul 2025", "https://primariamea.md/news/ce-prevede-si-de-ce-inca-nu-este-aprobat-bugetul-municipal-pentru-2025"], ["RealMedia – fără buget după zece luni", "https://realmedia.md/chisinaul-fara-buget-dupa-zece-luni-din-2025-ce-spun-consilierii-pas/"]] },
  2026: { approved: "2026-07-13", rev: 9.6, tr: 4.9, exp: 10.8, note: { ro: "Aprobat de CMC la 13 iulie 2026 (după jumătate de an pe buget provizoriu). Deficitul se acoperă din sold, vânzări de active și împrumuturi.", en: "Adopted by the council on 13 July 2026 (after half a year on a provisional budget). The deficit is covered from balances, asset sales and borrowing." },
    src: [["Moldpres – bugetul 2026 votat de CMC", "https://www.moldpres.md/rom/economie/bugetul-municipiului-chisinau-pentru-anul-2026-votat-de-cmc"], ["Telegraph – bugetul 2026 aprobat", "https://telegraph.md/bugetul-municipiului-chisinau-pentru-2026-a-fost-aprobat-pas-s-a-abtinut-de-la-vot/"]] },
  2027: { approved: null, rev: null, exp: null, note: { ro: "Nu există încă un proiect publicat al bugetului 2027 (la 17.11.2026). Primăria estimează că politica fiscală 2027 ar reduce veniturile cu circa 900 mil. lei.", en: "No 2027 draft budget had been published (as of 17 Nov 2026). The city estimates the 2027 fiscal policy would cut its revenue by about 900 million lei." },
    src: [["Logos Press – impactul politicii fiscale 2027", "https://logos-pres.md/en/news/chisinau-and-balti-calculate-the-damage-caused-by-tax-policy-2027/"]] },
};
// living standards (latest figure available on or before the selected date)
const LIFE = {
  gdp: [{ from: "2024-10-01", year: 2023, total: 185.7781, share: 61.2, pc: 278210,
    src: [["BNS – statistica regională", "https://statistica.gov.md/ro/statistic_indicator_details/29"], ["V. Ioniță – analiza mun. Chișinău", "https://ionita.md/2024/10/11/172-analize-economice-analiza-socio-economica-a-mun-chisinau-in-context-national/"]] }],
  hdi: [{ from: "2024-03-13", year: 2022, v: 0.763, rank: null }, { from: "2025-05-06", year: 2023, v: 0.785, rank: 86,
    src: [["PNUD – Raportul dezvoltării umane 2025", "https://www.undp.org/moldova/press-releases/age-ai-moldova-faces-key-choices-ensure-human-development-progress-says-new-undp-report"]] }],
  wage: [{ from: "2026-03-01", label: { ro: "anul 2025", en: "year 2025" }, v: 18708, nat: null },
    { from: "2026-09-01", label: { ro: "semestrul I 2026", en: "H1 2026" }, v: 19834, nat: 16895.7,
      src: [["bani.md – salariul mediu în Chișinău", "https://bani.md/salariul-mediu-in-chisinau-a-sarit-de-19-mii-de-lei-cu-173-peste-media-pe-tara/"], ["BNS – câștigul salarial", "https://statistica.gov.md/ro/castigul-salarial-si-costul-fortei-de-munca-9433.html"]] }],
  poverty: [{ from: "2025-06-01", year: 2024, v: 14.6, nat: 33.6,
    src: [["Primăria Chișinău – nivelul de trai 2024", "https://dgect.chisinau.md/wp-content/uploads/2025/12/nivelul-de-trai-al-populatiei-chisinau-2024.pdf"]] }],
};
const pick = (arr) => { let r = null; for (const x of arr) if (S.date >= x.from) r = x; return r; };
const EUR_RATE = 20.1666, EUR_DATE = "2026-11-17"; // BNM official rate, MDL per 1 EUR
const t = (k) => T[S.lang]?.[k] ?? T.en[k] ?? k;
const nameOf = (p) => (S.lang === "en" ? p.en : p.ro) || p.ro;
const loc = () => ({ ro: "ro-RO", en: "en-GB", ru: "ru-RU" }[S.lang] || "ro-RO");
const fmt = (n, d = 0) => n == null || Number.isNaN(n) ? "—" : Number(n).toLocaleString(loc(), { maximumFractionDigits: d, minimumFractionDigits: d });
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const scMatch = () => ["in", ["get", "sc"], ["literal", [REF(), "both"]]];

// ================================================================== palette
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const isDark = () => { const a = document.documentElement.getAttribute("data-theme"); return a ? a === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
const CATCOL = { shop: "#e8590c", mall: "#c2255c", food: "#d6336c", cafe: "#8d5a3b", business: "#5f3dc4", health: "#e03131", pharmacy: "#2b8a3e",
  gov: "#1c4f8a", school: "#f08c00", kindergarten: "#d9a400", college: "#0c8599", university: "#364fc7", religion: "#862e9c", museum: "#a61e4d", monument: "#5c3d2e", hotel: "#1098ad", park: "#37b24d" };
function pal() {
  const d = isDark();
  return {
    bg: css("--map-bg"), water: css("--map-water"), roadBase: css("--map-road"), rail: css("--map-rail"), line: css("--map-line"),
    ink: css("--fg"), accent: css("--accent"),
    zone: d ? {
      residential: "#b3302f", commercial: "#c27a1e", industrial: "#862e9c", public: "#2f6fa8", park: "#3f9443", sport: "#12b886",
      forest: "#1e5c33", agri: "#9a8f2c", grass: "#5f7f3a", water: "#1864ab", wetland: "#2b8a6e", cemetery: "#9c5fb0",
      military: "#4f7a10", transport: "#3b5bdb", construction: "#8f7650", quarry: "#6a5d50", bare: "#8a6d4a" } : {
      residential: "#e5484d", commercial: "#f7a74a", industrial: "#9c36b5", public: "#74c0fc", park: "#78c96d", sport: "#20c997",
      forest: "#2f8f4e", agri: "#f1e27a", grass: "#c7e39a", water: "#1c7ed6", wetland: "#63e6be", cemetery: "#e599f7",
      military: "#5c940d", transport: "#4c6ef5", construction: "#dcbf8c", quarry: "#8d7b68", bare: "#e8c9a0" },
    mode: { trolleybus: "#1f6fd1", bus: "#1f9a5b", minibus: "#e07b1a", train: "#8a3fc7" },
    road: d ? { motorway: "#4dabf7", trunk: "#4dabf7", primary: "#74c0fc", secondary: "#a5d8ff", tertiary: "#6f95c4", other: "#56708f" }
            : { motorway: "#0b3d91", trunk: "#0b3d91", primary: "#1c64d1", secondary: "#3b82f6", tertiary: "#6aa3f0", other: "#9dbdeb" },
    pop: d ? ["#1c2333", "#203a5c", "#255a87", "#2f7bb0", "#5aa3d4", "#a3d0f0"] : ["#f3f6fb", "#cfe0f2", "#9ec3e6", "#5d9bd3", "#2b6cb0", "#173f73"],
    sector: { Centru: "#c0392b", Buiucani: "#2e86de", Rîșcani: "#8e44ad", Botanica: "#27ae60", Ciocana: "#e67e22" },
  };
}
const SECTOR_COL = ["match", ["get", "sector"], "Centru", "#c0392b", "Buiucani", "#2e86de", "Rîșcani", "#8e44ad", "Botanica", "#27ae60", "Ciocana", "#e67e22", "#888"];

// ================================================================== packed tiles (satellite, terrain, relief)
const PACKS = {};
async function loadBin(name) {
  const j = await fetch(`data/${name}.bin.json`).then((r) => r.json());
  const bin = atob(j.b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}
function loadPack(name) {
  return PACKS[name] ??= loadBin(name).then((buf) => {
    const n = new DataView(buf).getUint32(0, true);
    const idx = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
    return { buf, idx, base: 4 + n };
  });
}
const BLANK = {};
function blankTile(kind) {
  return BLANK[kind] ??= new Promise((res) => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    if (kind === "dem") { const g = c.getContext("2d"); g.fillStyle = "rgb(128,0,0)"; g.fillRect(0, 0, 256, 256); }
    c.toBlob((b) => b.arrayBuffer().then(res), "image/png");
  });
}
maplibregl.addProtocol("pack", async (params) => {
  const [, kind, z, x, y] = params.url.match(/^pack:\/\/(\w+)\/(\d+)\/(\d+)\/(\d+)/);
  const file = kind === "sat" ? (+z >= 14 ? "sat_b" : "sat_a") : kind;
  const p = await loadPack(file);
  const e = p.idx[`${z}/${x}/${y}`];
  if (!e) return { data: await blankTile(kind) };
  return { data: p.buf.slice(p.base + e[0], p.base + e[0] + e[1]) };
});

// ================================================================== map
const BOUNDS = [[28.22, 46.66], [29.50, 47.38]];

// ---------------------------------------------------------------- map text: SDF glyphs rendered in the browser (no glyph server)
// TinySDF © Mapbox, ISC licence (inlined from @mapbox/tiny-sdf)
const SDF_INF = 1e20;

// lookup table for gamma-corrected, signed squared alpha distance values
const sdfAlpha = new Float64Array(256);
for (let i = 0; i < 256; i++) {
    const d = 0.5 - Math.pow(i / 255, 1 / 2.2);
    sdfAlpha[i] = d * Math.abs(d);
}
sdfAlpha[255] = -SDF_INF;

class TinySDF {
    constructor({
        fontSize = 24,
        buffer = 3,
        radius = 8,
        cutoff = 0.25,
        fontFamily = 'sans-serif',
        fontWeight = 'normal',
        fontStyle = 'normal',
        lang = null
    } = {}) {
        buffer = this.buffer = Math.round(buffer); // padding around a glyph's bounding box; integer to keep the grid pixel-aligned
        this.radius = radius; // how many pixels around the glyph edge are encoded as signed distances
        this.cutoff = cutoff; // how much of the SDF byte range represents inside vs outside the edge
        this.lang = lang; // language of the Canvas drawing context

        // make the canvas size big enough to both have the specified buffer around the glyph
        // for "halo", and account for some glyphs possibly being larger than their font size
        const size = this.size = Math.ceil(fontSize) + buffer * 4;

        const canvas = this._createCanvas(size);
        const ctx = this.ctx = canvas.getContext('2d', {willReadFrequently: true});
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left'; // Necessary so that RTL text doesn't have different alignment
        ctx.fillStyle = 'black';
        if (lang) ctx.lang = lang;

        // the glyph is rasterized at (buffer, buffer), so the canvas clips it to this
        const maxGlyphDim = this.maxGlyphDim = size - buffer;
        const gridDim = maxGlyphDim + 2 * buffer;

        // two grids of squared distances: one for the outside of the glyph shape, one for the inside;
        // the signed distance is derived as sqrt(outer) - sqrt(inner)
        this.gridOuter = new Float64Array(gridDim * gridDim);
        this.gridInner = new Float64Array(gridDim * gridDim);
        this.f = new Float64Array(gridDim);
        this.z = new Float64Array(gridDim + 1);
        this.v = new Uint16Array(gridDim);
    }

    _createCanvas(size) {
        if (typeof OffscreenCanvas !== 'undefined') {
            return new OffscreenCanvas(size, size);
        }
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        return canvas;
    }

    draw(char) {
        const {
            width: glyphAdvance,
            actualBoundingBoxAscent,
            actualBoundingBoxDescent,
            actualBoundingBoxLeft,
            actualBoundingBoxRight
        } = this.ctx.measureText(char);

        // The integer/pixel part of the alignment is encoded in metrics.glyphTop/glyphLeft
        // The remainder is implicitly encoded in the rasterization
        const glyphTop = Math.ceil(actualBoundingBoxAscent);
        // actualBoundingBoxLeft is positive when ink extends LEFT of the origin (per spec),
        // so negate to get the ink's left edge in canvas x-coords (positive = right of origin)
        const glyphLeft = Math.floor(-actualBoundingBoxLeft);

        // If the glyph overflows the canvas size, it will be clipped at the bottom/right
        const glyphWidth = Math.max(0, Math.min(this.maxGlyphDim, Math.ceil(actualBoundingBoxRight) - glyphLeft));
        const glyphHeight = Math.max(0, Math.min(this.maxGlyphDim, glyphTop + Math.ceil(actualBoundingBoxDescent)));

        const width = glyphWidth + 2 * this.buffer;
        const height = glyphHeight + 2 * this.buffer;

        const len = width * height;
        const data = new Uint8ClampedArray(len);
        const glyph = {data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance};
        if (glyphWidth === 0 || glyphHeight === 0) return glyph;

        const {ctx, buffer, gridInner, gridOuter} = this;
        ctx.clearRect(buffer, buffer, glyphWidth, glyphHeight);
        ctx.fillText(char, buffer - glyphLeft, buffer + glyphTop);
        const imgData = ctx.getImageData(buffer, buffer, glyphWidth, glyphHeight);

        // default: outside the glyph (SDF_INF distance) for outer, inside (0 distance) for inner
        gridOuter.fill(SDF_INF, 0, len);
        gridInner.fill(0, 0, len);

        // for anti-aliased pixels, treat partial coverage as a distance approximation:
        // a fully covered pixel gets 0 outer / SDF_INF inner; a partial pixel gets a small
        // non-zero outer or inner distance based on how far its coverage deviates from 0.5
        let imgIdx = 3; // start at the alpha channel of the first pixel
        for (let y = 0; y < glyphHeight; y++) {
            let j = (y + buffer) * width + buffer;
            for (let x = 0; x < glyphWidth; x++, imgIdx += 4, j++) {
                const a = imgData.data[imgIdx]; // alpha value
                if (a === 0) continue; // empty pixels
                const t = sdfAlpha[a];
                gridOuter[j] = Math.max(0, t);
                gridInner[j] = Math.max(0, -t);
            }
        }

        // columns left and right of the glyph have no seeds and stay SDF_INF in the column pass, so skip them
        sdfEdt(gridOuter, 0, 0, width, height, width, this.f, this.v, this.z, buffer);
        // Pad the inner EDT region by 1 px so ink pixels touching the bbox edge can see the
        // outside-ink seeds in the buffer region; clamp to buffer so we don't underflow when buffer=0
        const pad = Math.min(buffer, 1);
        sdfEdt(gridInner, buffer - pad, buffer - pad, glyphWidth + 2 * pad, glyphHeight + 2 * pad, width, this.f, this.v, this.z);

        // encode signed distance as a byte: inside the glyph maps to high values, outside to low,
        // with the edge gradient spanning [-radius * cutoff, radius * (1 - cutoff)] pixels around the edge;
        // Uint8ClampedArray rounds and clamps beyond that
        const scale = 255 / this.radius;
        const base = 255 * (1 - this.cutoff);
        for (let i = 0; i < len; i++) {
            const d = Math.sqrt(gridOuter[i]) - Math.sqrt(gridInner[i]);
            data[i] = base - scale * d;
        }

        return glyph;
    }
}

// 2D Euclidean squared distance transform by Felzenszwalb & Huttenlocher https://cs.brown.edu/~pff/papers/dt-final.pdf
function sdfEdt(data, x0, y0, width, height, gridSize, f, v, z, skipCols = 0) {
    for (let x = x0 + skipCols; x < x0 + width - skipCols; x++) sdfEdt1d(data, y0 * gridSize + x, gridSize, height, f, v, z);
    for (let y = y0; y < y0 + height; y++) sdfEdt1d(data, y * gridSize + x0, 1, width, f, v, z);
}

// 1D squared distance transform
function sdfEdt1d(grid, offset, stride, length, f, v, z) {
    v[0] = 0;
    z[0] = -SDF_INF;
    z[1] = SDF_INF;
    f[0] = grid[offset];

    for (let q = 1, k = 0; q < length; q++) {
        const fq = f[q] = grid[offset + q * stride];
        const q2 = q * q;
        let s;
        do {
            const r = v[k];
            s = (fq - f[r] + q2 - r * r) / (q - r) / 2;
        } while (s <= z[k] && --k > -1);

        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = SDF_INF;
    }

    for (let q = 0, k = 0; q < length; q++) {
        while (z[k + 1] < q) k++;
        const r = v[k];
        const qr = q - r;
        grid[offset + q * stride] = f[r] + qr * qr;
    }
}

const SDF = {};
function pbfGlyphs(stack, start, end) {
  const out = [];
  const varint = (a, v) => { v = v >>> 0; while (v > 127) { a.push((v & 127) | 128); v >>>= 7; } a.push(v); };
  const zz = (v) => (v << 1) ^ (v >> 31);
  const field = (a, tag, type) => varint(a, (tag << 3) | type);
  const bytes = (a, tag, b) => { field(a, tag, 2); varint(a, b.length); for (let i = 0; i < b.length; i++) a.push(b[i]); };
  const italic = /italic/i.test(stack), weight = /bold/i.test(stack) ? "700" : /medium/i.test(stack) ? "500" : "400";
  const key = weight + (italic ? "i" : "");
  const sdf = SDF[key] ??= new TinySDF({ fontSize: 24, buffer: 3, radius: 8, cutoff: 0.25, fontFamily: '"Inter", system-ui, "Segoe UI", Arial, sans-serif', fontWeight: weight, fontStyle: italic ? "italic" : "normal" });
  const fs = [];
  bytes(fs, 1, new TextEncoder().encode(stack));
  bytes(fs, 2, new TextEncoder().encode(`${start}-${end}`));
  for (let id = start; id <= end; id++) {
    if (id < 32 || (id > 126 && id < 160)) continue;
    const g = sdf.draw(String.fromCharCode(id)), gm = [];
    field(gm, 1, 0); varint(gm, id);
    if (g.glyphWidth && g.glyphHeight) { bytes(gm, 2, g.data); field(gm, 3, 0); varint(gm, g.glyphWidth); field(gm, 4, 0); varint(gm, g.glyphHeight); }
    else { field(gm, 3, 0); varint(gm, 0); field(gm, 4, 0); varint(gm, 0); }
    field(gm, 5, 0); varint(gm, zz(g.glyphLeft)); field(gm, 6, 0); varint(gm, zz(g.glyphTop - 26)); field(gm, 7, 0); varint(gm, Math.round(g.glyphAdvance));
    bytes(fs, 3, gm);
  }
  bytes(out, 1, fs);
  return new Uint8Array(out).buffer;
}
maplibregl.addProtocol("glyphs", async (params) => {
  const m = params.url.match(/glyphs:\/\/([^/]+)\/(\d+)-(\d+)/);
  try { await document.fonts.load('16px "Inter"'); } catch {}
  return { data: pbfGlyphs(decodeURIComponent(m[1]), +m[2], +m[3]) };
});
const GLYPHS_URL = "glyphs://{fontstack}/{range}";
const ABBR = [[/^Strada /, "str. "], [/^Bulevardul /, "bd. "], [/^Șoseaua /, "șos. "], [/^Stradela /, "str-la "], [/^Calea /, "cal. "], [/^Piața /, "pța "], [/^Aleea /, "al. "], [/^Drumul /, "dr. "], [/^Fundacul /, "fund. "]];
const shortName = (n) => { for (const [r, v] of ABBR) if (r.test(n)) return n.replace(r, v); return n; };
const DBOX = [28.5, 46.82, 29.22, 47.23];
const JOBT = { i: ["Industrie și logistică", "Industry & logistics", "#6741d9"], c: ["Comerț, HoReCa și servicii", "Retail, hospitality & services", "#f08c00"], o: ["Birouri și administrație", "Offices & administration", "#1971c2"],
  e: ["Educație", "Education", "#2f9e44"], s: ["Sănătate", "Health", "#e03131"], t: ["Transport", "Transport", "#495057"] };
const jobSel = () => S.jobTypes || Object.keys(JOBT);
const jobSum = () => ["+", 0, ...jobSel().map((k) => ["coalesce", ["get", k], 0])];
const JOBBR = [0, 100, 500, 1500, 4000, 10000], JOBCOL = ["#fbf3e8", "#f6d7ad", "#f0b36a", "#e07b39", "#b8471c", "#7a2810"];
const RATIOBR = [0, 0.15, 0.35, 0.6, 1, 1.8], RATIOCOL = ["#1d4e89", "#4f86c6", "#a9c8e8", "#f1e3c6", "#ef8a47", "#c0391b"];
async function ensureJobs() {
  const admin = await adminFC(); if (admin.__jobs) return;
  const g = (await load("jobgrid.geojson")).features.map((f) => [f.geometry.coordinates[0], f.geometry.coordinates[1], f.properties.p]);
  for (const f of admin.features) {
    const p = f.properties; if (!f.geometry) continue;
    const pg = prepGeom(f.geometry), [x0, y0, x1, y1] = pg.bbox; let j = 0;
    for (const [x, y, v] of g) if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && pg.has(x, y)) j += v;
    p.jobs = Math.round(j); p.jdens = p.km2 ? Math.round(j / p.km2) : 0; p.jr = p.pop ? Math.round((j / p.pop) * 100) / 100 : (j ? 9 : 0);
  }
  admin.__jobs = true; map.getSource("admin")?.setData(admin);
}
const heatLike = () => S.popView === "heat" || S.popView === "hills";
// ---------------------------------------------------------------- population as terrain: denser areas become higher hills
const GRIDS = {};
const gridFile = (w) => (w === "jobs" ? "jobgrid.geojson" : "popgrid.geojson");
const wantJobs = () => S.popWhat === "jobs";
async function popGrid(what = "pop") {
  if (GRIDS[what]) return GRIDS[what];
  const g = await load(gridFile(what)), dx = 0.00219, dy = 0.0015, x0 = DBOX[0], y0 = DBOX[1];
  const W = Math.ceil((DBOX[2] - x0) / dx) + 1, H = Math.ceil((DBOX[3] - y0) / dy) + 1, a = new Float32Array(W * H);
  for (const f of g.features) { const [x, y] = f.geometry.coordinates, i = Math.round((x - x0) / dx), j = Math.round((y - y0) / dy); if (i >= 0 && j >= 0 && i < W && j < H) a[j * W + i] += f.properties.p; }
  const k = [], R = 4, sg = 1.6; for (let i = -R; i <= R; i++) k.push(Math.exp(-(i * i) / (2 * sg * sg))); const ks = k.reduce((u, v) => u + v, 0);
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let v = 0; for (let t = -R; t <= R; t++) { const ii = Math.min(W - 1, Math.max(0, i + t)); v += a[j * W + ii] * k[t + R]; } tmp[j * W + i] = v / ks; }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let v = 0; for (let t = -R; t <= R; t++) { const jj = Math.min(H - 1, Math.max(0, j + t)); v += tmp[jj * W + i] * k[t + R]; } out[j * W + i] = v / ks; }
  const cellKm2 = (dx * 111.32 * Math.cos((47.0 * Math.PI) / 180)) * (dy * 110.57);
  return (GRIDS[what] = { W, H, dx, dy, x0, y0, a: out, cellKm2 });
}
// heights: proportional by default (90 m per 1,000 per km²); "highlight villages" uses a square root so dispersed places stay visible
const HILL_LIN = 90, HILL_SQRT = 310;
const hillH = (d, sq) => (sq ? Math.sqrt(Math.max(0, d / 1000)) * HILL_SQRT : Math.max(0, d / 1000) * HILL_LIN);
// one fixed colour scale for the hills, from the same smoothed grid as their height (people or jobs per km²)
const HILL_STOPS = [[150, [74, 144, 226, 0]], [400, [74, 144, 226, 150]], [1500, [0, 166, 202, 170]], [4000, [120, 205, 120, 180]], [8000, [249, 208, 87, 190]], [14000, [242, 140, 40, 200]], [22000, [215, 25, 28, 210]]];
function hillCol(d) {
  if (d <= HILL_STOPS[0][0]) return [0, 0, 0, 0];
  for (let i = 1; i < HILL_STOPS.length; i++) {
    const [b, c] = HILL_STOPS[i], [a, p] = HILL_STOPS[i - 1];
    if (d <= b) { const t = (d - a) / (b - a); return p.map((v, k) => v + (c[k] - v) * t); }
  }
  return HILL_STOPS.at(-1)[1];
}
function sampleGrid(G, lon, lat) {
  const fx = (lon - G.x0) / G.dx, fy = (lat - G.y0) / G.dy;
  if (!(fx >= 0 && fy >= 0 && fx < G.W - 1 && fy < G.H - 1)) return 0;
  const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, w = fy - j, A = G.a;
  return (A[j * G.W + i] * (1 - u) + A[j * G.W + i + 1] * u) * (1 - w) + (A[(j + 1) * G.W + i] * (1 - u) + A[(j + 1) * G.W + i + 1] * u) * w;
}
async function gridTile(url, paint) {   // url: what/mode/z/x/y
  const [what, mode, ...zxy] = url.split("/"), [z, x, y] = zxy.map(Number), G = await popGrid(what);
  const N = 256, cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(N, N) : Object.assign(document.createElement("canvas"), { width: N, height: N });
  const ctx = cv.getContext("2d"), img = ctx.createImageData(N, N), n = 2 ** z, s = what === "jobs" ? 1 : popScale();
  for (let py = 0; py < N; py++) {
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + (py + 0.5) / N)) / n))) * 180) / Math.PI;
    for (let px = 0; px < N; px++) {
      const lon = ((x + (px + 0.5) / N) / n) * 360 - 180, d = (sampleGrid(G, lon, lat) * s) / G.cellKm2;
      paint(img.data, (py * N + px) * 4, d, mode);
    }
  }
  ctx.putImageData(img, 0, 0);
  const blob = cv.convertToBlob ? await cv.convertToBlob({ type: "image/png" }) : await new Promise((r) => cv.toBlob(r, "image/png"));
  return { data: await blob.arrayBuffer() };
}
maplibregl.addProtocol("popdem", (params) => gridTile(params.url.replace("popdem://", ""), (a, o, d, mode) => {
  const h = hillH(d, mode === "sqrt") + 32768;
  a[o] = Math.floor(h / 256); a[o + 1] = Math.floor(h) % 256; a[o + 2] = Math.floor((h % 1) * 256); a[o + 3] = 255;
}));
maplibregl.addProtocol("popcol", (params) => gridTile(params.url.replace("popcol://", ""), (a, o, d) => {
  const c = hillCol(d); a[o] = c[0]; a[o + 1] = c[1]; a[o + 2] = c[2]; a[o + 3] = c[3];
}));
const map = new maplibregl.Map({
  container: "map",
  style: { version: 8, glyphs: GLYPHS_URL, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#eee" } }] },
  center: [28.90, 47.03], zoom: 10.1, minZoom: 8.6, maxZoom: 19.5, maxPitch: 75, maxBounds: BOUNDS, attributionControl: false,
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "© OpenStreetMap · BNS 2024 · Sentinel-2 cloudless 2023 © EOX · Terrain Tiles" }));

const DATA = {};
const load = (name) => DATA[name] ??= fetch(`data/${name}`).then((r) => { if (!r.ok) throw new Error(name); return r.json(); });

// ---------------------------------------------------------------- POI icons drawn on canvas (no icon or glyph server needed)
const GLYPH = {
  shop: ["M6 8h12l-1 12H7z", "M9 8V7a3 3 0 0 1 6 0v1"],
  mall: ["M3 21V9l9-5 9 5v12", "M8 21v-6h8v6", "M8 11h8"],
  food: ["M8 3v18", "M5 3v5a3 3 0 0 0 6 0V3", "M17 21V3c-2.5 1.5-3 5-3 8h3"],
  cafe: ["M5 9h11v4a5 5 0 0 1-10 0z", "M16 10h1.5a2.2 2.2 0 0 1 0 4.4H16", "M8 4.5v2M11.5 4.5v2", "M4 20h14"],
  business: ["M4 8h16v11H4z", "M9 8V5h6v3", "M4 13h16"],
  health: ["M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"],
  pharmacy: ["M8.6 17.4l8.8-8.8a3.3 3.3 0 0 0-4.7-4.7l-8.8 8.8a3.3 3.3 0 0 0 4.7 4.7z", "M8.3 8.3l4.7 4.7"],
  gov: ["M3 9l9-5 9 5", "M5 10v8M9.5 10v8M14.5 10v8M19 10v8", "M3 20.5h18"],
  school: ["M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z", "M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"],
  kindergarten: ["M12 4.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", "M6.5 20a5.5 5.5 0 0 1 11 0", "M4 9l2 1M20 9l-2 1"],
  college: ["M14.5 5.5l4 4-9 9-4-4z", "M5.5 18.5L3 21", "M17 3l4 4"],
  university: ["M2 9.5L12 5l10 4.5L12 14z", "M6 11.5v4.5c3 2.2 9 2.2 12 0v-4.5", "M21 10v5"],
  park: ["M12 3l6 8h-3.5l4 6H5.5l4-6H6z", "M12 17v4"],
  religion: ["M12 2.5v19", "M7 7.5h10", "M8.5 15l7-2"],
  museum: ["M3 9l9-5 9 5", "M5 10v8M9.5 10v8M14.5 10v8M19 10v8", "M3 20.5h18", "M10 7h4"],
  monument: ["M10 3h4l1 15H9z", "M6 21h12", "M7.5 18h9"],
  hotel: ["M3 18V7", "M3 14h18v4", "M21 14v-2.5a3 3 0 0 0-3-3h-6v5.5", "M7 11.5a1.6 1.6 0 1 0 0-.1"],
};
function iconImage(cat, size = 26) {
  const r = 2, c = document.createElement("canvas"); c.width = c.height = size * r;
  const g = c.getContext("2d"); g.scale(r, r);
  g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 1.2, 0, Math.PI * 2);
  g.fillStyle = CATCOL[cat]; g.fill(); g.lineWidth = 1.6; g.strokeStyle = "#ffffff"; g.stroke();
  g.save(); const s = (size - 9) / 24; g.translate(4.5, 4.5); g.scale(s, s);
  g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineWidth = 2.1; g.lineCap = "round"; g.lineJoin = "round";
  for (const d of GLYPH[cat]) { const p = new Path2D(d); cat === "health" ? g.fill(p) : g.stroke(p); }
  g.restore();
  return c;
}
const ICON_URL = {};
function addIcons() {
  for (const k of CATS) {
    const c = iconImage(k);
    ICON_URL[k] = c.toDataURL();
    if (!map.hasImage("poi-" + k)) map.addImage("poi-" + k, c.getContext("2d").getImageData(0, 0, c.width, c.height), { pixelRatio: 2 });
  }
}

// ================================================================== init
async function init() {
  addIcons();
  const [admin, landuse, base, roads, rail, train] = await Promise.all(
    ["admin.geojson", "landuse.geojson", "base.geojson", "roads.geojson", "rail.geojson", "train.geojson"].map(load));
  const P = pal();
  map.addSource("sat", { type: "raster", tiles: ["pack://sat/{z}/{x}/{y}"], tileSize: 256, minzoom: 9, maxzoom: 14, bounds: DBOX });
  map.addSource("relief", { type: "raster", tiles: ["pack://relief/{z}/{x}/{y}"], tileSize: 256, minzoom: 9, maxzoom: 12, bounds: DBOX });
  map.addSource("dem", { type: "raster-dem", tiles: ["pack://dem/{z}/{x}/{y}"], tileSize: 256, minzoom: 9, maxzoom: 12, encoding: "terrarium", bounds: DBOX });
  map.addLayer({ id: "sat", type: "raster", source: "sat", layout: { visibility: "none" }, paint: { "raster-fade-duration": 0 } });
  map.addLayer({ id: "relief", type: "raster", source: "relief", layout: { visibility: "none" }, paint: { "raster-fade-duration": 0 } });

  map.addSource("admin", { type: "geojson", data: admin, promoteId: "id" });
  map.addSource("landuse", { type: "geojson", data: landuse });
  map.addSource("base", { type: "geojson", data: base });
  for (const f of roads.features) if (f.properties.n) f.properties.lb = shortName(f.properties.n);
  map.addSource("roads", { type: "geojson", data: roads });
  map.addSource("rail", { type: "geojson", data: rail });
  map.addSource("train", { type: "geojson", data: train });
  map.addSource("draw", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

  map.addLayer({ id: "landuse", type: "fill", source: "landuse", paint: { "fill-color": "#ccc", "fill-opacity": 0.35 } });
  map.addLayer({ id: "water-line", type: "line", source: "base", paint: { "line-color": P.water,
    "line-width": ["interpolate", ["linear"], ["zoom"], 10, ["match", ["get", "w"], "river", 1.6, 0.4], 15, ["match", ["get", "w"], "river", 5, 1.2]] } });
  map.addLayer({ id: "roads-base", type: "line", source: "roads", layout: { "line-cap": "round", "line-join": "round" },
    filter: ["!=", ["get", "c"], "pedestrian"],
    paint: { "line-color": P.roadBase, "line-width": ["interpolate", ["linear"], ["zoom"],
      10, ["match", ["get", "c"], ["motorway", "trunk", "primary"], 1.4, ["secondary", "tertiary"], 0.8, 0.0],
      13, ["match", ["get", "c"], ["motorway", "trunk", "primary"], 3, ["secondary", "tertiary"], 2, 1],
      17, ["match", ["get", "c"], ["motorway", "trunk", "primary"], 14, ["secondary", "tertiary"], 10, 6]] } });
  map.addLayer({ id: "rail", type: "line", source: "rail", filter: ["==", ["get", "r"], "rail"],
    paint: { "line-color": P.rail, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 16, 3], "line-dasharray": [3, 2] } });
  map.addLayer({ id: "roads-casing", type: "line", source: "roads", layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
    filter: ["!=", ["get", "c"], "pedestrian"],
    paint: { "line-color": isDark() ? "#000" : "#ffffff", "line-opacity": isDark() ? 0.75 : 0.95,
      "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 10, ["+", 1, ["*", 0.5, ["max", 1, ["get", "l"]]]], 13, ["+", 1.6, ["*", 1.25, ["max", 1, ["get", "l"]]]], 16, ["+", 2.5, ["*", 4.2, ["max", 1, ["get", "l"]]]], 18, ["+", 3, ["*", 11, ["max", 1, ["get", "l"]]]]] } });
  map.addLayer({ id: "roads-lanes", type: "line", source: "roads", layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
    filter: ["!=", ["get", "c"], "pedestrian"],
    paint: {
      "line-color": ["match", ["get", "c"], ["motorway", "motorway_link"], P.road.motorway, ["trunk", "trunk_link"], P.road.trunk,
        ["primary", "primary_link"], P.road.primary, ["secondary", "secondary_link"], P.road.secondary, ["tertiary", "tertiary_link"], P.road.tertiary, P.road.other],
      "line-opacity": ["case", ["==", ["get", "e"], 1], 0.8, 1],
      "line-width": ["interpolate", ["exponential", 1.6], ["zoom"],
        10, ["*", 0.5, ["max", 1, ["get", "l"]]], 13, ["*", 1.25, ["max", 1, ["get", "l"]]], 16, ["*", 4.2, ["max", 1, ["get", "l"]]], 18, ["*", 11, ["max", 1, ["get", "l"]]]] } });

  map.addLayer({ id: "admin-fill", type: "fill", source: "admin", paint: { "fill-color": "#000", "fill-opacity": 0 } });
  map.addLayer({ id: "admin-ctx", type: "line", source: "admin", filter: ["==", ["get", "lvl"], "ctx"],
    paint: { "line-color": P.line, "line-width": 1, "line-dasharray": [2, 2], "line-opacity": 0.75 } });
  map.addLayer({ id: "admin-line", type: "line", source: "admin", layout: { "line-join": "round" }, paint: { "line-color": P.ink, "line-width": 1.2 } });
  map.addLayer({ id: "admin-mun", type: "line", source: "admin", layout: { "line-join": "round" },
    paint: { "line-color": P.accent, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 14, 5], "line-opacity": 0.9 } });
  map.addLayer({ id: "admin-sel", type: "line", source: "admin", filter: ["==", ["get", "id"], -1], paint: { "line-color": "#f59f00", "line-width": 3.5 } });

  map.addLayer({ id: "train-line", type: "line", source: "train", filter: ["==", ["get", "k"], "line"], layout: { visibility: "none", "line-cap": "round" },
    paint: { "line-color": P.mode.train, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 15, 6] } });
  map.addLayer({ id: "train-stops", type: "circle", source: "train", filter: ["==", ["get", "k"], "stop"], layout: { visibility: "none" },
    paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 4, 15, 8], "circle-color": "#fff", "circle-stroke-color": P.mode.train, "circle-stroke-width": 3 } });

  // street and place names
  const nameCol = isDark() ? "#e6e8ec" : "#2b2f36", haloCol = isDark() ? "rgba(20,24,31,.9)" : "rgba(255,255,255,.92)";
  map.addLayer({ id: "road-names", type: "symbol", source: "roads", filter: ["has", "lb"],
    minzoom: 13,
    layout: { "symbol-placement": "line", "text-field": ["get", "lb"], "text-font": ["Inter Regular"], "symbol-spacing": 320, "text-max-angle": 30, "text-padding": 2,
      "text-size": ["interpolate", ["linear"], ["zoom"], 13, ["match", ["get", "c"], ["trunk", "primary", "secondary"], 10.5, 0], 14.5, ["match", ["get", "c"], ["trunk", "primary", "secondary", "tertiary"], 11.5, 9.5], 17, 13.5],
      "symbol-sort-key": ["match", ["get", "c"], ["trunk", "primary"], 0, ["secondary", "tertiary"], 1, 2] },
    paint: { "text-color": nameCol, "text-halo-color": haloCol, "text-halo-width": 1.4 } });
  map.addSource("pnames", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "place-names", type: "symbol", source: "pnames", minzoom: 13,
    filter: ["any", ["==", ["get", "c"], "park"], [">=", ["zoom"], 15.3]],
    layout: { "text-field": ["get", "n"], "text-font": ["match", ["get", "c"], "park", ["literal", ["Inter Italic"]], ["literal", ["Inter Medium"]]],
      "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10.5, 17, 13], "text-max-width": 9, "text-padding": 4, "text-variable-anchor": ["center", "top", "bottom"], "text-radial-offset": 0.6,
      "symbol-sort-key": ["match", ["get", "c"], "park", 0, 1] },
    paint: { "text-color": ["match", ["get", "c"], "park", isDark() ? "#8fd18a" : "#2f7d32", "museum", isDark() ? "#d0a8f0" : "#7a2fa8", "university", isDark() ? "#a5c8f0" : "#1d5aa6", "college", isDark() ? "#a5c8f0" : "#1d5aa6", nameCol],
      "text-halo-color": haloCol, "text-halo-width": 1.4 } });
  load("pois.geojson").then((fc) => {
    const keep = (p) => p.n && (p.c === "park" || ["museum", "university", "college", "mall"].includes(p.c) || (p.c === "health" && p.k === "hospital") || (p.c === "gov" && p.k === "townhall") || (p.c === "religion" && ["monastery", "church"].includes(p.k)) || p.k === "theatre");
    map.getSource("pnames").setData({ type: "FeatureCollection", features: fc.features.filter((f) => keep(f.properties)).map((f) => ({ type: "Feature", properties: { n: f.properties.n, c: f.properties.c }, geometry: f.geometry })) });
  }).catch(() => {});
  map.addSource("mask", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "mask", type: "fill", source: "mask", filter: ["==", ["get", "k"], "mask"], paint: { "fill-color": "#f8f9fa", "fill-opacity": 1 } });
  map.addLayer({ id: "mask-edge", type: "line", source: "mask", filter: ["==", ["get", "k"], "edge"], paint: { "line-color": "#f59f00", "line-width": 2.5 } });
  map.addLayer({ id: "draw-fill", type: "fill", source: "draw", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#f59f00", "fill-opacity": 0.14 } });
  map.addLayer({ id: "draw-line", type: "line", source: "draw", filter: ["!=", ["geometry-type"], "Point"],
    paint: { "line-color": "#f59f00", "line-width": 2.6, "line-dasharray": [2, 1] } });
  map.addLayer({ id: "draw-pts", type: "circle", source: "draw", filter: ["==", ["geometry-type"], "Point"],
    paint: { "circle-radius": 5, "circle-color": "#fff", "circle-stroke-color": "#f59f00", "circle-stroke-width": 2.5 } });

  bindEvents();
  pjBind();
  shBind();
  applyTheme();
  if (S.hideOut) applyRegion(false);
  document.body.classList.add("ready");
}

// ================================================================== lazy layers
const ensure = {
  async transit() {
    if (map.getSource("tlines")) return;
    const [lines, stops] = await Promise.all([load("transit_lines.geojson"), load("stops.geojson"), load("routes.json")]);
    if (map.getSource("tlines")) return;
    const P = pal();
    const TCOL = ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#9c36b5", "#0c8599", "#c2255c", "#5c940d", "#3b5bdb", "#d9480f", "#087f5b", "#862e9c", "#1098ad", "#e8590c", "#495057"];
    const rank = (r) => (r.startsWith("trolleybus:") ? 0 : /^bus:\d+$/.test(r) ? 1 : r.startsWith("minibus:") ? 2 : 3);
    for (const f of lines.features) {   // each segment gets the colour of its main urban route
      const rs = [...(f.properties.r || [])].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "ro", { numeric: true }));
      const key = rs[0] || ""; let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      f.properties.col = TCOL[h % TCOL.length]; f.properties.main = key;
    }
    map.addSource("tlines", { type: "geojson", data: lines });
    map.addSource("tstops", { type: "geojson", data: stops });
    map.addLayer({ id: "tlines-casing", type: "line", source: "tlines", layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": P.bg, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 16, 9] } }, "admin-fill");
    map.addLayer({ id: "tlines", type: "line", source: "tlines", layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["coalesce", ["get", "col"], P.mode.bus],
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, ["min", 4, ["+", 0.6, ["*", 0.25, ["get", "nr"]]]], 16, ["min", 10, ["+", 2, ["*", 0.6, ["get", "nr"]]]]] } }, "admin-fill");
    map.addLayer({ id: "tlines-hl", type: "line", source: "tlines", filter: ["in", "__none__", ["get", "r"]], layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#f59f00", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 4, 16, 10] } }, "train-line");
    map.addLayer({ id: "tstops", type: "circle", source: "tstops", minzoom: 11.5,
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 2, 16, 6], "circle-color": "#fff",
        "circle-stroke-color": ["match", ["get", "k"], "trolleybus", P.mode.trolleybus, "train", P.mode.train, P.mode.bus], "circle-stroke-width": 1.6 } }, "draw-fill");
    fillRoutes();
    map.on("click", "tstops", (e) => { if (S.tool) return; const p = e.features[0].properties; showStop(p.n, JSON.parse(p.r || "[]"), e.lngLat); });
    pointer("tstops");
  },
  async roads() {
    if (map.getSource("bike")) return;
    const [bike, proj] = await Promise.all([load("bike.geojson"), load("projects.geojson")]);
    if (map.getSource("bike")) return;
    map.addSource("bike", { type: "geojson", data: bike });
    map.addSource("proj", { type: "geojson", data: proj });
    map.addLayer({ id: "bike", type: "line", source: "bike", layout: { "line-cap": "round" }, filter: ["in", ["get", "b"], ["literal", ["track", "path"]]],
      paint: { "line-color": "#13a36b", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.5, 16, 4] } }, "admin-fill");
    map.addLayer({ id: "bike-lane", type: "line", source: "bike", filter: ["in", ["get", "b"], ["literal", ["lane", "shared"]]],
      paint: { "line-color": "#13a36b", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.5, 16, 4], "line-dasharray": [2, 1.2] } }, "admin-fill");
    map.addLayer({ id: "ped", type: "line", source: "roads", filter: ["==", ["get", "c"], "pedestrian"], layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#e8590c", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 2, 14, 4, 17, 12], "line-opacity": 0.9 } }, "admin-fill");
    map.on("click", "ped", (e) => { if (S.tool) return; const p = e.features[0].properties;
      popup(e.lngLat, `<b>${esc(p.n || t("ped"))}</b><br>${t("ped")}`); });
    map.addLayer({ id: "proj-casing", type: "line", source: "proj", filter: ["==", ["get", "major"], 1],
      paint: { "line-color": "#fff", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 4, 16, 12], "line-opacity": 0.6 } }, "admin-fill");
    map.addLayer({ id: "proj", type: "line", source: "proj", layout: { "line-cap": "round" },
      paint: { "line-color": ["match", ["get", "st"], "construction", "#d6336c", "#7048e8"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, ["case", ["==", ["get", "major"], 1], 2.5, 0.8], 16, ["case", ["==", ["get", "major"], 1], 8, 3]],
        "line-dasharray": [1.2, 1] } }, "admin-fill");
    map.on("click", "proj", (e) => { if (S.tool) return; const p = e.features[0].properties;
      popup(e.lngLat, `<b>${esc(p.n || t(p.st))}</b><br>${t(p.st)}${p.note ? "<br><small>" + esc(p.note) + "</small>" : ""}`); });
    map.on("click", "roads-lanes", (e) => {
      if (S.tool || PJ.tool || map.queryRenderedFeatures(e.point, { layers: ["proj"] }).length) return;
      const p = e.features[0].properties;
      popup(e.lngLat, `<b>${esc(p.n || p.ref || p.c)}</b><br>${esc(p.c)}${p.ref ? " · " + esc(p.ref) : ""}<br>${L("Benzi", "Lanes")}: <b>${p.l}</b>${p.e == 1 ? " <small>(" + t("lanes_est") + ")</small>" : ""}${p.ms ? "<br>Max " + esc(p.ms) + " km/h" : ""}${p.ow == 1 ? "<br>" + L("Sens unic", "One-way") : ""}`);
    });
  },
  async pois() {
    if (map.getSource("pois")) return;
    const pois = await load("pois.geojson");
    if (map.getSource("pois")) return;
    map.addSource("pois", { type: "geojson", data: pois });
    map.addLayer({ id: "pois", type: "symbol", source: "pois",
      layout: { "icon-image": ["concat", "poi-", ["get", "c"]], "icon-allow-overlap": true, "icon-ignore-placement": true,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.32, 11, 0.45, 14, 0.85, 17, 1.05],
        "symbol-sort-key": ["match", ["get", "c"], ["university", "mall", "gov"], 0, ["health", "college", "school"], 1, ["pharmacy", "kindergarten", "park"], 2, 3] } }, "draw-fill");
    map.on("click", "pois", (e) => { if (S.tool) return; showPoi(e.features[0], e.lngLat); });
    pointer("pois");
  },
  async agegrid() {
    if (map.getSource("agegrid")) return;
    const g = await load("agegrid.geojson");
    if (map.getSource("agegrid")) return;
    map.addSource("agegrid", { type: "geojson", data: g });
    map.addLayer({ id: "agegrid", type: "fill", source: "agegrid", maxzoom: 15, layout: { visibility: "none", "fill-sort-key": ["get", "o"] },
      paint: { "fill-color": ["match", ["get", "a"], ...AGECOL.flatMap((c, i) => [i, c]), "#ccc"],
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12.5, 0.8, 15, 0], "fill-antialias": true } }, "water-line");
  },
  async temp() {
    if (map.getSource("temp")) return;
    const T0 = await load("temp.json");
    if (map.getSource("temp")) return;
    map.addSource("temp", { type: "image", url: "data/temp/now.jpg", coordinates: T0.bounds });
    map.addLayer({ id: "temp", type: "raster", source: "temp", paint: { "raster-opacity": 0.78, "raster-fade-duration": 0 } }, "water-line");
  },
  async builtup() {
    if (map.getSource("builtup")) return;
    const g = await load("builtup.geojson");
    if (map.getSource("builtup")) return;
    map.addSource("builtup", { type: "geojson", data: g });
    map.addLayer({ id: "builtup", type: "fill", source: "builtup", paint: { "fill-color": "#e03131", "fill-opacity": 0.75 } }, "water-line");
  },
  async popdem(what = "pop", mode = "lin") {
    const src = `pd-${what}-${mode}`;
    if (!map.getSource(`pc-${what}`)) {
      map.addSource(`pc-${what}`, { type: "raster", tiles: [`popcol://${what}/c/{z}/{x}/{y}`], tileSize: 256, maxzoom: 13, bounds: DBOX });
      map.addLayer({ id: `pcol-${what}`, type: "raster", source: `pc-${what}`, layout: { visibility: "none" }, paint: { "raster-fade-duration": 0, "raster-opacity": 0.9 } }, "admin-fill");
    }
    if (map.getSource(src)) return;
    map.addSource(src, { type: "raster-dem", tiles: [`popdem://${what}/${mode}/{z}/{x}/{y}`], tileSize: 256, encoding: "terrarium", maxzoom: 12, bounds: DBOX });
    map.addLayer({ id: `hs-${what}-${mode}`, type: "hillshade", source: src, layout: { visibility: "none" },
      paint: { "hillshade-exaggeration": 0.3, "hillshade-shadow-color": isDark() ? "#000" : "#6d6680", "hillshade-highlight-color": "#fff", "hillshade-illumination-direction": 315 } }, "admin-fill");
    map.moveLayer(`pcol-${what}`, "admin-fill");   // colours above the shading, so peaks keep their colour
  },
  async heat() {
    if (map.getSource("popgrid")) return;
    const g = await load("popgrid.geojson");
    if (map.getSource("popgrid")) return;
    map.addSource("popgrid", { type: "geojson", data: g });
    map.addLayer({ id: "heat", type: "heatmap", source: "popgrid", maxzoom: 17,
      paint: { "heatmap-weight": ["/", ["get", "p"], 400],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 12, 1.2, 15, 2.2],
        "heatmap-radius": ["interpolate", ["exponential", 2], ["zoom"], 9, 4, 12, 14, 15, 60, 17, 160],
        "heatmap-opacity": 0.85,
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(44,123,182,0)", 0.08, "rgba(44,123,182,0.55)", 0.2, "#2c7bb6", 0.3, "#00a6ca", 0.5, "#90eb9d", 0.7, "#f9d057", 0.85, "#f29e2e", 1, "#d7191c"] } }, "admin-fill");
  },
  async ring() {
    if (map.getSource("ringsrc")) return;
    const g = await load("ring.geojson");
    if (map.getSource("ringsrc")) return;
    map.addSource("ringsrc", { type: "geojson", data: g });
    map.addLayer({ id: "ring-casing", type: "line", source: "ringsrc", layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 5, 15, 14], "line-opacity": 0.8 } }, "train-line");
    map.addLayer({ id: "ring", type: "line", source: "ringsrc", layout: { "line-join": "round" },
      paint: { "line-color": ["match", ["get", "st"], "existent", "#0b7285", "propus", "#7048e8", "#e8590c"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3, 15, 8],
        "line-dasharray": ["literal", [1, 0]] } }, "train-line");
    map.addLayer({ id: "ring-plan", type: "line", source: "ringsrc", filter: ["!=", ["get", "st"], "existent"], layout: { "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.5, 15, 4], "line-dasharray": [1.5, 1.5] } }, "train-line");
    map.on("click", "ring", (e) => { if (S.tool) return; const p = e.features[0].properties;
      popup(e.lngLat, `<b>Centura Chișinăului</b><br>${t(p.st === "existent" ? "ring_ex" : p.st === "propus" ? "ring_pr" : "ring_ap")}<br><small>${L("Schema din 2014: 6 segmente, ~90 km; variantă actuală ~47 km, 4 benzi.", "2014 scheme: 6 segments, ~90 km; current plan ~47 km, 4 lanes.")}</small>`); });
    pointer("ring");
  },
  async buildings() {
    if (map.getSource("bld")) return;
    const parts = await Promise.all([load("bld0.json"), load("bld1.json"), load("bld2.json")]);
    if (map.getSource("bld")) return;
    const ageCol = ["match", ["get", "a"], ...AGECOL.flatMap((c, i) => [i, c]), "#ccc"];

    const features = [];
    for (const arr of parts) for (const b of arr) {
      let x = b[1], y = b[2];
      const ring = [[28.5 + x / 1e5, 46.8 + y / 1e5]];
      for (let i = 3; i < b.length; i += 2) { x += b[i]; y += b[i + 1]; ring.push([28.5 + x / 1e5, 46.8 + y / 1e5]); }
      ring.push(ring[0]);
      features.push({ type: "Feature", properties: { h: b[0] >> 4, a: b[0] & 15 }, geometry: { type: "Polygon", coordinates: [ring] } });
    }
    map.addSource("bld", { type: "geojson", data: { type: "FeatureCollection", features } });
    map.addLayer({ id: "bld-age", type: "fill", source: "bld", minzoom: 12.5, layout: { visibility: "none" },
      paint: { "fill-color": ageCol, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12.5, 0, 13.5, 0.95], "fill-outline-color": ["interpolate", ["linear"], ["zoom"], 13, "rgba(0,0,0,0)", 15, "rgba(0,0,0,0.25)"] } }, "water-line");
    map.on("click", "bld-age", (e) => { if (S.tool) return; const p = e.features[0].properties;
      popup(e.lngLat, `<b>${L(AGE_RO[p.a], AGE_EN[p.a])}</b><br><small>${t("age_l")}</small>`); });
    map.addLayer({ id: "bld", type: "fill-extrusion", source: "bld", minzoom: 12,
      paint: { "fill-extrusion-color": ["interpolate", ["linear"], ["get", "h"], 3, isDark() ? "#5b6170" : "#ddd8d0", 20, isDark() ? "#7c8396" : "#c3b9ad", 60, isDark() ? "#a8b0c4" : "#9a8c7c"],
        "fill-extrusion-height": ["get", "h"], "fill-extrusion-opacity": 0.92 } }, map.getLayer("pois") ? "pois" : "draw-fill");
  },
};
function pointer(id) {
  map.on("mouseenter", id, () => { if (!S.tool) map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", id, () => { if (!S.tool) map.getCanvas().style.cursor = ""; });
}

// ================================================================== render
function vis(id, on) { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none"); }
const popScale = () => (S.scen === "est" ? 832865 / 720128 : popAt(S.date) / 720128);
const adminFC = () => (typeof PJ !== "undefined" && PJ.cur && PJ.admin ? Promise.resolve(PJ.admin) : load("admin.geojson"));
const BASEMODE = { padmin: "admin", proads: "roads", pnb: "zone" };
const bm = (x) => BASEMODE[x] || x;

async function render() {
  const m = bm(S.mode), P = pal();
  document.documentElement.lang = S.lang;
  document.querySelectorAll("[data-t]").forEach((el) => { const v = t(el.dataset.t); if (typeof v === "string") el.textContent = v; });
  document.getElementById("about").innerHTML = ABOUT[S.lang];
  document.querySelectorAll(".tab").forEach((b) => {
    b.setAttribute("aria-selected", b.dataset.mode === S.mode);
    const k = !!S.keep[b.dataset.mode]; b.classList.toggle("kept", k);
    b.title = k ? t("kept_tip_on") : t("kept_tip_off");
  });
  document.querySelectorAll("[data-panel]").forEach((p) => { const ps = p.dataset.panel.split(" "); p.hidden = !(ps.includes(S.mode) || (ps.includes(m) && !ps.includes("!" + S.mode))); });
  if (typeof PJ !== "undefined" && PJ.cur) {
    document.querySelectorAll("input[name=blevel]").forEach((r) => (r.checked = +r.value === S.level));
    pjEnsureRoadLayers(); pjRoadsData(); pjStatus();
  }
  const setR = (name, v) => document.querySelectorAll(`input[name=${name}]`).forEach((r) => (r.checked = r.value === String(v)));
  setR("zoneview", S.zoneView);
  setR("level", S.level); setR("scen", S.scen); setR("reform", S.ref); setR("base", S.base); setR("popview", S.popView); setR("popwhat", S.popWhat);
  document.getElementById("date").value = S.date;
  document.getElementById("todaybtn").hidden = S.date === TODAY;
  document.getElementById("auto_d").textContent = t("auto_d")(REF());
  document.getElementById("elevlegend").hidden = S.base !== "elevation";
  for (const id of ["ctx", "d3", "terrain", "outside", "labels", "names"]) document.getElementById(id).checked = S[id];
  vis("road-names", S.names); vis("place-names", S.names);
  document.getElementById("lang").textContent = t("lang");
  if (S.tool) document.getElementById("toolhint").textContent = t("h_" + S.tool);
  const admin = await adminFC();
  const munF = admin.features.find((f) => f.properties.lvl === "mun" && [REF(), "both"].includes(f.properties.sc)).properties;
  document.getElementById("subtitle").textContent = t("sub")(fmt(munF.km2, 0), REF() === "ref" ? 46 : 35);
  document.getElementById("sc1n").textContent = fmt(munF.pop * popAt(S.date) / 720128);
  document.getElementById("sc2n").textContent = fmt(munF.pop * 832865 / 720128);

  // ---- which thematic maps are on: the current tab plus every map marked "keep"
  const A = new Set([m, ...MAPS.filter((k) => S.keep[k])]);
  const only = !!S.only[m];
  const has = (k) => A.has(k);
  const adminOn = has("admin") || has("pop");
  const b = S.base, onImg = b === "satellite";
  vis("sat", !only && b === "satellite"); vis("relief", !only && b === "elevation");
  map.setPaintProperty("bg", "background-color", only ? (isDark() ? "#101318" : "#ffffff") : b === "simple" ? (isDark() ? "#14171c" : "#f7f6f3") : P.bg);
  vis("water-line", !only);
  vis("rail", !only);
  const lvl = adminOn ? S.level : 1;
  const sc = scMatch();
  map.setFilter("admin-fill", ["all", sc, ["any", ["==", ["get", "lvl"], lvl], ["==", ["get", "lvl"], "ctx"]]]);
  map.setFilter("admin-line", ["all", sc, ["==", ["get", "lvl"], lvl]]);
  map.setFilter("admin-mun", ["all", sc, ["==", ["get", "lvl"], "mun"]]);
  map.setFilter("admin-ctx", ["all", sc, ["==", ["get", "lvl"], "ctx"]]);
  vis("admin-ctx", S.ctx && !only);
  vis("admin-line", !only || adminOn); vis("admin-mun", !only || adminOn);
  map.setPaintProperty("admin-line", "line-color", onImg && !only ? "#ffffff" : P.ink);
  map.setPaintProperty("admin-ctx", "line-color", onImg && !only ? "#e9ecef" : P.line);
  map.setPaintProperty("admin-line", "line-width", lvl === 3 ? 0.8 : lvl === 2 ? 1.3 : 2.2);
  map.setPaintProperty("admin-line", "line-opacity", adminOn ? 0.85 : 0.35);
  // fill: the current tab wins; otherwise a kept population map, then a kept administrative map
  const fillMode = (m === "admin" || m === "pop") ? m : has("pop") ? "pop" : has("admin") ? "admin" : null;
  const multi = A.size > 1;
  if (fillMode === "admin") {
    map.setPaintProperty("admin-fill", "fill-color", ["case", ["==", ["get", "lvl"], "ctx"], P.line, ["has", "scol"], ["get", "scol"], SECTOR_COL]);
    const k = (b === "elevation" ? 0.35 : 1) * (multi ? 0.6 : 1);
    map.setPaintProperty("admin-fill", "fill-opacity", ["case", ["==", ["get", "lvl"], "ctx"], 0.06 * k, ["==", ["get", "kind"], "city"], (onImg ? 0.2 : 0.28) * k, (onImg ? 0.12 : 0.14) * k]);
  } else if (fillMode === "pop" && (!heatLike() || S.popWhat === "ratio")) {
    if (S.popWhat !== "pop") await ensureJobs();
    const s = popScale(), br = [0, 100, 500, 1500, 4000, 8000];
    let col = ["step", ["*", s, ["coalesce", ["get", "dens"], 0]], P.pop[0]]; br.slice(1).forEach((v, i) => col.push(v, P.pop[i + 1]));
    if (S.popWhat === "jobs") { col = ["step", ["coalesce", ["get", "jdens"], 0], JOBCOL[0]]; JOBBR.slice(1).forEach((v, i) => col.push(v, JOBCOL[i + 1])); }
    if (S.popWhat === "ratio") { col = ["step", ["/", ["coalesce", ["get", "jr"], 0], s], RATIOCOL[0]]; RATIOBR.slice(1).forEach((v, i) => col.push(v, RATIOCOL[i + 1])); }
    map.setPaintProperty("admin-fill", "fill-color", ["case", ["==", ["get", "lvl"], "ctx"], P.line, col]);
    map.setPaintProperty("admin-fill", "fill-opacity", ["case", ["==", ["get", "lvl"], "ctx"], 0.05, S.popWhat === "jobs" ? 0.3 : multi ? 0.55 : 0.8]);
  } else {
    map.setPaintProperty("admin-fill", "fill-opacity", 0);
  }
  const vector = b === "standard" || b === "simple";
  const luBase = only ? 0 : b === "standard" ? ["match", ["get", "z"], "water", 1, 0.3] : b === "simple" ? ["match", ["get", "z"], "water", 1, 0] : 0;
  const popFill = fillMode === "pop" && (!heatLike() || S.popWhat === "ratio");
  map.setPaintProperty("landuse", "fill-opacity", has("zone") ? (vector || only ? (multi ? 0.7 : 0.88) : 0.6) : popFill ? (vector && !only ? ["match", ["get", "z"], "water", 1, 0] : 0) : luBase);
  map.setFilter("landuse", has("zone") ? ["in", ["get", "z"], ["literal", S.zones ?? Object.keys(T.ro.z)]] : null);
  const builtOn = has("zone") && S.zoneView === "built";
  if (builtOn) { await ensure.builtup(); map.setPaintProperty("landuse", "fill-opacity", only ? 0 : luBase); }
  vis("builtup", builtOn);
  map.setPaintProperty("roads-base", "line-opacity", onImg ? 0.35 : b === "elevation" ? 0.6 : 1);
  map.setFilter("roads-base", b === "simple" ? ["in", ["get", "c"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary", "motorway_link", "trunk_link", "primary_link"]]] : ["!=", ["get", "c"], "pedestrian"]);
  vis("roads-base", !has("roads") && !only); vis("roads-lanes", has("roads")); vis("roads-casing", has("roads"));
  if (has("roads") && !has("zone")) map.setPaintProperty("landuse", "fill-opacity", only ? 0 : ["match", ["get", "z"], "water", 0.7, 0.12]);
  if (has("roads")) await ensure.roads();
  ["bike", "bike-lane", "ped", "proj", "proj-casing"].forEach((id) => vis(id, has("roads")));
  if (has("transit")) await ensure.transit();
  ["tlines", "tlines-casing", "tlines-hl", "tstops"].forEach((id) => vis(id, has("transit")));
  vis("train-line", has("transit") && S.modes.train); vis("train-stops", has("transit") && S.modes.train);
  if (map.getLayer("tlines")) {
    const ms = Object.keys(S.modes).filter((k) => S.modes[k]);
    const f = ["any", ...ms.map((k) => ["in", k, ["get", "m"]])];
    map.setFilter("tlines", f); map.setFilter("tlines-casing", f);
    map.setFilter("tstops", ["any", ...ms.map((k) => k === "minibus" ? ["==", ["get", "k"], "bus"] : ["==", ["get", "k"], k])]);
    map.setFilter("tlines-hl", S.route ? ["in", S.route, ["get", "r"]] : ["in", "__none__", ["get", "r"]]);
    map.setPaintProperty("tlines-casing", "line-color", only ? (isDark() ? "#101318" : "#ffffff") : P.bg);
  }
  document.getElementById("only").checked = only;
  const kept = MAPS.filter((k) => S.keep[k] && k !== m);
  document.getElementById("keptlist").innerHTML = kept.length ? `<span>${t("kept_on")}:</span>` + kept.map((k) => `<button type="button" class="keptchip" data-unkeep="${k}" aria-label="${t("remove")} ${t(k)}">${t(k)} ×</button>`).join("") : "";
  if (S.cats.length) await ensure.pois();
  if (map.getLayer("pois")) {
    const mask = REF() === "ref" ? 2 : 1;
    map.setFilter("pois", ["all", ["in", ["get", "c"], ["literal", S.cats]], S.outside ? true : ["==", ["%", ["floor", ["/", ["get", "i"], mask]], 2], 1]]);
    vis("pois", S.cats.length > 0 && !only);
  }
  if (has("pop") && heatLike()) await ensure.heat();
  if (map.getLayer("heat")) {
    vis("heat", has("pop") && heatLike() && S.popWhat !== "ratio");
    const gk = wantJobs() ? "jobs" : "pop";
    if (DATA.__heatKind !== gk) { DATA.__heatKind = gk; map.getSource("popgrid").setData(await load(gridFile(gk))); }
    map.setPaintProperty("heat", "heatmap-weight", wantJobs() ? ["/", jobSum(), 300] : ["*", popScale(), ["/", ["get", "p"], 400]]);
  }
  // jobs by type: one dot per 150 m cell, coloured by its main type, sized by the jobs of the ticked types
  const dotsOn = has("pop") && wantJobs() && !heatLike();
  if (dotsOn && !map.getSource("jobpts")) {
    map.addSource("jobpts", { type: "geojson", data: await load("jobgrid.geojson") });
    map.addLayer({ id: "jobdots", type: "circle", source: "jobpts", paint: { "circle-stroke-color": "rgba(255,255,255,.7)", "circle-stroke-width": 0.5, "circle-opacity": 0.85 } }, "admin-fill");
  }
  if (map.getLayer("jobdots")) {
    vis("jobdots", dotsOn);
    if (dotsOn) {
      const sel = jobSel();
      map.setFilter("jobdots", [">", jobSum(), 0.5]);
      map.setPaintProperty("jobdots", "circle-color", ["match", ["get", "d"], ...sel.flatMap((k) => [k, JOBT[k][2]]), "#adb5bd"]);
      map.setPaintProperty("jobdots", "circle-radius", ["interpolate", ["linear"], ["zoom"], 10, ["*", 0.12, ["sqrt", jobSum()]], 13, ["*", 0.35, ["sqrt", jobSum()]], 16, ["*", 1.1, ["sqrt", jobSum()]]]);
    }
  }
  if (has("transit") && S.ring) await ensure.ring();
  ["ring", "ring-casing", "ring-plan"].forEach((id) => vis(id, has("transit") && S.ring));
  const ageOn = has("age");
  if (ageOn) await ensure.agegrid();
  vis("agegrid", ageOn && !S.d3);
  const ageF = ["in", ["get", "a"], ["literal", S.ages ?? AGE_ORDER]];
  if (map.getLayer("agegrid")) map.setFilter("agegrid", ageF);
  if (map.getLayer("bld-age")) map.setFilter("bld-age", ageF);
  if (has("cmp") || Object.keys(S.cmp).length) await cmpUpdate();
  if (S.d3 || ageOn) { if (!map.getSource("bld")) { document.getElementById("legend").insertAdjacentHTML("afterbegin", `<li class="loading"><span class="spin"></span>${t("age_load")}</li>`); } await ensure.buildings(); }
  vis("bld", S.d3 && !only);
  vis("bld-age", ageOn && !S.d3);
  if (map.getLayer("bld")) map.setFilter("bld", ageOn ? ageF : null);
  if (map.getLayer("bld")) map.setPaintProperty("bld", "fill-extrusion-color", ageOn ? ["match", ["get", "a"], ...AGECOL.flatMap((c, i) => [i, c]), "#ccc"]
    : ["interpolate", ["linear"], ["get", "h"], 3, isDark() ? "#5b6170" : "#ddd8d0", 20, isDark() ? "#7c8396" : "#c3b9ad", 60, isDark() ? "#a8b0c4" : "#9a8c7c"]);
  if (ageOn) {   // building age replaces the land-use map: keep only water underneath
    map.setFilter("landuse", ["==", ["get", "z"], "water"]);
    map.setPaintProperty("landuse", "fill-opacity", only ? 0 : 0.8);
    vis("builtup", false);
  }
  const tempOn = has("temp");
  if (tempOn) await ensure.temp();
  if (map.getLayer("temp")) { vis("temp", tempOn); updateTempImage(); }
  const hills = has("pop") && S.popView === "hills" && S.popWhat !== "ratio", hw = wantJobs() ? "jobs" : "pop", hm = S.hillSqrt ? "sqrt" : "lin", hsrc = `pd-${hw}-${hm}`;
  if (hills) await ensure.popdem(hw, hm);
  for (const w of ["pop", "jobs"]) { vis(`pcol-${w}`, hills && w === hw); for (const md of ["lin", "sqrt"]) vis(`hs-${w}-${md}`, hills && w === hw && md === hm); }
  if (map.getLayer("heat") && hills) vis("heat", false);
  if (map.getLayer("heat")) map.setPaintProperty("heat", "heatmap-radius", hills ? ["interpolate", ["exponential", 2], ["zoom"], 9, 7, 12, 24, 15, 90, 17, 200] : ["interpolate", ["exponential", 2], ["zoom"], 9, 4, 12, 14, 15, 60, 17, 160]);
  const wantSrc = hills ? hsrc : S.terrain && !only ? "dem" : null;
  if ((map.getTerrain()?.source || null) !== wantSrc) {
    map.setTerrain(wantSrc ? { source: wantSrc, exaggeration: hills ? 1 : 1.8 } : null);
    if (hills && map.getPitch() < 35) map.easeTo({ pitch: 58, bearing: -18, duration: 900 });
  }
  const er = document.getElementById("elevread");
  er.hidden = only || !(b === "elevation" || S.terrain) || !er.textContent;
  document.getElementById("elevlegend").hidden = only || S.base !== "elevation";
  if (map.getLayer("mask")) { map.moveLayer("mask", "draw-fill"); map.moveLayer("mask-edge", "draw-fill"); map.setPaintProperty("mask", "fill-color", isDark() ? "#101318" : "#f8f9fa"); }
  fillRegions();
  if (S.hideOut && !S.region) { const mf = admin.features.find((x) => x.properties.lvl === "mun" && [REF(), "both"].includes(x.properties.sc)); if (mf.properties.id !== MASK_ID) await applyRegion(false); }
  document.getElementById("hideout").checked = S.hideOut;
  renderLegend(); renderLabels(); renderInfo(); renderLife();
  for (const k of ["mode", "level", "ctx", "scen", "lang", "base", "labels", "names"]) store.set(k, S[k]);
  store.set("cats2", S.cats);
  store.set("ref3", S.ref);
  store.set("keep", S.keep); store.set("only", S.only);
}

function applyTheme() {
  const P = pal();
  map.setPaintProperty("landuse", "fill-color", ["match", ["get", "z"], ...Object.entries(P.zone).flat(), "#ccc"]);
  map.setPaintProperty("water-line", "line-color", P.water);
  map.setPaintProperty("roads-base", "line-color", P.roadBase);
  map.setPaintProperty("rail", "line-color", P.rail);
  map.setPaintProperty("admin-mun", "line-color", P.accent);
  if (map.getLayer("tlines-casing")) map.setPaintProperty("tlines-casing", "line-color", P.bg);
  render();
}

// ================================================================== labels (DOM)
let labelMarkers = [];
async function renderLabels() {
  labelMarkers.forEach((m) => m.remove()); labelMarkers = [];
  if (!S.labels) return;
  const admin = await adminFC();
  const m = bm(S.mode), adm = m === "admin" || m === "pop" || S.keep.admin || S.keep.pop, lvl = adm ? S.level : 1;
  if (S.only[m] && !adm && m !== "temp") return;
  // weather map: level-2 names with their temperature, switching to level 3 when zoomed in
  const tmap = m === "temp" ? (DATA.__temp ?? await load("temp.json"))?.maps?.[tempKey()] : null;
  const tlv = m === "temp" ? [1, 2, 3] : null;
  const items = admin.features.filter((f) => [REF(), "both"].includes(f.properties.sc) &&
    (tlv ? tlv.includes(f.properties.lvl) || (f.properties.lvl === "ctx" && !S.only[m]) : (f.properties.lvl === lvl || (f.properties.lvl === "ctx" && !S.only[m]))));
  for (const f of items) {
    const p = f.properties;
    if (REGION_PG && !REGION_PG.has(p.lx, p.ly)) continue;
    const el = document.createElement("div");
    el.className = "lbl lbl-" + p.lvl + (S.base === "satellite" ? " lbl-img" : "") + (tmap ? " lbl-t" : "");
    el.dataset.km2 = p.km2;
    let txt = nameOf(p).replace(/^Chișinău – (sectorul )?/, "").replace(/ sector$/, "");
    if (p.lvl === 2 && p.kind === "city") txt = "Chișinău · " + txt;
    const dir = p.lvl === 1 && (m === "admin" || m === "pop") && SECDIR[p.sector] ? L(SECDIR[p.sector][0], SECDIR[p.sector][1]) : null;
    el.innerHTML = `<span>${esc(txt)}</span>` + (dir ? `<em class="dir">(${dir})</em>` : "") + (m === "pop" ? (S.popWhat === "jobs" && p.jobs != null ? `<small>${fmt(p.jobs)} ${L("locuri de muncă", "jobs")}</small>` : S.popWhat === "ratio" && p.jr != null ? `<small>${fmt(p.jr / popScale(), 2)} ${L("locuri/locuitor", "jobs/resident")}</small>` : p.pop ? `<small>${fmt(p.pop * popScale())}</small>` : "") : "")
      + (tmap && tmap.u?.[p.id] != null ? `<b class="tval">${fmt(tmap.u[p.id], 1)} °C</b>` : "");
    labelMarkers.push(new maplibregl.Marker({ element: el }).setLngLat([p.lx, p.ly]).addTo(map));
  }
  updateLabelVis();
}
const LABEL_ALL_ZOOM = { 2: 11, 3: 11.5 };   // from these zooms every level-2 / level-3 name is shown
const TEMP_L3_ZOOM = 12, TEMP_L2_ZOOM = 10.8;   // weather map: sectors < 10.8 ≤ mayoralties < 12 ≤ neighbourhoods                       // weather map: districts below, neighbourhoods from here
function updateLabelVis() {
  const z = map.getZoom();
  for (const mk of labelMarkers) {
    const el = mk.getElement();
    const lv = el.classList.contains("lbl-2") ? 2 : el.classList.contains("lbl-3") ? 3 : 0;
    const lv1 = el.classList.contains("lbl-1");
    if (el.classList.contains("lbl-t") && (lv || lv1)) {
      el.hidden = lv1 ? z >= TEMP_L2_ZOOM : lv === 2 ? z < TEMP_L2_ZOOM || z >= TEMP_L3_ZOOM : z < TEMP_L3_ZOOM; continue;
    }
    if (lv && z >= LABEL_ALL_ZOOM[lv]) { el.hidden = false; continue; }
    const px = Math.sqrt(+el.dataset.km2) * 1000 / (156543 * Math.cos(47 * Math.PI / 180) / 2 ** z);
    el.hidden = px < (el.classList.contains("lbl-ctx") ? 60 : 46);
  }
}
map.on("zoomend", updateLabelVis);

// ================================================================== legend
function renderLegend() {
  const el = document.getElementById("legend"), P = pal(), m = bm(S.mode);
  let h = "";
  if (m === "admin") {
    h = Object.entries(P.sector).map(([k, c]) => `<li><i style="background:${c}"></i>${L(`Sectorul ${k}`, `${k} sector`)}${SECDIR[k] ? ` <span class="small">(${L(SECDIR[k][0], SECDIR[k][1])})</span>` : ""}</li>`).join("")
      + `<li><i class="ln" style="border-color:${P.accent}"></i>${L("Limita municipiului", "Municipality border")}${REF() === "ref" ? " (2027)" : ""}</li>`
      + (S.ctx ? `<li><i class="ln dash" style="border-color:${P.line}"></i>${t("lvlname").ctx}</li>` : "");
  } else if (m === "pop" && S.popWhat === "ratio") {
    const lab = [L("cartier-dormitor", "dormitory area"), L("mai mulți locuitori", "more residents"), L("mai mulți locuitori", "more residents"), L("echilibru", "balanced"), L("mai multe locuri de muncă", "more jobs"), L("centru de muncă", "job centre")];
    h = `<li class="cap">${L("Locuri de muncă la un locuitor", "Jobs per resident")}</li>` + RATIOBR.map((v, i) => `<li><i style="background:${RATIOCOL[i]}"></i>${fmt(v, 2)}${RATIOBR[i + 1] != null ? "–" + fmt(RATIOBR[i + 1], 2) : "+"} <span class="small">${lab[i]}</span></li>`).join("")
      + `<li class="small">${L("Albastru: oamenii locuiesc aici și pleacă la lucru în altă parte. Roșu: aici vin la muncă oameni din alte cartiere.", "Blue: people live here and commute elsewhere. Red: people from other areas come here to work.")}</li><li class="small">${t("jobs_note")}</li>`;
  } else if (m === "pop" && S.popView === "hills") {
    const lab = wantJobs() ? L("Locuri de muncă pe km²", "Jobs per km²") : L("Locuitori pe km²", "Residents per km²");
    h = `<li class="cap">${lab}</li>` + HILL_STOPS.slice(1).map(([v, c], i) => `<li><i style="background:rgba(${c[0]},${c[1]},${c[2]},${(c[3] / 255).toFixed(2)})"></i>${fmt(HILL_STOPS[i][0])}–${fmt(v)}${i === HILL_STOPS.length - 2 ? "+" : ""}</li>`).join("")
      + `<li><label class="check"><input type="checkbox" data-hillsqrt="1" ${S.hillSqrt ? "checked" : ""}> ${L("Evidențiază satele (scară cu rădăcină pătrată)", "Highlight villages (square-root scale)")}</label></li>`
      + `<li class="small">${S.hillSqrt ? L("Înălțimea crește cu rădăcina pătrată a densității: satele răsfirate se văd, dar diferențele dintre cartierele dense par mai mici.", "Height grows with the square root of density: dispersed villages show, but differences between dense areas look smaller.") : L("Înălțimea e proporțională cu densitatea: un deal de două ori mai înalt înseamnă de două ori mai mulți oameni pe km². Culoarea folosește aceeași grilă și aceeași scală fixă.", "Height is proportional to density: a hill twice as high means twice as many people per km². Colour uses the same grid and a fixed scale.")}</li>`
      + (wantJobs() ? `<li class="small">${t("jobs_note")}</li>` : "");
  } else if (m === "pop" && heatLike() && wantJobs()) {
    h = `<li class="cap">${L("Densitatea locurilor de muncă (estimare)", "Job density (estimate)")}</li><li><span class="ramp heatramp"></span></li><li class="rampl"><span>${t("low")}</span><span>${t("high")}</span></li>`
      + (S.popView === "hills" ? `<li class="small">${L("Înălțimea arată câte locuri de muncă sunt într-o zonă.", "Height shows how many jobs an area has.")}</li>` : "") + `<li class="small">${t("jobs_note")}</li>`;
  } else if (m === "pop" && wantJobs()) {
    const G = DATA.__jobtot || {};
    if (!DATA.__jobtot) load("jobgrid.geojson").then((g) => { const o = {}; for (const f of g.features) for (const k in JOBT) o[k] = (o[k] || 0) + (f.properties[k] || 0); DATA.__jobtot = o; renderLegend(); });
    const sel = jobSel(), tot = Object.values(G).reduce((a, b) => a + b, 0) || 1;
    h = `<li class="cap">${L("Tipuri de locuri de muncă (un punct = 150 m)", "Types of jobs (one dot = 150 m)")}</li>`
      + Object.entries(JOBT).map(([k, v]) => `<li><label><input type="checkbox" data-jobtype="${k}" ${sel.includes(k) ? "checked" : ""}><i style="background:${v[2]};border-radius:50%"></i><span class="zl">${L(v[0], v[1])}</span>${G[k] ? `<span class="za">${fmt(Math.round(G[k] / 100) * 100)} · ${fmt((G[k] / tot) * 100, 0)}%</span>` : ""}</label></li>`).join("")
      + `<li class="small">${L("Culoarea arată tipul dominant din fiecare pătrat; mărimea, numărul de locuri de muncă din tipurile bifate. Fundalul colorează unitățile după densitatea locurilor de muncă.", "Colour shows the main type in each square; size shows the jobs of the ticked types. The background shades areas by job density.")}</li><li class="small">${t("jobs_note")}</li>`;
  } else if (m === "pop" && heatLike()) {
    h = `<li class="cap">${t("heat_l")}</li><li><span class="ramp heatramp"></span></li><li class="rampl"><span>${t("low")}</span><span>${t("high")}</span></li>`
      + (S.popView === "hills" ? `<li class="small">${t("hills_n")}</li>` : "");
  } else if (m === "pop") {
    const b = [0, 100, 500, 1500, 4000, 8000];
    h = `<li class="cap">${t("density")}</li>` + b.map((v, i) => `<li><i style="background:${P.pop[i]}"></i>${fmt(v)}${b[i + 1] ? "–" + fmt(b[i + 1]) : "+"}</li>`).join("");
  } else if (m === "cmp") {
    const list = DATA.__cmp;
    if (!list) { h = `<li class="loading"><span class="spin"></span>…</li>`; cmpList().then((x) => { DATA.__cmp = x; renderLegend(); }); }
    else {
      const mun = DATA.__zs?.[REF()];
      h = `<li class="small">${t("cmp_h")}</li>` + list.map((c) => `<li><label><input type="checkbox" data-cmp="${c.k}" ${S.cmp[c.k] ? "checked" : ""}><i style="background:${CMPCOL[c.k]}"></i><span class="zl">${esc(L(c.ro, c.en))}</span><span class="za">${fmt(c.km2, 1)} km²</span></label>${S.cmp[c.k] ? `<button type="button" class="btn ghost sm cmpc" data-cmpc="${c.k}">${t("cmp_center")}</button>` : ""}</li>`).join("")
        + `<li class="cap">${t("cmp_ref")}</li><li class="zrow2"><i style="background:var(--accent)"></i><span class="zl">${L("Municipiul Chișinău", "Chișinău Municipality")}</span><b class="za">${fmt(mun?.total ?? 575.5, 1)} km²</b></li>`
        + `<li class="small">${t("cmp_note")}</li>`;
      if (!DATA.__zs) load("zone_stats.json").then((z) => { DATA.__zs = z; renderLegend(); });
    }
  } else if (m === "age") {
    const ZS = DATA.__zs?.[REF()], names = AGE_RO.map((r, i) => L(r, AGE_EN[i]));
    const on = new Set(S.ages ?? AGE_ORDER);
    h = `<li class="cap">${t("age_l")}</li><li class="cap" style="justify-content:flex-end;display:flex">${L("clădiri · suprafață la sol", "buildings · footprint")}</li>` + AGE_ORDER.map((k) => `<li><label><input type="checkbox" data-age="${k}" ${on.has(k) ? "checked" : ""}><i style="background:${AGECOL[k]}"></i><span class="zl">${names[k]}</span>${ZS?.age ? `<span class="za">${fmt(ZS.age[k])} · ${fmt(ZS.age_km2?.[k] ?? 0, 2)} km²</span>` : ""}</label></li>`).join("")
      + (ZS?.age ? `<li class="zrow2"><b class="zl">Total</b><b class="za">${fmt(ZS.age.reduce((a, b) => a + b, 0))} ${t("age_n")}</b></li>` : "")
      + `<li class="small">${t("age_replace")}</li><li class="small">${t("age_note")}</li>`;
    if (!DATA.__zs) load("zone_stats.json").then((z) => { DATA.__zs = z; renderLegend(); });
  } else if (m === "temp") {
    const T0 = DATA.__temp;
    if (!T0) { h = `<li class="loading"><span class="spin"></span>…</li>`; load("temp.json").then((x) => { DATA.__temp = x; renderLegend(); }); }
    else {
      const k = tempKey(), M = k ? T0.maps[k] : null;
      const ABS = [[-15, "#313695"], [-5, "#4575b4"], [3, "#74add1"], [10, "#abd9e9"], [15, "#e6f5c8"], [20, "#fee090"], [25, "#fdae61"], [30, "#f46d43"], [35, "#d73027"]];
      const pos = (v) => Math.max(0, Math.min(100, (v + 15) / 50 * 100));
      const grad = `linear-gradient(90deg, ${ABS.map(([v, c]) => `${c} ${pos(v)}%`).join(", ")})`;
      h = `<li class="tnow"><span>${k === "now" ? t("t_now") : t("t_day") + " · " + fmtDate(S.date)}</span>${M ? `<b>${fmt(M.mean, 1)} °C</b><small>${t("t_range")} ${fmt(M.min, 1)} … ${fmt(M.max, 1)} °C</small>` : `<small>${t("t_nodata")}</small>`}</li>`
        + `<li class="cap">°C</li><li class="tramp"><span class="ramp" style="background:${grad}"></span>${M ? `<span class="tmark" style="left:${pos(M.min)}%;width:${Math.max(1.5, pos(M.max) - pos(M.min))}%"></span>` : ""}</li><li class="rampl"><span>−15</span><span>0</span><span>10</span><span>20</span><span>35</span></li>`
        + `<li class="cap">${t("t_chart")}</li><li class="chartli">${tempChart(T0)}</li>`
        + `<li class="small">${t("t_upd")}: ${new Date(T0.updated).toLocaleString(loc(), { dateStyle: "medium", timeStyle: "short" })} · MET Norway, Open-Meteo</li><li class="small">${t("t_note")}</li>`;
    }
  } else if (m === "zone" && S.zoneView === "built") {
    const ZS = DATA.__zs?.[REF()];
    h = `<li><i style="background:#e03131"></i>${t("built_l")}</li>` + (ZS ? `<li class="cap">${REF() === "ref" ? "2027" : L("Limite actuale", "Current borders")}</li>
      <li class="zrow2"><span class="zl">${t("built_area")}</span><b class="za">${fmt(ZS.built_km2, 1)} km²</b></li>
      <li class="zrow2"><span class="zl"></span><span class="za">${fmt(100 * ZS.built_km2 / ZS.total, 1)}% ${t("built_share")} (${fmt(ZS.total, 1)} km²)</span></li>
      <li class="zrow2"><span class="zl">${t("built_n")}</span><b class="za">${fmt(ZS.buildings)}</b></li>` : "") + `<li class="small">${t("built_note")}</li>`;
    if (!DATA.__zs) load("zone_stats.json").then((z) => { DATA.__zs = z; renderLegend(); });
  } else if (m === "zone") {
    const on = new Set(S.zones ?? Object.keys(T.ro.z));
    const ZS = DATA.__zs?.[REF()];
    const za = (k) => ZS ? `<span class="za">${fmt(ZS.z[k] || 0, 1)} km² · ${fmt(100 * (ZS.z[k] || 0) / ZS.total, 1)}%</span>` : "";
    const order = Object.keys(T.ro.z).sort((a, b) => ZS ? (ZS.z[b] || 0) - (ZS.z[a] || 0) : 0);
    h = (ZS ? `<li class="cap">${t("zone_tot")}</li>` : "") + order.map((k) => `<li><label><input type="checkbox" data-zone="${k}" ${on.has(k) ? "checked" : ""}><i style="background:${P.zone[k]}"></i><span class="zl">${t("z")[k]}</span>${za(k)}</label></li>`).join("")
      + (ZS ? `<li class="zrow"><i style="background:transparent;border-style:dashed"></i><span class="zl">${t("unmapped")}</span>${za("other")}</li><li class="zrow"><b class="zl">Total</b><b class="za">${fmt(ZS.total, 1)} km² · 100%</b></li>` : "");
    if (!DATA.__zs) load("zone_stats.json").then((z) => { DATA.__zs = z; renderLegend(); });
  } else if (m === "transit") {
    h = ["trolleybus", "bus", "minibus", "train"].map((k) => `<li><label><input type="checkbox" data-mode="${k}" ${S.modes[k] ? "checked" : ""}><i class="ln thick" style="border-color:${P.mode[k]}"></i>${t(k)}</label></li>`).join("")
      + `<li class="cap">${L("Fiecare linie are culoarea ei (pe segmentele comune se vede linia principală); grosimea = numărul de rute. Apasă pe o linie pentru rute.", "Each line has its own colour (shared segments show the main line); width = number of routes. Tap a line for its routes.")}</li>`
      + `<li><label><input type="checkbox" data-ring="1" ${S.ring ? "checked" : ""}><i class="ln thick" style="border-color:#0b7285"></i>${t("ring")}</label></li>`
      + (S.ring ? `<li><i class="ln thick" style="border-color:#0b7285"></i>${t("ring_ex")}</li><li><i class="ln thick dash" style="border-color:#7048e8"></i>${t("ring_pr")}</li><li><i class="ln thick dash" style="border-color:#e8590c"></i>${t("ring_ap")}</li>` : "");
  } else if (m === "roads") {
    h = `<li class="cap">${t("lanes")}</li>`
      + [1, 2, 4, 6].map((n) => `<li><i class="ln" style="border-top-width:${Math.max(1, n * 1.6)}px;border-color:${P.road.primary}"></i>${n} ${n === 1 ? L("bandă", "lane") : L("benzi", "lanes")}</li>`).join("")
      + `<li><i class="ln" style="border-color:${P.road.motorway}"></i>${L("Magistrale / naționale", "Trunk / national")}</li>`
      + `<li><i class="ln" style="border-color:${P.road.secondary}"></i>${L("Secundare", "Secondary")}</li>`
      + `<li><i class="ln" style="border-color:${P.road.other};opacity:.55"></i>${t("lanes_est")}</li>`
      + `<li><i class="ln" style="border-color:#e8590c;border-top-width:4px"></i>${t("ped")}</li>`
      + `<li class="cap">${t("bike")}</li><li><i class="ln" style="border-color:#13a36b"></i>${t("track")}</li><li><i class="ln dash" style="border-color:#13a36b"></i>${t("lane")}</li>`
      + `<li class="cap">${t("projects")}</li><li><i class="ln dot" style="border-color:#d6336c"></i>${t("construction")}</li><li><i class="ln dot" style="border-color:#7048e8"></i>${t("proposed")}</li>`;
  }
  el.innerHTML = h;
  document.getElementById("poilist").innerHTML = CATS.map((k) => `<li><label><input type="checkbox" data-cat="${k}" ${S.cats.includes(k) ? "checked" : ""}><img src="${ICON_URL[k] || ""}" alt="">${t("cat")[k]}</label></li>`).join("");
}

// ================================================================== geometry helpers
const R = 6371.0088;
const rad = (d) => d * Math.PI / 180;
function hav(a, b) {
  const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function ringArea(c) {
  let a = 0;
  for (let i = 0; i < c.length - 1; i++) { const p1 = c[i], p2 = c[i + 1]; a += rad(p2[0] - p1[0]) * (2 + Math.sin(rad(p1[1])) + Math.sin(rad(p2[1]))); }
  return Math.abs(a * 6378137 * 6378137 / 2);
}
const polysOf = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
function geomArea(g) { let a = 0; for (const p of polysOf(g)) { a += ringArea(p[0]); for (const h of p.slice(1)) a -= ringArea(h); } return a; }
function geomPerim(g) { let s = 0; for (const p of polysOf(g)) for (const r of p) for (let i = 1; i < r.length; i++) s += hav(r[i - 1], r[i]); return s; }
function lineLen(c) { let s = 0; for (let i = 1; i < c.length; i++) s += hav(c[i - 1], c[i]); return s; }
function circlePoly(c, rKm, n = 128) {
  const pts = [], lat = rad(c[1]), d = rKm / R;
  for (let i = 0; i <= n; i++) {
    const a = 2 * Math.PI * i / n;
    const la = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(a));
    const lo = rad(c[0]) + Math.atan2(Math.sin(a) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(la));
    pts.push([lo * 180 / Math.PI, la * 180 / Math.PI]);
  }
  return { type: "Polygon", coordinates: [pts] };
}
// point-in-polygon with horizontal bands; even-odd over all rings handles holes and multipolygons
function prepGeom(g) {
  const edges = []; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of polysOf(g)) for (const r of p) for (let i = 1; i < r.length; i++) {
    const a = r[i - 1], b = r[i]; edges.push([a[0], a[1], b[0], b[1]]);
    x0 = Math.min(x0, a[0]); x1 = Math.max(x1, a[0]); y0 = Math.min(y0, a[1]); y1 = Math.max(y1, a[1]);
  }
  const N = Math.max(16, Math.min(2048, edges.length >> 2)), h = (y1 - y0) / N || 1e-9;
  const bands = Array.from({ length: N }, () => []);
  for (const e of edges) {
    const lo = Math.max(0, Math.floor((Math.min(e[1], e[3]) - y0) / h)), hi = Math.min(N - 1, Math.floor((Math.max(e[1], e[3]) - y0) / h));
    for (let k = lo; k <= hi; k++) bands[k].push(e);
  }
  return {
    bbox: [x0, y0, x1, y1],
    has(x, y) {
      if (x < x0 || x > x1 || y < y0 || y > y1) return false;
      const band = bands[Math.min(N - 1, Math.floor((y - y0) / h))];
      let inside = false;
      for (let i = 0; i < band.length; i++) {
        const e = band[i];
        if ((e[1] > y) !== (e[3] > y) && x < (e[2] - e[0]) * (y - e[1]) / (e[3] - e[1]) + e[0]) inside = !inside;
      }
      return inside;
    },
  };
}

// ================================================================== statistics for any polygon
let STATDATA = null;
async function statData() {
  if (STATDATA) return STATDATA;
  const [pts, pois, stops, train, roads, rail, elevBuf] = await Promise.all([
    load("pts.json"), load("pois.geojson"), load("stops.geojson"), load("train.geojson"), load("roads.geojson"), load("rail.geojson"),
    loadBin("elev")]);
  const n = pts.b.length / 3, bx = new Float64Array(n), by = new Float64Array(n), bp = new Float32Array(n);
  let x = 0, y = 0;
  for (let i = 0; i < n; i++) { x += pts.b[3 * i]; y += pts.b[3 * i + 1]; bx[i] = 28.5 + x / 1e5; by[i] = 46.8 + y / 1e5; bp[i] = pts.b[3 * i + 2] / 10; }
  const hd = new Uint32Array(elevBuf, 0, 4);
  const elev = { w: hd[0], h: hd[1], x0: hd[2], y0: hd[3], v: new Uint16Array(elevBuf, 16, hd[0] * hd[1]) };
  const stopPts = stops.features.map((f) => f.geometry.coordinates);
  for (const f of train.features) if (f.properties.k === "stop") {
    const c = f.geometry.coordinates;
    if (!stopPts.some((q) => Math.abs(q[0] - c[0]) < 0.002 && Math.abs(q[1] - c[1]) < 0.0014)) stopPts.push(c);
  }
  return STATDATA = { bx, by, bp, extra: pts.x, pois: pois.features, stopPts, roads: roads.features, rail: rail.features, elev };
}
const WORLD = 2 ** 12 * 128;
const mercY = (lat) => { const s = Math.sin(rad(lat)); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * WORLD; };
function elevAt(lon, lat) {
  if (!STATDATA) return null;
  const e = STATDATA.elev;
  const i = Math.floor((lon + 180) / 360 * WORLD - e.x0), j = Math.floor(mercY(lat) - e.y0);
  if (i < 0 || j < 0 || i >= e.w || j >= e.h) return null;
  return e.v[j * e.w + i] || null;
}
function sumLines(feats, pg, fn) {
  const [x0, y0, x1, y1] = pg.bbox;
  for (const f of feats) {
    const g = f.geometry; const lines = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
    for (const c of lines) for (let i = 1; i < c.length; i++) {
      const a = c[i - 1], b = c[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (mx < x0 || mx > x1 || my < y0 || my > y1) continue;
      if (pg.has(mx, my)) fn(f.properties, hav(a, b));
    }
  }
}
async function computeStats(geom) {
  const D = await statData();
  const pg = prepGeom(geom);
  const out = { pop: 0, bld: 0, cats: Object.fromEntries(CATS.map((k) => [k, 0])), stops: 0, roadKm: 0, laneKm: 0, railKm: 0, trackKm: 0, eMin: null, eMax: null, eMean: null };
  for (let i = 0; i < D.bx.length; i++) if (pg.has(D.bx[i], D.by[i])) { out.bld++; out.pop += D.bp[i]; }
  for (const e of D.extra) if (pg.has(e[0], e[1])) out.pop += e[2];
  for (const f of D.pois) { const c = f.geometry.coordinates; if (pg.has(c[0], c[1])) out.cats[f.properties.c]++; }
  for (const c of D.stopPts) if (pg.has(c[0], c[1])) out.stops++;
  sumLines(D.roads, pg, (p, km) => { if (p.c === "pedestrian") return; out.roadKm += km; out.laneKm += km * Math.max(1, p.l || 1); });
  sumLines(D.rail, pg, (p, km) => { if (p.r === "rail") { out.trackKm += km; out.railKm += km * (p.cf ?? 0); } });
  const e = D.elev, [bx0, by0, bx1, by1] = pg.bbox;
  const i0 = Math.max(0, Math.floor((bx0 + 180) / 360 * WORLD - e.x0)), i1 = Math.min(e.w - 1, Math.ceil((bx1 + 180) / 360 * WORLD - e.x0));
  const j0 = Math.max(0, Math.floor(mercY(by1) - e.y0)), j1 = Math.min(e.h - 1, Math.ceil(mercY(by0) - e.y0));
  let sum = 0, cnt = 0, mn = 1e9, mx = -1e9;
  for (let j = j0; j <= j1; j++) {
    const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (j + 0.5 + e.y0) / WORLD))) * 180 / Math.PI;
    for (let i = i0; i <= i1; i++) {
      const lon = (i + 0.5 + e.x0) / WORLD * 360 - 180;
      if (!pg.has(lon, lat)) continue;
      const v = e.v[j * e.w + i]; if (!v) continue;
      sum += v; cnt++; if (v < mn) mn = v; if (v > mx) mx = v;
    }
  }
  if (cnt) { out.eMin = mn; out.eMax = mx; out.eMean = sum / cnt; }
  return out;
}

// ================================================================== info panel
let statToken = 0;
let QUICK = null;
async function quickData() {
  if (QUICK) return QUICK;
  const pts = await load("pts.json");
  const n = pts.b.length / 3, bx = new Float64Array(n), by = new Float64Array(n), bp = new Float32Array(n);
  let x = 0, y = 0;
  for (let i = 0; i < n; i++) { x += pts.b[3 * i]; y += pts.b[3 * i + 1]; bx[i] = 28.5 + x / 1e5; by[i] = 46.8 + y / 1e5; bp[i] = pts.b[3 * i + 2] / 10; }
  return QUICK = { bx, by, bp, extra: pts.x };
}
async function quickPop(sel) {
  const D = await quickData(), pg = prepGeom(sel.geom);
  let pop = 0, bld = 0;
  for (let i = 0; i < D.bx.length; i++) if (pg.has(D.bx[i], D.by[i])) { bld++; pop += D.bp[i]; }
  for (const e of D.extra) if (pg.has(e[0], e[1])) pop += e[2];
  if (S.selected === sel) { sel.quick = { pop, bld }; renderInfo(); }
}
async function renderInfo() {
  const sel = S.selected, s = popScale();
  const mi = document.getElementById("measureinfo");
  const drawn = !!sel && sel.kind !== "admin";
  const panel = document.getElementById("panel"), adminSel = !!sel && sel.kind === "admin";
  if (panel.classList.contains("has-sel") !== adminSel) {
    panel.classList.toggle("has-sel", adminSel);
    panel.querySelector(".body").scrollTop = 0;
  }
  if (!drawn) mi.innerHTML = "";
  const el = drawn ? mi : document.getElementById("info");
  if (!sel || drawn) {
    const el = document.getElementById("info");
    const admin = await adminFC();
    const mun = admin.features.find((f) => f.properties.lvl === "mun" && [REF(), "both"].includes(f.properties.sc)).properties;
    el.innerHTML = `<div class="kpi"><span>${t("pop_total")} · ${S.scen === "est" ? t("est") : t("census_d")}${REF() === "ref" ? " · 2027" : ""}</span><b>${fmt(mun.pop * s)}</b><span>${fmtDate(S.date)}</span></div>`
      + `<div class="kpi kpi2"><span>${t("area_mun")}${REF() === "ref" ? " · 2027" : ""}</span><b>${fmt(mun.km2, 1)} km²</b></div>`
      + budgetHtml(mun.pop * s) + `<p class="hint">${t("clickhint")}</p>` + (S.date !== TODAY ? `<p class="note">${t("snap")}</p>` : "");
    el.querySelectorAll("[data-cur]").forEach((b) => b.addEventListener("click", () => { S.cur = b.dataset.cur; store.set("cur", S.cur); renderInfo(); }));
    if (!sel) return;
  }
  const p = sel.props || {};
  let h = `<button type="button" class="closex" id="closeinfo" aria-label="${L("Închide", "Close")}">×</button><span class="chip">${t("lvlname")[sel.kind === "admin" ? p.lvl : sel.kind]}</span>`;
  if (sel.kind === "admin") {
    h += `<h3>${esc(nameOf(p))}</h3><dl>${p.sector ? `<dt>${t("sector")}</dt><dd>${esc(p.sector)}</dd>` : ""}${p.unit && p.lvl === 3 ? `<dt>${t("unit")}</dt><dd>${esc(p.unit)}</dd>` : ""}
      <dt>${t("popl")}</dt><dd>${p.pop ? `<b>${fmt(p.pop * s)}</b>` : t("none")}</dd>
      <dt>${t("area")}</dt><dd>${fmt(p.km2, 2)} km²</dd><dt>${t("perim")}</dt><dd>${fmt(geomPerim(sel.geom), 1)} km</dd>
      <dt>${t("dens")}</dt><dd>${p.dens ? fmt(p.dens * s) + " / km²" : t("none")}</dd>
      ${p.jobs != null ? `<dt>${L("Locuri de muncă (estimare)", "Jobs (estimate)")}</dt><dd>${fmt(p.jobs)}</dd><dt>${L("Locuri de muncă la un locuitor", "Jobs per resident")}</dt><dd>${fmt(p.jr / s, 2)}</dd>` : ""}</dl>`;
    if (p.note) h += `<p class="note">${esc(p.note)}</p>`;
  } else if (sel.kind === "line") {
    h += `<h3>${t("length")}: ${fmt(sel.len, sel.len < 10 ? 2 : 1)} km</h3><p class="small">${sel.n} ${L("puncte", "points")}</p>`;
  } else {
    if (sel.kind === "circle") h += `<h3>${t("radius")} ${sel.r < 1 ? fmt(sel.r * 1000) + " m" : fmt(sel.r, 2) + " km"}</h3>`;
    h += `<div class="measure"><div><span>${t("areaL")}</span><b>${fmt(sel.area / 1e6, sel.area < 1e7 ? 3 : 2)} km²</b></div><div><span>${t("perim")}</span><b>${fmt(sel.perim, 2)} km</b></div>`
      + `<div><span>${t("popest")}</span><b>${sel.quick ? fmt(Math.round(sel.quick.pop * s)) : "…"}</b></div><div><span>${t("buildings")}</span><b>${sel.quick ? fmt(sel.quick.bld) : "…"}</b></div></div>`;
  }
  if (sel.geom) {
    if (sel.stats === undefined) h += `<button type="button" class="btn" id="seeinfo">${t("see")}</button>`;
    else if (sel.stats === null) h += `<div class="loading" role="status"><span class="spin"></span>${t("calc")}</div>`;
    else h += statsHtml(sel.stats, sel.kind === "admin");
  }
  if (sel.kind === "admin") h += `<p class="src">${p.lvl === "ctx" ? t("outside") + "<br>" : ""}${p.src ? t("src") + ": " + esc(p.src) + (S.scen === "est" ? L(" · scalat la estimarea BNS 2019", " · scaled to NBS 2019 estimate") : "") : ""}${p.method ? "<br>" + t("method") + ": " + esc(p.method) : ""}</p>`;
  el.innerHTML = h;
  el.querySelector("#seeinfo")?.addEventListener("click", runStats);
  el.querySelector("#closeinfo")?.addEventListener("click", () => {
    if (drawn) { endTool(); clearSel(); document.getElementById("toolopts").hidden = true; document.getElementById("measurebtn").setAttribute("aria-expanded", "false"); }
    else clearSel();
  });
}
function fmtDate(iso) { return new Date(iso + "T12:00:00").toLocaleDateString(loc(), { day: "numeric", month: "long", year: "numeric" }); }
function budgetHtml(pop) {
  const y = +S.date.slice(0, 4), B = BUDGET[y];
  let h = `<div class="budget"><div class="bhead"><b>${t("b_title")} ${y}</b>`;
  if (!B) return h + `<span class="pill warn">${L("fără date", "no data")}</span></div><p class="small">${L("Nu există date publice despre bugetul acestui an.", "No public data for this year's budget.")}</p></div>`;
  const ok = B.approved && S.date >= B.approved;
  const status = ok ? L(`aprobat ${fmtDate(B.approved)}`, `adopted ${fmtDate(B.approved)}`)
    : B.rev == null ? L("fără proiect publicat", "no draft published")
    : L("buget provizoriu · cifre din proiect", "provisional budget · draft figures");
  h += `<span class="pill ${ok ? "good" : "warn"}">${status}</span></div>`;
  h = h.replace(`<b>${t("b_title")} ${y}</b>`, `<b>${t("b_title")} ${y}</b><span class="curseg" role="group" aria-label="Monedă"><button type="button" data-cur="lei" aria-pressed="${S.cur === "lei"}">lei</button><button type="button" data-cur="eur" aria-pressed="${S.cur === "eur"}">EUR</button></span>`);
  if (B.rev != null) {
    const eur = S.cur === "eur";
    const bn = (v) => eur ? `${fmt(v * 1000 / EUR_RATE, 0)} ${L("mil. €", "m €")}` : `${fmt(v, 2)} ${t("bln")}`;
    h += `<dl class="stats">${`<dt>${t("b_rev")}</dt><dd>${bn(B.rev)}</dd>`}${B.tr ? `<dt>&nbsp;&nbsp;${t("b_tr")}</dt><dd>${bn(B.tr)}</dd>` : ""}<dt>${t("b_exp")}</dt><dd>${bn(B.exp)}</dd>
      <dt>${t("b_bal")}</dt><dd>${bn(B.exp - B.rev)}</dd><dt>${t("b_pc")}</dt><dd>${eur ? fmt(B.exp * 1e9 / pop / EUR_RATE) + " €" : fmt(B.exp * 1e9 / pop) + " " + t("lei")}</dd></dl>`
      + (eur ? `<p class="small">${L("Curs oficial BNM", "Official NBM rate")} ${fmtDate(EUR_DATE)}: 1 € = ${fmt(EUR_RATE, 4)} lei</p>` : "");
  }
  h += `<p class="small">${esc(B.note[S.lang])}</p><p class="small">${t("b_src")}: ${B.src.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`).join(" · ")}</p></div>`;
  return h;
}
function money(lei, d = 0) { return S.cur === "eur" ? `${fmt(lei / EUR_RATE, d)} €` : `${fmt(lei, d)} lei`; }
function lifeHtml() {
  const ro = S.lang === "ro";
  const g = pick(LIFE.gdp), h = pick(LIFE.hdi), w = pick(LIFE.wage), p = pick(LIFE.poverty);
  const B = BUDGET[+S.date.slice(0, 4)];
  const pop = popAt(S.date);
  const row = (a, b, note) => `<dt>${a}</dt><dd>${b}</dd>${note ? `<div class="rownote">${note}</div>` : ""}`;
  let x = `<div class="bhead"><b>${t("life")}</b><span class="curseg" role="group"><button type="button" data-cur="lei" aria-pressed="${S.cur === "lei"}">lei</button><button type="button" data-cur="eur" aria-pressed="${S.cur === "eur"}">EUR</button></span></div>
    <p class="small">${L("Cele mai noi date publicate până la", "Latest data published by")} ${fmtDate(S.date)}.</p><dl class="stats">`;
  if (g) x += `<div class="sep">${L("Economie", "Economy")}</div>` + row(L(`PIB pe locuitor (${g.year})`, `GDP per capita (${g.year})`), money(g.pc), L("mun. Chișinău, calcul BNS", "Chișinău municipality, NBS"))
    + row(L(`PIB regional (${g.year})`, `Regional GDP (${g.year})`), S.cur === "eur" ? `${fmt(g.total * 1000 / EUR_RATE, 0)} ${L("mil. €", "m €")}` : `${fmt(g.total, 1)} ${t("bln")}`)
    + row(L("Ponderea în PIB-ul țării", "Share of national GDP"), `${fmt(g.share, 1)}%`);
  if (w) x += `<div class="sep">${L("Venituri", "Income")}</div>` + row(L(`Salariu mediu brut (${w.label.ro})`, `Average gross wage (${w.label.en})`), money(w.v) + L("/lună", "/month"),
    w.nat ? L(`media națională ${money(w.nat)}; Chișinău +${fmt((w.v / w.nat - 1) * 100, 1)}%`, `national average ${money(w.nat)}; Chișinău +${fmt((w.v / w.nat - 1) * 100, 1)}%`) : "");
  if (p) x += row(L(`Rata sărăciei absolute (${p.year})`, `Absolute poverty rate (${p.year})`), `${fmt(p.v, 1)}%`, L(`media națională ${fmt(p.nat, 1)}% (metodologia veche)`, `national ${fmt(p.nat, 1)}% (old methodology)`));
  if (h) x += `<div class="sep">${L("Dezvoltare umană", "Human development")}</div>` + row(L(`IDU Moldova (${h.year})`, `HDI Moldova (${h.year})`), fmt(h.v, 3),
    (h.rank ? L(`locul ${h.rank} din 193, dezvoltare umană ridicată`, `rank ${h.rank} of 193, high human development`) : "") + L(" · PNUD nu publică IDU pe municipii", " · UNDP does not publish HDI by municipality"));
  x += `<div class="sep">${L("Municipiu", "Municipality")}</div>` + row(t("popl"), fmt(pop)) + (B && B.exp ? row(t("b_pc"), money(B.exp * 1e9 / pop)) : "");
  x += `</dl>`;
  const src = [g, h, w, p].filter(Boolean).flatMap((o) => o.src || LIFE[Object.keys(LIFE).find((k) => LIFE[k].includes(o))].find((q) => q.src)?.src || []);
  const uniq = [...new Map(src.map((q) => [q[1], q])).values()];
  x += `<p class="small">${t("b_src")}: ${uniq.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`).join(" · ")}</p>`;
  if (S.cur === "eur") x += `<p class="small">1 € = ${fmt(EUR_RATE, 4)} lei (BNM, ${fmtDate(EUR_DATE)})</p>`;
  return x;
}
function statsHtml(st, isAdmin) {
  const s = popScale(), row = (a, b) => `<dt>${a}</dt><dd>${b}</dd>`;
  let h = `<dl class="stats"><div class="sep">${t("s_people")}</div>`;
  if (!isAdmin) h += row(t("popest"), fmt(Math.round(st.pop * s)));
  h += row(t("buildings"), fmt(st.bld));
  h += `<div class="sep">${t("s_places")}</div>` + CATS.map((k) => row(`<img src="${ICON_URL[k]}" alt="">${t("cat")[k]}`, fmt(st.cats[k]))).join("");
  h += `<div class="sep">${t("s_mob")}</div>` + row(t("stops"), fmt(st.stops)) + row(t("road_km"), fmt(st.roadKm, 1)) + row(t("lane_km"), fmt(st.laneKm, 1))
    + row(t("rail_km"), fmt(st.railKm, 2)) + row(t("rail_tr"), fmt(st.trackKm, 2));
  if (st.eMin != null) h += `<div class="sep">${t("s_terrain")}</div>` + row(t("elev"), `${fmt(st.eMin)} / ${fmt(st.eMean)} / ${fmt(st.eMax)} m`);
  h += `</dl>`;
  if (!isAdmin) h += `<p class="src">${t("popest")}: ${t("pop_note")}</p>`;
  return h;
}
async function runStats() {
  const sel = S.selected; if (!sel) return;
  const tok = ++statToken;
  sel.stats = null; renderInfo();
  await new Promise((r) => setTimeout(r, 40));
  const st = await computeStats(sel.geom);
  if (tok !== statToken || S.selected !== sel) return;
  sel.stats = st; renderInfo();
}
function select(sel) {
  statToken++; S.selected = sel;
  if (sel.kind !== "admin") {
    document.getElementById("toolopts").hidden = false; document.getElementById("measurebtn").setAttribute("aria-expanded", "true");
    renderInfo(); if (sel.geom) quickPop(sel); return;
  }
  document.getElementById("panel").classList.remove("min");
  if (document.getElementById("panel").hidden) { document.getElementById("panel").hidden = false; document.getElementById("showpanel").hidden = true; document.body.classList.remove("nopanel"); }
  renderInfo().then(() => { document.querySelector("#panel .body").scrollTop = 0; });
}

// ================================================================== popups
let pop = null;
function popup(ll, html) { pop?.remove(); pop = new maplibregl.Popup({ maxWidth: "300px" }).setLngLat(ll).setHTML(html).addTo(map); return pop; }
function showStop(name, rs, ll) {
  const chips = rs.map((k) => { const [m, r] = k.split(":"); return `<span class="rchip" style="background:${pal().mode[m] || "#666"}">${esc(r)}</span>`; }).join(" ");
  popup(ll, `<b>${esc(name || "—")}</b><br><small>${t("routes_here")}</small><div class="rchips">${chips || t("none")}</div>`);
}
const KIND_RO = { supermarket: "supermarket", convenience: "magazin alimentar", clothes: "îmbrăcăminte", pharmacy: "farmacie", restaurant: "restaurant", fast_food: "fast-food",
  bar: "bar", pub: "pub", cafe: "cafenea", bank: "bancă", hospital: "spital", clinic: "clinică", dentist: "stomatologie", doctors: "cabinet medical", doctor: "cabinet medical",
  school: "școală", kindergarten: "grădiniță", childcare: "îngrijire copii", university: "universitate", college: "colegiu", townhall: "primărie", police: "poliție",
  government: "instituție de stat", park: "parc", garden: "grădină", mall: "centru comercial", department_store: "magazin universal", hotel: "hotel", fuel: "benzinărie",
  post_office: "oficiu poștal", courthouse: "judecătorie", fire_station: "pompieri", embassy: "ambasadă", diplomatic: "misiune diplomatică", marketplace: "piață",
  hairdresser: "frizerie", car_repair: "service auto", beauty: "salon de frumusețe", bakery: "brutărie", butcher: "carmangerie", hardware: "articole tehnice",
  furniture: "mobilă", mobile_phone: "telefoane mobile", electronics: "electronice", company: "companie", it: "IT", lawyer: "avocat", notary: "notar",
  insurance: "asigurări", estate_agent: "imobiliare", fitness_centre: "sală de fitness", laboratory: "laborator", ice_cream: "înghețată", car_wash: "spălătorie auto", place_of_worship: "lăcaș de cult", museum: "muzeu", hostel: "hostel", guest_house: "pensiune", motel: "motel", monument: "monument", memorial: "memorial",
  building: "clădire istorică", castle: "conac / castel", archaeological_site: "sit arheologic", ruins: "ruine", manor: "conac", wayside_cross: "troiță", tomb: "mormânt istoric", heritage: "patrimoniu", monastery: "mănăstire", church: "biserică", chapel: "capelă", cathedral: "catedrală" };
const REL_RO = { christian: "creștin", orthodox: "ortodox", catholic: "catolic", jewish: "evreiesc", muslim: "musulman", buddhist: "budist", hindu: "hindus", baptist: "baptist", pentecostal: "penticostal", lutheran: "luteran", russian_orthodox: "ortodox (Mitropolia Moldovei)", romanian_orthodox: "ortodox (Mitropolia Basarabiei)" };
async function showPoi(f, ll) {
  const p = f.properties;
  const kind = KIND_RO[p.k] ? L(KIND_RO[p.k], String(p.k).replace(/_/g, " ")) : String(p.k || "").replace(/_/g, " ");
  const inside = p.i & (REF() === "ref" ? 2 : 1);
  const web = p.w ? (p.w.startsWith("http") ? p.w : "https://" + p.w) : null;
  const html = (img) => `<div class="poipop">${img || ""}<b>${esc(p.n || t("cat")[p.c])}</b><div class="k">${esc(t("cat")[p.c])}${kind ? " · " + esc(kind) : ""}${p.b && p.b !== p.n ? " · " + esc(p.b) : ""}</div>
    ${p.rel ? `<div>${L("Cult", "Faith")}: ${esc([p.rel, p.den].filter(Boolean).map((x) => (REL_RO[x] ? L(REL_RO[x], x.replace(/_/g, " ")) : x.replace(/_/g, " "))).join(", "))}</div>` : ""}
    ${p.sd ? `<div>${L("Construit", "Built")}: ${esc(p.sd)}</div>` : ""}${p.st ? `<div>${L("Stele", "Stars")}: ${"★".repeat(Math.min(5, parseInt(p.st) || 0))}</div>` : ""}
    ${p.her ? `<div class="k">${L("Monument ocrotit de stat", "Listed heritage")}${/^\d+$/.test(p.her) ? "" : " · " + esc(p.her)}</div>` : ""}
    ${p.a ? `<div>${t("addr")}: ${esc(p.a)}</div>` : ""}${p.h ? `<div>${t("hours")}: ${esc(p.h)}</div>` : ""}
    ${web ? `<div>${t("web")}: <a href="${esc(web)}" target="_blank" rel="noopener">${esc(web.replace(/^https?:\/\//, "").slice(0, 40))}</a></div>` : ""}
    ${inside ? "" : `<div class="k">${t("outside")}</div>`}</div>`;
  const pp = popup(ll, html(p.ph ? `<div class="ph phph"></div>` : ""));
  if (p.ph) {
    try {
      const ph = (await load("photos.json"))[p.id];
      if (ph && pp.isOpen()) pp.setHTML(html(`<img class="ph" src="${ph.src}" alt="${esc(p.n || "")}"><div class="k">${t("photo")} · ${esc(ph.file)}</div>`));
    } catch {}
  }
}

// ================================================================== drawing tools
function drawFC() {
  const d = S.draw, feats = [], kind = S.tool || S.selected?.kind;
  if (kind === "circle") {
    if (d.center) feats.push({ type: "Feature", geometry: circlePoly(d.center, d.radius / 1000) }, { type: "Feature", geometry: { type: "Point", coordinates: d.center } });
  } else if (kind === "line" || kind === "poly") {
    const live = d.hover && !d.done && S.tool;
    if (kind === "poly" && d.done) feats.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [[...d.pts, d.pts[0]]] } });
    else if (d.pts.length >= 2 || (live && d.pts.length)) feats.push({ type: "Feature", geometry: { type: "LineString", coordinates: live ? [...d.pts, d.hover] : d.pts } });
    if (live && kind === "poly" && d.pts.length >= 2) feats.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [[...d.pts, d.hover, d.pts[0]]] } });
    d.pts.forEach((c) => feats.push({ type: "Feature", geometry: { type: "Point", coordinates: c } }));
  }
  map.getSource("draw")?.setData({ type: "FeatureCollection", features: feats });
}
function setTool(tool) {
  S.tool = S.tool === tool ? null : tool;
  S.draw = { pts: [], done: false, center: null, radius: S.draw.radius || 1000 };
  document.querySelectorAll(".mode[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === S.tool)));
  document.getElementById("toolopts").hidden = !S.tool;
  document.getElementById("measurebtn").setAttribute("aria-expanded", String(!!S.tool));
  document.getElementById("viewmenu").hidden = true; document.getElementById("viewbtn").setAttribute("aria-expanded", "false");
  document.getElementById("radiusbox").hidden = S.tool !== "circle";
  document.getElementById("finish").hidden = S.tool === "circle";
  document.getElementById("toolhint").textContent = S.tool ? t("h_" + S.tool) : "";
  map.getCanvas().style.cursor = S.tool ? "crosshair" : "";
  if (S.tool) map.doubleClickZoom.disable(); else map.doubleClickZoom.enable();
  statToken++; S.selected = null; map.setFilter("admin-sel", ["==", ["get", "id"], -1]); renderInfo();
  drawFC(); updateRadiusLabel();
}
function endTool() {
  S.tool = null;
  document.querySelectorAll(".mode[data-tool]").forEach((b) => b.setAttribute("aria-pressed", "false"));
  document.getElementById("toolhint").textContent = "";
  document.getElementById("finish").hidden = true; map.getCanvas().style.cursor = ""; map.doubleClickZoom.enable();
}
function finishDraw() {
  const d = S.draw;
  if (S.tool === "line" && d.pts.length >= 2) {
    d.done = true; d.hover = null; endTool(); select({ kind: "line", len: lineLen(d.pts), n: d.pts.length });
  } else if (S.tool === "poly" && d.pts.length >= 3) {
    d.done = true; d.hover = null; endTool();
    const geom = { type: "Polygon", coordinates: [[...d.pts, d.pts[0]]] };
    select({ kind: "poly", geom, area: geomArea(geom), perim: geomPerim(geom) });
  } else if (S.tool === "circle") { endTool(); }
  drawFC();
}
function updateRadiusLabel() {
  const r = S.draw.radius; document.getElementById("radiusval").textContent = r >= 1000 ? fmt(r / 1000, 2) + " km" : fmt(r) + " m";
  document.getElementById("radius").value = r;
}
function circleSelect() {
  const d = S.draw; if (!d.center) return;
  const geom = circlePoly(d.center, d.radius / 1000);
  select({ kind: "circle", geom, r: d.radius / 1000, area: geomArea(geom), perim: 2 * Math.PI * d.radius / 1000 });
  drawFC();
}

// ================================================================== routes
async function fillRoutes() {
  if (!DATA["routes.json"]) return;
  const routes = await load("routes.json");
  const sel = document.getElementById("route-sel"), seen = new Set();
  sel.innerHTML = `<option value="">${t("allroutes")}</option>` + routes.filter((r) => !seen.has(r.key) && seen.add(r.key))
    .map((r) => `<option value="${esc(r.key)}">${t(r.mode)} ${esc(r.ref)}${r.from && r.to ? " · " + esc(r.from) + " – " + esc(r.to) : r.name ? " · " + esc(r.name) : ""}</option>`).join("");
  sel.value = S.route;
}

// ================================================================== events
function renderLife() { const m = document.getElementById("lifemenu"); if (!m.hidden) m.innerHTML = lifeHtml(); }
async function fillRegions() {
  const sel = document.getElementById("region"), admin = await adminFC();
  const grp = (lvl, label) => {
    const fs = admin.features.filter((f) => f.properties.lvl === lvl && [REF(), "both"].includes(f.properties.sc))
      .sort((a, b) => nameOf(a.properties).localeCompare(nameOf(b.properties), loc()));
    return `<optgroup label="${esc(label)}">` + fs.map((f) => `<option value="${f.properties.id}">${esc(nameOf(f.properties))}${lvl === 3 && f.properties.unit ? " · " + esc(f.properties.unit.replace(/^Chișinău – sectorul /, "")) : ""}</option>`).join("") + `</optgroup>`;
  };
  sel.innerHTML = `<option value="">${t("region_all")}</option>` + grp(1, t("l1")) + grp(2, t("l2")) + grp(3, t("l3"));
  if (S.region && !admin.features.some((f) => f.properties.id === S.region && [REF(), "both"].includes(f.properties.sc))) { S.region = null; applyRegion(false); }
  sel.value = S.region ? String(S.region) : "";
}
let REGION_PG = null, MASK_ID = null;
async function applyRegion(fit) {
  const admin = await adminFC();
  const f = S.region ? admin.features.find((x) => x.properties.id === S.region)
    : S.hideOut ? admin.features.find((x) => x.properties.lvl === "mun" && [REF(), "both"].includes(x.properties.sc)) : null;
  MASK_ID = f ? f.properties.id : null;
  REGION_PG = f ? prepGeom(f.geometry) : null;
  const world = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
  const holes = f ? polysOf(f.geometry).map((p) => p[0]) : [];
  const enclaves = f ? polysOf(f.geometry).flatMap((p) => p.slice(1)) : [];
  map.getSource("mask").setData({ type: "FeatureCollection", features: f ? [
    { type: "Feature", properties: { k: "mask" }, geometry: { type: "Polygon", coordinates: [world, ...holes] } },
    ...enclaves.map((r) => ({ type: "Feature", properties: { k: "mask" }, geometry: { type: "Polygon", coordinates: [r] } })),
    { type: "Feature", properties: { k: "edge" }, geometry: f.geometry }] : [] });
  map.setPaintProperty("mask", "fill-color", isDark() ? "#101318" : "#f8f9fa");
  if (f && fit) {
    const b = new maplibregl.LngLatBounds();
    polysOf(f.geometry).forEach((p) => p[0].forEach((c) => b.extend(c)));
    map.fitBounds(b, { padding: { top: 80, bottom: 40, left: window.innerWidth > 640 && !document.getElementById("panel").hidden ? 390 : 30, right: 40 }, maxZoom: 15.5 });
  }
  renderLabels();
}
let TEMP_KEY = "now";
function tempKey() {
  const T0 = DATA.__temp; if (!T0) return null;
  if (S.date === TODAY) return "now";
  return T0.maps[S.date] ? S.date : null;
}
function updateTempImage() {
  load("temp.json").then((T0) => {
    DATA.__temp = T0;
    const k = tempKey();
    vis("temp", !!k && (S.mode === "temp" || S.keep.temp));
    if (k && k !== TEMP_KEY) { TEMP_KEY = k; map.getSource("temp")?.updateImage({ url: `data/temp/${k}.jpg`, coordinates: T0.bounds }); if (S.mode === "temp") renderLabels(); }
    if (S.mode === "temp") renderLegend();
  });
}
function tempChart(T0) {
  const ser = T0.series.filter((r) => r.mean != null), W = 300, H = 150, L = 28, B = 18, Tp = 8;
  const lo = Math.floor(Math.min(...ser.map((r) => r.min)) / 5) * 5, hi = Math.ceil(Math.max(...ser.map((r) => r.max)) / 5) * 5;
  const x = (i) => L + (W - L - 6) * i / (ser.length - 1), y = (v) => Tp + (H - Tp - B) * (hi - v) / (hi - lo);
  const iToday = ser.findIndex((r) => r.d === TODAY), iSel = ser.findIndex((r) => r.d === S.date);
  let g = "";
  for (let v = lo; v <= hi; v += 5) g += `<line x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 4}" y="${y(v) + 3}" class="ax" text-anchor="end">${v}</text>`;
  if (iToday >= 0) g += `<rect x="${x(iToday)}" y="${Tp}" width="${W - 6 - x(iToday)}" height="${H - Tp - B}" class="fc"/><text x="${W - 8}" y="${Tp + 9}" class="ax" text-anchor="end">${t("t_fc")}</text>`;
  if (lo < 0 && hi > 0) g += `<line x1="${L}" x2="${W - 6}" y1="${y(0)}" y2="${y(0)}" class="zero"/>`;
  const band = ser.map((r, i) => `${x(i)},${y(r.max)}`).join(" ") + " " + ser.map((r, i) => `${x(i)},${y(r.min)}`).reverse().join(" ");
  g += `<polygon points="${band}" class="band"/><polyline points="${ser.map((r, i) => `${x(i)},${y(r.mean)}`).join(" ")}" class="line"/>`;
  if (iSel >= 0) g += `<line x1="${x(iSel)}" x2="${x(iSel)}" y1="${Tp}" y2="${H - B}" class="sel"/><circle cx="${x(iSel)}" cy="${y(ser[iSel].mean)}" r="3.5" class="dot"/>`;
  [0, Math.floor(ser.length / 2), ser.length - 1].forEach((i) => { g += `<text x="${x(i)}" y="${H - 4}" class="ax" text-anchor="${i === 0 ? "start" : i === ser.length - 1 ? "end" : "middle"}">${new Date(ser[i].d + "T12:00").toLocaleDateString(loc(), { day: "numeric", month: "short" })}</text>`; });
  ser.forEach((r, i) => { g += `<rect x="${x(i) - (W - L) / ser.length / 2}" y="${Tp}" width="${(W - L) / ser.length}" height="${H - Tp - B}" class="hit" data-day="${r.d}"><title>${r.d}: ${fmt(r.mean, 1)} °C (${fmt(r.min, 1)} / ${fmt(r.max, 1)})</title></rect>`; });
  return `<svg viewBox="0 0 ${W} ${H}" class="tchart" role="img" aria-label="${t("t_chart")}">${g}</svg>`;
}
// ---------------------------------------------------------------- city size comparison
const CMP_MARK = {};
function cmpGeom(c, lon0, lat0) {
  const conv = (ring) => ring.map(([x, y]) => { const lat = lat0 + y / 111320; return [lon0 + x / (111320 * Math.cos(lat * Math.PI / 180)), lat]; });
  return { type: "MultiPolygon", coordinates: c.poly.map((p) => p.map(conv)) };
}
async function cmpUpdate() {
  const list = await cmpList();
  if (!map.getSource("cmp")) {
    map.addSource("cmp", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "cmp-fill", type: "fill", source: "cmp", paint: { "fill-color": ["get", "col"], "fill-opacity": 0.32 } }, "draw-fill");
    map.addLayer({ id: "cmp-line", type: "line", source: "cmp", paint: { "line-color": ["get", "col"], "line-width": 2.2 } }, "draw-fill");
    // drag the outline itself (mouse and touch)
    let drag = null;
    const start = (e) => {
      if (S.tool || (e.originalEvent.touches && e.originalEvent.touches.length > 1)) return;
      const k = e.features?.[0]?.properties?.k; if (!k) return;
      e.preventDefault();
      drag = { k, ll: e.lngLat, pos: [...S.cmp[k]] };
      map.dragPan.disable(); map.getCanvas().style.cursor = "grabbing";
    };
    const move = (e) => {
      if (!drag) return;
      S.cmp[drag.k] = [drag.pos[0] + (e.lngLat.lng - drag.ll.lng), drag.pos[1] + (e.lngLat.lat - drag.ll.lat)];
      CMP_MARK[drag.k]?.setLngLat(S.cmp[drag.k]); cmpData(DATA.__cmp || list);
    };
    const end = () => { if (!drag) return; drag = null; map.dragPan.enable(); map.getCanvas().style.cursor = ""; };
    map.on("mousedown", "cmp-fill", start); map.on("touchstart", "cmp-fill", start);
    map.on("mousemove", move); map.on("touchmove", move);
    map.on("mouseup", end); map.on("touchend", end); map.on("touchcancel", end);
    map.on("mouseenter", "cmp-fill", () => { if (!drag && !S.tool) map.getCanvas().style.cursor = "grab"; });
    map.on("mouseleave", "cmp-fill", () => { if (!drag && !S.tool) map.getCanvas().style.cursor = ""; });
  }
  const feats = [];
  for (const c of list) {
    const pos = S.cmp[c.k];
    if (!pos) { CMP_MARK[c.k]?.remove(); delete CMP_MARK[c.k]; continue; }
    feats.push({ type: "Feature", properties: { col: CMPCOL[c.k], k: c.k }, geometry: cmpGeom(c, pos[0], pos[1]) });
    if (!CMP_MARK[c.k]) {
      const el = document.createElement("div"); el.className = "cmplbl"; el.style.setProperty("--c", CMPCOL[c.k]);
      el.innerHTML = `<span>⠿</span>${esc(L(c.ro, c.en))}<small>${fmt(c.km2, 1)} km²</small>`;
      const mk = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(pos).addTo(map);
      mk.on("drag", () => { const p = mk.getLngLat(); S.cmp[c.k] = [p.lng, p.lat]; cmpData(list); });
      CMP_MARK[c.k] = mk;
    } else CMP_MARK[c.k].setLngLat(pos);
  }
  map.getSource("cmp").setData({ type: "FeatureCollection", features: feats });
  const on = S.mode === "cmp" || S.keep.cmp;
  vis("cmp-fill", on); vis("cmp-line", on);
  Object.values(CMP_MARK).forEach((m) => (m.getElement().hidden = !on));
}
let cmpRaf = 0;
function cmpData(list) {
  cancelAnimationFrame(cmpRaf);
  cmpRaf = requestAnimationFrame(() => map.getSource("cmp").setData({ type: "FeatureCollection",
    features: list.filter((c) => S.cmp[c.k]).map((c) => ({ type: "Feature", properties: { col: CMPCOL[c.k], k: c.k }, geometry: cmpGeom(c, S.cmp[c.k][0], S.cmp[c.k][1]) })) }));
}
function clearSel() { statToken++; S.selected = null; map.setFilter("admin-sel", ["==", ["get", "id"], -1]); S.draw = { pts: [], done: false, center: null, radius: S.draw.radius }; drawFC(); renderInfo(); }
function bindEvents() {
  const $ = (id) => document.getElementById(id);
  let lastTap = { mode: null, t: 0 };
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", (e) => {
    const md = b.dataset.mode, now = e.timeStamp;
    if (lastTap.mode === md && now - lastTap.t < 400) {          // double click / double tap: keep or release this map
      S.keep = { ...S.keep, [md]: !S.keep[md] }; lastTap = { mode: null, t: 0 }; render(); return;
    }
    lastTap = { mode: md, t: now };
    if (S.mode !== md) { S.mode = md; if (S.selected?.kind === "admin") clearSel(); render(); }
  }));
  const radios = (name, fn) => document.querySelectorAll(`input[name=${name}]`).forEach((r) => r.addEventListener("change", () => fn(r.value)));
  radios("level", (v) => { S.level = +v; if (S.selected?.kind === "admin") clearSel(); render(); });
  radios("scen", (v) => { S.scen = v; render(); });
  radios("reform", (v) => { S.ref = v; setTimeout(() => applyRegion(false), 50); if (S.selected?.kind === "admin") clearSel(); render(); });
  radios("zoneview", (v) => { S.zoneView = v; store.set("zoneView", v); render(); });
  radios("popview", (v) => { S.popView = v; store.set("popView", v); render(); });
  radios("popwhat", (v) => { S.popWhat = v; store.set("popWhat", v); render(); });
  $("date").addEventListener("change", (e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) { S.date = e.target.value; if (S.selected?.kind === "admin") clearSel(); render(); } });
  $("todaybtn").addEventListener("click", () => { S.date = TODAY; render(); });
  $("planbtn").addEventListener("click", () => {
    const m = $("lifemenu"), open = m.hidden;
    $("viewmenu").hidden = true; $("viewbtn").setAttribute("aria-expanded", "false");
    if (S.tool) setTool(S.tool);
    $("toolopts").hidden = true; $("measurebtn").setAttribute("aria-expanded", "false");
    m.hidden = !open; $("planbtn").setAttribute("aria-expanded", String(open));
    if (open) renderLife();
  });
  $("lifemenu").addEventListener("click", (e) => { const c = e.target.dataset?.cur; if (c) { S.cur = c; store.set("cur", c); renderLife(); renderInfo(); } });
  $("newproj").addEventListener("click", () => {});
  radios("base", (v) => { S.base = v; if (v === "elevation") statData(); render(); });
  $("ctx").addEventListener("change", (e) => { S.ctx = e.target.checked; render(); });
  $("outside").addEventListener("change", (e) => { S.outside = e.target.checked; render(); });
  $("labels").addEventListener("change", (e) => { S.labels = e.target.checked; render(); });
  $("names").addEventListener("change", (e) => { S.names = e.target.checked; render(); });
  $("terrain").addEventListener("change", (e) => {
    S.terrain = e.target.checked; statData();
    render().then(() => {
      if (S.terrain && map.getPitch() < 30) map.easeTo({ pitch: 62, bearing: -15, duration: 900 });
      if (!S.terrain && !S.d3) map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    });
  });
  $("d3").addEventListener("change", (e) => {
    S.d3 = e.target.checked;
    if (S.d3 && !S.terrain) { S.terrain = true; S.terrainAuto = true; statData(); }
    if (!S.d3 && S.terrainAuto) { S.terrain = false; S.terrainAuto = false; }
    if (S.d3) map.easeTo({ pitch: 58, bearing: -18, zoom: Math.max(map.getZoom(), 14.2), center: map.getZoom() < 13 ? [28.8338, 47.0245] : map.getCenter() });
    else if (!S.terrain) map.easeTo({ pitch: 0, bearing: 0 });
    render();
  });
  $("lang").addEventListener("click", () => setLang({ ro: "en", en: "ru", ru: "ro" }[S.lang] || "ro"));
  $("viewbtn").addEventListener("click", () => {
    if (S.tool) setTool(S.tool);
    $("toolopts").hidden = true; $("measurebtn").setAttribute("aria-expanded", "false");
    $("lifemenu").hidden = true; $("planbtn").setAttribute("aria-expanded", "false");
    const m = $("viewmenu"); m.hidden = !m.hidden; $("viewbtn").setAttribute("aria-expanded", String(!m.hidden));
  });
  $("measurebtn").addEventListener("click", () => {
    const box = $("toolopts"), open = box.hidden;
    $("viewmenu").hidden = true; $("viewbtn").setAttribute("aria-expanded", "false");
    if (!open) { endTool(); clearSel(); box.hidden = true; $("measurebtn").setAttribute("aria-expanded", "false"); return; }
    box.hidden = false; $("measurebtn").setAttribute("aria-expanded", "true");
    $("lifemenu").hidden = true; $("planbtn").setAttribute("aria-expanded", "false");
    if (!S.tool) setTool("line");
  });
  document.querySelectorAll(".mode[data-tool]").forEach((b) => b.addEventListener("click", () => { if (S.tool !== b.dataset.tool) setTool(b.dataset.tool); }));
  $("finish").addEventListener("click", finishDraw);
  $("cleartool").addEventListener("click", () => { const tl = S.tool || "line"; endTool(); clearSel(); setTool(tl); });
  $("radius").addEventListener("input", (e) => { S.draw.radius = +e.target.value; updateRadiusLabel(); if (S.draw.center) circleSelect(); });
  $("poi-all").addEventListener("click", () => { S.cats = [...CATS]; render(); });
  $("poi-none").addEventListener("click", () => { S.cats = []; render(); });
  $("route-sel").addEventListener("change", (e) => {
    S.route = e.target.value; render();
    if (S.route) load("transit_lines.geojson").then((fc) => {
      const b = new maplibregl.LngLatBounds();
      fc.features.filter((f) => f.properties.r.includes(S.route)).forEach((f) => f.geometry.coordinates.forEach((c) => b.extend(c)));
      if (!b.isEmpty()) map.fitBounds(b, { padding: 60 });
    });
  });
  $("legend").addEventListener("click", (e) => {
    const k = e.target.closest?.("[data-cmpc]")?.dataset.cmpc;
    if (k) { const c = map.getCenter(); S.cmp = { ...S.cmp, [k]: [c.lng, c.lat] }; cmpUpdate(); return; }
    const d = e.target.closest?.("[data-day]")?.dataset.day;
    if (d) { S.date = d; render(); }
  });
  $("legend").addEventListener("change", (e) => {
    const d = e.target.dataset;
    if (d.cmp) {
      if (e.target.checked) {
        const c = map.getCenter(), p = map.project(c);
        let q = p, n = 0;
        while (n < 8 && Object.values(S.cmp).some((v) => { const r = map.project(v); return Math.abs(r.x - q.x) < 150 && Math.abs(r.y - q.y) < 28; })) { n++; q = { x: p.x, y: p.y + 32 * n }; }
        const ll = map.unproject([q.x, q.y]); S.cmp = { ...S.cmp, [d.cmp]: [ll.lng, ll.lat] };
      }
      else { const n = { ...S.cmp }; delete n[d.cmp]; S.cmp = n; }
      cmpUpdate(); renderLegend(); return;
    }
    if (d.age !== undefined) { S.ages = [...document.querySelectorAll("[data-age]")].filter((c) => c.checked).map((c) => +c.dataset.age); store.set("ages", S.ages); render(); }
    if (d.zone) { S.zones = [...document.querySelectorAll("[data-zone]")].filter((c) => c.checked).map((c) => c.dataset.zone); render(); }
    if (d.hillsqrt) { S.hillSqrt = e.target.checked; store.set("hillSqrt", S.hillSqrt); render(); }
    if (d.jobtype) { S.jobTypes = [...document.querySelectorAll("[data-jobtype]")].filter((c) => c.checked).map((c) => c.dataset.jobtype); store.set("jobTypes", S.jobTypes); render(); }
    if (d.mode) { S.modes[d.mode] = e.target.checked; render(); }
    if (d.ring) { S.ring = e.target.checked; store.set("ring", S.ring); render(); if (S.ring) map.fitBounds([[28.70, 46.93], [29.03, 47.12]], { padding: { top: 70, bottom: 30, left: window.innerWidth > 640 ? 380 : 20, right: 30 } }); }
  });
  $("hideout").addEventListener("change", (e) => { S.hideOut = e.target.checked; store.set("hideOut", S.hideOut); applyRegion(false); });
  $("region").addEventListener("change", (e) => { S.region = e.target.value ? +e.target.value : null; applyRegion(true); });
  $("only").addEventListener("change", (e) => { S.only = { ...S.only, [S.mode]: e.target.checked }; render(); });
  $("keptlist").addEventListener("click", (e) => { const k = e.target.dataset.unkeep; if (k) { S.keep = { ...S.keep, [k]: false }; render(); } });
  $("poilist").addEventListener("change", (e) => {
    if (e.target.dataset.cat) {
      S.cats = [...document.querySelectorAll("#poilist [data-cat]")].filter((c) => c.checked).map((c) => c.dataset.cat);
      render();
    }
  });
  map.on("click", (e) => {
    if (!S.tool) return;
    const c = [e.lngLat.lng, e.lngLat.lat], d = S.draw;
    if (S.tool === "circle") { d.center = c; circleSelect(); return; }
    if (S.tool === "poly" && d.pts.length >= 3) {
      const p0 = map.project(d.pts[0]);
      if (Math.hypot(p0.x - e.point.x, p0.y - e.point.y) < 12) { finishDraw(); return; }
    }
    d.pts.push(c); drawFC();
    if (S.tool === "line" && d.pts.length >= 2) { S.selected = { kind: "line", len: lineLen(d.pts), n: d.pts.length }; renderInfo(); }
  });
  map.on("dblclick", (e) => { if (S.tool === "line" || S.tool === "poly") { e.preventDefault(); S.draw.pts.pop(); finishDraw(); } });
  map.on("mousemove", (e) => {
    if (S.tool === "line" || S.tool === "poly") { S.draw.hover = [e.lngLat.lng, e.lngLat.lat]; drawFC(); }
    if (S.base === "elevation" || S.terrain) {
      const v = elevAt(e.lngLat.lng, e.lngLat.lat);
      $("elevread").textContent = v ? `${t("elevword")}: ${v} m` : `${t("elevword")}: —`;
      $("elevread").hidden = false;
    }
  });
  map.on("click", "admin-fill", async (e) => {
    if (S.tool || !(bm(S.mode) === "admin" || S.mode === "pop")) return;
    if (REGION_PG && !REGION_PG.has(e.lngLat.lng, e.lngLat.lat)) return;   // hidden area: nothing to select
    const top = ["pois", "tstops"].filter((l) => map.getLayer(l) && map.getLayoutProperty(l, "visibility") !== "none");
    if (top.length && map.queryRenderedFeatures(e.point, { layers: top }).length) return;
    if (PJ.tool) return;
    const f = e.features[0];
    const full = (await adminFC()).features.find((x) => x.properties.id === f.properties.id);
    if (pjAdminActive()) { pjToggleSel(full.properties); return; }
    map.setFilter("admin-sel", ["==", ["get", "id"], f.properties.id]);
    S.draw = { pts: [], done: false, center: null, radius: S.draw.radius }; drawFC();
    select({ kind: "admin", props: full.properties, geom: full.geometry });
  });
  map.on("mousemove", "admin-fill", (e) => {
    if (S.tool || !(bm(S.mode) === "admin" || S.mode === "pop")) return;
    map.getCanvas().style.cursor = REGION_PG && !REGION_PG.has(e.lngLat.lng, e.lngLat.lat) ? "" : "pointer";
  });
  map.on("mouseleave", "admin-fill", () => { if (!S.tool) map.getCanvas().style.cursor = ""; });
  map.on("click", "train-stops", (e) => { if (S.tool) return; const p = e.features[0].properties;
    popup(e.lngLat, `<b>${esc(p.n)}</b><br><small>${t("trainline")} · ${L("stația", "stop")} ${p.i}</small>`); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  $("collapse").addEventListener("click", () => $("panel").classList.toggle("min"));
  const setPanel = (show) => {
    $("panel").hidden = !show; $("showpanel").hidden = show; document.body.classList.toggle("nopanel", !show);
    store.set("panelHidden", !show); (show ? $("hidepanel") : $("showpanel")).focus();
  };
  $("hidepanel").addEventListener("click", () => setPanel(false));
  $("showpanel").addEventListener("click", () => setPanel(true));
  if (store.get("panelHidden", false)) { $("panel").hidden = true; $("showpanel").hidden = false; document.body.classList.add("nopanel"); }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && S.tool) setTool(S.tool);
    if (e.key === "Enter" && S.tool && e.target === document.body) finishDraw();
  });
}

/*__PROJECTS_JS__*/
window.atlasMap = map;
map.on("load", () => init().catch((e) => { document.getElementById("info").innerHTML = `<p class="hint">Error loading data: ${esc(e.message)}</p>`; console.error(e); }));
})();
