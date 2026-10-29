import { useMemo, useState } from 'react';
import { Skeleton } from '@radix-ui/themes';
import type { SearchRequest, SearchResponse } from '../lib/types';
import { flightMinutes, formatSearchDate } from '../lib/format';
import { FlightCard } from './FlightCard';
import { SelectField } from './SelectField';
import { SearchMetadata } from './SearchMetadata';

export function FlightResults({
  data,
  request,
  loading,
}: {
  data: SearchResponse | null;
  request: SearchRequest | null;
  loading: boolean;
}) {
  const [sort, setSort] = useState('recommended');
  const flights = useMemo(() => {
    const results = [...(data?.flights ?? [])];
    if (sort === 'price')
      results.sort(
        (a, b) => (a.price > 0 ? a.price : Infinity) - (b.price > 0 ? b.price : Infinity),
      );
    if (sort === 'duration') results.sort((a, b) => flightMinutes(a) - flightMinutes(b));
    return results;
  }, [data, sort]);
  const cheapest = Math.min(
    ...flights.filter((flight) => flight.price > 0).map((flight) => flight.price),
  );
  if (loading)
    return (
      <section className="results-section" aria-busy="true" aria-label="Searching flights">
        <div className="results-heading">
          <h2 role="status">Searching…</h2>
        </div>
        {[1, 2, 3].map((key) => (
          <Skeleton key={key} height="88px" mb="3" style={{ borderRadius: 8 }} />
        ))}
      </section>
    );
  if (!data || !request) return null;
  const total = Object.values(request.passengers).reduce((a, b) => a + b, 0);
  return (
    <section className="results-section" aria-label="Flight results">
      <div className="results-heading">
        <div>
          <div className="result-title-row">
            <h2>
              {request.flights[0].fromAirport}
              <span className="heading-arrow">→</span>
              {request.flights[0].toAirport}
            </h2>
          </div>
          <p className="muted">
            {formatSearchDate(request.flights[0].date)} · {total}{' '}
            {total === 1 ? 'traveler' : 'travelers'} · {request.seat.replace('-', ' ')}
          </p>
        </div>
        <SelectField
          label="Sort flight results"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'recommended', label: 'Provider order' },
            { value: 'price', label: 'Lowest price' },
            { value: 'duration', label: 'Shortest journey' },
          ]}
        />
      </div>
      <p className="result-count" role="status">
        {flights.length} {flights.length === 1 ? 'flight' : 'flights'}{' '}
        <span>· Prices can change{request.filters ? ' · Filtered provider results' : ''}</span>
      </p>

      {flights.length ? (
        <div className="flight-list">
          {flights.map((flight, index) => (
            <FlightCard
              key={`${flight.googleFlightsUrl || JSON.stringify(flight)}-${index}`}
              flight={flight}
              currency={request.currency}
              cabin={request.seat}
              cheapest={flight.price === cheapest}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No flights found</h3>
          <p>Try another date or fewer filters.</p>
        </div>
      )}
      <SearchMetadata metadata={data.metadata} currency={request.currency} />
    </section>
  );
}
