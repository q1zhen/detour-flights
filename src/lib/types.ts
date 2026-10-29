export type Trip = 'one-way' | 'round-trip';
export type Cabin = 'economy' | 'premium-economy' | 'business' | 'first';
export type StopChoice = 'any' | '0' | '1' | '2' | '3';
export type LegStopChoice = StopChoice | 'inherit';
export interface Passengers {
  adults: number;
  children: number;
  infants_in_seat: number;
  infants_on_lap: number;
}
export interface SearchValues {
  trip: Trip;
  seat: Cabin;
  from: string;
  to: string;
  departure: string;
  returnDate: string;
  passengers: Passengers;
  currency: string;
  language: string;
  stops: StopChoice;
  outboundStops: LegStopChoice;
  returnStops: LegStopChoice;
  outboundAirlines: string;
  returnAirlines: string;
}
export interface SearchLeg {
  date: string;
  from_airport: string;
  to_airport: string;
  max_stops?: number | null;
  airlines?: string[];
}
export interface SearchRequest {
  flights: SearchLeg[];
  trip: Trip;
  seat: Cabin;
  passengers: Passengers;
  currency: string;
  language: string;
  max_stops: number | null;
}
export interface FlightTime {
  date: number[];
  time: number[];
}
export interface Segment {
  from_airport: { code: string; name: string };
  to_airport: { code: string; name: string };
  departure: FlightTime;
  arrival: FlightTime;
  duration: number;
  plane_type: string;
}
export interface Flight {
  type: string;
  price: number;
  google_flights_url: string | null;
  airlines: string[];
  flights: Segment[];
  outbound?: Segment[];
  return?: Segment[];
  carbon: { emission: number; typical_on_route: number };
}
export interface CodeName {
  code: string;
  name: string;
}
export interface SearchResponse {
  flights: Flight[];
  metadata: { airlines: CodeName[]; alliances: CodeName[] };
}
