import { describe, expect, it, vi } from 'vitest';
import { candidates, haversine } from './routes';
import type { RouteAirport, RouteGraph } from './routes';
import { addDays, localDateAt, localToEpoch } from './flight-time';
import {
  DEFAULT_TRANSFER_OPTIONS,
  joinFlights,
  searchSelfTransfers,
  validateTransferOptions,
} from './self-transfer';
import type { TimedFlight, TransferProgress, FlightQuery } from './self-transfer';
import type { Flight, FlightTime, SearchRequest } from './types';
import { emptyMetadata, oneWayFlight } from '../test/fixtures';
import { buildRequest, initialValues } from './search';

function airport(lon: number, out: string[] = [], incoming: string[] = []): RouteAirport {
  return {
    name: 'Airport',
    city: 'City',
    country: 'US',
    timezone: 'Etc/UTC',
    lat: 0,
    lon,
    out,
    in: incoming,
  };
}
const degree = Array.from({ length: 10 }, (_, i) => `E${String.fromCharCode(65 + i)}A`);
function graph(
  hubs: [string, number][] = [
    ['HAA', 1],
    ['HBB', 2],
  ],
): RouteGraph {
  return {
    version: 1,
    airports: {
      AAA: airport(
        0,
        hubs.map(([code]) => code),
      ),
      BBB: airport(20),
      ...Object.fromEntries(hubs.map(([code, lon]) => [code, airport(lon, degree)])),
      ...Object.fromEntries(degree.map((code) => [code, airport(100)])),
    },
  };
}
function time(date: string, clock: string): FlightTime {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = clock.split(':').map(Number);
  return { date: { year, month, day }, time: { hour, minute } };
}
function flight(
  from: string,
  to: string,
  price: number,
  departure = '2027-01-20T08:00',
  arrival = '2027-01-20T12:00',
): Flight {
  return {
    ...oneWayFlight,
    price,
    segments: [
      {
        ...oneWayFlight.segments[0],
        fromAirport: { code: from, name: from },
        toAirport: { code: to, name: to },
        departure: time(...(departure.split('T') as [string, string])),
        arrival: time(...(arrival.split('T') as [string, string])),
      },
    ],
    stopCount: 0,
    layovers: [],
  };
}
function request(): SearchRequest {
  return buildRequest({ ...initialValues(), from: 'AAA', to: 'BBB', departure: '2027-01-20' });
}
const response = (flights: Flight[]) => ({ flights, metadata: emptyMetadata });
const run = (
  query: FlightQuery,
  overrides: Partial<Parameters<typeof searchSelfTransfers>[0]> = {},
) =>
  searchSelfTransfers({
    graph: graph(),
    request: request(),
    baseline: [flight('AAA', 'BBB', 300)],
    signal: new AbortController().signal,
    onProgress: () => {},
    query,
    ...overrides,
  });

describe('route candidates', () => {
  it('uses outgoing OR incoming neighbors, geographic detour and minimum outgoing degree', () => {
    const g = graph();
    g.airports.AAA.out = ['HAA', 'AAA', 'BBB', 'LOW', 'FAR'];
    g.airports.BBB.in = ['HBB'];
    g.airports.LOW = airport(5, ['BBB']);
    g.airports.FAR = airport(120, degree);
    expect(candidates(g, 'AAA', 'BBB').map((h) => h.code)).toEqual(['HAA', 'HBB']);
    expect(candidates(g, 'AAA', 'BBB').map((h) => h.longLeg)).toEqual([2, 2]);
    g.airports.HBB.lon = 19;
    expect(candidates(g, 'AAA', 'BBB').find((h) => h.code === 'HBB')?.longLeg).toBe(1);
    expect(() => candidates(g, 'NYC', 'BBB')).toThrow('specific airports');
  });
  it('handles equal points and the antimeridian with haversine', () => {
    expect(haversine(airport(0), airport(0))).toBe(0);
    expect(haversine(airport(179), airport(-179))).toBeCloseTo(222.39, 1);
    expect(haversine(airport(0), airport(180))).toBeCloseTo(20015.1, 0);
  });
});

