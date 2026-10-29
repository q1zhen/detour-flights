import { searchFlights } from './api';
import { addDays, localDateAt, localToEpoch } from './flight-time';
import { candidates } from './routes';
import type { MidpointCandidate, RouteGraph } from './routes';
import type { Flight, FlightTime, SearchRequest, SearchResponse } from './types';

export interface TransferOptions {
  minBufferMinutes: number;
  maxBufferMinutes: number;
}
export const DEFAULT_TRANSFER_OPTIONS: TransferOptions = {
  minBufferMinutes: 120,
  maxBufferMinutes: 1440,
};
export function validateTransferOptions(options: TransferOptions) {
  const { minBufferMinutes: min, maxBufferMinutes: max } = options;
  return [min, max].every(Number.isInteger) && min >= 0 && max >= min && max <= 10080;
}
export type MidpointStatus =
  | 'queued'
  | 'pricing'
  | 'ready'
  | 'searching'
  | 'results'
  | 'empty'
  | 'pruned'
  | 'error'
  | 'cancelled';
export interface MidpointProgress extends MidpointCandidate {
  status: MidpointStatus;
  cheapestLong?: number;
  resultCount: number;
  message?: string;
}
export interface TimedFlight {
  flight: Flight;
  departure: number;
  arrival: number;
}
export interface TransferResult {
  id: string;
  midpoint: string;
  leg1: Flight;
  leg2: Flight;
  price: number;
  transferMinutes: number;
  durationMinutes: number;
}
export interface TransferProgress {
  phase: 'pricing' | 'joining' | 'complete' | 'cancelled';
  midpoints: MidpointProgress[];
  results: TransferResult[];
  baselinePrice: number | null;
  ceilingPrice: number | null;
  skippedFlights: number;
}
export type FlightQuery = (request: SearchRequest, signal?: AbortSignal) => Promise<SearchResponse>;
const validPrice = (price: number) => Number.isFinite(price) && price > 0;

function withinTime(time: FlightTime, window: { earliest?: string; latest?: string } | undefined) {
  if (!window) return true;
  const clock = `${String(time.time.hour).padStart(2, '0')}:${String(time.time.minute).padStart(2, '0')}`;
  return (
    (!window.earliest || clock >= window.earliest) && (!window.latest || clock <= window.latest)
  );
}

function normalize(
  flights: Flight[],
  graph: RouteGraph,
  from: string,
  to: string,
  date: string,
  original: SearchRequest,
  leg: 1 | 2,
  nonstop: boolean,
) {
  const out: TimedFlight[] = [];
  let skipped = 0;
  const seen = new Set<string>();
  for (const flight of flights) {
    const first = flight.segments[0];
    const last = flight.segments.at(-1);
    if (
      !validPrice(flight.price) ||
      (nonstop && (flight.segments.length !== 1 || flight.stopCount !== 0)) ||
      first?.fromAirport?.code !== from ||
      last?.toAirport?.code !== to
    ) {
      skipped++;
      continue;
    }
    const departure = localToEpoch(first.departure, graph.airports[from].timezone);
    const arrival = localToEpoch(last.arrival, graph.airports[to].timezone);
    if (departure === null || arrival === null || arrival <= departure) {
      skipped++;
      continue;
    }
    if (localDateAt(departure, graph.airports[from].timezone) !== date) continue;
    if (leg === 1 && !withinTime(first.departure, original.filters?.departureTime)) continue;
    if (leg === 2 && !withinTime(last.arrival, original.filters?.arrivalTime)) continue;
    const key = flightKey(flight);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ flight, departure, arrival });
  }
  return { flights: out, skipped };
}
function flightKey(flight: Flight) {
  return JSON.stringify([
    flight.price,
    flight.segments.map((s) => [
      s.fromAirport?.code,
      s.toAirport?.code,
      s.flightNumber,
      s.departure,
      s.arrival,
    ]),
  ]);
}

