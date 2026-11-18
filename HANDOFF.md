# All in Chișinău — handoff

Live prototype (artifact): https://claude.ai/artifact/H7LjEiWbqSJJdbFnMB2ArV  (capability `db`, collection `projects`)

## Layout
- `web/index.template.html` – page shell + CSS. `web/app.js` – map app (MapLibre 4.7.1). `web/projects.js` – projects + construction menu (inlined into app.js at `/*__PROJECTS_JS__*/`).
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

## Next (agreed, all as mock-ups)
1. Atlas: pedestrian zones; roads map blue but visible; distinct colour per transit route.
2. Construction menu → "Construcție de cartier": draw area, density, estimate dwellings/heights/schools/kindergartens/clinics/roads/sewer, cost range, duration, workers + qualifications; land-use types (residential, industrial, mixed, park, offices); shows on zoning map; adds part of capacity to population; all costs into project total.
3. App shell renamed "All in Chișinău": main menu Atlas / Proiecte / Transport public / Ghid turistic / Noutăți.
4. Tourist guide (budget, days, interests → itinerary from POIs).
5. Projects & petitions with mock roles (citizen, business, city hall), contractor offers, projects in execution.
6. Transit tickets + live tracking as mock-up (schedule-based simulation).
7. Archives (public/private) with search. 8. Chatbot later (`sample` capability).
