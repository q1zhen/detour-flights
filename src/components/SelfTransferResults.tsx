import type { TransferProgress, TransferResult } from '../lib/self-transfer';
import { formatPrice } from '../lib/format';
import { SelfTransferCard } from './SelfTransferCard';

export function SelfTransferResults({
  progress,
  loading,
  error,
  currency,
  selectedId,
  onSelect,
}: {
  progress: TransferProgress | null;
  loading: boolean;
  error: string | null;
  currency: string;
  selectedId?: string;
  onSelect?: (result: TransferResult) => void;
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
            selected={selectedId === `transfer:${result.id}`}
            onSelect={onSelect ? () => onSelect(result) : undefined}
            result={result}
            currency={currency}
            baselinePrice={progress.baselinePrice}
          />
        ))}
      </div>
    </section>
  );
}
