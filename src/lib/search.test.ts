import { describe, expect, it } from 'vitest';
import { airlineCodes, buildRequest, initialValues, validateSearch } from './search';

const valid = () => ({
  ...initialValues(),
  from: 'jfk',
  to: 'lax',
  departure: '2027-01-20',
});
describe('flight search contract', () => {
  it('normalizes airport codes, fixes locale defaults, and creates one departure leg', () => {
    const values = { ...valid(), currency: 'eur', language: ' fr ' };
    const request = buildRequest(values);
    expect(request.flights).toEqual([{ date: '2027-01-20', fromAirport: 'JFK', toAirport: 'LAX' }]);
    expect(request.currency).toBe('USD');
    expect(request.language).toBe('en-US');
    expect(request).not.toHaveProperty('maxStops');
    expect(request.region).toBe('US');
    expect(request).not.toHaveProperty('filters');
  });
  it('omits unrestricted stops and preserves zero for nonstop', () => {
    expect(buildRequest({ ...valid(), stops: '1' }).maxStops).toBe(1);
    expect(buildRequest({ ...valid(), stops: '0' }).maxStops).toBe(0);
    expect(buildRequest(valid())).not.toHaveProperty('maxStops');
    expect(JSON.stringify(buildRequest(valid()))).not.toContain('null');
  });
  it('always sends one way even if stale round-trip settings are supplied', () => {
    const values = {
      ...valid(),
      trip: 'round-trip' as const,
      returnDate: '',
      returnAirlines: 'bad-code',
      returnStops: '0' as const,
    };
    expect(validateSearch(values)).toEqual([]);
    expect(buildRequest(values).flights).toHaveLength(1);
    expect(buildRequest(values).trip).toBe('one-way');
  });
  it('preserves all cabins, passenger categories, and per-leg airlines', () => {
    const values = {
      ...valid(),
      seat: 'first' as const,
      passengers: { adults: 2, children: 1, infantsInSeat: 1, infantsOnLap: 2 },
      outboundAirlines: 'aa, b6',
    };
    expect(validateSearch(values)).toEqual([]);
    const request = buildRequest(values);
    expect(request.passengers).toEqual(values.passengers);
    expect(request.seat).toBe('first');
    expect(request.flights[0].airlines).toEqual(['AA', 'B6']);
  });
  it('requires valid airports and a valid departure date', () => {
    expect(validateSearch({ ...valid(), from: 'JF' })).toHaveLength(1);
    expect(validateSearch({ ...valid(), to: 'JFK' })).toHaveLength(1);
    expect(
      validateSearch({ ...valid(), departure: '2027-02-30' }).some((v) =>
        v.includes('valid departure'),
      ),
    ).toBe(true);
  });
  it('enforces total passenger limits and adults for lap infants', () => {
    expect(
      validateSearch({
        ...valid(),
        passengers: { adults: 0, children: 0, infantsInSeat: 0, infantsOnLap: 0 },
      }),
    ).toHaveLength(1);
    expect(
      validateSearch({
        ...valid(),
        passengers: { adults: 9, children: 1, infantsInSeat: 0, infantsOnLap: 0 },
      }),
    ).toHaveLength(1);
    expect(
      validateSearch({
        ...valid(),
        passengers: { adults: 1, children: 0, infantsInSeat: 0, infantsOnLap: 2 },
      }),
    ).toHaveLength(1);
    expect(
      validateSearch({
        ...valid(),
        passengers: { adults: 0, children: 1, infantsInSeat: 0, infantsOnLap: 0 },
      }),
    ).toEqual([]);
  });
  it('validates and deduplicates airline codes including alphanumeric codes', () => {
    expect(airlineCodes('aa, AA b6\n6e')).toEqual(['AA', 'B6', '6E']);
    expect(validateSearch({ ...valid(), outboundAirlines: 'AAL' })).toHaveLength(1);
    const codes = Array.from({ length: 51 }, (_, i) => i.toString(36).padStart(2, '0')).join(',');
    expect(validateSearch({ ...valid(), outboundAirlines: codes })).toHaveLength(1);
  });
});

it('serializes inclusive local time windows and omits unrestricted windows', () => {
  const request = buildRequest({ ...valid(), departureTime: [480, 1080], arrivalTime: [0, 0] });
  expect(request.filters).toEqual({
    departureTime: { earliest: '08:00', latest: '18:00' },
    arrivalTime: { earliest: '00:00', latest: '00:00' },
  });
  expect(buildRequest(valid()).filters).toBeUndefined();
  expect(buildRequest({ ...valid(), arrivalTime: [1439, 1439] }).filters?.arrivalTime).toEqual({
    earliest: '23:59',
    latest: '23:59',
  });
});
it('rejects reversed, invalid, and overnight time windows', () => {
  expect(validateSearch({ ...valid(), departureTime: [1320, 360] })).toHaveLength(1);
  expect(validateSearch({ ...valid(), arrivalTime: [0, 1440] })).toHaveLength(1);
  expect(validateSearch({ ...valid(), arrivalTime: [NaN, 100] })).toHaveLength(1);
  expect(validateSearch({ ...valid(), arrivalTime: [0.5, 100] })).toHaveLength(1);
});
it('supports alliances, per-layover limits, and allowed/blocked airports', () => {
  const values = {
    ...valid(),
    outboundAirlines: 'aa, star_alliance',
    minLayover: '0',
    maxLayover: '180',
    allowConnections: 'jfk lhr JFK',
    blockConnections: 'ord',
  };
  expect(validateSearch(values)).toEqual([]);
  expect(buildRequest(values)).toMatchObject({
    flights: [{ airlines: ['AA', 'STAR_ALLIANCE'] }],
    filters: {
      layover: { minMinutes: 0, maxMinutes: 180 },
      connectionAirports: { allow: ['JFK', 'LHR'], block: ['ORD'] },
    },
  });
  expect(buildRequest({ ...valid(), maxLayover: '120' }).filters?.layover).toEqual({
    maxMinutes: 120,
  });
});
it('rejects bad layover limits and connection codes', () => {
  expect(validateSearch({ ...valid(), minLayover: '180', maxLayover: '120' })).toHaveLength(1);
  for (const value of ['-1', '1.5', 'bad', 'Infinity']) {
    expect(validateSearch({ ...valid(), maxLayover: value })).toHaveLength(1);
  }
  expect(validateSearch({ ...valid(), allowConnections: 'AA' })).toHaveLength(1);
  expect(validateSearch({ ...valid(), blockConnections: '123' })).toHaveLength(1);
});
it('never sends obsolete or unknown request properties to the strict API', () => {
  const values = {
    ...valid(),
    passengers: { adults: 2, children: 1, infantsInSeat: 1, infantsOnLap: 1 },
  };
  const request = buildRequest(values);
  expect(Object.keys(request).sort()).toEqual([
    'currency',
    'flights',
    'language',
    'passengers',
    'region',
    'seat',
    'trip',
  ]);
  expect(Object.keys(request.passengers)).toEqual([
    'adults',
    'children',
    'infantsInSeat',
    'infantsOnLap',
  ]);
  expect(Object.keys(request.flights[0])).toEqual(['date', 'fromAirport', 'toAirport']);
});
