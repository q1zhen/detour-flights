import { useMemo, useState } from 'react';
import { Badge, Skeleton } from '@radix-ui/themes';
import { MagnifyingGlassIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
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
          <h2>Finding your way there…</h2>
          <span className="muted" role="status">
            Checking live flight options
          </span>
        </div>
        {[1, 2, 3].map((key) => (
          <Skeleton key={key} height="126px" mb="3" style={{ borderRadius: 16 }} />
        ))}
      </section>
    );
  if (!data || !request)
    return (
      <section className="welcome-state">
        <div className="welcome-icon">
          <PaperPlaneIcon width="28" height="28" />
        </div>
        <h2>Somewhere new is calling.</h2>
        <p>Pick your airports and dates. We’ll find the flights.</p>
        <div className="welcome-features">
          <span>Live flight options</span>
          <i />
          <span>Flexible search filters</span>
          <i />
          <span>No account needed</span>
        </div>
      </section>
    );
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
            <Badge color="gray" variant="soft">
              One way
            </Badge>
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
        {flights.length} {flights.length === 1 ? 'flight option' : 'flight options'} found{' '}
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
          <MagnifyingGlassIcon width="28" height="28" />
          <h3>No flights found this time.</h3>
          <p>Try different dates, another airport, or fewer airline and stop restrictions.</p>
        </div>
      )}
      {(data.metadata.airlines.length > 0 || data.metadata.alliances.length > 0) && (
        <details className="metadata">
          <summary>Airlines & alliances in this search</summary>
          <div className="metadata-body">
            <p className="field-help">
              Provider metadata. Use airline codes in Search options to refine your next search.
            </p>
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
                <p className="field-help">Alliance filtering isn’t supported by this API.</p>
              </div>
            )}
          </div>
        </details>
      )}
    </section>
  );
}
