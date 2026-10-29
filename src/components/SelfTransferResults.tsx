import { Button } from '@radix-ui/themes';
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
  midpointFilter = null,
  onClearMidpoint,
  onSearch,
  canSearch = false,
  requestChanged = false,
}: {
  progress: TransferProgress | null;
  loading: boolean;
  error: string | null;
  currency: string;
  selectedId?: string;
  onSelect?: (result: TransferResult) => void;
  midpointFilter?: string | null;
  onClearMidpoint?: () => void;
  onSearch?: () => void;
  canSearch?: boolean;
  requestChanged?: boolean;
}) {
  const results = (progress?.results ?? []).filter(
    (result) => !midpointFilter || result.midpoint === midpointFilter,
  );
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
      {onSearch && (
        <Button
          type="button"
          className="start-transfer-search"
          size="2"
          disabled={!canSearch}
          loading={loading}
          onClick={onSearch}
        >
          Search self-transfers
        </Button>
      )}
      {requestChanged && <p className="muted">Update the regular search to use these changes.</p>}
      {midpointFilter && (
        <button
          type="button"
          className="midpoint-filter-chip"
          onClick={onClearMidpoint}
          aria-label="Show all self-transfer results"
        >
          Via {midpointFilter} <span aria-hidden="true">×</span>
        </button>
      )}
      <p className="result-count" role="status">
        {results.length} options · {error ? 'Unavailable' : phase}
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
      {!error && progress?.phase === 'complete' && !results.length && (
        <div className="empty-state">
          <h3>
            {midpointFilter ? `No trips via ${midpointFilter}` : 'No matching self-transfers'}
          </h3>
        </div>
      )}
      <div className="transfer-list">
        {results.map((result) => (
          <SelfTransferCard
            key={result.id}
            selected={selectedId === `transfer:${result.id}`}
            onSelect={onSelect ? () => onSelect(result) : undefined}
            result={result}
            currency={currency}
            baselinePrice={progress?.baselinePrice ?? null}
          />
        ))}
      </div>
    </section>
  );
}
