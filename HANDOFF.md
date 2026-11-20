# All in Chișinău — handoff

Live prototype (artifact): https://claude.ai/artifact/H7LjEiWbqSJJdbFnMB2ArV  (capability `db`, collection `projects`)

## Layout
- `web/index.template.html` – page shell + CSS. `web/app.js` – map app (MapLibre 4.7.1). `web/projects.js` – projects + construction menu; `web/nb.js` – neighbourhood builder; `web/shell.js` – app shell pages (Proiecte, Transport, Noutăți, Cont); `web/shell2.js` – home dashboard, tourist-guide wizard with map, archives + search, rule-based assistant. All three are inlined into app.js at `/*__PROJECTS_JS__*/`.
- `scripts/postprocess.py` – assembles `dist/index.html` + `dist/data/*` (binary packs wrapped as `*.bin.json`). Publish `dist/index.html` with changed `data/*` files.
- `data/raw/` – OSM downloads (OSM API map calls; Overpass/Geofabrik blocked), Microsoft footprints, GHSL, tiles. Not in git (2 GB).

## Build order
fetch_area.py (+ extra_e/extra_n strips) → build_layers.py → build_msb.py → build_admin.py → dedupe_stops.py → add_religion.py → add_culture.py → build_pois.py → build_age.py → build_zone_stats.py → build_builtup.py → infer_residential.py → build_extra.py → build_weather.py → build_compare.py → build_train.py → postprocess.py

## Decisions so far
- Borders: OSM relations; 2027 reform clusters from alegeri.md (Bubuieci+Floreni+Maximovca; Budești+Cruzești+Bălțata+Cimișeni; Ciorescu+Hrușova+Zăicana). Dolinnoe excluded. "După dată" switches at 2027-11-01.
- Population: Census 2024 per locality; city by sector (2015 yearbook shares); L3 by residential floor area; every level sums exactly (720,128 / 731,358). Date scaling from BNS 2025/2026 estimates.
- L3 manual edits in build_admin.py: MERGES, RENAMES, Sculeanca/Calea Ieșilor, Hrușca trim, Satul German + Cartierul Cluj carve. L3 geometries are coverage-simplified (shared edges) for project unions.
- Building age: 4 periods (Russian Empire, Romanian 1918–41, USSR, Independence) + undated; GHSL proportional allocation per cell.
- Weather: MET Norway grid + Open-Meteo daily, absolute colour scale, per-unit means.
- Projects: db `projects/{id}` (fallback localStorage); construction menu = separate floating panel (admin changes with 3 levels; new roads with free ends, right-click finishes, cost 190 €/m², 3.5 m/lane).

## Done
- Atlas: pedestrian zones (roads map), blue road palette with white casing, one colour per transit line (main urban route of each segment).
- Construction menu tab "Cartier nou" (nb.js): 8 types (houses, low/mid/high blocks, mixed, offices, industrial, park), density slider, polygon drawing (right-click/double-click closes), estimates (streets, sewer, water, power, buildings, schools, kindergartens, health centres, green space), public/private cost ranges, duration, workers by skill, manual overrides; shown on the zoning map; 70% of capacity added to the L3 block that contains the district; project total = roads + districts.
- App shell "All in Chișinău" (mock-ups): Proiecte (proposals, petitions, roles, contractor offers), Transport (tickets with QR, simulated live vehicles), Ghid turistic, Noutăți, Cont.

- Home page (tiles: atlas mini-map, weather, transport, guide, projects, budget, news, archive search, assistant, account); left rail kept.
- Tourist guide: 3 steps (days → budget incl. "nu vreau să specific" → 18 interests) with a live map of matching places; plan = numbered markers per day + dashed day routes + suggested hotels; "Arată în atlas".
- Archives: public / internal (official role) / personal docs (localStorage), search across docs, localities, POIs, proposals.
- Assistant: rule-based mock (population, area, weather, tickets, budget, place lookup).