describe('airport-local times', () => {
  it('converts timezone offsets, half-hour offsets and dates across the date line', () => {
    expect(localToEpoch(time('2027-01-20', '12:00'), 'America/New_York')).toBe(
      Date.parse('2027-01-20T17:00Z'),
    );
    expect(localToEpoch(time('2027-07-20', '12:00'), 'America/New_York')).toBe(
      Date.parse('2027-07-20T16:00Z'),
    );
    expect(localToEpoch(time('2027-01-20', '12:00'), 'Asia/Kolkata')).toBe(
      Date.parse('2027-01-20T06:30Z'),
    );
    expect(localToEpoch(time('2027-01-20', '00:00'), 'Pacific/Kiritimati')).toBe(
      Date.parse('2027-01-19T10:00Z'),
    );
    expect(localDateAt(Date.parse('2027-01-19T10:00Z'), 'Pacific/Kiritimati')).toBe('2027-01-20');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01');
  });
  it('rejects nonexistent, ambiguous, missing and malformed local times instead of guessing', () => {
    expect(localToEpoch(time('2027-03-14', '02:30'), 'America/New_York')).toBeNull();
    expect(localToEpoch(time('2027-11-07', '01:30'), 'America/New_York')).toBeNull();
    expect(localToEpoch(time('2027-02-30', '12:00'), 'Etc/UTC')).toBeNull();
    expect(localToEpoch(time('2027-01-20', '24:00'), 'Etc/UTC')).toBeNull();
    expect(localToEpoch(undefined, 'Etc/UTC')).toBeNull();
    expect(localToEpoch(time('2027-01-20', '12:00'), 'invalid/zone')).toBeNull();
  });
  it('measures elapsed time through DST transitions', () => {
    const before = localToEpoch(time('2027-03-14', '01:30'), 'America/New_York')!;
    const after = localToEpoch(time('2027-03-14', '04:30'), 'America/New_York')!;
    expect((after - before) / 60_000).toBe(120);
  });
});

describe('range-minimum transfer join', () => {
  const timed = (price: number, arrivalMinutes: number): TimedFlight => ({
    flight: flight('AAA', 'HAA', price),
    cabin: 'economy',
    arrival: arrivalMinutes * 60_000,
    departure: (arrivalMinutes - 60) * 60_000,
  });
  it('includes both boundaries, picks the cheapest in range, and skips empty windows', () => {
    const first = [timed(100, 0), timed(50, 60), timed(10, 61), timed(5, -1)];
    const second = [{ ...timed(200, 300), departure: 180 * 60_000 }];
    const result = joinFlights(
      first,
      second,
      { minBufferMinutes: 120, maxBufferMinutes: 180 },
      'HAA',
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ price: 250, transferMinutes: 120, durationMinutes: 300 });
    expect(
      joinFlights([first[0]], second, { minBufferMinutes: 120, maxBufferMinutes: 180 }, 'HAA')[0]
        .price,
    ).toBe(300);
    expect(
      joinFlights(
        [first[2], first[3]],
        second,
        { minBufferMinutes: 120, maxBufferMinutes: 180 },
        'HAA',
      ),
    ).toEqual([]);
    expect(joinFlights([], second, DEFAULT_TRANSFER_OPTIONS, 'HAA')).toEqual([]);
  });
  it('agrees with a brute-force join for unsorted, overlapping ranges and repeated arrival times', () => {
    const first = Array.from({ length: 127 }, (_, i) =>
      timed(1 + ((i * 37) % 101), (i * 13) % 180),
    );
    const second = Array.from({ length: 80 }, (_, i) => ({
      ...timed(100, 400 + i),
      departure: i * 7 * 60_000,
    }));
    const opts = { minBufferMinutes: 30, maxBufferMinutes: 100 };
    const actual = joinFlights(first, second, opts, 'HAA');
    const expected = second.flatMap((b) => {
      const choices = first.filter(
        (a) => b.departure - a.arrival >= 30 * 60_000 && b.departure - a.arrival <= 100 * 60_000,
      );
      return choices.length
        ? [Math.min(...choices.map((a) => a.flight.price)) + b.flight.price]
        : [];
    });
    expect(actual.map((r) => r.price)).toEqual(expected);
  });
});

