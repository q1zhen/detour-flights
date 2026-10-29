import { candidates } from './routes';
import type { CandidateFilters, RouteGraph } from './routes';
import type { Flight } from './types';
import type { MidpointProgress, TransferProgress } from './self-transfer';

export interface GlobeDraft {
  from: string;
  to: string;
  filters: CandidateFilters;
  allow: string[];
  block: string[];
  signature: string;
}
export interface SelectedTrip {
  id: string;
  flights: Flight[];
  midpoint?: string;
}
export const MIDPOINT_COLORS = {
  pending: '#9aa6b5',
  empty: '#ff657a',
  expensive: '#f7c84e',
  results: '#52e4a1',
};
export function midpointAppearance(hub?: Pick<MidpointProgress, 'status' | 'resultCount'>) {
  if (hub && hub.resultCount > 0)
    return { color: MIDPOINT_COLORS.results, status: 'Results available' };
  if (hub?.status === 'pruned')
    return { color: MIDPOINT_COLORS.expensive, status: 'Too expensive' };
  if (hub?.status === 'empty') return { color: MIDPOINT_COLORS.empty, status: 'No results' };
  return {
    color: MIDPOINT_COLORS.pending,
    status:
      hub?.status === 'error'
        ? 'Search failed'
        : hub?.status === 'cancelled'
          ? 'Cancelled'
          : hub && hub.status !== 'queued'
            ? 'Searching'
            : 'Not searched',
  };
}
export interface AirportDot {
  code: string;
  lat: number;
  lng: number;
  color: string;
  status: string;
  name: string;
  selected?: boolean;
}
export function midpointDots(
  graph: RouteGraph,
  draft: GlobeDraft,
  progress: TransferProgress | null,
): AirportDot[] {
  if (draft.from === draft.to || !graph.airports[draft.from] || !graph.airports[draft.to])
    return [];
  const states = new Map(progress?.midpoints.map((hub) => [hub.code, hub]));
  return candidates(
    graph,
    draft.from,
    draft.to,
    draft.filters.ratio,
    draft.filters.slackKm,
    draft.filters.minDegree,
  )
    .filter(
      (hub) =>
        !draft.block.includes(hub.code) && (!draft.allow.length || draft.allow.includes(hub.code)),
    )
    .filter(
      (hub) =>
        !['complete', 'cancelled'].includes(progress?.phase ?? '') ||
        (states.get(hub.code)?.resultCount ?? 0) > 0,
    )
    .map((hub) => ({
      code: hub.code,
      lat: hub.airport.lat,
      lng: hub.airport.lon,
      name: hub.airport.name,
      ...midpointAppearance(states.get(hub.code)),
    }));
}
export interface RouteArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  label: string;
  ground: boolean;
}
export function tripGeometry(
  graph: RouteGraph,
  trip: SelectedTrip | null,
  endpoints: string[] = [],
) {
  const codes = new Set<string>(trip ? [] : endpoints);
  const arcs: RouteArc[] = [];
  const missing = new Set<string>();
  let previous: string | undefined;
  function arc(from: string, to: string, ticket: number, ground = false) {
    codes.add(from);
    codes.add(to);
    const a = graph.airports[from],
      b = graph.airports[to];
    if (!a) missing.add(from);
    if (!b) missing.add(to);
    if (!a || !b || from === to) return;
    arcs.push({
      startLat: a.lat,
      startLng: a.lon,
      endLat: b.lat,
      endLng: b.lon,
      color: ground ? '#f7c84e' : ticket === 0 ? '#66d9ff' : '#c4a1ff',
      label: `${from} → ${to}${ground ? ' · Airport transfer' : ` · Ticket ${ticket + 1}`}`,
      ground,
    });
  }
  trip?.flights.forEach((flight, ticket) =>
    flight.segments.forEach((segment) => {
      const from = segment.fromAirport.code,
        to = segment.toAirport.code;
      if (previous && previous !== from) arc(previous, from, ticket, true);
      arc(from, to, ticket);
      previous = to;
    }),
  );
  const airports: AirportDot[] = [...codes].flatMap((code) => {
    const a = graph.airports[code];
    if (!a) {
      if (code) missing.add(code);
      return [];
    }
    return [
      {
        code,
        lat: a.lat,
        lng: a.lon,
        name: a.name,
        color: code === trip?.midpoint ? '#c4a1ff' : '#bcefff',
        status: code === trip?.midpoint ? 'Self-transfer' : 'Route airport',
        selected: true,
      },
    ];
  });
  return { arcs, airports, missing: [...missing] };
}
// Spherical mean keeps routes across the date line centred over the Pacific.
export function routeView(airports: { lat: number; lng: number }[]) {
  if (!airports.length) return { lat: 28, lng: -35, altitude: 2.1 };
  const rad = Math.PI / 180;
  const [x, y, z] = airports.reduce(
    ([x, y, z], a) => [
      x + Math.cos(a.lat * rad) * Math.cos(a.lng * rad),
      y + Math.cos(a.lat * rad) * Math.sin(a.lng * rad),
      z + Math.sin(a.lat * rad),
    ],
    [0, 0, 0],
  );
  return { lat: Math.atan2(z, Math.hypot(x, y)) / rad, lng: Math.atan2(y, x) / rad, altitude: 1.8 };
}
