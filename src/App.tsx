import { useEffect, useRef, useState } from 'react';
import { Callout } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { AppHeader } from './components/AppHeader';
import { SearchForm } from './components/SearchForm';
import { FlightResults } from './components/FlightResults';
import { SearchError, searchFlights } from './lib/api';
import type { SearchRequest, SearchResponse } from './lib/types';

export default function App() {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [request, setRequest] = useState<SearchRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SearchError | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function search(next: SearchRequest) {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setLoading(true);
    setError(null);
    setCancelled(false);
    setData(null);
    setRequest(next);
    try {
      const result = await searchFlights(next, active.signal);
      if (!active.signal.aborted) setData(result);
    } catch (failure) {
      if (!active.signal.aborted)
        setError(
          failure instanceof SearchError
            ? failure
            : new SearchError('Something went wrong. Please try again.'),
        );
    } finally {
      if (controller.current === active) setLoading(false);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to flight search
      </a>
      <AppHeader />
      <main id="main-content">
        <h1 className="sr-only">Flight search</h1>
        <SearchForm
          onSearch={search}
          loading={loading}
          onCancel={() => {
            controller.current?.abort();
            setLoading(false);
            setCancelled(true);
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
        {!error && <FlightResults data={data} request={request} loading={loading} />}
      </main>
    </div>
  );
}