describe('progressive self-transfer search', () => {
  it('prices long legs, tightens best and prunes more expensive ready hubs', async () => {
    const calls: string[] = [];
    const snapshots: TransferProgress[] = [];
    const query: FlightQuery = async (req) => {
      const leg = req.flights[0];
      calls.push(`${leg.fromAirport}-${leg.toAirport}:${leg.date}`);
      if (leg.date !== '2027-01-20') return response([]);
      if (leg.fromAirport === 'AAA')
        return response([flight('AAA', leg.toAirport, 50, '2027-01-20T08:00', '2027-01-20T10:00')]);
      return response([
        flight(
          leg.fromAirport,
          'BBB',
          leg.fromAirport === 'HAA' ? 100 : 160,
          '2027-01-20T12:00',
          '2027-01-20T18:00',
        ),
      ]);
    };
    const result = await run(query, { onProgress: (p) => snapshots.push(p) });
    expect(calls).toContain('HAA-BBB:2027-01-21');
    expect(calls.at(-1)).toBe('AAA-HAA:2027-01-20');
    expect(calls).not.toContain('AAA-HBB:2027-01-20');
    expect(result.results.map((r) => r.price)).toEqual([150]);
    expect(result.midpoints.find((h) => h.code === 'HBB')?.status).toBe('pruned');
    expect(snapshots[0].midpoints.every((h) => h.status === 'queued')).toBe(true);
    expect(snapshots.some((p) => p.results.length && p.phase === 'joining')).toBe(true);
    expect(result.phase).toBe('complete');
  });
  it('keeps transfers up to the maximum regular fare even above the minimum; rejects higher totals', async () => {
    const query: FlightQuery = async (req) => {
      const leg = req.flights[0];
      if (leg.date.endsWith('21')) return response([]);
      return response(
        leg.fromAirport === 'AAA'
          ? [flight('AAA', 'HAA', 100, '2027-01-20T08:00', '2027-01-20T10:00')]
          : [
              flight('HAA', 'BBB', 150, '2027-01-20T12:00', '2027-01-20T18:00'),
              flight('HAA', 'BBB', 200, '2027-01-20T13:00', '2027-01-20T19:00'),
              flight('HAA', 'BBB', 201, '2027-01-20T14:00', '2027-01-20T20:00'),
            ],
      );
    };
    const result = await run(query, {
      graph: graph([['HAA', 1]]),
      baseline: [flight('AAA', 'BBB', 200), flight('AAA', 'BBB', 300)],
    });
    expect(result.results.map((r) => r.price)).toEqual([250, 300]);
    expect(result.baselinePrice).toBe(200);
    expect(result.ceilingPrice).toBe(300);
  });
  it('queries every local date intersecting a short leg-2 window, including day +2', async () => {
    const dates: string[] = [];
    const query: FlightQuery = async (req) => {
      const leg = req.flights[0];
      if (leg.fromAirport === 'AAA')
        return response([flight('AAA', 'HAA', 50, '2027-01-20T22:00', '2027-01-21T23:00')]);
      dates.push(leg.date);
      return response([flight('HAA', 'BBB', 30, `${leg.date}T02:00`, `${leg.date}T03:00`)]);
    };
    const result = await run(query, { graph: graph([['HAA', 19]]) });
    expect(dates).toEqual(['2027-01-22']);
    expect(result.results[0]).toMatchObject({
      price: 80,
      transferMinutes: 180,
      durationMinutes: 1740,
    });
  });
  it('queries both days when the short leg departure window crosses midnight', async () => {
    const dates: string[] = [];
    const query: FlightQuery = async (req) => {
      const leg = req.flights[0];
      if (leg.fromAirport === 'AAA')
        return response([flight('AAA', 'HAA', 50, '2027-01-20T08:00', '2027-01-20T20:00')]);
      dates.push(leg.date);
      return response([
        flight('HAA', 'BBB', 30, `${leg.date}T23:00`, `${addDays(leg.date, 1)}T00:00`),
      ]);
    };
    const result = await run(query, { graph: graph([['HAA', 19]]) });
    expect(dates).toEqual(['2027-01-20', '2027-01-21']);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].transferMinutes).toBe(180);
  });
  it('handles empty/unpriced baselines, missing leg prices, and mismatched airports', async () => {
    const query: FlightQuery = async (req) => {
      const leg = req.flights[0];
      if (leg.date.endsWith('21')) return response([]);
      if (leg.fromAirport === 'AAA')
        return response([
          flight('AAA', 'HAA', 0),
          flight('AAA', 'XXX', 1),
          flight('AAA', 'HAA', 50, '2027-01-20T08:00', '2027-01-20T10:00'),
        ]);
      return response([flight('HAA', 'BBB', 50, '2027-01-20T12:00', '2027-01-20T18:00')]);
    };
    const result = await run(query, {
      graph: graph([['HAA', 1]]),
      baseline: [flight('AAA', 'BBB', 0), flight('AAA', 'BBB', NaN)],
    });
    expect(result.results[0].price).toBe(100);
    expect(result.baselinePrice).toBeNull();
    expect(result.ceilingPrice).toBeNull();
    expect(result.skippedFlights).toBe(2);
    expect((await run(async () => response([]))).midpoints.every((h) => h.status === 'empty')).toBe(
      true,
    );
  });
  it('preserves cabin/travelers/ticket filters, applies time bars only at journey endpoints', async () => {
    const req = request();
    req.seat = 'business';
    req.passengers.adults = 2;
    req.maxStops = 0;
    req.flights[0].airlines = ['AA'];
    req.filters = {
      departureTime: { earliest: '08:00', latest: '09:00' },
      arrivalTime: { earliest: '18:00', latest: '20:00' },
      layover: { minMinutes: 50 },
    };
    const query: FlightQuery = async (next) => {
      expect(next).toMatchObject({
        seat: 'business',
        passengers: { adults: 2 },
        maxStops: 0,
        filters: { layover: { minMinutes: 50 } },
        flights: [{ airlines: ['AA'] }],
      });
      expect(next.filters).not.toHaveProperty('departureTime');
      expect(next.filters).not.toHaveProperty('arrivalTime');
      expect(next).not.toHaveProperty('minBufferMinutes');
      const leg = next.flights[0];
      if (leg.date.endsWith('21')) return response([]);
      return response(
        leg.fromAirport === 'AAA'
          ? [
              flight('AAA', 'HAA', 1, '2027-01-20T07:00', '2027-01-20T10:00'),
              flight('AAA', 'HAA', 50, '2027-01-20T08:00', '2027-01-20T10:00'),
            ]
          : [
              flight('HAA', 'BBB', 50, '2027-01-20T12:00', '2027-01-20T18:00'),
              flight('HAA', 'BBB', 1, '2027-01-20T12:00', '2027-01-20T17:00'),
            ],
      );
    };
    const result = await run(query, {
      graph: graph([['HAA', 1]]),
      request: req,
      options: { ...DEFAULT_TRANSFER_OPTIONS, preferenceScope: 'all-segments' },
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].price).toBe(100);
  });
  it('respects allowed/blocked midpoints and returns no candidates without provider calls', async () => {
    const query = vi.fn(async () => response([]));
    const req = request();
    req.filters = { connectionAirports: { allow: ['HAA'], block: ['HAA'] } };
    const result = await run(query, { request: req });
    expect(result.midpoints).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
  it('isolates failed midpoints and continues the remaining search', async () => {
    const result = await run(async (req) => {
      const leg = req.flights[0];
      if (leg.fromAirport === 'HAA') throw new Error('Provider timeout');
      return response([]);
    });
    expect(result.midpoints.map((h) => h.status)).toEqual(['error', 'empty']);
    expect(result.midpoints[0].message).toContain('Provider timeout');
    expect(result.phase).toBe('complete');
  });
  it('cancels in-flight queries and emits no late progress or further queries', async () => {
    const controller = new AbortController();
    const updates: TransferProgress[] = [];
    let calls = 0;
    const pending = run(
      async (_req, signal) => {
        calls++;
        await new Promise<void>((_resolve, reject) =>
          signal!.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          ),
        );
        return response([]);
      },
      { signal: controller.signal, onProgress: (p) => updates.push(p) },
    );
    expect(calls).toBe(2);
    const before = updates.length;
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toBe(2);
    expect(updates).toHaveLength(before);
  });
  it('bounds concurrent provider requests to three and keeps result ordering deterministic', async () => {
    let active = 0,
      peak = 0;
    const result = await run(
      async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active--;
        return response([]);
      },
      {
        graph: graph([
          ['HAA', 1],
          ['HBB', 2],
          ['HCC', 3],
          ['HDD', 4],
        ]),
      },
    );
    expect(peak).toBe(3);
    expect(result.midpoints).toHaveLength(4);
  });
  it('validates transfer bounds', () => {
    expect(validateTransferOptions(DEFAULT_TRANSFER_OPTIONS)).toBe(true);
    for (const options of [
      { minBufferMinutes: -1, maxBufferMinutes: 60 },
      { minBufferMinutes: 61, maxBufferMinutes: 60 },
      { minBufferMinutes: 0, maxBufferMinutes: Infinity },
      { minBufferMinutes: 0, maxBufferMinutes: 10081 },
    ])
      expect(validateTransferOptions(options)).toBe(false);
  });
});

