import type { Flight, Segment, SearchResponse } from '../lib/types';

const outbound: Segment[] = [
  {
    fromAirport: { code: 'JFK', name: 'John F. Kennedy International Airport' },
    toAirport: { code: 'ORD', name: 'Chicago O’Hare' },
    departure: { date: { year: 2026, month: 11, day: 20 }, time: { hour: 7, minute: 0 } },
    arrival: { date: { year: 2026, month: 11, day: 20 }, time: { hour: 8, minute: 0 } },
    durationMinutes: 120,
    planeType: 'Boeing 737',
    operatingCarrier: 'AA',
    flightNumber: 'AA123',
    legroom: '31 in',
  },
  {
    fromAirport: { code: 'ORD', name: 'Chicago O’Hare' },
    toAirport: { code: 'LAX', name: 'Los Angeles International Airport' },
    departure: { date: { year: 2026, month: 11, day: 20 }, time: { hour: 10, minute: 0 } },
    arrival: { date: { year: 2026, month: 11, day: 20 }, time: { hour: 12, minute: 0 } },
    durationMinutes: 240,
    planeType: 'Airbus A321',
    operatingCarrier: 'AA',
    flightNumber: 'AA456',
    legroom: '',
  },
];
export const oneWayFlight: Flight = {
  type: 'AA',
  price: 553,
  airlines: ['American', 'JetBlue'],
  segments: outbound,
  totalDurationMinutes: 480,
  stopCount: 1,
  layovers: [
    {
      durationMinutes: 120,
      airportCode: 'ORD',
      airportName: 'Chicago O’Hare',
      cityName: 'Chicago',
      changeOfAirport: false,
    },
  ],
  farePolicy: { refundabilityCode: 2, checkedBaggageIncluded: true },
  bookingToken: '',
  carrierLinks: [],
  baggageLinks: [],
  carbon: { emission: 274000, typicalOnRoute: 345000 },
  googleFlightsUrl: 'https://www.google.com/travel/flights/booking?tfs=complete-itinerary&curr=USD',
};

export const emptyMetadata: SearchResponse['metadata'] = {
  airlines: [],
  alliances: [],
  baggageLinks: [],
  locations: [],
  flexibleDateInsight: null,
};
