import type { FlightTime, Segment } from './types';

// Compare the wall-clock dates at a single airport, independent of the browser's timezone.
// The provider supplies no UTC offsets, so these cannot account for clock changes.
function localClockMinutes(value: FlightTime | undefined): number | null {
  if (!value || value.date.length !== 3 || value.time.length !== 2) return null;
  const [year, month, day] = value.date;
  const [hour, minute] = value.time;
  if (
    ![year, month, day, hour, minute].every(Number.isInteger) ||
    year < 100 ||
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
  const timestamp = Date.UTC(year, month - 1, day, hour, minute);
  const date = new Date(timestamp);
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return timestamp / 60_000;
}

export function layoverMinutes(previous: Segment, next: Segment): number | null {
  const airport = previous.to_airport?.code?.trim().toUpperCase();
  if (!airport || airport !== next.from_airport?.code?.trim().toUpperCase()) return null;
  const arrival = localClockMinutes(previous.arrival);
  const departure = localClockMinutes(next.departure);
  if (arrival === null || departure === null || departure < arrival) return null;
  return departure - arrival;
}
