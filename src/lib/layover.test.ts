import { describe, expect, it } from 'vitest';
import type { Segment } from './types';
import { oneWayFlight } from '../test/fixtures';
import { layoverMinutes } from './layover';

const [first, second] = oneWayFlight.flights;
function connection(arrival: Segment['arrival'], departure: Segment['departure']) {
  return layoverMinutes({ ...first, arrival }, { ...second, departure });
}
describe('same-airport layovers in local clock time', () => {
  it('calculates the wait between segments rather than flight duration', () => {
    expect(layoverMinutes(first, second)).toBe(120);
  });
  it('handles overnight and year-boundary connections', () => {
    expect(
      connection({ date: [2026, 12, 31], time: [23, 20] }, { date: [2027, 1, 1], time: [1, 5] }),
    ).toBe(105);
  });
  it('preserves valid midnight and zero-minute connections', () => {
    expect(
      connection({ date: [2026, 11, 20], time: [0, 0] }, { date: [2026, 11, 20], time: [0, 0] }),
    ).toBe(0);
  });
  it('does not infer durations across different or missing airports', () => {
    expect(
      layoverMinutes(first, { ...second, from_airport: { code: 'MDW', name: 'Midway' } }),
    ).toBeNull();
    expect(
      layoverMinutes(
        { ...first, to_airport: { code: '', name: '' } },
        { ...second, from_airport: { code: '', name: '' } },
      ),
    ).toBeNull();
  });
  it('rejects missing, invalid, and reversed timestamps', () => {
    expect(connection({ date: [], time: [] }, second.departure)).toBeNull();
    expect(connection({ date: [2026, 2, 30], time: [0, 0] }, second.departure)).toBeNull();
    expect(connection({ date: [2026, 11, 20], time: [24, 0] }, second.departure)).toBeNull();
    expect(connection(second.departure, first.arrival)).toBeNull();
  });
});
