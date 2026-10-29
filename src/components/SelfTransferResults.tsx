import type { TransferProgress, MidpointStatus } from '../lib/self-transfer';
import { formatPrice } from '../lib/format';
import { SelfTransferCard } from './SelfTransferCard';

const labels: Record<MidpointStatus, string> = {
  queued: 'Queued',
  pricing: 'Pricing',
  ready: 'Ready',
  searching: 'Searching',
  results: 'Found',
  empty: 'No results',
  pruned: 'Price cutoff',
  error: 'Failed',
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
    progress?.midpoints.filter((h) => ['results', 'empty', 'pruned', 'error'].includes(h.status))
      .length ?? 0;
  const total = progress?.midpoints.length ?? 0;
  const cancelled = progress?.phase === 'cancelled';
  const progressValue = progress
    ? total
      ? finished
      : progress.phase === 'complete'
        ? 1
        : 0
    : loading
      ? undefined
      : 0;
  return (
    <aside className="midpoint-sidebar" aria-label="Midpoint search progress">
      <h2>
        Midpoints <span>{progress?.midpoints.length ?? '—'}</span>
      </h2>
      <div className="midpoint-progress-label" role="status">
        <span>{progress ? `${finished}/${total}` : loading ? 'Waiting…' : 'Ready'}</span>
        {cancelled && <span>Cancelled</span>}
      </div>
      <progress
        className="midpoint-progress"
        max={total || 1}
        value={progressValue}
        aria-label="Midpoint search progress"
        aria-valuetext={
          progress
            ? `${finished} of ${total} finished${cancelled ? ', cancelled' : ''}`
            : 'Waiting for midpoints'
        }
      />
      {progress && !total && <p className="muted">No matching midpoints.</p>}
      <ul>
        {progress?.midpoints.map((hub) => (
          <li key={hub.code} data-status={hub.status}>
            <div>
              <strong title={`${hub.airport.city} · ${hub.airport.name}`}>{hub.code}</strong>
              <span>
                {hub.status === 'results'
                  ? `${hub.resultCount} found`
                  : `${labels[hub.status]}${hub.resultCount ? ` · ${hub.resultCount} found` : ''}`}
              </span>
            </div>
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
          <SelfTransferCard
            key={result.id}
            result={result}
            currency={currency}
            baselinePrice={progress.baselinePrice}
          />
        ))}
      </div>
    </section>
  );
}
