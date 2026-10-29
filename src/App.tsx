import { useEffect, useMemo, useRef, useState } from 'react';
import { Callout } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { AppHeader } from './components/AppHeader';
import { SearchForm } from './components/SearchForm';
import { FlightResults } from './components/FlightResults';
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
  const [collapsed, setCollapsed] = useState(false);
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
  const [loading, setLoading] = useState(false);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [transfer, setTransfer] = useState<TransferProgress | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [error, setError] = useState<SearchError | null>(null);
  const [cancelled, setCancelled] = useState(false);
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
  async function search(next: SearchRequest, options: TransferOptions) {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setSelected(null);
    setSearchSignature(draft?.signature ?? '');
    setLoading(true);
    setBaselineLoading(true);
    setTransfer(null);
    setTransferError(null);
    setError(null);
    setCancelled(false);
    setData(null);
    setRequest(next);
    try {
      const result = await searchFlights(next, active.signal);
      if (active.signal.aborted) return;
      setData(result);
      setBaselineLoading(false);
      try {
        const routeGraph = graph ?? (await loadRoutes(active.signal));
        setGraph(routeGraph);
        setGraphError(null);
        if (active.signal.aborted) return;
        await searchSelfTransfers({
          graph: routeGraph,
          request: next,
          baseline: result.flights,
          options,
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
      }
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
        dots={dots}
        airports={geometry.airports}
        arcs={geometry.arcs}
        missing={geometry.missing}
        focusKey={selected?.id ?? `${draft?.from ?? ''}:${draft?.to ?? ''}`}
        progress={visibleProgress}
        dataError={graphError}
      />
      <div className={`floating-panel${collapsed ? ' panel-collapsed' : ''}`}>
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
                progress={transfer}
                loading={loading}
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
