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
export const oneWayFlight: Flight = {
  type: 'AA',
  price: 553,
  airlines: ['American', 'JetBlue'],
  flights: outbound,
  carbon: { emission: 274000, typical_on_route: 345000 },
  google_flights_url:
    'https://www.google.com/travel/flights/booking?tfs=complete-itinerary&curr=USD',
};
