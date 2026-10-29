import { useMemo, useState } from 'react';
import { Badge, Skeleton } from '@radix-ui/themes';
import type { SearchRequest, SearchResponse } from '../lib/types';
import { flightMinutes, formatSearchDate } from '../lib/format';
import { FlightCard } from './FlightCard';
import { SelectField } from './SelectField';

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
              {request.flights[0].from_airport}
              <span className="heading-arrow">→</span>
              {request.flights[0].to_airport}
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
            { value: 'duration', label: 'Shortest flight time' },
          ]}
        />
      </div>
      <p className="result-count" role="status">
        {flights.length} {flights.length === 1 ? 'flight' : 'flights'}{' '}
        <span>· Prices can change</span>
      </p>

      {flights.length ? (
        <div className="flight-list">
          {flights.map((flight, index) => (
            <FlightCard
              key={`${flight.google_flights_url || JSON.stringify(flight)}-${index}`}
              flight={flight}
              currency={request.currency}
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
      {(data.metadata.airlines.length > 0 || data.metadata.alliances.length > 0) && (
        <details className="metadata">
          <summary>Airlines & alliances</summary>
          <div className="metadata-body">
            {data.metadata.airlines.length > 0 && (
              <div>
                <strong>Airlines</strong>
                <div className="metadata-chips">
                  {data.metadata.airlines.map((airline, index) => (
                    <Badge color="gray" key={`${airline.code}-${index}`}>
                      {airline.name || 'Unnamed airline'} · {airline.code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {data.metadata.alliances.length > 0 && (
              <div>
                <strong>Alliances</strong>
                <div className="metadata-chips">
                  {data.metadata.alliances.map((alliance, index) => (
                    <Badge color="gray" key={`${alliance.code}-${index}`}>
                      {alliance.name || 'Unnamed alliance'} · {alliance.code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </details>
      )}
    </section>
  );
}
