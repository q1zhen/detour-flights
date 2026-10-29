import type { SearchRequest, SearchValues, TimeRange } from './types';

export const LAST_MINUTE = 23 * 60 + 59;
export const ALLIANCES = ['ONEWORLD', 'SKYTEAM', 'STAR_ALLIANCE'];
export function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function initialValues(): SearchValues {
  return {
    seat: 'economy',
    from: '',
    to: '',
    departure: localDate(14),
    passengers: { adults: 1, children: 0, infantsInSeat: 0, infantsOnLap: 0 },
    stops: 'any',
    outboundAirlines: '',
    departureTime: [0, LAST_MINUTE],
    arrivalTime: [0, LAST_MINUTE],
    minLayover: '',
    maxLayover: '',
    allowConnections: '',
    blockConnections: '',
  };
}
export function airlineCodes(value: string) {
  return [
    ...new Set(
      value
        .toUpperCase()
        .split(/[\s,]+/)
        .filter(Boolean),
    ),
  ];
}
export function timeLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function isAnyTime(range: TimeRange) {
  return range[0] === 0 && range[1] === LAST_MINUTE;
}
function timeFilter(range: TimeRange) {
  return isAnyTime(range)
    ? undefined
    : { earliest: timeLabel(range[0]), latest: timeLabel(range[1]) };
}
function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function validateSearch(values: SearchValues): string[] {
  const errors: string[] = [];
  const from = values.from.trim().toUpperCase();
  const to = values.to.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to))
    errors.push(
      'Enter a three-letter airport or city code for both locations (for example, JFK and LON).',
    );
  if (from && from === to) errors.push('Choose different departure and arrival locations.');
  if (!validDate(values.departure)) errors.push('Choose a valid departure date.');
  const counts = Object.values(values.passengers);
  if (
    counts.some((n) => !Number.isInteger(n) || n < 0 || n > 9) ||
    counts.reduce((a, b) => a + b, 0) < 1 ||
    counts.reduce((a, b) => a + b, 0) > 9
  )
    errors.push('Choose 1–9 travelers in total.');
  if (values.passengers.infantsOnLap > values.passengers.adults)
    errors.push('Each infant on a lap needs an adult traveler.');
  const codes = airlineCodes(values.outboundAirlines);
  if (
    codes.length > 50 ||
    codes.some((code) => !/^[A-Z0-9]{2}$/.test(code) && !ALLIANCES.includes(code))
  )
    errors.push('Use up to 50 airline or alliance codes (for example, AA, B6, STAR_ALLIANCE).');
  for (const [label, range] of [
    ['Departure', values.departureTime],
    ['Arrival', values.arrivalTime],
  ] as const) {
    if (
      range.length !== 2 ||
      range.some((n) => !Number.isInteger(n) || n < 0 || n > LAST_MINUTE) ||
      range[0] > range[1]
    )
      errors.push(`${label} times must be an ordered range from 00:00 to 23:59.`);
  }
  const layovers = [values.minLayover, values.maxLayover];
  if (layovers.some((v) => v !== '' && (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v)))))
    errors.push('Layover limits must be non-negative whole minutes.');
  else if (layovers.every((v) => v !== '') && Number(values.minLayover) > Number(values.maxLayover))
    errors.push('Minimum layover cannot exceed maximum layover.');
  for (const value of [values.allowConnections, values.blockConnections]) {
    const airports = airlineCodes(value);
    if (airports.length > 50 || airports.some((code) => !/^[A-Z]{3}$/.test(code)))
      errors.push('Use up to 50 three-letter connection airport codes.');
  }
  return errors;
}
export function buildRequest(values: SearchValues): SearchRequest {
  const airlines = airlineCodes(values.outboundAirlines);
  const allow = airlineCodes(values.allowConnections);
  const block = airlineCodes(values.blockConnections);
  const filters: NonNullable<SearchRequest['filters']> = {};
  const departureTime = timeFilter(values.departureTime);
  const arrivalTime = timeFilter(values.arrivalTime);
  if (departureTime) filters.departureTime = departureTime;
  if (arrivalTime) filters.arrivalTime = arrivalTime;
  if (values.minLayover !== '' || values.maxLayover !== '')
    filters.layover = {
      ...(values.minLayover !== '' ? { minMinutes: Number(values.minLayover) } : {}),
      ...(values.maxLayover !== '' ? { maxMinutes: Number(values.maxLayover) } : {}),
    };
  if (allow.length || block.length)
    filters.connectionAirports = {
      ...(allow.length ? { allow } : {}),
      ...(block.length ? { block } : {}),
    };
  return {
    flights: [
      {
        date: values.departure,
        fromAirport: values.from.trim().toUpperCase(),
        toAirport: values.to.trim().toUpperCase(),
        ...(airlines.length ? { airlines } : {}),
      },
    ],
    trip: 'one-way',
    seat: values.seat,
    passengers: { ...values.passengers },
    currency: 'USD',
    language: 'en-US',
    region: 'US',
    ...(values.stops === 'any' ? {} : { maxStops: Number(values.stops) }),
    ...(Object.keys(filters).length ? { filters } : {}),
  };
}
