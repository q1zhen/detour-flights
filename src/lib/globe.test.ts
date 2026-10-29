import { describe, it, expect } from 'vitest';
import {
  routeArcLayers,
  midpointAppearance,
  midpointDots,
  tripGeometry,
  routeView,
  MIDPOINT_COLORS,
} from './globe';
import type { GlobeDraft } from './globe';
import type { RouteAirport, RouteGraph } from './routes';
import type { MidpointStatus, TransferProgress } from './self-transfer';
import { oneWayFlight } from '../test/fixtures';
import { DURATION_TICKS } from '../components/DurationRangeField';

const airport = (lat: number, lon: number): RouteAirport => ({
  lat,
  lon,
  name: 'Airport',
  city: 'City',
  country: 'US',
  timezone: 'UTC',
  out: ['JFK', 'LHR'],
  in: ['JFK'],
});
const graph: RouteGraph = {
  version: 1,
  airports: {
    JFK: { ...airport(40, -74), out: ['BOS', 'ORD'] },
    BOS: airport(42, -71),
    ORD: airport(42, -88),
    LHR: airport(51, 0),
  },
};
const draft: GlobeDraft = {
  from: 'JFK',
  to: 'LHR',
  filters: { ratio: 1.25, slackKm: 300, minDegree: 1 },
  allow: [],
  block: [],
  signature: 'test',
};
describe('globe state', () => {
  it.each<MidpointStatus>(['queued', 'pricing', 'ready', 'searching', 'cancelled', 'error'])(
    'keeps %s grey without misreporting an empty result',
    (status) => {
      expect(midpointAppearance({ status, resultCount: 0 }).color).toBe(MIDPOINT_COLORS.pending);
    },
  );
  it('uses red for empty, yellow for expensive, green immediately for partial results', () => {
    expect(midpointAppearance({ status: 'empty', resultCount: 0 }).color).toBe(
      MIDPOINT_COLORS.empty,
    );
    expect(midpointAppearance({ status: 'pruned', resultCount: 0 }).color).toBe(
      MIDPOINT_COLORS.expensive,
    );
    for (const status of ['searching', 'error', 'cancelled', 'results'] as const)
      expect(midpointAppearance({ status, resultCount: 1 }).color).toBe(MIDPOINT_COLORS.results);
  });
  it('previews exact geographic/degree/connection filters without search results', () => {
    expect(midpointDots(graph, draft, null).map((d) => d.code)).toContain('BOS');
    expect(
      midpointDots(graph, { ...draft, filters: { ...draft.filters, minDegree: 10 } }, null),
    ).toEqual([]);
    expect(midpointDots(graph, { ...draft, block: ['BOS', 'ORD'] }, null)).toEqual([]);
    expect(midpointDots(graph, { ...draft, allow: ['BOS'] }, null).map((d) => d.code)).toEqual([
      'BOS',
    ]);
    expect(midpointDots(graph, { ...draft, from: 'NYC' }, null)).toEqual([]);
    expect(midpointDots(graph, { ...draft, to: 'JFK' }, null)).toEqual([]);
  });
  it('reverts stale statuses to grey when the caller switches to preview', () => {
    const progress = {
      midpoints: [{ code: 'BOS', status: 'empty', resultCount: 0 }],
    } as TransferProgress;
    expect(midpointDots(graph, draft, progress).find((d) => d.code === 'BOS')?.color).toBe(
      MIDPOINT_COLORS.empty,
    );
    expect(midpointDots(graph, draft, null).find((d) => d.code === 'BOS')?.color).toBe(
      MIDPOINT_COLORS.pending,
    );
  });
  it('renders actual flight segments, both tickets and airport transfers without guessing coordinates', () => {
    const segment = oneWayFlight.segments[0];
    const first = {
      ...oneWayFlight,
      segments: [
        {
          ...segment,
          fromAirport: { code: 'JFK', name: '' },
          toAirport: { code: 'BOS', name: '' },
        },
      ],
    };
    const second = {
      ...oneWayFlight,
      segments: [
        {
          ...segment,
          fromAirport: { code: 'ORD', name: '' },
          toAirport: { code: 'LHR', name: '' },
        },
        {
          ...segment,
          fromAirport: { code: 'LHR', name: '' },
          toAirport: { code: 'UNK', name: '' },
        },
      ],
    };
    const result = tripGeometry(graph, { id: 'split', flights: [first, second], midpoint: 'BOS' });
    expect(result.airports.map((a) => a.code)).toEqual(['JFK', 'BOS', 'ORD', 'LHR']);
    expect(result.arcs.map((a) => a.ground)).toEqual([false, true, false]);
    expect(result.arcs[0].color).toBe('#ffbe45');
    expect(result.arcs[2].color).toBe('#ffbe45');
    expect(result.missing).toEqual(['UNK']);
    expect(result.airports.find((a) => a.code === 'BOS')?.status).toBe('Self-transfer');
    expect(tripGeometry(graph, null, ['JFK', 'LHR']).arcs).toEqual([]);
  });
  it('centres date-line routes on the Pacific rather than Greenwich', () => {
    expect(
      Math.abs(
        routeView([
          { lat: 10, lng: 170 },
          { lat: 10, lng: -170 },
        ]).lng,
      ),
    ).toBeCloseTo(180);
  });
  it('offers ordered discrete durations covering defaults and the seven-day limit', () => {
    expect(DURATION_TICKS).toContain(120);
    expect(DURATION_TICKS).toContain(720);
    expect(DURATION_TICKS.at(-1)).toBe(10080);
    expect(new Set(DURATION_TICKS).size).toBe(DURATION_TICKS.length);
    expect(DURATION_TICKS.every((v, i) => !i || v > DURATION_TICKS[i - 1])).toBe(true);
  });
});

it('keeps only midpoints with results after completion or cancellation and preserves preview candidates', () => {
  const filtered = { ...draft, filters: { ratio: 3, slackKm: 3000, minDegree: 1 } };
  const progress = {
    phase: 'joining',
    midpoints: [
      { code: 'BOS', status: 'results', resultCount: 2 },
      { code: 'ORD', status: 'empty', resultCount: 0 },
    ],
  } as TransferProgress;
  expect(midpointDots(graph, filtered, progress).map((d) => d.code)).toContain('ORD');
  for (const phase of ['complete', 'cancelled'] as const) {
    expect(midpointDots(graph, filtered, { ...progress, phase }).map((d) => d.code)).toEqual([
      'BOS',
    ]);
    expect(midpointDots(graph, filtered, { ...progress, phase, midpoints: [] })).toEqual([]);
  }
  expect(midpointDots(graph, filtered, null).map((d) => d.code)).toContain('ORD');
});

it('keeps a complete amber route under the moving highlight and respects reduced motion', () => {
  const arc = {
    startLat: 0,
    startLng: 0,
    endLat: 10,
    endLng: 10,
    color: '#ffbe45',
    label: 'AAA → BBB',
    ground: false,
  };
  const layers = routeArcLayers([arc], false);
  const line = layers.find((a) => a.layer === 'line')!;
  expect(line).toMatchObject({ color: '#ffbe45', dashLength: 1, dashGap: 0, animateTime: 0 });
  expect(line.stroke).toBeLessThan(0.2);
  expect(layers.find((a) => a.layer === 'pulse')?.animateTime).toBeGreaterThan(0);
  expect(routeArcLayers([arc], true).every((a) => a.animateTime === 0)).toBe(true);
  expect(routeArcLayers([arc], true).some((a) => a.layer === 'line')).toBe(true);
});
