import { ChevronDownIcon } from '@radix-ui/react-icons';
import type { TransferResult } from '../lib/self-transfer';
import { formatDuration, formatPrice } from '../lib/format';
import { FlightDirection } from './FlightDirection';
import { FlightCard } from './FlightCard';
import { CabinBadge } from './CabinBadge';

export function SelfTransferCard({
  result,
  currency,
  baselinePrice,
  selected,
  onSelect,
}: {
  result: TransferResult;
  currency: string;
  baselinePrice: number | null;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const segments = [...result.leg1.segments, ...result.leg2.segments];
  const airlines = [...new Set([...(result.leg1.airlines ?? []), ...(result.leg2.airlines ?? [])])]
    .filter(Boolean)
    .join(' + ');
  return (
    <article
      className={`flight-card transfer-card${selected ? ' selected-trip' : ''}`}
      data-selected={selected || undefined}
      aria-label={`Via ${result.midpoint}, ${formatPrice(result.price, currency)}`}
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
          <span className="sr-only">Self-transfer via {result.midpoint}: </span>
          <FlightDirection
            segments={segments}
            durationMinutes={result.durationMinutes}
            connectionDurations={[
              ...result.leg1.segments
                .slice(0, -1)
                .map((_, i) => result.leg1.layovers?.[i]?.durationMinutes),
              result.transferMinutes,
              ...result.leg2.segments
                .slice(0, -1)
                .map((_, i) => result.leg2.layovers?.[i]?.durationMinutes),
            ]}
            selfTransferIndex={result.leg1.segments.length - 1}
          />
          <span className="flight-summary-footer">
            <span className="expanded-card-title">
              <strong>Self-transfer</strong>
              <small>{formatDuration(result.durationMinutes)}</small>
            </span>
            <span className="flight-meta">
              <span>{airlines || 'Airline unavailable'}</span>
              <span className="cabin-labels">
                <CabinBadge cabin={result.leg1Cabin} ticket={1} />
                <CabinBadge cabin={result.leg2Cabin} ticket={2} />
              </span>
            </span>
            <span className="flight-price">
              <strong>{formatPrice(result.price, currency)}</strong>
              <span>{currency} · 2 tickets</span>
              {baselinePrice !== null && (
                <small className="transfer-savings">
                  {result.price < baselinePrice
                    ? `Save ${formatPrice(baselinePrice - result.price, currency)}`
                    : result.price === baselinePrice
                      ? 'Same as regular'
                      : `${formatPrice(result.price - baselinePrice, currency)} above regular`}
                </small>
              )}
            </span>
            <ChevronDownIcon className="details-chevron" width="18" height="18" />
          </span>
        </summary>
        <div className="flight-details-content transfer-tickets">
          <h3>Ticket 1 · To {result.midpoint}</h3>
          <FlightCard
            flight={result.leg1}
            currency={currency}
            cabin={result.leg1Cabin}
            cheapest={false}
          />
          <p className="transfer-divider">
            Self-transfer at {result.midpoint} · {formatDuration(result.transferMinutes)}
          </p>
          <h3>Ticket 2 · From {result.midpoint}</h3>
          <FlightCard
            flight={result.leg2}
            currency={currency}
            cabin={result.leg2Cabin}
            cheapest={false}
          />
        </div>
      </details>
    </article>
  );
}
