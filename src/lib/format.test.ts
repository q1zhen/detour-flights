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
import type { Flight } from './types';

describe('honest result formatting', () => {
  it('never presents missing prices or durations as free or instant flights', () => {
    expect(formatPrice(0, 'USD')).toBe('Price unavailable');
    expect(formatPrice(215, 'USD')).toBe('$215');
    expect(formatPrice(215.5, 'EUR')).toBe('€215.50');
    expect(formatDuration(0)).toBe('Duration unavailable');
    expect(formatDuration(368)).toBe('6h 8m');
  });
  it('preserves valid midnight times and rejects missing date/time entries', () => {
    expect(formatTime({ date: [2027, 1, 20], time: [0, 0] })).toBe('00:00');
    expect(formatTime({ date: [], time: [] })).toBe('—');
    expect(formatTime({ date: [], time: [25, 0] })).toBe('—');
    expect(formatDate([2027, 1, 20])).toBe('Jan 20, 2027');
    expect(formatDate([0, 0, 0])).toBe('Date unavailable');
  });
  it('only totals flight time when every segment duration is available', () => {
    expect(flightMinutes({ flights: [{ duration: 60 }, { duration: 90 }] } as Flight)).toBe(150);
    expect(flightMinutes({ flights: [{ duration: 0 }, { duration: 90 }] } as Flight)).toBe(
      Infinity,
    );
    expect(flightMinutes({ flights: [] } as unknown as Flight)).toBe(Infinity);
  });
  it('marks overnight arrivals by local calendar date without inventing elapsed time', () => {
    expect(
      arrivalDayOffset(
        { date: [2026, 12, 31], time: [22, 0] },
        { date: [2027, 1, 1], time: [2, 0] },
      ),
    ).toBe('+1d');
    expect(arrivalDayOffset({ date: [], time: [] }, { date: [], time: [] })).toBeNull();
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