it.each([1, 19])(
  'requires a nonstop short leg on either side of the midpoint (longitude %s)',
  async (lon) => {
    const req = request();
    req.maxStops = 2;
    req.flights[0].maxStops = 1;
    const shortLeg = lon === 1 ? 1 : 2;
    const query: FlightQuery = async (next) => {
      const leg = next.flights[0];
      const isLeg1 = leg.fromAirport === 'AAA';
      const isShort = (isLeg1 ? 1 : 2) === shortLeg;
      expect(next.maxStops).toBe(isShort ? 0 : 2);
      expect(leg.maxStops).toBe(isShort ? 0 : 1);
      if (leg.date !== '2027-01-20') return response([]);
      const nonstop = flight(
        leg.fromAirport,
        leg.toAirport,
        100,
        isLeg1 ? '2027-01-20T06:00' : '2027-01-20T12:00',
        isLeg1 ? '2027-01-20T10:00' : '2027-01-20T18:00',
      );
      const connecting = {
        ...nonstop,
        price: 20,
        stopCount: 1,
        segments: [
          { ...nonstop.segments[0], toAirport: { code: 'XXX', name: 'Connection' } },
          { ...nonstop.segments[0], fromAirport: { code: 'XXX', name: 'Connection' } },
        ],
      };
      return response([connecting, nonstop]);
    };
    const result = await run(query, { graph: graph([['HAA', lon]]), request: req });
    expect(result.results.length).toBeGreaterThan(0);
    for (const resultFlight of result.results) {
      expect((shortLeg === 1 ? resultFlight.leg1 : resultFlight.leg2).segments).toHaveLength(1);
    }
    expect(result.results[0].price).toBe(120);
    expect(result.skippedFlights).toBe(1);
    expect(req.maxStops).toBe(2);
    expect(req.flights[0].maxStops).toBe(1);
  },
);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
it('publishes a ready midpoint while another is still pricing, then searches the later cheaper midpoint', async () => {
  const slow = deferred<ReturnType<typeof response>>();
  const snapshots: TransferProgress[] = [];
  const pending = run(
    async (req) => {
      const leg = req.flights[0];
      if (leg.date !== '2027-01-20') return response([]);
      if (leg.fromAirport === 'HBB') return slow.promise;
      return response(
        leg.fromAirport === 'AAA'
          ? [flight('AAA', leg.toAirport, 50, '2027-01-20T08:00', '2027-01-20T10:00')]
          : [flight('HAA', 'BBB', 100, '2027-01-20T12:00', '2027-01-20T18:00')],
      );
    },
    { onProgress: (p) => snapshots.push(p) },
  );
  try {
    await vi.waitFor(() => expect(snapshots.at(-1)?.results.map((r) => r.price)).toEqual([150]));
    const early = snapshots.at(-1)!;
    expect(early.phase).toBe('joining');
    expect(early.midpoints.find((h) => h.code === 'HBB')?.status).toBe('pricing');
    slow.resolve(response([flight('HBB', 'BBB', 90, '2027-01-20T12:00', '2027-01-20T18:00')]));
    const final = await pending;
    expect(final.results.map((r) => r.price)).toEqual([140, 150]);
    expect(final.midpoints.every((h) => h.status === 'results')).toBe(true);
    expect(early.results).toHaveLength(1); // snapshots remain stable as more results arrive
  } finally {
    slow.resolve(response([]));
    await pending;
  }
});
it('publishes each matching date immediately and retains those results if a later date fails', async () => {
  const nextDay = deferred<ReturnType<typeof response>>();
  const snapshots: TransferProgress[] = [];
  const pending = run(
    async (req) => {
      const leg = req.flights[0];
      if (leg.fromAirport === 'AAA')
        return response([flight('AAA', 'HAA', 50, '2027-01-20T08:00', '2027-01-20T20:00')]);
      if (leg.date === '2027-01-21') return nextDay.promise;
      return response([flight('HAA', 'BBB', 30, '2027-01-20T23:00', '2027-01-21T00:00')]);
    },
    { graph: graph([['HAA', 19]]), onProgress: (p) => snapshots.push(p) },
  );
  try {
    await vi.waitFor(() => expect(snapshots.at(-1)?.results).toHaveLength(1));
    expect(snapshots.at(-1)?.midpoints[0]).toMatchObject({ status: 'searching', resultCount: 1 });
    nextDay.reject(new Error('Provider timeout'));
    const final = await pending;
    expect(final.results.map((r) => r.price)).toEqual([80]);
    expect(final.midpoints[0]).toMatchObject({
      status: 'error',
      resultCount: 1,
      message: 'Provider timeout',
    });
  } finally {
    nextDay.resolve(response([]));
    await pending;
  }
});
it('stops emitting after cancellation while retaining already published results', async () => {
  const controller = new AbortController();
  const snapshots: TransferProgress[] = [];
  const pending = run(
    async (req, signal) => {
      const leg = req.flights[0];
      if (leg.fromAirport === 'HBB')
        return new Promise((_resolve, reject) => {
          signal!.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        });
      if (leg.date !== '2027-01-20') return response([]);
      return response(
        leg.fromAirport === 'AAA'
          ? [flight('AAA', 'HAA', 50, '2027-01-20T08:00', '2027-01-20T10:00')]
          : [flight('HAA', 'BBB', 100, '2027-01-20T12:00', '2027-01-20T18:00')],
      );
    },
    { signal: controller.signal, onProgress: (p) => snapshots.push(p) },
  );
  const stopped = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  try {
    await vi.waitFor(() => expect(snapshots.at(-1)?.results).toHaveLength(1));
    const count = snapshots.length;
    controller.abort();
    await stopped;
    expect(snapshots).toHaveLength(count);
    expect(snapshots.at(-1)?.results[0].price).toBe(150);
  } finally {
    controller.abort();
    await stopped;
  }
});

