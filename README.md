# Detour

**Find way cheaper flights that still match your preferences through an extra self-transfer.**

Detour compares regular flights with trips booked as two separate tickets through an intermediate airport. It searches for a short nonstop hop that can unlock a cheaper longer flight, while keeping the airline and cabin preferences that matter to you.

For example, you can look for a business-class long-haul flight on your preferred airline, with a short economy flight to reach it. Compare the combined fare against regular options, explore the route on a 3D globe, and open each ticket’s booking link when you find a trip you like.

## What you can do

- **Compare both ways to travel.** Regular flights and self-transfer trips appear in separate columns, with total prices, journey times, layovers, and cabin labels.
- **Keep your preferences.** Choose airlines or alliances, cabin class, departure and arrival windows, stop limits, and connection airports. Apply airline and class preferences to the longer ticket or to both tickets.
- **Control the detour.** Adjust the transfer window, extra route distance, and minimum number of destinations served by candidate midpoint airports.
- **Explore on the globe.** Candidate airports update as you adjust the filters. Select a trip to draw its route, or click an airport dot to filter results through that midpoint. Click again to clear the filter.
- **See results as they arrive.** Self-transfer matches appear immediately while other airports are still being searched. Failed flight requests retry automatically; cancelling keeps the results already found.

## Find a flight

1. Enter your departure and destination airport codes, travel date, travelers, and preferences. Use airport codes such as `PIT` and `LHR` for self-transfer search.
2. Click **Search** to get regular flights.
3. Click **Search self-transfers** in the second column when you want to explore separate-ticket alternatives.
4. Compare the results. Expand a trip to inspect its itinerary and, for a self-transfer, both tickets and their individual booking links.

By default, the self-transfer window is **2–12 hours**. Your airline and cabin choices apply to the **longer ticket only**; the shorter ticket is always nonstop and uses economy with any airline. Switch the scope to apply those preferences to both tickets. Regular flights always use your selected preferences.

On the globe, grey dots are pending, red dots have no results, yellow dots were excluded by price, and green dots have results. Once the search finishes, only midpoints with results remain, alongside the selected route’s airports.

## How it finds alternatives

Detour uses an airport route graph to choose plausible midpoints, then prices actual flights through the search API:

1. **Choose candidate airports.** Filter nearby route alternatives by total flying distance and airport connectivity. The defaults allow 30% extra distance plus a fixed 300 km allowance, and require at least 70 outbound destinations.
2. **Price the longer ticket first.** Search the expensive part of each trip, prioritize the cheapest available options, and skip candidates whose longer ticket alone cannot beat the best fare found so far.
3. **Find a matching nonstop hop.** Join the two tickets within your transfer window using airport time zones, including overnight journeys.
4. **Publish matches progressively.** Rank by combined price, then journey duration. Exclude combinations costing more than the most expensive regular result. If no regular fares are available, show matches without that comparison ceiling.

This searches promising combinations among the provider’s returned flights; it does not guarantee the cheapest possible fare or savings on every route. The route graph suggests airports to search, while the flight API determines current availability and prices.

## Before booking

A self-transfer consists of **separate tickets**. Missed connections are not protected as a single itinerary; allow time for baggage collection, check-in, security, and any entry requirements that apply to your connection. Detour does not book tickets, and fares can change before you book.

The app currently supports **one-way searches**, with prices in **USD**. Cabin labels reflect the cabin requested for each ticket; confirm the final fare, cabin, and baggage terms on the booking page.

## Run locally

Use Node.js **22.12+ on 22.x**, **24.x**, or **26+**.

```sh
git clone https://github.com/q1zhen/detour-flights.git
cd detour-flights
npm ci
npm run dev
```

Open the local URL printed by Vite. No API key or environment variables are required. The browser calls the flight search API at [gflight.q1z.dev](https://gflight.q1z.dev) directly, so flight searches require network access and the upstream service to be available.

```sh
npm test              # Run the test suite
npm run format:check  # Check formatting
npm run build         # Build the static app into dist/
npm run preview       # Preview the production build locally
```

The production build can be deployed to a static host.

## Built with

[React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), and [Vite](https://vite.dev/), with [Radix](https://www.radix-ui.com/) components and [globe.gl](https://github.com/vasturiano/globe.gl) for the interactive map.

| Area                                   | Source                                                 |
| -------------------------------------- | ------------------------------------------------------ |
| Search flow and application state      | [`src/App.tsx`](src/App.tsx)                           |
| Flight API and automatic retries       | [`src/lib/api.ts`](src/lib/api.ts)                     |
| Self-transfer search and fare matching | [`src/lib/self-transfer.ts`](src/lib/self-transfer.ts) |
| Airport graph and candidate selection  | [`src/lib/routes.ts`](src/lib/routes.ts)               |
| Airport-local time calculations        | [`src/lib/flight-time.ts`](src/lib/flight-time.ts)     |
| Search form, flight cards, and globe   | [`src/components/`](src/components/)                   |

## Airport data

Airport routes come from [Jonty/airline-route-data](https://github.com/Jonty/airline-route-data). The original snapshot is kept in `data/raw/airline_routes.json`; the app uses a cleaned graph in `public/data/routes.json` containing coordinates, time zones, and route connections.

To rebuild the graph after replacing the raw snapshot:

```sh
npm run prepare:routes
```

The transformation is repeatable and leaves the raw file untouched. Downloading future snapshots and scheduling updates are not automated. See [`data/README.md`](data/README.md) for provenance, validation, and alternate input/output paths. Globe land geometry comes from Natural Earth.
