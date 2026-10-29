import { useEffect, useMemo, useRef, useState } from 'react';
import { Callout } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { AppHeader } from './components/AppHeader';
import { SearchForm } from './components/SearchForm';
import { FlightResults } from './components/FlightResults';
import type { SearchRetry } from './lib/api';
import { SearchError, searchFlights } from './lib/api';
import type { SearchRequest, SearchResponse } from './lib/types';
import { SelfTransferResults } from './components/SelfTransferResults';
import FlightGlobe from './components/FlightGlobe';
import { midpointDots, tripGeometry } from './lib/globe';
import type { GlobeDraft, SelectedTrip } from './lib/globe';
import type { RouteGraph } from './lib/routes';
import { loadRoutes } from './lib/routes';
import { searchSelfTransfers } from './lib/self-transfer';
import type { TransferOptions, TransferProgress } from './lib/self-transfer';
import './self-transfer.css';
import './globe.css';

export default function App() {
  const [graph, setGraph] = useState<RouteGraph | null>(null);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [draft, setDraft] = useState<GlobeDraft | null>(null);
  const [searchSignature, setSearchSignature] = useState('');
  const [selected, setSelected] = useState<SelectedTrip | null>(null);
  const [midpointFilter, setMidpointFilter] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    loadRoutes(abort.signal)
      .then(setGraph)
      .catch(() => {
        if (!abort.signal.aborted)
          setGraphError('Airport coordinates unavailable. Regular search is still available.');
      });
    return () => abort.abort();
  }, []);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [request, setRequest] = useState<SearchRequest | null>(null);
  const [transferOptions, setTransferOptions] = useState<TransferOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [transfer, setTransfer] = useState<TransferProgress | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [error, setError] = useState<SearchError | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [retries, setRetries] = useState<Record<string, SearchRetry>>({});
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const visibleProgress = draft?.signature === searchSignature ? transfer : null;
  const dots = useMemo(
    () => (graph && draft ? midpointDots(graph, draft, visibleProgress) : []),
    [graph, draft, visibleProgress],
  );
  const geometry = useMemo(
    () =>
      graph
        ? tripGeometry(graph, selected, [draft?.from ?? '', draft?.to ?? ''])
        : { arcs: [], airports: [], missing: [] },
    [graph, selected, draft?.from, draft?.to],
  );
  function selectTrip(next: SelectedTrip) {
    setSelected((previous) => (previous?.id === next.id ? null : next));
  }
  function toggleMidpoint(code: string | null) {
    const next = code === midpointFilter ? null : code;
    setMidpointFilter(next);
    setSelected((previous) =>
      next && previous?.midpoint && previous.midpoint !== next ? null : previous,
    );
  }
  const regularRequestChanged = !!request && draft?.requestKey !== JSON.stringify(request);
  function queryFor(active: AbortController) {
    return (request: SearchRequest, signal?: AbortSignal) =>
      searchFlights(request, signal, {
        onRetry: (retry) => {
          if (controller.current !== active || active.signal.aborted) return;
          const key = JSON.stringify(request);
          setRetries((previous) => {
            const next = { ...previous };
            if (retry) next[key] = retry;
            else delete next[key];
            return next;
          });
        },
      });
  }
  async function startTransfers() {
    if (!data || !request || !transferOptions || loading || regularRequestChanged) return;
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setLoading(true);
    setCancelled(false);
    setRetries({});
    setTransfer(null);
    setTransferError(null);
    setMidpointFilter(null);
    setSelected((previous) => (previous?.midpoint ? null : previous));
    setSearchSignature(draft?.signature ?? '');
    try {
      const routeGraph = graph ?? (await loadRoutes(active.signal));
      if (active.signal.aborted) return;
      setGraph(routeGraph);
      setGraphError(null);
      await searchSelfTransfers({
        graph: routeGraph,
        query: queryFor(active),
        request,
        baseline: data.flights,
        options: draft?.transferOptions ?? transferOptions,
        signal: active.signal,
        onProgress: (progress) => {
          if (controller.current === active && !active.signal.aborted) setTransfer(progress);
        },
      });
    } catch (failure) {
      if (!active.signal.aborted)
        setTransferError(
          failure instanceof Error ? failure.message : 'Self-transfer search failed.',
        );
    } finally {
      if (controller.current === active) setLoading(false);
    }
  }
  async function search(next: SearchRequest, options: TransferOptions) {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setSelected(null);
    setMidpointFilter(null);
    setRetries({});
    setSearchSignature(draft?.signature ?? '');
    setLoading(true);
    setBaselineLoading(true);
    setTransfer(null);
    setTransferError(null);
    setError(null);
    setCancelled(false);
    setData(null);
    setRequest(next);
    setTransferOptions(options);
    try {
      const result = await queryFor(active)(next, active.signal);
      if (active.signal.aborted) return;
      setData(result);
      setBaselineLoading(false);
    } catch (failure) {
      if (!active.signal.aborted)
        setError(
          failure instanceof SearchError
            ? failure
            : new SearchError('Something went wrong. Please try again.'),
        );
    } finally {
      if (controller.current === active) {
        setLoading(false);
        setBaselineLoading(false);
      }
    }
  }
  return (
    <div className="app-shell globe-app">
      <FlightGlobe
        midpointFilter={midpointFilter}
        onToggleMidpoint={toggleMidpoint}
        panelRef={panelRef}
        panelCollapsed={collapsed}
        dots={dots}
        airports={geometry.airports}
        arcs={geometry.arcs}
        missing={geometry.missing}
        focusKey={selected?.id ?? `${draft?.from ?? ''}:${draft?.to ?? ''}`}
        progress={visibleProgress}
        loading={loading}
        baselineLoading={baselineLoading}
        waitingForTransfer={!!data && !transfer && !loading}
        cancelled={cancelled}
        searchFailed={!!error || !!transferError}
        retryCount={Object.keys(retries).length}
        retryMessage={Object.values(retries)[0]?.message}
        dataError={graphError}
      />
      <div ref={panelRef} className={`floating-panel${collapsed ? ' panel-collapsed' : ''}`}>
        <a className="skip-link" href="#main-content">
          Skip to flight search
        </a>
        <div className="panel-header">
          <AppHeader />
          <button
            className="panel-toggle"
            type="button"
            aria-expanded={!collapsed}
            aria-controls="main-content"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? 'Open search' : 'Minimize'}
          </button>
        </div>
        <main id="main-content" hidden={collapsed}>
          <h1 className="sr-only">Flight search</h1>
          <SearchForm
            onSearch={search}
            onPreviewChange={setDraft}
            loading={loading}
            onCancel={() => {
              controller.current?.abort();
              setRetries({});
              setLoading(false);
              setBaselineLoading(false);
              setCancelled(true);
              setTransfer((previous) =>
                previous
                  ? {
                      ...previous,
                      phase: 'cancelled',
                      midpoints: previous.midpoints.map((hub) =>
                        ['queued', 'pricing', 'ready', 'searching'].includes(hub.status)
                          ? { ...hub, status: 'cancelled' }
                          : hub,
                      ),
                    }
                  : null,
              );
            }}
          />
          {error && (
            <Callout.Root className="search-error" color="red" role="alert">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <div className="callout-message">
                <strong>{error.message}</strong>
                {error.issues.length > 0 && (
                  <ul>
                    {error.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Callout.Root>
          )}
          {cancelled && (
            <p role="status" className="cancelled-message">
              Search cancelled.
            </p>
          )}
          {!error && request && (
            <div className="search-workspace">
              <div className="regular-results">
                <h2 className="column-title">Regular flights</h2>
                <FlightResults
                  data={data}
                  request={request}
                  loading={baselineLoading}
                  selectedId={selected?.id}
                  onSelect={(flight, id) => selectTrip({ id, flights: [flight] })}
                />
              </div>
              <SelfTransferResults
                onSearch={startTransfers}
                canSearch={!!data && !loading && !regularRequestChanged}
                requestChanged={regularRequestChanged}
                midpointFilter={midpointFilter}
                onClearMidpoint={() => setMidpointFilter(null)}
                progress={transfer}
                loading={loading && !baselineLoading}
                error={transferError}
                selectedId={selected?.id}
                onSelect={(result) =>
                  selectTrip({
                    id: `transfer:${result.id}`,
                    flights: [result.leg1, result.leg2],
                    midpoint: result.midpoint,
                  })
                }
                currency={request.currency}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
