# Detour Flights

Compact one-way flight search for [gflight.q1z.dev](https://gflight.q1z.dev), using React, TypeScript, Radix Themes and Radix Slider. The browser calls the public API directly; no keys, cookies, backend, or environment variables are required.

## Run

Requires Node.js 22.12+, 24+, or 26+.

```sh
npm ci
npm run dev
npm test
npm run build
```

Open the Vite URL (normally `http://127.0.0.1:5173`). `npm run preview` serves the production build. Deploy `dist/` to any static host. `npm run format:check` checks formatting.

## Search

- One-way routes using three-letter airport or city/metro codes.
- Four cabins and all passenger categories, with 1–9 travelers and one adult per lap infant.
- Departure and arrival time bars with two handles, minute precision, local-time labels, and separate resets. Drag or use arrow keys; Page Up/Down moves ten minutes, Home/End moves to the allowed endpoints. Equal endpoints select an exact minute.
- Stop limits, airline and alliance codes, minimum/maximum minutes for every layover, and allowed/blocked connection airports.
- USD, English (`en-US`), and US region are fixed defaults. Currency and language selectors remain removed.
- Loading, cancellation, validation, empty results, upstream failures, and resubmission. Superseded requests cannot overwrite newer results.

Times apply to the first departure and final arrival, inclusively, in local airport time. Windows must stay within 00:00–23:59; overnight windows such as 22:00–06:00 are unsupported. Full-day windows are omitted from the request.

Time, layover, and connection filters narrow the results returned by Google; they do not fetch more flights. Every connection must satisfy the layover and airport filters; nonstop flights pass those filters. Submit Search after changing a filter.

## Results

Compact rows show local times, connections, **total journey duration including layovers**, airlines, fare, and emissions. Sort by provider order, price, or total journey duration. Expanded details show:

- A continuous itinerary timeline with local dates/times, airport names, segment duration, flight number, aircraft, and legroom.
- Highlighted **provider-supplied layover durations** and airport-change notices. Missing durations stay unavailable; the app no longer estimates them from wall clocks.
- An exact Google Flights itinerary link, when available. Carrier support and baggage links are clearly separate.
- Best-effort checked-baggage hints with a reminder to confirm with the airline. The API’s numeric refundability code has no documented meaning, so the UI does not infer refund terms from it.

Collapsed metadata includes airlines/alliances, airports/cities, baggage policies, and flexible-date price points. Flexible-date estimates retain the provider’s dates (which may be historical); they are explicitly labeled as not narrowed by search filters. Missing prices, times, durations, links, and details have fallbacks. Prices and availability can change.

Round trips remain disabled and multi-city is unsupported. No booking occurs in this app.

## Self-transfer search

Regular results appear first. A separate column then fills with two-ticket options,
ranked by combined price and then elapsed journey duration. A midpoint sidebar
shows queued, long-leg pricing, priced, matching, with-results, no-results,
price-pruned, failed, and cancelled states. Cancel keeps completed results and
aborts pending work; starting another search clears the previous run.

The form adds a separate self-transfer window (default 2–24 hours; configurable
from 0 to 168 hours at minute precision). The shorter leg **must be nonstop**:
both API stop-limit fields are forced to zero and responses are checked for
exactly one segment with zero stops. The selected stop limit applies to the
longer ticket and to regular flights. Airline, cabin, traveler, currency, and
within-ticket layover filters are preserved. Departure/arrival time bars constrain
only the original departure/final arrival. Connection allow/block filters include
the midpoint as well as within-ticket connections. The self-transfer buffer is
independent of within-ticket layover limits.

Implementation follows the two-phase search:

1. Use the union of outgoing neighbors of the origin and incoming neighbors of the
   destination, excluding both endpoints. Keep hubs with at least 10 outgoing
   destinations and total great-circle distance no greater than `1.25 × direct +
300 km`. Use airport codes found in the graph; city codes remain supported for
   regular searches but cannot be used to place a self-transfer geographically.
2. Price each hub's longer leg, with no transfer-time restriction. If that is leg
   2, query the requested date and following date; otherwise query leg 1 on the
   requested date. At most three API calls run concurrently. Repeated requests in
   one search share a promise; no cross-search price cache is retained.
3. Process hubs in ascending cheapest long-leg price. Stop when that price is at
   least the best valid fare found (initially the cheapest priced regular flight).
   Query the other leg over the envelope of feasible arrival/departure times.
   For short leg 2, query every local departure date intersecting the window,
   including dates beyond the next day when necessary.
4. The API has only time-of-day filters. Fetch whole local days and apply absolute
   transfer windows in the browser. Binary-search inclusive arrival bounds and
   use a segment tree to select the cheapest eligible leg 1 for each leg 2.
   Complexity is `O((n + m) log n)` with `O(n)` additional index space.
5. Exclude totals above the **highest priced regular result** (equal totals are
   allowed), update the best fare, and publish incremental results. If the regular
   list is empty or has no usable prices, search without a comparison ceiling and
   label this explicitly. Zero/missing/nonfinite fares are unavailable, never free.

Airport IANA time zones are used to compare actual instants, including midnight,
DST changes, and the international date line. The API supplies no UTC offset, so
ambiguous repeated-hour timestamps and nonexistent local times are omitted rather
than guessed. Wrong-airport, malformed-time, and non-nonstop short-leg results are
also omitted. Each result exposes both tickets and their independent booking
links. A failed midpoint does not discard successful results elsewhere; partial
failures are labeled.

This is a candidate heuristic over the provider's returned flights, not an
exhaustive global fare search. Cheapest-first pruning deliberately skips hubs
whose long leg cannot improve the current best, even if some combinations might
fit below the maximum regular fare. The supplied two-day horizon is retained when
leg 2 is the longer leg.

## Route dataset

The original snapshot is retained at `data/raw/airline_routes.json`. Run
`npm run prepare:routes` to rebuild `public/data/routes.json` deterministically.
The offline script validates airport codes, coordinates and time zones, removes
invalid/duplicate/self edges, and creates directed outgoing/incoming indexes.
The prepared graph records input SHA-256, source URL, counts and exclusions.
See [data/README.md](data/README.md) for provenance and alternate input/output paths.
Fetching future snapshots and scheduling updates are intentionally not implemented.

## API contract

The integration targets the camelCase API documented on 2026-10-28 (upstream `google-flights-scraper 0.2.0`):

- Requests use `fromAirport`, `toAirport`, `maxStops`, `infantsInSeat`, and `infantsOnLap`. Unrestricted `maxStops` is omitted, never `null`. Unknown/obsolete fields are not sent.
- Responses use `segments`, `googleFlightsUrl`, object-based dates/times, `totalDurationMinutes`, and `layovers`.
- `filters` accepts `departureTime`, `arrivalTime`, `layover`, and `connectionAirports`.
- Emissions are grams, displayed as kilograms. Fare policy fields are hints, not confirmed conditions. Raw booking tokens and undocumented policy codes are retained in the typed response but not presented as user-facing actions.
- `/health` provides the header status. `/flights` uses a 30-second client timeout around the API’s 20-second upstream timeout.

## Source layout

- `src/App.tsx`: page and request lifecycle.
- `src/components/SearchForm.tsx`, `TravelerPicker.tsx`, `SearchOptions.tsx`: route, travelers, and advanced filters.
- `src/components/TimeRangeField.tsx`: reusable accessible two-handle Radix time bar.
- `src/components/FlightResults.tsx`, `FlightCard.tsx`, `FlightDirection.tsx`: result states, sorting, and compact rows.
- `src/components/SegmentDetails.tsx`, `LayoverDetails.tsx`: continuous itinerary timeline.
- `src/components/FareDetails.tsx`, `CarrierLinks.tsx`, `SearchMetadata.tsx`: optional provider details.
- `src/components/SelfTransferResults.tsx`: independent ticket cards and live midpoint status list.
- `src/lib/self-transfer.ts`: bounded two-phase search, fare pruning and range-minimum joins.
- `src/lib/routes.ts`, `flight-time.ts`: graph candidates, distances and airport-local datetime conversion.
- `src/self-transfer.css`: responsive sidebar and result columns.
- `scripts/prepare-routes.mjs`: repeatable offline dataset preparation.
- `src/lib/`: typed API contract/client, request construction, validation, and formatting.

Automated coverage includes current API field names, omission versus zero, inclusive time boundaries, invalid windows, filter serialization, passenger constraints, malformed responses, errors/cancellation, missing data, safe external links, provider durations, airport transfers, metadata, and accessible slider markup. Live browser checks cover API searches, keyboard/pointer sliders, resets, and responsive layouts.

Self-transfer tests cover directed candidate selection, geographic filtering,
price pruning and the maximum-fare ceiling, range-minimum joins against a brute-force
reference, nonstop short legs in both orientations, timezone/DST/date-line behavior,
multiday windows, empty baselines, endpoint filters, partial failures, cancellation,
concurrency, and deterministic dataset regeneration.
