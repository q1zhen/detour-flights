import type { Flight, Segment } from '../lib/types';

const outbound: Segment[] = [
  {
    from_airport: { code: 'JFK', name: 'John F. Kennedy International Airport' },
    to_airport: { code: 'ORD', name: 'Chicago O’Hare' },
    departure: { date: [2026, 11, 20], time: [7, 0] },
    arrival: { date: [2026, 11, 20], time: [8, 0] },
    duration: 120,
    plane_type: 'Boeing 737',
  },
  {
    from_airport: { code: 'ORD', name: 'Chicago O’Hare' },
    to_airport: { code: 'LAX', name: 'Los Angeles International Airport' },
    departure: { date: [2026, 11, 20], time: [10, 0] },
    arrival: { date: [2026, 11, 20], time: [12, 0] },
    duration: 240,
    plane_type: 'Airbus A321',
  },
];
const inbound: Segment[] = [
  {
    from_airport: { code: 'LAX', name: 'Los Angeles International Airport' },
    to_airport: { code: 'JFK', name: 'John F. Kennedy International Airport' },
    departure: { date: [2026, 11, 27], time: [22, 0] },
    arrival: { date: [2026, 11, 28], time: [6, 0] },
    duration: 300,
    plane_type: 'Boeing 787',
  },
];
export const roundTripFlight: Flight = {
  type: 'AA',
  price: 553,
  airlines: ['American', 'JetBlue'],
  flights: [...outbound, ...inbound],
  outbound,
  return: inbound,
  carbon: { emission: 542000, typical_on_route: 677000 },
  google_flights_url:
    'https://www.google.com/travel/flights/booking?tfs=complete-itinerary&curr=USD',
};
