import type { LegStopChoice, SearchLeg, SearchRequest, SearchValues } from './types';

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
    passengers: { adults: 1, children: 0, infants_in_seat: 0, infants_on_lap: 0 },
    stops: 'any',
    outboundStops: 'inherit',
    outboundAirlines: '',
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
    errors.push('Enter a three-letter airport code for both airports (for example, JFK and LAX).');
  if (from && from === to) errors.push('Choose different departure and arrival airports.');
  if (!validDate(values.departure)) errors.push('Choose a valid departure date.');

  const counts = Object.values(values.passengers);
  if (
    counts.some((n) => !Number.isInteger(n) || n < 0 || n > 9) ||
    counts.reduce((a, b) => a + b, 0) < 1 ||
    counts.reduce((a, b) => a + b, 0) > 9
  )
    errors.push('Choose 1–9 travelers in total.');
  if (values.passengers.infants_on_lap > values.passengers.adults)
    errors.push('Each infant on a lap needs an adult traveler.');
  for (const [label, value] of [['Outbound', values.outboundAirlines]]) {
    const codes = airlineCodes(value);
    if (codes.length > 50 || codes.some((code) => !/^[A-Z0-9]{2}$/.test(code)))
      errors.push(
        `${label} airlines must be up to 50 two-character codes, separated by commas (for example, AA, B6).`,
      );
  }
  return errors;
}
export function buildRequest(values: SearchValues): SearchRequest {
  const from = values.from.trim().toUpperCase();
  const to = values.to.trim().toUpperCase();
  function leg(
    date: string,
    from_airport: string,
    to_airport: string,
    stops: LegStopChoice,
    airlines: string,
  ): SearchLeg {
    return {
      date,
      from_airport,
      to_airport,
      ...(stops === 'inherit' ? {} : { max_stops: stops === 'any' ? null : Number(stops) }),
      ...(airlineCodes(airlines).length ? { airlines: airlineCodes(airlines) } : {}),
    };
  }
  return {
    flights: [leg(values.departure, from, to, values.outboundStops, values.outboundAirlines)],
    trip: 'one-way',
    seat: values.seat,
    passengers: { ...values.passengers },
    currency: 'USD',
    language: 'en-US',
    max_stops: values.stops === 'any' ? null : Number(values.stops),
  };
}
