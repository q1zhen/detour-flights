import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import { Theme } from '@radix-ui/themes';
import type { ReactNode } from 'react';

const renderToStaticMarkup = (node: ReactNode) => renderMarkup(<Theme>{node}</Theme>);
import { FlightCard } from './FlightCard';
import { FlightResults } from './FlightResults';
import { SearchForm } from './SearchForm';
import { buildRequest, initialValues } from '../lib/search';
import type { Flight } from '../lib/types';
import { emptyMetadata, oneWayFlight } from '../test/fixtures';

const emptyFlight: Flight = {
  ...oneWayFlight,
  type: '',
  price: 0,
  googleFlightsUrl: null,
  airlines: [],
  segments: [],
  totalDurationMinutes: 0,
  layovers: [],
  carbon: { emission: 0, typicalOnRoute: 0 },
};
describe('result rendering edge cases', () => {
  it('renders missing upstream data without implying a free flight or a booking link', () => {
    const html = renderToStaticMarkup(
      <FlightCard flight={emptyFlight} currency="USD" cheapest={false} />,
    );
    expect(html).toContain('Price unavailable');
    expect(html).toContain('Airline unavailable');
    expect(html).toContain('Booking link unavailable');
    expect(html).not.toContain('href=');
  });
  it('shows provider metadata even when there are no flights', () => {
    const html = renderToStaticMarkup(
      <FlightResults
        data={{
          flights: [],
          metadata: {
            ...emptyMetadata,
            airlines: [{ code: 'AA', name: 'American' }],
            alliances: [{ code: 'OW', name: 'Oneworld' }],
          },
        }}
        request={buildRequest({ ...initialValues(), from: 'JFK', to: 'LAX' })}
        loading={false}
      />,
    );
    expect(html).toContain('No flights found');
    expect(html).toContain('American');
    expect(html).toContain('Oneworld');
  });
  it('links to the flight and escapes upstream labels', () => {
    const html = renderToStaticMarkup(
      <FlightCard
        flight={{
          ...emptyFlight,
          airlines: ['<script>alert(1)</script>'],
          googleFlightsUrl: 'https://www.google.com/travel/flights/search?tfs=test',
        }}
        currency="EUR"
        cheapest={false}
      />,
    );
    expect(html).toContain('Google Flights');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});

it('renders connecting one-way flights without return details', () => {
  const html = renderToStaticMarkup(
    <FlightCard flight={oneWayFlight} currency="USD" cheapest={false} />,
  );
  expect(html).toContain('1 stop');
  expect(html).toContain('8h 0m');
  expect(html).toContain('2h 0m');
  expect(html).toContain('layover');
  expect(html).toContain('timeline-start');
  expect(html).toContain('timeline-end');
  expect(html).toContain('274 kg CO₂');
  expect(html).not.toContain('Return');
  expect(html).not.toContain('Round-trip');
});

it('offers only a departure date and no round-trip or return-flight controls', () => {
  const html = renderToStaticMarkup(
    <SearchForm onSearch={() => {}} loading={false} onCancel={() => {}} />,
  );
  expect(html).toContain('One way');
  expect(html.match(/type="date"/g)).toHaveLength(1);
  expect(html).not.toContain('Round trip');
  expect(html).not.toContain('Return');
  expect(html).not.toContain('Trip type');
  expect(html).not.toContain('Currency');
  expect(html).not.toContain('Language');
});

it('shows provider layovers, flight numbers, and baggage hints', () => {
  const html = renderToStaticMarkup(
    <FlightCard
      flight={{
        ...oneWayFlight,
        layovers: [{ ...oneWayFlight.layovers[0], durationMinutes: 135 }],
      }}
      currency="USD"
      cheapest={false}
    />,
  );
  expect(html).toContain('2h 15m');
  expect(html).toContain('AA123');
  expect(html).toContain('31 in');
  expect(html).toContain('Checked baggage included');
  expect(html).not.toContain('local-clock estimates');
});
it('does not invent layover durations when upstream values are missing', () => {
  const html = renderToStaticMarkup(
    <FlightCard flight={{ ...oneWayFlight, layovers: [] }} currency="USD" cheapest={false} />,
  );
  expect(html).toContain('Duration unavailable');
});
it('distinguishes airport transfers from same-airport layovers', () => {
  const flight = {
    ...oneWayFlight,
    layovers: [{ ...oneWayFlight.layovers[0], changeOfAirport: true }],
    segments: [
      oneWayFlight.segments[0],
      { ...oneWayFlight.segments[1], fromAirport: { code: 'MDW', name: 'Midway' } },
    ],
  };
  const html = renderToStaticMarkup(<FlightCard flight={flight} currency="USD" cheapest={false} />);
  expect(html).toContain('transfer');
  expect(html).toContain('Change airports');
  expect(html).toContain('ORD → MDW');
});
it('renders accessible two-handle time bars and disables them during searches', () => {
  const html = renderToStaticMarkup(
    <SearchForm onSearch={() => {}} loading={true} onCancel={() => {}} />,
  );
  expect(html.match(/role="slider"/g)).toHaveLength(4);
  expect(html).toContain('aria-label="Departure time earliest"');
  expect(html).toContain('aria-label="Arrival time latest"');
  expect(html).toContain('aria-valuetext="00:00"');
  expect(html).toContain('aria-valuetext="23:59"');
  expect(html.match(/aria-disabled="true"/g)).toHaveLength(2);
});
