import type { TransferProgress, MidpointStatus } from '../lib/self-transfer';
import { formatDuration, formatPrice } from '../lib/format';
import { FlightCard } from './FlightCard';

const labels: Record<MidpointStatus, string> = {
  queued: 'Not started',
  pricing: 'Pricing',
  ready: 'Ready',
  searching: 'Searching',
  results: 'Found',
  empty: 'No results',
  pruned: 'Skipped by price',
  error: 'Search failed',
  cancelled: 'Cancelled',
};
export function MidpointSidebar({
  progress,
  loading,
}: {
  progress: TransferProgress | null;
  loading: boolean;
}) {
  const finished =
    progress?.midpoints.filter((h) =>
      ['results', 'empty', 'pruned', 'error', 'cancelled'].includes(h.status),
    ).length ?? 0;
  return (
    <aside className="midpoint-sidebar" aria-label="Midpoint search progress">
      <h2>
        Midpoints <span>{progress?.midpoints.length ?? '—'}</span>
      </h2>
      <p className="muted" role="status">
        {progress
          ? `${finished} of ${progress.midpoints.length} finished`
          : loading
            ? 'Waiting…'
            : 'No midpoint search'}
      </p>
      {progress && !progress.midpoints.length && <p className="muted">No matching midpoints.</p>}
      <ul>
        {progress?.midpoints.map((hub) => (
          <li key={hub.code} data-status={hub.status}>
            <div>
              <strong>{hub.code}</strong>
              <span>{labels[hub.status]}</span>
            </div>
            <p>{hub.airport.city || hub.airport.name}</p>
            {hub.cheapestLong !== undefined && (
              <small>Long leg {formatPrice(hub.cheapestLong, 'USD')}</small>
            )}
            {hub.resultCount > 0 && (
              <small>
                {hub.resultCount} {hub.resultCount === 1 ? 'option' : 'options'}
              </small>
            )}
            {hub.status === 'error' && hub.message && (
              <details className="midpoint-error">
                <summary>Error details</summary>
                <small>{hub.message}</small>
              </details>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function SelfTransferResults({
  progress,
  loading,
  error,
  currency,
}: {
  progress: TransferProgress | null;
  loading: boolean;
  error: string | null;
  currency: string;
}) {
  const errors = progress?.midpoints.filter((h) => h.status === 'error').length ?? 0;
  const phase = !progress
    ? loading
      ? 'Waiting…'
      : 'Ready'
    : progress.phase === 'cancelled'
      ? 'Cancelled'
      : progress.phase !== 'complete'
        ? 'Searching…'
        : errors
          ? `Partial · ${errors} failed`
          : 'Complete';
  return (
    <section className="results-section transfer-results" aria-label="Self-transfer results">
      <div className="results-heading">
        <h2>Self-transfer</h2>
        <span className="column-tag">Separate tickets</span>
      </div>
      <p className="result-count" role="status">
        {progress?.results.length ?? 0} options · {error ? 'Unavailable' : phase}
      </p>
      <p className="transfer-advice">Missed connections aren’t protected.</p>
      {error && (
        <p className="transfer-error" role="alert">
          {error}
        </p>
      )}
      {progress?.ceilingPrice !== null && progress?.ceilingPrice !== undefined && (
        <p className="muted">
          Regular fare ceiling: <strong>{formatPrice(progress.ceilingPrice, currency)}</strong>
        </p>
      )}
      {progress && progress.baselinePrice === null && (
        <p className="muted">No regular fare to compare.</p>
      )}
      {!error && progress?.phase === 'complete' && !progress.results.length && (
        <div className="empty-state">
          <h3>No matching self-transfers</h3>
        </div>
      )}
      <div className="transfer-list">
        {progress?.results.map((result) => (
          <article className="transfer-card" key={result.id}>
            <header>
              <div>
                <h3>Via {result.midpoint}</h3>
                <p>
                  {formatDuration(result.transferMinutes)} transfer ·{' '}
                  {formatDuration(result.durationMinutes)} total
                </p>
              </div>
              <div className="transfer-price">
                <strong>{formatPrice(result.price, currency)}</strong>
                {progress.baselinePrice !== null && (
                  <span>
                    {result.price < progress.baselinePrice
                      ? `Save ${formatPrice(progress.baselinePrice - result.price, currency)}`
                      : result.price === progress.baselinePrice
                        ? 'Same as regular'
                        : `${formatPrice(result.price - progress.baselinePrice, currency)} above regular`}
                  </span>
                )}
              </div>
            </header>
            <details className="transfer-tickets">
              <summary>
                View both tickets{' '}
                <span>
                  {formatPrice(result.leg1.price, currency)} +{' '}
                  {formatPrice(result.leg2.price, currency)}
                </span>
              </summary>
              <h4>Ticket 1 · To {result.midpoint}</h4>
              <FlightCard flight={result.leg1} currency={currency} cheapest={false} />
              <p className="transfer-divider">
                Self-transfer at {result.midpoint} · {formatDuration(result.transferMinutes)}
              </p>
              <h4>Ticket 2 · From {result.midpoint}</h4>
              <FlightCard flight={result.leg2} currency={currency} cheapest={false} />
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
