import { Fragment } from 'react';
import { Badge, Button } from '@radix-ui/themes';
import { ArrowTopRightIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import type { Cabin, Flight } from '../lib/types';
import { bookingUrl, flightMinutes, formatPrice } from '../lib/format';
import { FlightDirection } from './FlightDirection';
import { CabinBadge } from './CabinBadge';
import { SegmentDetails } from './SegmentDetails';
import { LayoverDetails } from './LayoverDetails';
import { FareDetails } from './FareDetails';

export function FlightCard({
  flight,
  currency,
  cheapest,
  cabin,
  selected,
  onSelect,
}: {
  flight: Flight;
  currency: string;
  cheapest: boolean;
  cabin?: Cabin;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const segments = flight.segments ?? [];
  const url = bookingUrl(flight.googleFlightsUrl);
  const airlines = flight.airlines?.filter(Boolean).join(' + ') || 'Airline unavailable';
  return (
    <article
      className={`flight-card${selected ? ' selected-trip' : ''}`}
      data-selected={selected || undefined}
      aria-label={`${airlines}, ${formatPrice(flight.price, currency)}`}
    >
      <details className="flight-details" open={onSelect ? selected : undefined}>
        <summary
          className="flight-row"
          onClick={
            onSelect
              ? (event) => {
                  event.preventDefault();
                  onSelect();
                }
              : undefined
          }
        >
          <span className="sr-only">Flight details: </span>
          <FlightDirection
            segments={segments}
            durationMinutes={flightMinutes(flight)}
            connectionDurations={segments
              .slice(0, -1)
              .map((_, i) => flight.layovers?.[i]?.durationMinutes)}
          />
          <span className="flight-meta">
            <span>{airlines}</span>
            {cabin && (
              <span className="cabin-labels">
                <CabinBadge cabin={cabin} />
              </span>
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
                  {index > 0 && (
                    <LayoverDetails
                      layover={flight.layovers?.[index - 1]}
                      previous={segments[index - 1]}
                      next={segment}
                    />
                  )}
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
          <FareDetails flight={flight} />
        </div>
      </details>
    </article>
  );
}
