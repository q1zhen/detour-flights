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

Compact rows show local times, connections, **total journey duration including layovers**, airlines, cabin class, and fare. Stops and total duration share a line above the route, with each connection’s layover duration below its airport code. Sort by provider order, price, or total journey duration. Expanded details show:

- A continuous itinerary timeline with local dates/times, airport names, segment duration, flight number, aircraft, and legroom.
- Plain-text **provider-supplied layover durations**, dotted layover timeline sections, and airport-change notices. Missing durations stay unavailable; the app no longer estimates them from wall clocks.
- An exact Google Flights itinerary link, when available. Carrier support and baggage links are clearly separate.
- Best-effort checked-baggage hints with a reminder to confirm with the airline. The API’s numeric refundability code has no documented meaning, so the UI does not infer refund terms from it.

Collapsed metadata includes airlines/alliances, airports/cities, baggage policies, and flexible-date price points. Flexible-date estimates retain the provider’s dates (which may be historical); they are explicitly labeled as not narrowed by search filters. Missing prices, times, durations, links, and details have fallbacks. Prices and availability can change.

Round trips remain disabled and multi-city is unsupported. No booking occurs in this app.

## Self-transfer search

Regular search runs on its own. Once it finishes, click **Search self-transfers** in the second column to start the two-ticket search. Available options stream into that column immediately,
ranked by combined price and then elapsed journey duration. The full-screen globe shows candidate airports as status dots: grey for pending,
red for no results, yellow for price cutoffs, and green as soon as a valid result
arrives. Retrying searches stay grey unless they already found a result. Inspect a dot (or use the keyboard-accessible airport picker) for its status.
A prominent progress bar shows the completed-midpoint count and percentage,
including the initial regular-flight search and automatic retry state. After
completion or cancellation, only midpoints with results remain on the globe;
selected itinerary airports stay visible. The bottom-right card links to this
GitHub repository. Cancelled work does not count toward completion. Cancel keeps
completed results and aborts pending work; starting another search clears the
previous run.

The form adds a separate self-transfer window (default 2–12 hours; configurable
from 0 to 168 hours using discrete slider ticks). The shorter leg **must be nonstop**:
both API stop-limit fields are forced to zero and responses are checked for
exactly one segment with zero stops. The selected stop limit applies to the
longer ticket and to regular flights. Airline and class controls are always visible.
By default, they apply only to the longer self-transfer ticket; the shorter ticket
uses economy with any airline. The scope switch applies both selections to all
self-transfer segments instead. Regular searches always use the selected airline
and class, regardless of this switch. Traveler, currency, and within-ticket
layover filters are preserved. Departure/arrival time bars constrain
only the original departure/final arrival. Connection allow/block filters include
the midpoint as well as within-ticket connections. The self-transfer buffer is
independent of within-ticket layover limits.

Midpoint-filter sliders tune the actual candidate selection: **Extra route distance**
(0–200%, in 5% steps; default 30%) and **Minimum destinations** (0–500; default 70).
The percentage maps to `ratio = 1 + percentage / 100`. A fixed 300 km allowance is
added to that distance limit; it has no form control, and non-300 values are rejected
by search-option validation. Minimum destinations counts the midpoint airport’s
outbound destinations in the route graph. Reset restores both defaults. These
client-side settings are never sent to the flight API.

Self-transfer cards use the same route timeline, local endpoint times, stop
markers, total duration and price layout as regular flights. The ticket boundary
has a distinct **Self-transfer** marker; ordinary connections retain their usual
markers. Expanding the combined row reveals the two independently expandable
tickets and their booking links. Every card labels its requested cabin class;
combined cards label each ticket separately. These labels retain the cabin used
when pricing, since the API does not return a per-segment cabin field.

Each midpoint keeps the long-leg-first search, with pricing and matching overlapped:

1. Use the union of outgoing neighbors of the origin and incoming neighbors of the
   destination, excluding both endpoints. Keep hubs meeting the selected minimum outgoing
   degree and total great-circle distance no greater than `ratio × direct + slack_km`
   (defaults: 70 destinations, 1.3× and 300 km). Use airport codes found in the graph; city codes remain supported for
   regular searches but cannot be used to place a self-transfer geographically.
2. Price each hub's longer leg, with no transfer-time restriction. If that is leg
   2, query the requested date and following date; otherwise query leg 1 on the
   requested date. At most three API calls run concurrently across both pricing
   and matching. Short-leg queries get the next free request slot. Repeated
   requests in one search share a promise; no cross-search price cache is retained.
3. Match the cheapest currently priced hub immediately, while other hubs continue
   pricing. Skip a priced hub if its long-leg fare is at least the best valid fare
   found (initially the cheapest priced regular flight). Never prune an unpriced
   hub; re-evaluate it when its price arrives. Query the other leg over the envelope
   of feasible arrival/departure times. For short leg 2, query every local departure
   date intersecting the window, including dates beyond the next day when needed.
4. The API has only time-of-day filters. Fetch whole local days and apply absolute
   transfer windows in the browser. Binary-search inclusive arrival bounds and
   use a segment tree to select the cheapest eligible leg 1 for each leg 2.
   Complexity is `O((n + m) log n)` with `O(n)` additional index space.
5. Exclude totals above the **highest priced regular result** (equal totals are
   allowed), update the best fare, and publish matches after each short-leg response,
   before waiting for other midpoints or departure dates. Already published matches
   survive a later date's failure or cancellation. If the regular list is empty or
   has no usable prices, search without a comparison ceiling and
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
- Carbon data is not displayed. Fare policy fields are hints, not confirmed conditions. Raw booking tokens and undocumented policy codes are retained in the typed response but not presented as user-facing actions.
- `/health` provides the header status. `/flights` uses a 30-second client timeout around the API’s 20-second upstream timeout.

## Source layout

- `src/App.tsx`: page and request lifecycle.
- `src/components/SearchForm.tsx`, `TravelerPicker.tsx`, `SearchOptions.tsx`: route, travelers, and advanced filters.
- `src/components/TimeRangeField.tsx`: reusable accessible two-handle Radix time bar.
- `src/components/FlightResults.tsx`, `FlightCard.tsx`, `FlightDirection.tsx`: result states, sorting, and compact rows.
- `src/components/SegmentDetails.tsx`, `LayoverDetails.tsx`: continuous itinerary timeline.
- `src/components/FareDetails.tsx`, `CarrierLinks.tsx`, `SearchMetadata.tsx`: optional provider details.
- `src/components/SelfTransferResults.tsx`, `SelfTransferCard.tsx`: combined route summaries and separate tickets.
- `src/components/FlightGlobe.tsx`: globe, search progress, airport inspection, and project link.
- `src/components/CandidateFilterSliders.tsx`: candidate distance/degree sliders and reset.
- `src/lib/self-transfer.ts`: bounded progressive search, fare pruning and range-minimum joins.
- `src/lib/routes.ts`, `flight-time.ts`: graph candidates, distances and airport-local datetime conversion.
- `src/self-transfer.css`: responsive sidebar and result columns.
- `scripts/prepare-routes.mjs`: repeatable offline dataset preparation.
- `src/lib/`: typed API contract/client, request construction, validation, and formatting.

Automated coverage includes current API field names, omission versus zero, inclusive time boundaries, invalid windows, filter serialization, passenger constraints, malformed responses, errors/cancellation, missing data, safe external links, provider durations, airport transfers, metadata, and accessible slider markup. Live browser checks cover API searches, keyboard/pointer sliders, resets, and responsive layouts.

Self-transfer tests cover directed candidate selection, geographic filtering,
price pruning and the maximum-fare ceiling, range-minimum joins against a brute-force
reference, nonstop short legs in both orientations, airline/class scope isolation,
the default 2–12-hour window, per-ticket cabin labels, timezone/DST/date-line behavior,
multiday windows, empty baselines, endpoint filters, partial failures, cancellation,
concurrency, and deterministic dataset regeneration.