// Segment tree: O(n) space/build after sorting, O(log n) cheapest range query.
export function joinFlights(
  leg1: TimedFlight[],
  leg2: TimedFlight[],
  options: TransferOptions,
  midpoint: string,
): TransferResult[] {
  if (!leg1.length || !leg2.length) return [];
  const arrivals = [...leg1].sort(
    (a, b) => a.arrival - b.arrival || a.flight.price - b.flight.price,
  );
  const n = arrivals.length;
  const tree: (TimedFlight | undefined)[] = new Array(n * 2);
  const cheaper = (a: TimedFlight | undefined, b: TimedFlight | undefined) =>
    !a ? b : !b || a.flight.price <= b.flight.price ? a : b;
  for (let i = 0; i < n; i++) tree[n + i] = arrivals[i];
  for (let i = n - 1; i > 0; i--) tree[i] = cheaper(tree[i * 2], tree[i * 2 + 1]);
  function bound(time: number, inclusive: boolean) {
    let lo = 0,
      hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arrivals[mid].arrival < time || (inclusive && arrivals[mid].arrival === time))
        lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  const results: TransferResult[] = [];
  for (const second of leg2) {
    let lo = bound(second.departure - options.maxBufferMinutes * 60_000, false) + n;
    let hi = bound(second.departure - options.minBufferMinutes * 60_000, true) + n;
    let first: TimedFlight | undefined;
    while (lo < hi) {
      if (lo & 1) first = cheaper(first, tree[lo++]);
      if (hi & 1) first = cheaper(first, tree[--hi]);
      lo >>= 1;
      hi >>= 1;
    }
    if (first)
      results.push({
        id: `${midpoint}:${flightKey(first.flight)}:${flightKey(second.flight)}`,
        midpoint,
        leg1: first.flight,
        leg2: second.flight,
        price: first.flight.price + second.flight.price,
        transferMinutes: (second.departure - first.arrival) / 60_000,
        durationMinutes: (second.arrival - first.departure) / 60_000,
      });
  }
  return results;
}

