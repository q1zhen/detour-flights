import { Fragment } from 'react';
import { Badge, Button, Tooltip } from '@radix-ui/themes';
import { ArrowTopRightIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import type { Flight } from '../lib/types';
import {
  bookingUrl,
  carbonComparison,
  flightMinutes,
  formatDuration,
  formatPrice,
} from '../lib/format';
import { FlightDirection } from './FlightDirection';
import { SegmentDetails } from './SegmentDetails';
import { LayoverDetails } from './LayoverDetails';

export function FlightCard({
  flight,
  currency,
  cheapest,
}: {
  flight: Flight;
  currency: string;
  cheapest: boolean;
}) {
  const segments = flight.flights ?? [];
  const carbon = carbonComparison(flight.carbon?.emission, flight.carbon?.typical_on_route);
  const url = bookingUrl(flight.google_flights_url);
  const airlines = flight.airlines?.filter(Boolean).join(' + ') || 'Airline unavailable';
  return (
    <article
      className="flight-card"
      aria-label={`${airlines}, ${formatPrice(flight.price, currency)}`}
    >
      <details className="flight-details">
        <summary className="flight-row">
          <span className="sr-only">Flight details: </span>
          <FlightDirection segments={segments} />
          <span className="flight-meta">
            <Tooltip content="Flight time excludes layovers">
              <strong>
                {formatDuration(flightMinutes(flight))} <small>in air</small>
              </strong>
            </Tooltip>
            <span>{airlines}</span>
          </span>
          <span className="flight-carbon">
            {flight.carbon?.emission > 0 ? (
              <>
                <span>{(flight.carbon.emission / 1000).toLocaleString()} kg CO₂</span>
                {carbon && (
                  <span className={carbon.difference < 0 ? 'carbon-lower' : 'muted'}>
                    {carbon.difference === 0
                      ? 'Typical'
                      : `${carbon.difference > 0 ? '+' : ''}${carbon.difference}% vs. typical`}
                  </span>
                )}
              </>
            ) : (
              <span className="muted">CO₂ unavailable</span>
            )}
          </span>
          <span className="flight-price">
            <strong>{formatPrice(flight.price, currency)}</strong>
            <span>
              {currency}
              {cheapest && (
                <Badge size="1" color="green" variant="soft">
                  Lowest
                </Badge>
              )}
            </span>
          </span>
          <ChevronDownIcon className="details-chevron" width="18" height="18" />
        </summary>
        <div className="flight-details-content">
          <div className="details-toolbar">
            <h3>Flight details</h3>
            {url ? (
              <Button size="2" variant="soft" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  Google Flights
                  <ArrowTopRightIcon />
                </a>
              </Button>
            ) : (
              <span className="muted">Booking link unavailable</span>
            )}
          </div>
          {segments.length ? (
            <ol className="itinerary-timeline" aria-label="Flight itinerary">
              {segments.map((segment, index) => (
                <Fragment key={index}>
                  {index > 0 && <LayoverDetails previous={segments[index - 1]} next={segment} />}
                  <SegmentDetails
                    segment={segment}
                    first={index === 0}
                    last={index === segments.length - 1}
                  />
                </Fragment>
              ))}
            </ol>
          ) : (
            <p className="muted">Segment details unavailable</p>
          )}
          <div className="details-footnote">
            <span>Local times · Layovers are local-clock estimates</span>
            <span>
              CO₂:{' '}
              {flight.carbon?.emission > 0
                ? `${(flight.carbon.emission / 1000).toLocaleString()} kg`
                : 'unavailable'}
              {flight.carbon?.typical_on_route > 0 &&
                ` · typical ${(flight.carbon.typical_on_route / 1000).toLocaleString()} kg`}
            </span>
          </div>
        </div>
      </details>
    </article>
  );
}
