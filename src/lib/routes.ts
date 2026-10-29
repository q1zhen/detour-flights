export interface CandidateFilters {
  ratio: number;
  slackKm: number;
  minDegree: number;
}
export const DEFAULT_CANDIDATE_FILTERS: CandidateFilters = {
  ratio: 1.25,
  slackKm: 300,
  minDegree: 10,
};
export const CANDIDATE_FILTER_LIMITS = {
  ratio: { min: 1, max: 3, step: 0.05 },
  slackKm: { min: 0, max: 3000, step: 50 },
  minDegree: { min: 0, max: 500, step: 1 },
};
export function validCandidateFilters(filters: CandidateFilters) {
  return (Object.keys(CANDIDATE_FILTER_LIMITS) as (keyof CandidateFilters)[]).every((key) => {
    const value = filters[key];
    const { min, max } = CANDIDATE_FILTER_LIMITS[key];
    return (
      Number.isFinite(value) &&
      value >= min &&
      value <= max &&
      (key === 'ratio' || Number.isInteger(value))
    );
  });
}

export interface RouteAirport {
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
  out: string[];
  in: string[];
}
export interface RouteGraph {
  version: 1;
  airports: Record<string, RouteAirport>;
}
export interface MidpointCandidate {
  code: string;
  airport: RouteAirport;
  distanceKm: number;
  longLeg: 1 | 2;
}

export async function loadRoutes(signal?: AbortSignal): Promise<RouteGraph> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/routes.json`, { signal });
  if (!response.ok) throw new Error('The airport route data could not be loaded.');
  const graph = await response.json();
  if (graph?.version !== 1 || !graph.airports || typeof graph.airports !== 'object')
    throw new Error('The airport route data has an unsupported format.');
  return graph;
}

export function haversine(a: RouteAirport, b: RouteAirport) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function candidates(
  graph: RouteGraph,
  from: string,
  to: string,
  ratio = DEFAULT_CANDIDATE_FILTERS.ratio,
  slackKm = DEFAULT_CANDIDATE_FILTERS.slackKm,
  minDegree = DEFAULT_CANDIDATE_FILTERS.minDegree,
): MidpointCandidate[] {
  const a = graph.airports[from];
  const b = graph.airports[to];
  if (!a || !b)
    throw new Error(
      'Self-transfer search needs specific airports in the route dataset. Use airport codes (for example, JFK and LHR), rather than city codes. Regular results are still available.',
    );
  const limit = ratio * haversine(a, b) + slackKm;
  return [...new Set([...a.out, ...b.in])]
    .filter((code) => code !== from && code !== to)
    .flatMap((code) => {
      const airport = graph.airports[code];
      if (!airport || airport.out.length < minDegree) return [];
      const leg1 = haversine(a, airport);
      const leg2 = haversine(airport, b);
      if (leg1 + leg2 > limit) return [];
      return [
        {
          code,
          airport,
          distanceKm: leg1 + leg2,
          longLeg: leg2 >= leg1 ? (2 as const) : (1 as const),
        },
      ];
    })
    .sort((a, b) => a.distanceKm - b.distanceKm || a.code.localeCompare(b.code));
}
