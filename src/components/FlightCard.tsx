import { Badge, Button } from '@radix-ui/themes';
import { ArrowRightIcon, ArrowTopRightIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import type { Flight, Segment, Trip } from '../lib/types';
import {
  arrivalDayOffset,
  bookingUrl,
  carbonComparison,
  flightMinutes,
  formatDate,
  formatDuration,
  formatPrice,
  formatTime,
} from '../lib/format';

export function FlightCard({
  flight,
  currency,
  trip,
  cheapest,
}: {
  flight: Flight;
  currency: string;
  trip: Trip;
  cheapest: boolean;
}) {
  const segments = flight.flights ?? [];
  const first = segments[0];
  const last = segments.at(-1);
  const carbon = carbonComparison(flight.carbon?.emission, flight.carbon?.typical_on_route);
  const url = bookingUrl(flight.google_flights_url);
  const dayOffset = arrivalDayOffset(first?.departure, last?.arrival);
  const airlines = flight.airlines?.filter(Boolean).join(' + ') || 'Airline unavailable';
  return (
    <article
      className="flight-card"
      aria-label={`${airlines}, ${formatPrice(flight.price, currency)}`}
    >
      <div className="flight-main">
        <div className="airline-cell">
          <div className="airline-mark" aria-hidden="true">
            {airlines.slice(0, 1)}
          </div>
          <div>
            <strong>{airlines}</strong>
            <span className="muted">
              {trip === 'round-trip' ? 'Outbound option' : 'One-way flight'}
            </span>
          </div>
        </div>
        <div className="flight-route">
          <div className="flight-time">
            <strong>{formatTime(first?.departure)}</strong>
            <span>{first?.from_airport?.code || '—'}</span>
          </div>
          <div className="route-line">
            <span>
              {segments.length
                ? segments.length === 1
                  ? 'Nonstop'
                  : `${segments.length - 1} ${segments.length === 2 ? 'stop' : 'stops'}`
                : 'Stops unavailable'}
            </span>
            <div className="route-line-art">
              <i />
              <ArrowRightIcon />
            </div>
            <small>
              {segments
                .slice(0, -1)
                .map((segment) => segment.to_airport?.code)
                .filter(Boolean)
                .join(' · ')}
            </small>
          </div>
          <div className="flight-time">
            <strong>
              {formatTime(last?.arrival)}
              {dayOffset && <sup aria-label={`Arrival date offset ${dayOffset}`}>{dayOffset}</sup>}
            </strong>
            <span>{last?.to_airport?.code || '—'}</span>
          </div>
        </div>
        <div className="flight-duration">
          <strong>{formatDuration(flightMinutes(flight))}</strong>
          <span className="muted">Flight time</span>
          {carbon && (
            <span className={carbon.difference < 0 ? 'carbon-lower' : 'carbon-neutral'}>
              {carbon.label}
            </span>
          )}
        </div>
        <div className="flight-price">
          {cheapest && (
            <Badge color="green" variant="soft" size="1">
              Lowest price
            </Badge>
          )}
          <strong>{formatPrice(flight.price, currency)}</strong>
          <span className="muted">{currency} · quoted fare</span>
        </div>
      </div>
      <details className="flight-details">
        <summary>
          Flight details <ChevronDownIcon />
        </summary>
        <div className="flight-details-content">
          <div className="segment-list">
            {segments.length ? (
              segments.map((segment, index) => (
                <SegmentDetails key={index} segment={segment} index={index} />
              ))
            ) : (
              <p>Segment details weren’t provided for this flight.</p>
            )}
          </div>
          <div className="flight-facts">
            <div>
              <span>Carbon emissions</span>
              <strong>
                {flight.carbon?.emission > 0
                  ? `${(flight.carbon.emission / 1000).toLocaleString()} kg CO₂`
                  : 'Unavailable'}
              </strong>
            </div>
            <div>
              <span>Typical for this route</span>
              <strong>
                {flight.carbon?.typical_on_route > 0
                  ? `${(flight.carbon.typical_on_route / 1000).toLocaleString()} kg CO₂`
                  : 'Unavailable'}
              </strong>
            </div>
            <div>
              <span>Provider result code</span>
              <strong>{flight.type || 'Unavailable'}</strong>
            </div>
          </div>
          <p className="field-help">
            Times are local to each airport. Flight time excludes layovers. The provider does not
            supply time zones or connection durations.
          </p>
          <div className="booking-row">
            <p>
              {trip === 'round-trip'
                ? 'Choose this outbound flight, then select a return on Google Flights.'
                : 'View current pricing and booking options on Google Flights.'}
            </p>
            {url ? (
              <Button asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {trip === 'round-trip' ? 'Select outbound' : 'View flight'}
                  <ArrowTopRightIcon />
                </a>
              </Button>
            ) : (
              <span className="muted">Exact booking link unavailable</span>
            )}
          </div>
        </div>
      </details>
    </article>
  );
}
function SegmentDetails({ segment, index }: { segment: Segment; index: number }) {
  return (
    <div className="segment">
      <div className="segment-index">{index + 1}</div>
      <div className="segment-body">
        <div className="segment-airports">
          <strong>{segment.from_airport?.code || '—'}</strong>
          <ArrowRightIcon />
          <strong>{segment.to_airport?.code || '—'}</strong>
          <span>{formatDuration(segment.duration)}</span>
        </div>
        <p>
          {segment.from_airport?.name || 'Departure airport unavailable'} →{' '}
          {segment.to_airport?.name || 'Arrival airport unavailable'}
        </p>
        <div className="segment-times">
          <span>
            Departs <strong>{formatTime(segment.departure)}</strong> ·{' '}
            {formatDate(segment.departure?.date)}
          </span>
          <span>
            Arrives <strong>{formatTime(segment.arrival)}</strong> ·{' '}
            {formatDate(segment.arrival?.date)}
          </span>
        </div>
        <span className="muted">{segment.plane_type || 'Aircraft unavailable'}</span>
      </div>
    </div>
  );
}
