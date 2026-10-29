import { Badge, Button } from '@radix-ui/themes';
import { ArrowTopRightIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import type { Flight, Trip } from '../lib/types';
import {
  bookingUrl,
  carbonComparison,
  flightMinutes,
  formatDuration,
  formatPrice,
} from '../lib/format';
import { FlightDirection } from './FlightDirection';
import { SegmentDetails } from './SegmentDetails';

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
  const roundTrip = trip === 'round-trip';
  const directions = roundTrip
    ? [
        { label: 'Outbound', segments: flight.outbound ?? [] },
        { label: 'Return', segments: flight.return ?? [] },
      ]
    : [{ label: 'Flight', segments: flight.flights ?? [] }];
  const carbon = carbonComparison(flight.carbon?.emission, flight.carbon?.typical_on_route);
  const url = bookingUrl(flight.google_flights_url);
  const airlines = flight.airlines?.filter(Boolean).join(' + ') || 'Airline unavailable';
  return (
    <article
      className="flight-card"
      aria-label={`${airlines}, ${formatPrice(flight.price, currency)}`}
    >
      <div className="flight-main has-directions">
        <div className="airline-cell">
          <div className="airline-mark" aria-hidden="true">
            {airlines.slice(0, 1)}
          </div>
          <div>
            <strong>{airlines}</strong>
            <span className="muted">{roundTrip ? 'Round-trip itinerary' : 'One-way flight'}</span>
            {carbon && (
              <span className={carbon.difference < 0 ? 'carbon-lower' : 'carbon-neutral'}>
                {carbon.label}
              </span>
            )}
          </div>
        </div>
        <div className="flight-directions">
          {directions.map((direction) => (
            <FlightDirection key={direction.label} {...direction} />
          ))}
        </div>
        <div className="flight-price">
          {cheapest && (
            <Badge color="green" variant="soft" size="1">
              Lowest price
            </Badge>
          )}
          <strong>{formatPrice(flight.price, currency)}</strong>
          <span className="muted">{currency} · itinerary total</span>
          {roundTrip && <span className="muted">Outbound + return</span>}
        </div>
      </div>
      <details className="flight-details">
        <summary>
          Flight details <ChevronDownIcon />
        </summary>
        <div className="flight-details-content">
          {directions.map(({ label, segments }) => (
            <section
              key={label}
              className="direction-details"
              aria-label={`${label} flight segments`}
            >
              {roundTrip && <h3>{label} flight</h3>}
              <div className="segment-list">
                {segments.length ? (
                  segments.map((segment, index) => (
                    <SegmentDetails key={index} segment={segment} index={index} />
                  ))
                ) : (
                  <p className="muted">{label} segment details weren’t provided.</p>
                )}
              </div>
            </section>
          ))}
          <div className="flight-facts">
            <div>
              <span>
                {roundTrip ? 'Total carbon emissions · both directions' : 'Carbon emissions'}
              </span>
              <strong>
                {flight.carbon?.emission > 0
                  ? `${(flight.carbon.emission / 1000).toLocaleString()} kg CO₂`
                  : 'Unavailable'}
              </strong>
            </div>
            <div>
              <span>
                {roundTrip ? 'Typical emissions · both directions' : 'Typical for this route'}
              </span>
              <strong>
                {flight.carbon?.typical_on_route > 0
                  ? `${(flight.carbon.typical_on_route / 1000).toLocaleString()} kg CO₂`
                  : 'Unavailable'}
              </strong>
            </div>
            <div>
              <span>{roundTrip ? 'Total flight time · both directions' : 'Flight time'}</span>
              <strong>{formatDuration(flightMinutes(flight))}</strong>
            </div>
            <div>
              <span>{roundTrip ? 'Outbound provider result code' : 'Provider result code'}</span>
              <strong>{flight.type || 'Unavailable'}</strong>
            </div>
          </div>
          <p className="field-help">
            Times are local to each airport. Flight time excludes layovers. The provider does not
            supply time zones or connection durations.
          </p>
          <div className="booking-row">
            <p>
              {roundTrip
                ? 'View booking options with both flights selected on Google Flights. The price is the total for this exact itinerary.'
                : 'View current pricing and booking options on Google Flights.'}
            </p>
            {url ? (
              <Button asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {roundTrip ? 'View round trip' : 'View flight'}
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
