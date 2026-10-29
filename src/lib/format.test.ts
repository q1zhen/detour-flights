import { describe, expect, it } from 'vitest';
import {
  arrivalDayOffset,
  bookingUrl,
  carbonComparison,
  flightMinutes,
  formatDate,
  formatDuration,
  formatPrice,
  formatTime,
} from './format';
import { oneWayFlight } from '../test/fixtures';

describe('honest result formatting', () => {
  it('never presents missing prices or durations as free or instant flights', () => {
    expect(formatPrice(0, 'USD')).toBe('Price unavailable');
    expect(formatPrice(215, 'USD')).toBe('$215');
    expect(formatPrice(215.5, 'EUR')).toBe('€215.50');
    expect(formatDuration(0)).toBe('Duration unavailable');
    expect(formatDuration(368)).toBe('6h 8m');
  });
  it('preserves valid midnight times and rejects missing date/time entries', () => {
    expect(
      formatTime({ date: { year: 2027, month: 1, day: 20 }, time: { hour: 0, minute: 0 } }),
    ).toBe('00:00');
    expect(
      formatTime({ date: { year: 0, month: 0, day: 0 }, time: { hour: -1, minute: -1 } }),
    ).toBe('—');
    expect(formatTime({ date: { year: 0, month: 0, day: 0 }, time: { hour: 25, minute: 0 } })).toBe(
      '—',
    );
    expect(formatDate({ year: 2027, month: 1, day: 20 })).toBe('Jan 20, 2027');
    expect(formatDate({ year: 0, month: 0, day: 0 })).toBe('Date unavailable');
  });
  it('uses provider total duration and keeps missing totals last when sorting', () => {
    expect(flightMinutes({ ...oneWayFlight, totalDurationMinutes: 0 })).toBe(Infinity);
    expect(flightMinutes({ ...oneWayFlight, totalDurationMinutes: NaN })).toBe(Infinity);
    expect(flightMinutes(oneWayFlight)).toBe(480);
  });
  it('marks overnight arrivals by local calendar date without inventing elapsed time', () => {
    expect(
      arrivalDayOffset(
        { date: { year: 2026, month: 12, day: 31 }, time: { hour: 22, minute: 0 } },
        { date: { year: 2027, month: 1, day: 1 }, time: { hour: 2, minute: 0 } },
      ),
    ).toBe('+1d');
    expect(
      arrivalDayOffset(
        { date: { year: 0, month: 0, day: 0 }, time: { hour: -1, minute: -1 } },
        { date: { year: 0, month: 0, day: 0 }, time: { hour: -1, minute: -1 } },
      ),
    ).toBeNull();
  });
  it('compares emissions only with valid positive values', () => {
    expect(carbonComparison(0, 1000)).toBeNull();
    expect(carbonComparison(800, 1000)).toEqual({ difference: -20, label: '20% less CO₂' });
  });
  it('allows exact Google Flights links and rejects unsafe schemes and lookalike hosts', () => {
    expect(bookingUrl('https://www.google.com/travel/flights/booking?tfs=test')).toContain(
      'tfs=test',
    );
    expect(bookingUrl(null)).toBeNull();
    expect(bookingUrl('javascript:alert(1)')).toBeNull();
    expect(bookingUrl('https://www.google.com.evil.test/travel/flights')).toBeNull();
    expect(bookingUrl('https://www.google.com/url?q=https://evil.test')).toBeNull();
  });
});

it('sorts connecting flights by total journey time, including layovers', () => {
  expect(flightMinutes(oneWayFlight)).toBe(480);
});