- Map names: street, park and place labels rendered with in-browser SDF glyphs (`glyphs://` protocol + inlined TinySDF); toggle in View and Settings.
- Shell: floating assistant (bottom right), RO/EN + mock sign-in top right on pages, Settings page (language, theme, start page, currency, map names, account, clear local data), "Arhive" renamed "Documente", no search bars on Home.
- Guide: day trips by direction (Cricova, Orheiul Vechi, Mileștii Mici, Bardar, Căpriana, Castel Mimi…; curated ones have approximate coordinates).
- Transport: journey planner from stop to stop (direct or one change, simulated times from typical frequency, 6 lei per urban boarding, km-based suburban/train fares), buy tickets for the chosen connection.

- Level 4 (Microcartiere) = building blocks; level 3 groups them (build_admin.py GROUPS; villages whole). remap_temp_units.py re-keys weather means after an admin rebuild.
- Jobs grid (build_jobs.py) by type, commuting ratio; population/jobs hills (proportional, optional square root).
- AI assistant (shell5.js, `sample` capability): data tools, project edits, building, map drawing (highlight, walk catchment, places), set_view for every menu setting.
- Rail reduced to Home + Settings; every section opens from the Home tiles.

## Next
- Real AI assistant (`sample` capability), mobile pass on the new pages.

## Done: Statistics map (Statistici)
- `scripts/build_stats.py` → `web/data/statgrid.json`: on the 150 m population grid, access scores 0–100 for green space,
  public transport, healthcare, schools, computed from walking distance on the OSM street/path network (scipy Dijkstra)
  to ALL facilities around with exponential distance decay (gravity), saturating score 100·(1−e^(−raw/R)).
  Public green only (parks, public gardens, recreation grounds, forests ≥ 0.3/1 ha, no private access).
  Air quality = estimated exposure index (road class × lanes, industrial land); no measurements available.
- `web/stats.js`: Statistics tab with units / heat map / 3D hills; "Ratio of two statistics" (percentile gap, or a real
  ratio for residents vs jobs); legend with share of residents per class, median walking distance, weakest/best
  neighbourhoods (clickable); unit info shows all scores; assistant set_view/area_details know the statistics.

## Done: more statistics, heights, knowledge base
- Pipeline order for web/data/statgrid.json: build_stats.py → build_heights.py → build_flood.py (the last two patch the file).
- Terrain slope (elev.bin, ~50 m), flood exposure (HAND with D8 flow routing on elev.bin + OSM rivers/streams),
  building height (OSM height/levels exact; others by a gradient-boosting model on GHSL Built-Height 2018 + neighbour
  heights + footprint/type; hold-out MAE 3.3 m vs 6.6 m type defaults). Heights also feed the 3D buildings (bld*.json).
- Schools weighted by capacity estimated from building floor area (build_school_cap.py, general schools only).
- build_kb.py → web/data/kb.json: Wikipedia (ro/en/ru) passages about Chișinău; assistant tool city_knowledge (BM25).

## Done: Heritage, Industry, Compare moved
- The Compare tab is gone. Compare now opens from a "Comparație" button under the municipality area in Admin, Statistics and Zoning (`cmpBox()` in app.js; outlines show only in those modes). Population shows only the population figure; Zoning shows only the total area.
- **Patrimoniu** (`web/heritage.js`, `scripts/build_heritage.py`):
  - Data: Wikidata items with heritage designation P1435 in the region box; types are architecture, religious, historic, art, archaeology and nature.
  - State of conservation comes from Wikidata P5816/P576 and OSM ruins/abandoned/condition tags. Most monuments have none.
  - Photos are Commons thumbnails (240 px) stored as data URIs in `her_ph_<n>.json`, 40 per chunk, loaded on click.
- **Industrie** (`scripts/build_industry.py`):
  - Data: OSM works / industrial / producing crafts / power plants / named industrial landuse, plus Wikidata factories and wineries.
  - Branches are assigned from tags plus ro/ru name keywords. Non-producing sites are dropped (depots, pumping, transport, telecom).
  - Industrial zones and quarries are kept as areas.
  - OSM input subset: `data/raw/osm_her_ind.json`, cut from area/extra_e/extra_n.
