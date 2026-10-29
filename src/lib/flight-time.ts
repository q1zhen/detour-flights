import type { FlightTime } from './types';

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timezone: string) {
  let result = formatters.get(timezone);
  if (!result) {
    result = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timezone, result);
  }
  return result;
}
function parts(epoch: number, timezone: string) {
  return Object.fromEntries(
    formatter(timezone)
      .formatToParts(epoch)
      .map((p) => [p.type, p.value]),
  );
}
function wallAt(epoch: number, timezone: string) {
  const p = parts(epoch, timezone);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
}
export function localDateAt(epoch: number, timezone: string) {
  const p = parts(epoch, timezone);
  return `${p.year}-${p.month}-${p.day}`;
}
export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

const offsetsByDate = new Map<string, number[]>();
// The API supplies local calendar fields without an offset. Never guess during
// a repeated DST hour: ambiguous or nonexistent local times cannot form a safe join.
export function localToEpoch(value: FlightTime | undefined, timezone: string): number | null {
  if (!value?.date || !value.time) return null;
  const { year, month, day } = value.date;
  const { hour, minute } = value.time;
  if (
    ![year, month, day, hour, minute].every(Number.isInteger) ||
    year < 1900 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  )
    return null;
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const date = new Date(wall);
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  try {
    const key = `${timezone}/${year}-${month}-${day}`;
    let offsets = offsetsByDate.get(key);
    if (!offsets) {
      const midnight = Date.UTC(year, month - 1, day);
      offsets = [
        ...new Set(
          Array.from({ length: 13 }, (_, i) => {
            const probe = midnight + (i - 6) * 6 * 3_600_000;
            return wallAt(probe, timezone) - probe;
          }),
        ),
      ];
      if (offsetsByDate.size >= 2000) offsetsByDate.clear();
      offsetsByDate.set(key, offsets);
    }
    const matches = offsets
      .map((offset) => wall - offset)
      .filter((epoch) => wallAt(epoch, timezone) === wall);
    return matches.length === 1 ? matches[0] : null;
  } catch {
    return null;
  }
}
