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
- `src/lib/`: typed API contract/client, request construction, validation, and formatting.

Automated coverage includes current API field names, omission versus zero, inclusive time boundaries, invalid windows, filter serialization, passenger constraints, malformed responses, errors/cancellation, missing data, safe external links, provider durations, airport transfers, metadata, and accessible slider markup. Live browser checks cover API searches, keyboard/pointer sliders, resets, and responsive layouts.
