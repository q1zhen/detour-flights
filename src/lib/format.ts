import type { Flight, FlightTime } from './types';

export function formatPrice(price: number, currency: string) {
  if (!Number.isFinite(price) || price <= 0) return 'Price unavailable';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency })
      .format(price)
      .replace(/\.00$/, '');
  } catch {
    return `${price.toLocaleString('en-US')} ${currency}`;
  }
}
export function formatTime(value?: FlightTime) {
  const [hour, minute] = value?.time ?? [];
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  )
    return '—';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
export function formatDate(value?: number[]) {
  if (!value || value.length !== 3 || value.some((v) => !Number.isInteger(v) || v <= 0))
    return 'Date unavailable';
  const [year, month, day] = value;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return 'Date unavailable';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
export function formatSearchDate(date: string) {
  return formatDate(date.split('-').map(Number));
}
export function arrivalDayOffset(departure?: FlightTime, arrival?: FlightTime) {
  if (
    formatDate(departure?.date) === 'Date unavailable' ||
    formatDate(arrival?.date) === 'Date unavailable'
  )
    return null;
  const [dy, dm, dd] = departure!.date;
  const [ay, am, ad] = arrival!.date;
  const days = Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(dy, dm - 1, dd)) / 86_400_000);
  return days === 0 ? null : `${days > 0 ? '+' : ''}${days}d`;
}
export function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Duration unavailable';
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
export function flightMinutes(flight: Flight) {
  return flight.flights?.length && flight.flights.every((segment) => segment.duration > 0)
    ? flight.flights.reduce((sum, segment) => sum + segment.duration, 0)
    : Infinity;
}
export function bookingUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === 'www.google.com' &&
      url.pathname.startsWith('/travel/flights')
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function carbonComparison(emission?: number, typical?: number) {
  if (!emission || emission <= 0 || !typical || typical <= 0) return null;
  const difference = Math.round((emission / typical - 1) * 100);
  return {
    difference,
    label:
      difference === 0
        ? 'Typical emissions'
        : `${Math.abs(difference)}% ${difference < 0 ? 'less' : 'more'} CO₂`,
  };
}