export async function searchSelfTransfers({
  graph,
  request,
  baseline,
  options = DEFAULT_TRANSFER_OPTIONS,
  signal,
  onProgress,
  query = searchFlights,
}: {
  graph: RouteGraph;
  request: SearchRequest;
  baseline: Flight[];
  options?: TransferOptions;
  signal: AbortSignal;
  onProgress: (progress: TransferProgress) => void;
  query?: FlightQuery;
}): Promise<TransferProgress> {
  if (!validateTransferOptions(options))
    throw new Error('Choose an ordered transfer window between 0 and 168 hours.');
  const original = request.flights[0];
  const prices = baseline.map((f) => f.price).filter(validPrice);
  let best = prices.length ? Math.min(...prices) : Infinity;
  const ceiling = prices.length ? Math.max(...prices) : Infinity;
  const connections = request.filters?.connectionAirports;
  const hubs = candidates(graph, original.fromAirport, original.toAirport).filter(
    (h) =>
      !connections?.block?.includes(h.code) &&
      (!connections?.allow?.length || connections.allow.includes(h.code)),
  );
  const state: TransferProgress = {
    phase: 'pricing',
    midpoints: hubs.map((h) => ({ ...h, status: 'queued', resultCount: 0 })),
    results: [],
    baselinePrice: Number.isFinite(best) ? best : null,
    ceilingPrice: Number.isFinite(ceiling) ? ceiling : null,
    skippedFlights: 0,
  };
  function snapshot() {
    return {
      ...state,
      midpoints: state.midpoints.map((h) => ({ ...h })),
      results: [...state.results],
    };
  }
  function emit() {
    if (!signal.aborted) onProgress(snapshot());
  }
  function check() {
    signal.throwIfAborted();
  }
  const cache = new Map<string, Promise<SearchResponse>>();
  async function fetchLeg(hub: MidpointProgress, leg: 1 | 2, date: string) {
    check();
    const nonstop = leg !== hub.longLeg;
    const from = leg === 1 ? original.fromAirport : hub.code;
    const to = leg === 1 ? hub.code : original.toAirport;
    // No absolute datetime filters exist in this API. Query a whole local day,
    // then apply endpoint filters and the absolute transfer window locally.
    const filters = { ...request.filters };
    delete filters.departureTime;
    delete filters.arrivalTime;
    const next: SearchRequest = {
      ...request,
      flights: [
        {
          ...original,
          fromAirport: from,
          toAirport: to,
          date,
          ...(nonstop ? { maxStops: 0 } : {}),
        },
      ],
      ...(nonstop ? { maxStops: 0 } : {}),
      ...(Object.keys(filters).length ? { filters } : {}),
    };
    if (!Object.keys(filters).length) delete next.filters;
    const key = JSON.stringify(next);
    let pending = cache.get(key);
    if (!pending) {
      pending = query(next, signal);
      cache.set(key, pending);
    }
    const data = await pending;
    check();
    const normalized = normalize(data.flights, graph, from, to, date, request, leg, nonstop);
    state.skippedFlights += normalized.skipped;
    return normalized.flights;
  }
  const long = new Map<string, TimedFlight[]>();
  emit();
  let cursor = 0;
  // Bound provider load. Each worker makes at most one request at a time.
  async function worker() {
    while (cursor < state.midpoints.length) {
      check();
      const hub = state.midpoints[cursor++];
      hub.status = 'pricing';
      emit();
      try {
        const flights = await fetchLeg(hub, hub.longLeg, original.date);
        if (hub.longLeg === 2) flights.push(...(await fetchLeg(hub, 2, addDays(original.date, 1))));
        long.set(hub.code, flights);
        hub.cheapestLong = flights.length
          ? Math.min(...flights.map((f) => f.flight.price))
          : undefined;
        hub.status = flights.length ? 'ready' : 'empty';
        if (!flights.length) hub.message = 'No usable long-leg flights.';
      } catch (error) {
        check();
        hub.status = 'error';
        hub.message = error instanceof Error ? error.message : 'Midpoint search failed.';
      }
      emit();
    }
  }
  try {
    // Settle workers before leaving, including on cancellation.
    const workers = await Promise.allSettled(
      Array.from({ length: Math.min(3, hubs.length) }, worker),
    );
    check();
    const failed = workers.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
    state.phase = 'joining';
    emit();
    const ready = state.midpoints
      .filter((h) => h.status === 'ready')
      .sort((a, b) => a.cheapestLong! - b.cheapestLong! || a.code.localeCompare(b.code));
    for (let index = 0; index < ready.length; index++) {
      check();
      const hub = ready[index];
      if (hub.cheapestLong! >= best) {
        for (const remaining of ready.slice(index)) {
          remaining.status = 'pruned';
          remaining.message = 'Long leg alone cannot beat the best fare found.';
        }
        emit();
        break;
      }
      hub.status = 'searching';
      emit();
      try {
        let leg1: TimedFlight[], leg2: TimedFlight[];
        if (hub.longLeg === 2) {
          leg2 = long.get(hub.code)!;
          const after =
            Math.min(...leg2.map((f) => f.departure)) - options.maxBufferMinutes * 60_000;
          const before =
            Math.max(...leg2.map((f) => f.departure)) - options.minBufferMinutes * 60_000;
          leg1 = (await fetchLeg(hub, 1, original.date)).filter(
            (f) => f.arrival >= after && f.arrival <= before,
          );
        } else {
          leg1 = long.get(hub.code)!;
          const after = Math.min(...leg1.map((f) => f.arrival)) + options.minBufferMinutes * 60_000;
          const before =
            Math.max(...leg1.map((f) => f.arrival)) + options.maxBufferMinutes * 60_000;
          leg2 = [];
          const lastDate = localDateAt(before, hub.airport.timezone);
          for (
            let day = localDateAt(after, hub.airport.timezone);
            day <= lastDate;
            day = addDays(day, 1)
          ) {
            leg2.push(
              ...(await fetchLeg(hub, 2, day)).filter(
                (f) => f.departure >= after && f.departure <= before,
              ),
            );
          }
        }
        const results = joinFlights(leg1, leg2, options, hub.code).filter(
          (r) => r.price <= ceiling,
        );
        const seen = new Set(state.results.map((r) => r.id));
        for (const result of results) {
          if (!seen.has(result.id)) {
            state.results.push(result);
            seen.add(result.id);
          }
          best = Math.min(best, result.price);
        }
        state.results.sort(
          (a, b) =>
            a.price - b.price || a.durationMinutes - b.durationMinutes || a.id.localeCompare(b.id),
        );
        hub.resultCount = results.length;
        hub.status = results.length ? 'results' : 'empty';
        if (!results.length)
          hub.message = 'No matching transfers within the time window and regular fare ceiling.';
      } catch (error) {
        check();
        hub.status = 'error';
        hub.message = error instanceof Error ? error.message : 'Midpoint search failed.';
      }
      emit();
    }
    state.phase = 'complete';
    emit();
    return snapshot();
  } catch (error) {
    if (signal.aborted) {
      state.phase = 'cancelled';
      for (const hub of state.midpoints)
        if (['queued', 'pricing', 'ready', 'searching'].includes(hub.status))
          hub.status = 'cancelled';
    }
    throw error;
  }
}
