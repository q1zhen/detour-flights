import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import { Theme } from '@radix-ui/themes';
import type { ReactNode } from 'react';

const renderToStaticMarkup = (node: ReactNode) => renderMarkup(<Theme>{node}</Theme>);
import { FlightCard } from './FlightCard';
import { FlightResults } from './FlightResults';
import { buildRequest, initialValues } from '../lib/search';
import type { Flight } from '../lib/types';

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
  it('explains outbound selection for round trips and escapes upstream labels', () => {
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
    expect(html).toContain('Select outbound');
    expect(html).toContain('then select a return');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
