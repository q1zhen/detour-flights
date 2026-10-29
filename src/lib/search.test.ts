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
    const request = buildRequest({ ...valid(), currency: 'eur', language: ' fr ' });
    expect(request.flights).toEqual([
      { date: '2027-01-20', from_airport: 'JFK', to_airport: 'LAX' },
    ]);
    expect(request.currency).toBe('USD');
    expect(request.language).toBe('en-US');
    expect(request.max_stops).toBeNull();
  });
  it('distinguishes inherited, unrestricted, and zero-stop overrides', () => {
    const request = buildRequest({
      ...valid(),
      stops: '1',
      outboundStops: '0',
    });
    expect(request.max_stops).toBe(1);
    expect(request.flights[0].max_stops).toBe(0);
    expect(buildRequest({ ...valid(), outboundStops: 'any' }).flights[0].max_stops).toBeNull();
    expect(buildRequest(valid()).flights[0]).not.toHaveProperty('max_stops');
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
      passengers: { adults: 2, children: 1, infants_in_seat: 1, infants_on_lap: 2 },
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
        passengers: { adults: 0, children: 0, infants_in_seat: 0, infants_on_lap: 0 },
      }),
    ).toHaveLength(1);
    expect(
      validateSearch({
        ...valid(),
        passengers: { adults: 9, children: 1, infants_in_seat: 0, infants_on_lap: 0 },
      }),
    ).toHaveLength(1);
    expect(
      validateSearch({
        ...valid(),
        passengers: { adults: 1, children: 0, infants_in_seat: 0, infants_on_lap: 2 },
      }),
    ).toHaveLength(1);
    expect(
      validateSearch({
        ...valid(),
        passengers: { adults: 0, children: 1, infants_in_seat: 0, infants_on_lap: 0 },
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