it('uses all three submitted midpoint filters without sending them to the flight API', async () => {
  const g = graph([['HAA', -2]]);
  const query = vi.fn(async (next: SearchRequest) => {
    expect(next).not.toHaveProperty('candidateFilters');
    expect(next.flights[0]).not.toHaveProperty('ratio');
    return response([]);
  });
  const selected = async (ratio: number, slackKm: number, minDegree: number) =>
    (
      await run(query, {
        graph: g,
        options: { ...DEFAULT_TRANSFER_OPTIONS, candidateFilters: { ratio, slackKm, minDegree } },
      })
    ).midpoints.map((h) => h.code);
  expect(await selected(1, 0, 10)).toEqual([]);
  expect(query).not.toHaveBeenCalled();
  expect(await selected(1.25, 0, 10)).toEqual(['HAA']);
  expect(await selected(1, 500, 10)).toEqual(['HAA']);
  expect(await selected(1.25, 300, 11)).toEqual([]);
  expect(await selected(1.25, 300, 10)).toEqual(['HAA']);
});
it('validates candidate filter bounds while retaining default options for existing searches', () => {
  expect(validateTransferOptions(DEFAULT_TRANSFER_OPTIONS)).toBe(true);
  const defaults = { ratio: 1.25, slackKm: 300, minDegree: 10 };
  for (const patch of [
    { ratio: NaN },
    { ratio: 0.9 },
    { ratio: 3.1 },
    { slackKm: -1 },
    { slackKm: 3001 },
    { minDegree: 0.5 },
    { minDegree: 501 },
  ]) {
    expect(
      validateTransferOptions({
        ...DEFAULT_TRANSFER_OPTIONS,
        candidateFilters: { ...defaults, ...patch },
      }),
    ).toBe(false);
  }
  expect(
    validateTransferOptions({
      ...DEFAULT_TRANSFER_OPTIONS,
      candidateFilters: { ratio: 3, slackKm: 3000, minDegree: 500 },
    }),
  ).toBe(true);
});

