# Atlasul Municipiului Chișinău

Interactive map (MapLibre GL) of Chișinău municipality built from OpenStreetMap and the 2024 census (BNS).

Rebuild:
    cd scripts
    python3 fetch_area.py          # OSM API map calls over the study bbox -> data/raw/area.json
    python3 build_layers.py        # land use, roads/lanes, bike, projects, transit, buildings
    python3 build_train.py         # Sîngera – Chișinău – Strășeni suburban train
    python3 build_boundaries.py    # admin levels 1-3 + population
    python3 postprocess.py         # shrink + assemble dist/ (index.html + data/)

Population sources: Recensământul 2024 (municipiu 720 128, oraș 567 038, per locality via Wikipedia/Wikidata),
sector shares from Anuarul statistic Chișinău 2015, neighbourhoods by residential building floor area (estimate).
Alternative scenario: BNS 2019 usual-resident estimate 832 865 (scaled proportionally).

## v2 additions
    python3 fetch_area.py 29.15,46.84,29.20,47.21 extra_e.json   # reform villages (east)
    python3 fetch_area.py 28.53,47.18,29.15,47.21 extra_n.json   # reform villages (north)
    python3 build_layers.py      # + POIs, rail corridor km, building points, no underground roads
    python3 build_admin.py       # levels 1-3, current + 2027 amalgamation, exact population sums
    python3 build_pois.py        # POI flags + Wikimedia photos
    python3 fetch_tiles.py && python3 build_tiles.py   # Sentinel-2 satellite, terrain, relief, elevation grid
    python3 build_train.py && python3 postprocess.py