Streaming regression tests deliberately hold one midpoint or departure date pending
to verify that matching results are emitted before it resolves, that a later cheaper
midpoint is still searched, and that failures/cancellation preserve earlier matches.

## Globe workspace

[globe.gl](https://github.com/vasturiano/globe.gl) renders the full-screen interactive
map. The compact search/results panel floats at the top left and scrolls independently;
Minimize leaves the map available for rotation and zoom. The panel can grow to the
full viewport height (minus its outer margins). Desktop width scales from 50vw
below 1,200px to 46vw at 1,200px and 38vw at 1,800px, minus the left margin. The
globe centres in the remaining horizontal space using the panel’s measured bounds,
and returns to the screen centre when minimized. On
small screens it uses the available width and can be minimized to explore the map.
Regular and self-transfer results retain separate columns on desktop.

The prepared airport graph loads immediately. Origin/destination, geographic sliders,
and connection allow/block filters recompute candidate dots locally before any fare
requests. Editing a search returns the dots to preview grey so previous search statuses
are not mistaken for new availability. A new search clears the selected trip.

Opening a regular or self-transfer card selects that one trip and closes the previous
selection. The globe draws every actual segment, labels every known airport by IATA,
with a thin, continuous amber line and a single warm highlight travelling along each
flight segment. A soft amber glow keeps the route readable against the map. Airport
changes retain an amber line without the flight animation.
Missing coordinates are reported without inventing locations. Nested ticket details
remain independent of the single selected trip. Recenter restores the route view;
date-line routes use a spherical centre. Reduced-motion settings disable route animation.

Departure/arrival sliders use 15-minute ticks plus the inclusive 23:59 endpoint.
Transfer/within-ticket layover sliders use 30-minute ticks through 24 hours, hourly ticks
through 48 hours, then six-hour ticks through 168 hours. The within-ticket upper bound
also offers **Any**, and Reset restores unconstrained layovers. Defaults stay 2–12 hours.

The globe library is loaded separately from the search UI. Land geometry is bundled
locally (see data/README.md); no external basemap service is required. If WebGL fails,
search and results remain usable. Tests cover preview filtering, status colours,
partial-result precedence, midpoint result filtering, continuous route layers,
segment/airport-transfer geometry, missing coordinates,
date-line centring, discrete durations and exclusive selection markup.

All regular and self-transfer price requests use the same `searchFlights` retry
wrapper. Network errors, timeouts, HTTP errors, and malformed responses retry until
success or explicit cancellation, with exponential delays of 1, 2, 4, 8, 16, then
30 seconds. HTTP `Retry-After` delays are respected when longer. A successful empty
response is final, not a failure. Cancellation aborts the current request or delay;
replacing a search prevents stale retry notifications from updating the new run.
The progress card announces active retries. Tests use fake timers to verify
backoff, recovery, Retry-After, and cancellation without repeated live requests.

The land layer uses 1-degree polygon-cap tessellation and a small surface offset
to keep cap triangles from intersecting the globe mesh when zoomed in. Polygon
transitions are disabled so the caps never animate through the ocean surface.

Click a midpoint dot (or its IATA label) to show only self-transfer trips through
that airport. Click it again to show all midpoints. The result heading and the globe
picker also offer a clear action; the picker provides keyboard access to the same
filter. Regular results and fare comparisons are unchanged. Filtering clears a
selected self-transfer from another midpoint, while keeping a selected regular
flight. New searches reset the midpoint filter. Results still stream into the
filtered list as they arrive. The route highlight is separate from the continuous
line, so it never creates gaps; reduced motion removes the travelling highlight.

Self-transfer window, scope, and midpoint filters can be adjusted before manually starting or rerunning self-transfer search. Changing regular-flight criteria requires a new regular search first, so price comparisons always use the same enquiry.
