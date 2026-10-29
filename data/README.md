# Route data

`raw/airline_routes.json` is the unmodified snapshot downloaded on October 28,
2026 (America/New_York) from
[Jonty/airline-route-data](https://github.com/Jonty/airline-route-data), using
https://raw.githubusercontent.com/Jonty/airline-route-data/refs/heads/main/airline_routes.json.

Run `npm run prepare:routes` from the repository root to regenerate
`public/data/routes.json`. Optional arguments select another input and output:

```sh
node scripts/prepare-routes.mjs path/to/raw.json path/to/prepared.json
```

This is an offline transformation. It neither downloads updates nor overwrites
the original input. No scheduled fetching is implemented.

The versioned, deterministic graph stores numeric coordinates, IANA time zones,
airport/city names, and sorted, deduplicated outgoing and incoming adjacency lists.
It excludes invalid airport codes, invalid/missing coordinates, missing/invalid
time zones, and edges to excluded/unknown airports, self edges, and duplicate
edges. `stats.excluded` identifies each excluded airport and its reason;
`stats.droppedRoutes` counts rejected edges from retained airports. Incoming edges
are computed from outgoing edges; routes are not assumed to be symmetric. The
source URL and SHA-256 identify the exact input bytes. Carrier lists and published
route distances/durations are unnecessary for candidate selection and remain in
the raw snapshot. Runtime distances are computed with haversine.

The initial snapshot contains 4,038 entries. The prepared graph has 4,021 airports
and 59,228 directed edges. Sixteen entries lack usable time zones; KUB has invalid
coordinates. The route graph suggests candidates only; it does not establish
flight availability on any date. Pricing and availability come from the search API.

## Globe land geometry

`public/data/land.geojson` is the Natural Earth 1:110m land layer from
[the Natural Earth repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson).
Natural Earth data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/).
It is a static basemap, separate from the airport graph and its refresh script.
Airport positions and candidate calculations continue to use `routes.json`.
