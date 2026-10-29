# Detour Flights

A simple React + TypeScript flight-search frontend for [gflight.q1z.dev](https://gflight.q1z.dev). UI components use [Radix Themes](https://www.radix-ui.com/themes): selects, popovers, text fields, buttons, badges, callouts, and loading skeletons.

The interface uses compact flight rows, an inline search form, and expandable itinerary timelines. Flight time is labeled “in air”; same-airport layovers are shown separately using local clock differences.

The app currently supports one-way searches only. Round-trip support is temporarily removed.

The browser calls the public API directly. No credentials, API key, backend, or environment variables are needed. There are no mock flight results in the app.

## Run locally

Requires Node.js 22.12+, 24+, or 26+ (supported even-numbered releases).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`.

```sh
npm test          # API, validation, result formatting, and rendering tests
npm run build    # TypeScript check and production bundle
npm run preview  # Serve the production bundle locally
npm run format:check
```

`npm run format` formats the source. The production build is a static site in `dist/`; deploy that directory to any static hosting service. No SPA fallback rules are necessary because the app has one route.

## API coverage

| API capability                    | Interface                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------- |
| One-way searches                  | One departure leg with no return-date controls                                    |
| All four cabins                   | Economy, premium economy, business, first class                                   |
| All passenger categories          | Adults, children, infants in seats, infants on laps; 1–9 travelers                |
| Stop limit                        | Any, nonstop, or up to 1, 2, or 3 stops                                           |
| Airline filter                    | Up to 50 two-character codes, including alphanumeric codes                        |
| Currency and language             | Fixed to USD and en-US; no form controls                                          |
| Prices and airlines               | Flight cards and expandable details                                               |
| Every flight segment              | Airport codes/names, departure and arrival dates/times, flight duration, aircraft |
| Carbon emissions                  | Kilograms of CO₂, typical route emissions, percentage comparison                  |
| Google Flights links              | Booking details with the complete itinerary selected; clear unavailable state     |
| Airline and alliance metadata     | Expandable metadata section, including when no flights are found                  |
| API validation and service errors | Readable errors with field paths; form values retained                            |
| Health endpoint                   | Compact service status in the header                                              |

Results can also be sorted by price or flight time. Searches have loading, cancellation, empty, error, and retry-through-resubmission states. A superseded or cancelled request cannot overwrite a newer search.

## Provider limitations reflected in the UI

- Multi-city and open-jaw trips are unsupported by the API and are not offered.
- Prices are the provider’s total fares for the selected one-way itinerary. Availability and final booking prices can change.
- Times are airport-local, with no supplied UTC offsets. Flight time excludes layovers. For same-airport connections, layover duration is calculated from the local arrival and next departure date/time; clock changes may affect that calculation. Different-airport transfers and invalid timestamps show duration unavailable.
- Missing values such as zero prices, zero durations, empty arrays, and unavailable links have explicit fallbacks.
- Alliance metadata is displayed for reference; the API does not support alliance filtering.
- Searches use USD and English. Flight availability and live prices depend on the upstream provider.

## Source layout

- `src/App.tsx`: page composition and request lifecycle.
- `src/components/SearchForm.tsx`: route, departure date, and validation.
- `src/components/TravelerPicker.tsx`: passenger popover and counters.
- `src/components/SearchOptions.tsx`: stop and airline filters.
- `src/components/SelectField.tsx`: reusable typed Radix selector.
- `src/components/FlightResults.tsx`: result states, sorting, and metadata.
- `src/components/FlightCard.tsx`: compact expandable rows with price, emissions, timeline, and booking link.
- `src/components/FlightDirection.tsx`: departure/arrival times and a route line with connection airports.
- `src/components/SegmentDetails.tsx`: segment events on a shared, continuous timeline rail.
- `src/components/LayoverDetails.tsx`: highlighted connection duration and airport.
- `src/lib/layover.ts`: validated, timezone-independent local-clock calculations.
- `src/components/AppHeader.tsx`: navigation and API health.
- `src/lib/`: API types/client, request construction, validation, and formatting.

## Verification

Automated tests cover request normalization, one-way request enforcement, stop inheritance versus explicit null and zero, passenger constraints, airline validation, HTTP/network failures, cancellation, missing upstream data, metadata on empty searches, safe booking URLs, escaped provider content, one-way segments and flight duration, and absence of round-trip controls.

Browser checks exercised live flight searches, airline and stop filters, date edits, expandable details, and responsive layouts. No booking is performed by this app.

Dropdown and traveler panels use Radix’s content sizing; full-viewport styles apply only to the root page theme. Browser checks include mouse selection, keyboard expansion, mobile overflow, and continuity of the timeline rail.
