import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import { Theme } from '@radix-ui/themes';
import type { ReactNode } from 'react';

const renderToStaticMarkup = (node: ReactNode) => renderMarkup(<Theme>{node}</Theme>);
import { FlightCard } from './FlightCard';
import { FlightResults } from './FlightResults';
import { buildRequest, initialValues } from '../lib/search';
import type { Flight } from '../lib/types';
import { roundTripFlight } from '../test/fixtures';

const emptyFlight: Flight = {
  type: '',
  price: 0,
  google_flights_url: null,
  airlines: [],
  flights: [],
  carbon: { emission: 0, typical_on_route: 0 },
};
describe('result rendering edge cases', () => {
  it('renders missing upstream data without implying a free flight or a booking link', () => {
    const html = renderToStaticMarkup(
      <FlightCard flight={emptyFlight} currency="USD" trip="one-way" cheapest={false} />,
    );
    expect(html).toContain('Price unavailable');
    expect(html).toContain('Airline unavailable');
    expect(html).toContain('Exact booking link unavailable');
    expect(html).not.toContain('href=');
  });
  it('shows provider metadata even when there are no flights', () => {
    const html = renderToStaticMarkup(
      <FlightResults
        data={{
          flights: [],
          metadata: {
            airlines: [{ code: 'AA', name: 'American' }],
            alliances: [{ code: 'OW', name: 'Oneworld' }],
          },
        }}
        request={buildRequest({ ...initialValues(), from: 'JFK', to: 'LAX' })}
        loading={false}
      />,
    );
    expect(html).toContain('No flights found this time.');
    expect(html).toContain('American');
    expect(html).toContain('Oneworld');
  });
  it('links to the complete round trip and escapes upstream labels', () => {
    const html = renderToStaticMarkup(
      <FlightCard
        flight={{
          ...emptyFlight,
          airlines: ['<script>alert(1)</script>'],
          google_flights_url: 'https://www.google.com/travel/flights/search?tfs=test',
        }}
        currency="EUR"
        trip="round-trip"
        cheapest={false}
      />,
    );
    expect(html).toContain('View round trip');
    expect(html).toContain('both flights selected');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});

describe('complete round-trip itineraries', () => {
  it('separates directions, stops, travel dates, and overnight offsets', () => {
    const html = renderToStaticMarkup(
      <FlightCard flight={roundTripFlight} currency="USD" trip="round-trip" cheapest={true} />,
    );
    expect(html).toContain('Outbound flight summary');
    expect(html).toContain('Return flight summary');
    expect(html).toContain('Outbound flight segments');
    expect(html).toContain('Return flight segments');
    expect(html).toContain('Nov 20, 2026');
    expect(html).toContain('Nov 27, 2026');
    expect(html).toContain('1 stop');
    expect(html).toContain('Nonstop');
    expect(html).not.toContain('2 stops');
    expect(html).toContain('+1d');
    expect(html).not.toContain('+8d');
    expect(html).toContain('6h 0m');
    expect(html).toContain('5h 0m');
    expect(html).toContain('11h 0m');
    expect(html).toContain('542 kg CO₂');
    expect(html).toContain('both directions');
    expect(html).toContain('$553');
    expect(html).toContain('itinerary total');
    expect(html).toContain('American + JetBlue');
    expect(html).toContain('tfs=complete-itinerary');
    expect(html).not.toContain('Select outbound');
  });
  it('does not fabricate a direction when upstream arrays are missing', () => {
    const html = renderToStaticMarkup(
      <FlightCard flight={emptyFlight} currency="USD" trip="round-trip" cheapest={false} />,
    );
    expect(html).toContain('Outbound details unavailable');
    expect(html).toContain('Return details unavailable');
    expect(html).not.toContain('Nonstop');
  });
  it('retains the one-way display without a return section', () => {
    const html = renderToStaticMarkup(
      <FlightCard
        flight={{
          ...roundTripFlight,
          outbound: undefined,
          return: undefined,
          flights: roundTripFlight.outbound!,
        }}
        currency="USD"
        trip="one-way"
        cheapest={false}
      />,
    );
    expect(html).toContain('View flight');
    expect(html).toContain('1 stop');
    expect(html).not.toContain('Return flight');
    expect(html).not.toContain('both directions');
  });
  it('counts complete combinations without truncating at 20 outbound options', () => {
    const html = renderToStaticMarkup(
      <FlightResults
        data={{
          flights: Array.from({ length: 25 }, () => roundTripFlight),
          metadata: { airlines: [], alliances: [] },
        }}
        request={buildRequest({ ...initialValues(), from: 'JFK', to: 'LAX' })}
        loading={false}
      />,
    );
    expect(html).toMatch(/25.*round-trip combinations/);
    expect(html.match(/<article /g)).toHaveLength(25);
    expect(html).toContain('first 20 outbound options');
    expect(html).not.toContain('outbound segments only');
  });
});