it.each([
  [1, undefined],
  [19, undefined],
  [1, 'long-leg'],
  [19, 'long-leg'],
  [1, 'all-segments'],
  [19, 'all-segments'],
] as const)(
  'applies airline and cabin scope %s / %s without changing the regular request',
  async (lon, scope) => {
    const req = request();
    req.seat = 'business';
    req.flights[0].airlines = ['AA', 'STAR_ALLIANCE'];
    req.passengers.adults = 2;
    const original = structuredClone(req);
    const longLeg = lon === 1 ? 2 : 1;
    const seen: SearchRequest[] = [];
    const result = await run(
      async (next) => {
        seen.push(next);
        const leg = next.flights[0];
        const legNumber = leg.fromAirport === 'AAA' ? 1 : 2;
        const selected = scope === 'all-segments' || legNumber === longLeg;
        expect(next.seat).toBe(selected ? 'business' : 'economy');
        if (selected) expect(leg.airlines).toEqual(['AA', 'STAR_ALLIANCE']);
        else expect(leg).not.toHaveProperty('airlines');
        expect(next.passengers.adults).toBe(2);
        expect(next).not.toHaveProperty('preferenceScope');
        if (legNumber !== longLeg) {
          expect(leg.maxStops).toBe(0);
          expect(next.maxStops).toBe(0);
        }
        if (leg.date !== '2027-01-20') return response([]);
        return response([
          flight(
            leg.fromAirport,
            leg.toAirport,
            50,
            legNumber === 1 ? '2027-01-20T08:00' : '2027-01-20T12:00',
            legNumber === 1 ? '2027-01-20T10:00' : '2027-01-20T18:00',
          ),
        ]);
      },
      {
        graph: graph([['HAA', lon]]),
        request: req,
        options: {
          minBufferMinutes: 120,
          maxBufferMinutes: 720,
          ...(scope ? { preferenceScope: scope } : {}),
        },
      },
    );
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      leg1Cabin: scope === 'all-segments' || longLeg === 1 ? 'business' : 'economy',
      leg2Cabin: scope === 'all-segments' || longLeg === 2 ? 'business' : 'economy',
    });
    expect(req).toEqual(original);
  },
);
it('defaults to a 2–12 hour transfer window and rejects longer waits', () => {
  expect(DEFAULT_TRANSFER_OPTIONS).toMatchObject({
    minBufferMinutes: 120,
    maxBufferMinutes: 720,
    preferenceScope: 'long-leg',
  });
  const first: TimedFlight = {
    flight: flight('AAA', 'HAA', 10),
    departure: 0,
    arrival: 60_000,
    cabin: 'economy',
  };
  const second = (wait: number): TimedFlight => ({
    flight: flight('HAA', 'BBB', 20),
    departure: first.arrival + wait * 60_000,
    arrival: first.arrival + (wait + 60) * 60_000,
    cabin: 'business',
  });
  expect(
    joinFlights(
      [first],
      [second(120), second(720), second(721)],
      DEFAULT_TRANSFER_OPTIONS,
      'HAA',
    ).map((r) => r.transferMinutes),
  ).toEqual([120, 720]);
});

it('marks compatible pairs above the regular fare ceiling as too expensive, not empty', async () => {
  const result = await run(
    async (req) => {
      const leg = req.flights[0];
      if (leg.date !== '2027-01-20') return response([]);
      return response([
        leg.fromAirport === 'AAA'
          ? flight('AAA', 'HAA', 250, '2027-01-20T08:00', '2027-01-20T10:00')
          : flight('HAA', 'BBB', 100, '2027-01-20T12:00', '2027-01-20T18:00'),
      ]);
    },
    {
      graph: graph([['HAA', 1]]),
      baseline: [flight('AAA', 'BBB', 200), flight('AAA', 'BBB', 300)],
    },
  );
  expect(result.results).toEqual([]);
  expect(result.midpoints[0]).toMatchObject({ status: 'pruned', overBudget: true, resultCount: 0 });
});
