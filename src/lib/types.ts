export type Cabin = 'economy' | 'premium-economy' | 'business' | 'first';
export type StopChoice = 'any' | '0' | '1' | '2' | '3';
export type TimeRange = [number, number];
export interface Passengers {
  adults: number;
  children: number;
  infantsInSeat: number;
  infantsOnLap: number;
}
export interface SearchValues {
  seat: Cabin;
  from: string;
  to: string;
  departure: string;
  passengers: Passengers;
  stops: StopChoice;
  outboundAirlines: string;
  departureTime: TimeRange;
  arrivalTime: TimeRange;
  minLayover: string;
  maxLayover: string;
  allowConnections: string;
  blockConnections: string;
}
export interface SearchLeg {
  date: string;
  fromAirport: string;
  toAirport: string;
  maxStops?: number;
  airlines?: string[];
}
export interface SearchRequest {
  flights: [SearchLeg];
  trip: 'one-way';
  seat: Cabin;
  passengers: Passengers;
  currency: string;
  language: string;
  region: string;
  maxStops?: number;
  filters?: {
    departureTime?: { earliest?: string; latest?: string };
    arrivalTime?: { earliest?: string; latest?: string };
    layover?: { minMinutes?: number; maxMinutes?: number };
    connectionAirports?: { allow?: string[]; block?: string[] };
  };
}
export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}
export interface FlightTime {
  date: CalendarDate;
  time: { hour: number; minute: number };
}
export interface Segment {
  fromAirport: { code: string; name: string };
  toAirport: { code: string; name: string };
  departure: FlightTime;
  arrival: FlightTime;
  durationMinutes: number;
  planeType: string;
  operatingCarrier: string;
  flightNumber: string;
  legroom: string;
}
export interface Layover {
  durationMinutes: number;
  airportCode: string;
  airportName: string;
  cityName: string;
  changeOfAirport: boolean;
}
export interface CarrierLink {
  code: string;
  name: string;
  url: string;
  type?: 'support' | 'baggage';
}
export interface Flight {
  type: string;
  price: number;
  googleFlightsUrl: string | null;
  airlines: string[];
  segments: Segment[];
  totalDurationMinutes: number;
  stopCount: number;
  layovers: Layover[];
  carbon: { emission: number; typicalOnRoute: number };
  farePolicy: { refundabilityCode: number | null; checkedBaggageIncluded: boolean | null };
  bookingToken: string;
  carrierLinks: CarrierLink[];
  baggageLinks: CarrierLink[];
}
export interface CodeName {
  code: string;
  name: string;
}
export interface SearchResponse {
  flights: Flight[];
  metadata: {
    airlines: CodeName[];
    alliances: CodeName[];
    baggageLinks: CarrierLink[];
    locations: {
      code: string;
      kind: 'airport' | 'city' | 'place';
      name: string;
      cityName: string;
      cityCode: string;
      countryCode: string;
      countryName: string;
    }[];
    flexibleDateInsight: {
      destinationLabel: string;
      cheapestPrice: number | null;
      highestPrice: number | null;
      pricePoints: { epochMs: number; date: CalendarDate; price: number }[];
    } | null;
  };
}
